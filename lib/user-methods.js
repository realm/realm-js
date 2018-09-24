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

const AuthError = require('./errors').AuthError;
const permissionApis = require('./permission-api');

const merge = require('deepmerge');
const require_method = require;
const URL = require('url-parse');

function node_require(module) {
    return require_method(module);
}

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

// Perform a HTTP request, enqueuing it if too many requests are already in
// progress to avoid hammering the server.
const performFetch = (function() {
    const doFetch = typeof fetch === 'undefined' ? node_require('node-fetch') : fetch;
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

const postHeaders = {
    'content-type': 'application/json;charset=utf-8',
    'accept': 'application/json'
};

function append_url(server, path) {
    return server + (server.charAt(server.length - 1) != '/' ? '/' : '') + path;
}

function scheduleAccessTokenRefresh(user, localRealmPath, realmUrl, expirationDate) {
    const refreshBuffer = 10 * 1000;
    const timeout = expirationDate - Date.now() - refreshBuffer;
    setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), timeout);
}

function print_error() {
    (console.error || console.log).apply(console, arguments);
}

function validateRefresh(user, localRealmPath, response, json) {
    let session = user._sessionForOnDiskPath(localRealmPath);
    if (!session) {
        print_error(`Unhandled session token refresh error: could not look up session for user ${user.identity} at path ${localRealmPath}`);
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
    performFetch(url, {method: 'GET', timeout: 10000.0, headers: {Authorization: user.token}})
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

        const newUser = user.constructor.adminUser(token, server);
        const session = validateRefresh(newUser, localRealmPath, response, json);
        if (session) {
            parsedRealmUrl.set('pathname', json.path);
            session._refreshAccessToken(user.token, parsedRealmUrl.href, json.syncLabel);
        }
    })
    .catch((e) => {
        print_error(e);
        setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), 10 * 1000);
    });
}

function refreshAccessToken(user, localRealmPath, realmUrl) {
    if (!user.server) {
        throw new Error("Server for user must be specified");
    }

    let parsedRealmUrl = url_parse(realmUrl);
    if (user.isAdminToken) {
        return refreshAdminToken(user, localRealmPath, realmUrl);
    }

    const url = append_url(user.server, 'auth');
    const options = {
        method: 'POST',
        body: JSON.stringify({
            data: user.token,
            path: parsedRealmUrl.pathname,
            provider: 'realm',
            app_id: ''
        }),
        headers: postHeaders,
        // FIXME: This timeout appears to be necessary in order for some requests to be sent at all.
        // See https://github.com/realm/realm-js-private/issues/338 for details.
        timeout: 10000.0
    };
    performFetch(url, options)
        .then((response) => response.json().then((json) => { return { response, json }; }))
        .then((responseAndJson) => {
            const response = responseAndJson.response;
            const json = responseAndJson.json;
            // Look up a fresh instance of the user.
            // We do this because in React Native Remote Debugging
            // `Realm.clearTestState()` will have invalidated the user object
            let newUser = user.constructor._getExistingUser(user.server, user.identity);
            if (!newUser) {
                return;
            }

            const session = validateRefresh(newUser, localRealmPath, response, json);
            if (!session) {
                return;
            }

            const tokenData = json.access_token.token_data;

            parsedRealmUrl.set('pathname', tokenData.path);
            session._refreshAccessToken(json.access_token.token, parsedRealmUrl.href, tokenData.sync_label);

            const errorHandler = session.config.error;
            if (errorHandler && errorHandler._notifyOnAccessTokenRefreshed) {
                errorHandler(session, errorHandler._notifyOnAccessTokenRefreshed)
            }

            const tokenExpirationDate = new Date(tokenData.expires * 1000);
            scheduleAccessTokenRefresh(newUser, localRealmPath, realmUrl, tokenExpirationDate);
        })
        .catch((e) => {
            print_error(e);
            // in case something lower in the HTTP stack breaks, try again in 10 seconds
            setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), 10 * 1000);
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
function _authenticate(userConstructor, server, json) {
    json.app_id = '';
    const url = append_url(server, 'auth');
    const options = {
        method: 'POST',
        body: JSON.stringify(json),
        headers: postHeaders,
        open_timeout: 5000
    };

    return performFetch(url, options)
        .then((response) => {
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
                return response.json().then(function (body) {
                    // TODO: validate JSON
                    const token = body.refresh_token.token;
                    const identity = body.refresh_token.token_data.identity;
                    const isAdmin = body.refresh_token.token_data.is_admin;
                    return userConstructor.createUser(server, identity, token, false, isAdmin);
                });
            }
        });
}

function _updateAccount(userConstructor, server, json) {
    const url = append_url(server, 'auth/password/updateAccount');
    const options = {
        method: 'POST',
        body: JSON.stringify(json),
        headers: postHeaders,
        open_timeout: 5000
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
        checkTypes(arguments, ['string', 'string', 'object']);
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

        return _authenticate(this, server, credentials);
    },

    deserialize(serialized) {
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
        const url = url_parse(this.server);
        url.set('pathname', '/auth/revoke');
        const headers = {
            Authorization: this.token
        };
        const body = JSON.stringify({
            token: this.token
        });
        const options = {
            method: 'POST',
            headers,
            body: body,
            open_timeout: 5000
        };

        performFetch(url.href, options)
            .then(() => console.log('User is logged out'))
            .catch((e) => print_error(e));
    },
    serialize() {
        return {
            server: this.server,
            refreshToken: this.token,
            identity: this.identity,
            isAdmin: this.isAdmin,
        };
    },
    openManagementRealm() {
        let url = url_parse(this.server);
        if (url.protocol === 'http:') {
            url.set('protocol', 'realm:');
        } else if (url.protocol === 'https:') {
            url.set('protocol', 'realms:');
        } else {
            throw new Error(`Unexpected user auth url: ${this.server}`);
        }

        url.set('pathname', '/~/__management');

        return new this.constructor._realmConstructor({
            schema: require('./management-schema'),
            sync: {
                user: this,
                url: url.href
            }
        });
    },
    retrieveAccount(provider, provider_id) {
        checkTypes(arguments, ['string', 'string']);
        const url = url_parse(this.server);
        url.set('pathname', `/auth/users/${provider}/${provider_id}`);
        const headers = {
            Authorization: this.token
        };
        const options = {
            method: 'GET',
            headers,
            open_timeout: 5000
        };
        return performFetch(url.href, options)
            .then((response) => {
                if (response.status !== 200) {
                    return response.json()
                        .then(body => {
                            throw new AuthError(body);
                        });
                } else {
                    return response.json();
                }
            });
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

        // Create default config
        let url = new URL(this.server);
        let secure = (url.protocol === 'https:')?'s':'';
        let port = (url.port === undefined)?'9080':url.port;
        let realmUrl = `realm${secure}://${url.hostname}:${port}/default`;

        let defaultConfig = {
            sync: {
                user: this,
                url: realmUrl,
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
        return mergedConfig;
    },
};

class Credentials {
    constructor(identityProvider, token, userInfo) {
        this.identityProvider = identityProvider;
        this.token = token;
        this.userInfo = userInfo;
    }

    toJSON() {
        return {
            data: this.token,
            provider: this.identityProvider,
            user_info: this.userInfo || {},
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
