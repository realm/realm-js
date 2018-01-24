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

const require_method = require;

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

/* global fetch */
const performFetch = typeof fetch === 'undefined' ? node_require('node-fetch') : fetch;

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
        print_error(`Unhandled session token refresh error: could not look up session at path ${localRealmPath}`);
        return;
    }

    const errorHandler = session.config.error;
    if (response.status != 200) {
        let error = new AuthError(json);
        if (errorHandler) {
            errorHandler(session, error);
        } else {
            print_error('Unhandled session token refresh error', error);
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
function _authenticate(userConstructor, server, json, callback) {
    json.app_id = '';
    const url = append_url(server, 'auth');
    const options = {
        method: 'POST',
        body: JSON.stringify(json),
        headers: postHeaders,
        open_timeout: 5000
    };

    const promise = performFetch(url, options)
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

    if (callback) {
        promise.then(user => {
            callback(null, user);
        })
        .catch(err => {
             callback(err);
        });
    } else {
        return promise;
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

        adminUser(token, server) {
            checkTypes(arguments, ['string', 'string']);
            return this._adminUser(server, token);
        },

        register(server, username, password, callback) {
            checkTypes(arguments, ['string', 'string', 'string', 'function']);
            const json = {
                provider: 'password',
                user_info: { password: password, register: true },
                data: username
            };

            if (callback) {
                const message = "register(..., callback) is now deprecated in favor of register(): Promise<User>. This function argument will be removed in future versions.";
                (console.warn || console.log).call(console, message);
            }

            return _authenticate(this, server, json, callback);
        },

        login(server, username, password, callback) {
            checkTypes(arguments, ['string', 'string', 'string', 'function']);
            const json = {
                provider: 'password',
                user_info: { password: password, register: false },
                data: username
            };

            if (callback) {
                const message = "login(..., callback) is now deprecated in favor of login(): Promise<User>. This function argument will be removed in future versions.";
                (console.warn || console.log).call(console, message);
            }

            return _authenticate(this, server, json, callback);
        },

        registerWithProvider(server, options, callback) {

            // Compatibility with previous signature:
            // registerWithProvider(server, provider, providerToken, callback)
            if (arguments.length === 4) {
                checkTypes(arguments, ['string', 'string', 'string', 'function']);
                options = {
                    provider: arguments[1],
                    providerToken: arguments[2]
                };
                callback = arguments[3];
            } else {
                checkTypes(arguments, ['string', 'object', 'function']);
            }

            let json = {
                provider: options.provider,
                data: options.providerToken,
            };

            if (options.userInfo) {
                json.user_info = options.userInfo;
            }

            if (callback) {
                const message = "registerWithProvider(..., callback) is now deprecated in favor of registerWithProvider(): Promise<User>. This function argument will be removed in future versions.";
                (console.warn || console.log).call(console, message);
            }

            return _authenticate(this, server, json, callback);
        },

        authenticate(server, provider, options) {
            checkTypes(arguments, ['string', 'string', 'object'])

            var json = {}
            switch (provider.toLowerCase()) {
            case 'jwt':
                json.provider = 'jwt'
                json.token = options.token;
                break
            case 'password':
                json.provider = 'password'
                json.user_info = { password: options.password }
                json.data = options.username
                break
            default:
                Object.assign(json, options)
                json.provider = provider
            }

            return _authenticate(this, server, json)
        },

        _refreshAccessToken: refreshAccessToken,
};


const instanceMethods = {
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
    };

// Append the permission apis
Object.assign(instanceMethods, permissionApis);

module.exports = {
    static: staticMethods,
    instance: instanceMethods
};
