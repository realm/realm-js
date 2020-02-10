////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

/* global Request, Response, XMLHttpRequest */

const AuthError = require('./errors').AuthError;
const permissionApis = require('./permission-api');

const merge = require('deepmerge');
const URL = require('url-parse');

const refreshTimers = {};
const retryInterval = 5 * 1000; // Amount of time between retrying authentication requests, if the first request failed.
const refreshBuffer = 20 * 1000; // A "safe" amount of time before a token expires that allow us to refresh it.
const refreshLowerBound = 10 * 1000; // Lower bound for refreshing tokens.

// Prevent React Native packager from seeing modules required with this
const nodeRequire = require;

function checkTypes(args, types) {
    args = Array.prototype.slice.call(args);
    for (var i = 0; i < types.length; ++i) {
        if (args.length > i && typeof args[i] !== types[i]) {
            throw new TypeError('param ' + i + ' must be of type ' + types[i]);
        }
    }
}

function checkObjectTypes(obj, types) {
    for (const name of Object.getOwnPropertyNames(types)) {
        const actualType = typeof obj[name];
        let targetType = types[name];
        const isOptional = targetType[targetType.length - 1] === '?';
        if (isOptional) {
            targetType = targetType.slice(0, -1);
        }

        if (!isOptional && actualType === 'undefined') {
            throw new Error(`${name} is required, but a value was not provided.`);
        }

        if (actualType !== targetType) {
            throw new TypeError(`${name} must be of type '${targetType}' but was of type '${actualType}' instead.`);
        }
    }
}

function normalizeSyncUrl(authUrl, syncUrl) {
    const parsedAuthUrl = new URL(authUrl);
    const realmProtocol = (parsedAuthUrl.protocol === "https:") ? "realms" : "realm";
    // Inherit ports from the Auth url
    const port = parsedAuthUrl.port ? `:${parsedAuthUrl.port}` : "";
    const baseUrl = `${realmProtocol}://${parsedAuthUrl.hostname}${port}`;
    if (!syncUrl) {
        syncUrl = "/default";
    }
    return new URL(syncUrl, baseUrl, false).toString();
}

// node-fetch supports setting a timeout as a nonstandard extension, but normal fetch doesn't
function fetchWithTimeout(input, init) {
    const request = new Request(input, init);
    const xhr = new XMLHttpRequest();
    xhr.timeout = init.timeout || 0;

    return new Promise(function(resolve, reject) {
        xhr.onload = () => {
            const options = {
                status: xhr.status,
                statusText: xhr.statusText,
                url: xhr.responseURL,
                headers: xhr.responseHeaders
            };
            if (!options.headers) {
                options.headers = {'content-type': xhr.getResponseHeader('content-type')};
            }
            const body = 'response' in xhr ? xhr.response : xhr.responseText;
            resolve(new Response(body, options));
        };
        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.ontimeout = () => reject(new TypeError('Network request failed'));
        xhr.open(request.method, request.url, true);
        request.headers.forEach((value, name) => xhr.setRequestHeader(name, value));
        xhr.send(typeof request._bodyInit === 'undefined' ? init.body : request._bodyInit);
    });
}

// Perform a HTTP request, enqueuing it if too many requests are already in
// progress to avoid hammering the server.
const performFetch = (function() {
    const doFetch = typeof XMLHttpRequest === 'undefined' ? nodeRequire('node-fetch') : fetchWithTimeout;
    const queue = [];
    let count = 0;
    const maxCount = 5;
    const next = () => {
        if (count >= maxCount) {
            return;
        }
        const req = queue.shift();
        if (!req) {
            return;
        }
        const [url, options, resolve, reject] = req;

        if (options.headers === undefined) {
            options.headers = {};
        }

        if (typeof options.body !== "undefined") {
            // fetch expects a stringified body
            if (typeof options.body === "object") {
                options.body = JSON.stringify(options.body);
            }

            // If content-type header is not explicitly set, we should set it ourselves
            if (typeof options.headers['content-type'] === "undefined") {
                options.headers['content-type'] = 'application/json;charset=utf-8';
            }
        }

        if (!options.headers['accept']){
            options.headers['accept'] = 'application/json';
        }

        ++count;
        // node doesn't support Promise.prototype.finally until 10
        doFetch(url, options)
            .then(response => {
                --count;
                next();
                resolve(response);
            })
            .catch(error => {
                --count;
                next();
                reject(error);
            });
    };
    return (url, options) => {
        return new Promise((resolve, reject) => {
            queue.push([url, options, resolve, reject]);
            next();
        });
    };
})();

const url_parse = require('url-parse');

function append_url(server, path) {
    return server + (server.charAt(server.length - 1) != '/' ? '/' : '') + path;
}

function scheduleAccessTokenRefresh(user, localRealmPath, realmUrl, expirationDate) {
    let userTimers = refreshTimers[user.identity];
    if (!userTimers) {
        refreshTimers[user.identity] = userTimers = {};
    }

    // We assume that access tokens have ~ the same expiration time, so if someone already
    // scheduled a refresh, it's likely to complete before the one we would have scheduled
    if (!userTimers[localRealmPath]) {
        const timeout = Math.max(expirationDate - Date.now() - refreshBuffer, refreshLowerBound);
        userTimers[localRealmPath] = setTimeout(() => {
            delete userTimers[localRealmPath];
            refreshAccessToken(user, localRealmPath, realmUrl);
        }, timeout);
    }
}

function print_error() {
    (console.error || console.log).apply(console, arguments);
}

function validateRefresh(user, localRealmPath, response, json) {
    let session = user._sessionForOnDiskPath(localRealmPath);
    if (!session) {
        return;
    }

    const errorHandler = session.config.error;
    if (response.status != 200) {
        let error = new AuthError(json);
        if (errorHandler) {
            errorHandler(session, error);
        } else {
            print_error(`Unhandled session token refresh error for user ${user.identity} at path ${localRealmPath}`, error);
        }
        return;
    }
    if (session.state === 'invalid') {
        return;
    }
    return session;
}

function refreshAdminToken(user, localRealmPath, realmUrl) {
    const token = user.token;
    const server = user.server;

    // We don't need to actually refresh the token, but we need to let ROS know
    // we're accessing the file and get the sync label for multiplexing
    let parsedRealmUrl = url_parse(realmUrl);
    const url = append_url(user.server, 'realms/files/' + encodeURIComponent(parsedRealmUrl.pathname));
    performFetch(url, { method: 'GET', timeout: 10000.0, headers: { Authorization: user.token }})
    .then((response) => {
        // There may not be a Realm Directory Service running on the server
        // we're talking to. If we're talking directly to the sync service
        // we'll get a 404, and if we're running inside ROS we'll get a 503 if
        // the directory service hasn't started yet (perhaps because we got
        // called due to the directory service itself opening some Realms).
        //
        // In both of these cases we can just pretend we got a valid response.
        if (response.status === 404 || response.status === 503) {
            return {response: {status: 200}, json: {path: parsedRealmUrl.pathname, syncLabel: '_direct'}};
        }
        else {
            return response.json().then((json) => { return { response, json }; });
        }
    })
    .then((responseAndJson) => {
        const response = responseAndJson.response;
        const json = responseAndJson.json;

        const credentials = credentialsMethods.adminToken(token)
        const newUser = user.constructor.login(server, credentials);
        const session = validateRefresh(newUser, localRealmPath, response, json);
        if (session) {
            parsedRealmUrl.set('pathname', json.path);
            session._refreshAccessToken(user.token, parsedRealmUrl.href, json.syncLabel);
        }
    })
    .catch((e) => {
        setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), retryInterval);
    });
}

function refreshAccessToken(user, localRealmPath, realmUrl) {
    if (!user._sessionForOnDiskPath(localRealmPath)) {
        // We're trying to refresh the token for a session that's closed. This could happen, for example,
        // when the server is not reachable and we periodically try to refresh the token, but the user has
        // already closed the Realm file.
        return;
    }

    if (!user.server) {
        throw new Error("Server for user must be specified");
    }

    const parsedRealmUrl = url_parse(realmUrl);
    const path = parsedRealmUrl.pathname;
    if (!path) {
        throw new Error(`Unexpected Realm path inferred from url '${realmUrl}'. The path section of the url should be a non-empty string.`);
    }

    if (user.isAdminToken) {
        return refreshAdminToken(user, localRealmPath, realmUrl);
    }

    const url = append_url(user.server, 'auth');
    const options = {
        method: 'POST',
        body: {
            data: user.token,
            path,
            provider: 'realm',
            app_id: ''
        },
        // FIXME: This timeout appears to be necessary in order for some requests to be sent at all.
        // See https://github.com/realm/realm-js-private/issues/338 for details.
        timeout: 10000.0
    };
    const server = user.server;
    const identity = user.identity;
    performFetch(url, options)
        .then((response) => response.json().then((json) => { return { response, json }; }))
        .then((responseAndJson) => {
            const response = responseAndJson.response;
            const json = responseAndJson.json;
            // Look up a fresh instance of the user.
            // We do this because in React Native Remote Debugging
            // `Realm.clearTestState()` will have invalidated the user object
            let newUser = user.constructor._getExistingUser(server, identity);
            if (!newUser) {
                return;
            }

            const session = validateRefresh(newUser, localRealmPath, response, json);
            if (!session) {
                return;
            }

            const tokenData = json.access_token.token_data;
            let syncWorkerPathPrefix = undefined;

            // returned by Cloud instance where sync workers are exposed with ingress and not sync proxy
            if (json.sync_worker) {
                syncWorkerPathPrefix = json.sync_worker.path;
            }

            parsedRealmUrl.set('pathname', tokenData.path);
            session._refreshAccessToken(json.access_token.token, parsedRealmUrl.href, tokenData.sync_label, syncWorkerPathPrefix);

            const errorHandler = session.config.error;
            if (errorHandler && errorHandler._notifyOnAccessTokenRefreshed) {
                errorHandler(session, errorHandler._notifyOnAccessTokenRefreshed)
            }

            const tokenExpirationDate = new Date(tokenData.expires * 1000);
            scheduleAccessTokenRefresh(newUser, localRealmPath, realmUrl, tokenExpirationDate);
        })
        .catch((e) => {
            // in case something lower in the HTTP stack breaks, try again in `retryInterval` seconds
            setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), retryInterval);
        })
}

/**
 * The base authentication method. It fires a JSON POST to the server parameter plus the auth url
 * For example, if the server parameter is `http://myapp.com`, this url will post to `http://myapp.com/auth`
 * @param {object} userConstructor
 * @param {string} server the http or https server url
 * @param {object} json the json to post to the auth endpoint
 * @param {Function} callback an optional callback with an error and user parameter
 * @returns {Promise} only returns a promise if the callback parameter was omitted
 */
function _authenticate(userConstructor, server, json, retries) {
    json.app_id = '';
    const url = append_url(server, 'auth');
    const options = {
        method: 'POST',
        body: json,
        timeout: 5000
    };

    return performFetch(url, options).then((response) => {
        const contentType = response.headers.get('Content-Type');
        if (contentType.indexOf('application/json') === -1) {
            return response.text().then((body) => {
                throw new AuthError({
                    title: `Could not authenticate: Realm Object Server didn't respond with valid JSON`,
                    body,
                });
            });
        } else if (!response.ok) {
            return response.json().then((body) => Promise.reject(new AuthError(body)));
        } else {
            return response.json().then((body) => {
                // TODO: validate JSON
                const token = body.refresh_token.token;
                const identity = body.refresh_token.token_data.identity;
                const isAdmin = body.refresh_token.token_data.is_admin;
                return userConstructor.createUser(server, identity, token, false, isAdmin);
            });
        }
    }, (err) => {
        if (retries < 3) {
            // Retry on network errors (which are different from the auth endpoint returning an error)
            return _authenticate(userConstructor, server, json, retries + 1);
        } else {
            throw err;
        }
    });
}

function _updateAccount(userConstructor, server, json) {
    const url = append_url(server, 'auth/password/updateAccount');
    const options = {
        method: 'POST',
        body: json,
    };

    return performFetch(url, options)
        .then((response) => {
            const contentType = response.headers.get('Content-Type');
            if (contentType.indexOf('application/json') === -1) {
                return response.text().then((body) => {
                    throw new AuthError({
                        title: `Could not update user account: Realm Object Server didn't respond with valid JSON`,
                        body,
                    });
                });
            }
            if (!response.ok) {
                return response.json().then((body) => Promise.reject(new AuthError(body)));
            }
        });
}

const credentialsMethods = {
    usernamePassword(username, password, createUser) {
        checkTypes(arguments, ['string', 'string', 'boolean']);
        return new Credentials('password', username, { register: createUser, password });
    },

    facebook(token) {
        checkTypes(arguments, ['string']);
        return new Credentials('facebook', token);
    },

    google(token) {
        checkTypes(arguments, ['string']);
        return new Credentials('google', token);
    },

    anonymous() {
        return new Credentials('anonymous');
    },

    nickname(value, isAdmin) {
        checkTypes(arguments, ['string', 'boolean']);
        return new Credentials('nickname', value, { is_admin: isAdmin || false });
    },

    azureAD(token) {
        checkTypes(arguments, ['string']);
        return new Credentials('azuread', token)
    },

    jwt(token, providerName) {
        checkTypes(arguments, ['string', 'string']);
        return new Credentials(providerName || 'jwt', token);
    },

    adminToken(token) {
        checkTypes(arguments, ['string']);
        return new Credentials('adminToken', token);
    },

    custom(providerName, token, userInfo) {
        if (userInfo) {
            checkTypes(arguments, ['string', 'string', 'object']);
        } else {
            checkTypes(arguments, ['string', 'string']);
        }

        return new Credentials(providerName, token, userInfo);
    }
}

const staticMethods = {
    get current() {
        const allUsers = this.all;
        const keys = Object.keys(allUsers);
        if (keys.length === 0) {
            return undefined;
        } else if (keys.length > 1) {
            throw new Error("Multiple users are logged in");
        }

        return allUsers[keys[0]];
    },

    login(server, credentials) {
        if (arguments.length === 3) {
            // Deprecated legacy signature.
            checkTypes(arguments, ['string', 'string', 'string']);
            console.warn("User.login is deprecated. Please use User.login(server, Credentials.usernamePassword(...)) instead.");
            const newCredentials = credentialsMethods.usernamePassword(arguments[1], arguments[2], /* createUser */ false);
            return this.login(server, newCredentials);
        }

        checkTypes(arguments, ['string', 'object']);
        if (credentials.identityProvider === 'adminToken') {
            let u = this._adminUser(server, credentials.token);
            return u;
        }

        return _authenticate(this, server, credentials, 0);
    },

    deserialize(serialized) {
        if (serialized.adminToken) {
            checkObjectTypes(serialized, {
                server: 'string',
                adminToken: 'string',
            });

            return this._adminUser(serialized.server, serialized.adminToken);
        }

        checkObjectTypes(serialized, {
            server: 'string',
            identity: 'string',
            refreshToken: 'string',
            isAdmin: 'boolean',
        });

        return this.createUser(serialized.server, serialized.identity, serialized.refreshToken, false, serialized.isAdmin || false);
    },

    requestPasswordReset(server, email) {
        checkTypes(arguments, ['string', 'string']);
        const json = {
            provider_id: email,
            data: { action: 'reset_password' }
        };

        return _updateAccount(this, server, json);
    },

    completePasswordReset(server, resetToken, newPassword) {
        checkTypes(arguments, ['string', 'string']);
        const json = {
            data: {
                action: 'complete_reset',
                token: resetToken,
                new_password: newPassword
            }
        };

        return _updateAccount(this, server, json);
    },

    requestEmailConfirmation(server, email) {
        checkTypes(arguments, ['string', 'string']);
        const json = {
            provider_id: email,
            data: { action: 'request_email_confirmation' }
        };

        return _updateAccount(this, server, json);
    },

    confirmEmail(server, confirmationToken) {
        checkTypes(arguments, ['string', 'string']);
        const json = {
            data: {
                action: 'confirm_email',
                token: confirmationToken
            }
        };

        return _updateAccount(this, server, json);
    },

    _refreshAccessToken: refreshAccessToken,

    // Deprecated...
    adminUser(token, server) {
        checkTypes(arguments, ['string', 'string']);
        console.warn("User.adminUser is deprecated. Please use User.login(server, Credentials.adminToken(token)) instead.");
        const credentials = credentialsMethods.adminToken(token);
        return this.login(server, credentials);
    },

    register(server, username, password) {
        checkTypes(arguments, ['string', 'string', 'string']);
        console.warn("User.register is deprecated. Please use User.login(server, Credentials.usernamePassword(...)) instead.");
        const credentials = credentialsMethods.usernamePassword(username, password, /* createUser */ true);
        return this.login(server, credentials);
    },

    registerWithProvider(server, options) {
        checkTypes(arguments, ['string', 'object']);
        console.warn("User.registerWithProvider is deprecated. Please use User.login(server, Credentials.SOME-PROVIDER(...)) instead.");
        const credentials = credentialsMethods.custom(options.provider, options.providerToken, options.userInfo);
        return this.login(server, credentials);
    },

    authenticate(server, provider, options) {
        checkTypes(arguments, ['string', 'string', 'object'])
        console.warn("User.authenticate is deprecated. Please use User.login(server, Credentials.SOME-PROVIDER(...)) instead.");

        let credentials;
        switch (provider.toLowerCase()) {
            case 'jwt':
                credentials = credentialsMethods.jwt(options.token, 'jwt');
                break
            case 'password':
                credentials = credentialsMethods.usernamePassword(options.username, options.password);
                break
            default:
                credentials = credentialsMethods.custom(provider, options.data, options.user_info || options.userInfo);
                break;
        }

        return this.login(server, credentials);
    },
};

const instanceMethods = {
    logout() {
        this._logout();
        const userTimers = refreshTimers[this.identity];
        if (userTimers) {
            Object.keys(userTimers).forEach((key) => {
                clearTimeout(userTimers[key]);
            });

            delete refreshTimers[this.identity];
        }

        const options = {
            method: 'POST',
            headers: { Authorization: this.token },
            body: { token: this.token },
        };

        return this._performFetch('/auth/revoke', options)
            .catch((e) => print_error('An error occurred while logging out a user', e));
    },
    serialize() {
        if (this.isAdminToken) {
            return {
                server: this.server,
                adminToken: this.token,
            }
        }

        return {
            server: this.server,
            refreshToken: this.token,
            identity: this.identity,
            isAdmin: this.isAdmin,
        };
    },
    retrieveAccount(provider, provider_id) {
        checkTypes(arguments, ['string', 'string']);
        const options = {
            method: 'GET',
            headers: { Authorization: this.token },
        };
        return this._performFetch(`/auth/users/${provider}/${provider_id}`, options);
    },
    createConfiguration(config) {
        if (config && config.sync) {
            if (config.sync.user && console.warn !== undefined) {
                console.warn(`'user' property will be overridden by ${this.identity}`);
            }
            if (config.sync.partial !== undefined && config.sync.fullSynchronization !== undefined) {
                throw new Error("'partial' and 'fullSynchronization' were both set. 'partial' has been deprecated, use only 'fullSynchronization'");
            }
        }

        let defaultConfig = {
            sync: {
                user: this,
            },
        };

        // Set query-based as the default setting if the user doesn't specified any other behaviour.
        if (!(config && config.sync && config.sync.partial)) {
            defaultConfig.sync.fullSynchronization = false;
        }

        // Merge default configuration with user provided config. User defined properties should aways win.
        // Doing the naive merge in JS break objects that are backed by native objects, so these needs to
        // be merged manually. This is currently only `sync.user`.
        let mergedConfig = (config === undefined) ? defaultConfig : merge(defaultConfig, config);
        mergedConfig.sync.user = this;

        // Parsing the URL requires extra handling as some forms of input (e.g. relative URLS) should not completely
        // override the default url.
        mergedConfig.sync.url = normalizeSyncUrl(this.server, (config && config.sync) ? config.sync.url : undefined);
        return mergedConfig;
    },
    _performFetch(relativePath, options) {
        if (options && !options.open_timeout === undefined) {
            options.open_timeout = 5000;
        }

        const url = url_parse(this.server);
        url.set('pathname', relativePath);

        return performFetch(url.href, options)
            .then((response) => {
                if (response.status !== 200) {
                    return response.json()
                        .then(body => {
                            throw new AuthError(body);
                        });
                }

                return response.json();
            });
    }
};

class Credentials {
    constructor(identityProvider, token, userInfo) {
        this.identityProvider = identityProvider;
        this.token = token;
        this.userInfo = userInfo || {};
    }

    toJSON() {
        return {
            data: this.token,
            provider: this.identityProvider,
            user_info: this.userInfo,
        };
    }
}

// Append the permission apis
Object.assign(instanceMethods, permissionApis);

module.exports = {
    static: staticMethods,
    instance: instanceMethods,
    credentials: credentialsMethods,
};
