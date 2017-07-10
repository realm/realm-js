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

function node_require(module) {
    return require(module);
}

function checkTypes(args, types) {
    args = Array.prototype.slice.call(args);
    for (var i = 0; i < types.length; ++i) {
        if (typeof args[i] !== types[i]) {
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

function auth_url(server) {
    if (server.charAt(server.length - 1) != '/') {
        return server + '/auth';
    }
    return server + 'auth';
}

function scheduleAccessTokenRefresh(user, localRealmPath, realmUrl, expirationDate) {
    const refreshBuffer = 10 * 1000;
    const timeout = expirationDate - Date.now() - refreshBuffer;
    setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), timeout);
}

function print_error() {
    (console.error || console.log).apply(console, arguments);
}

function refreshAccessToken(user, localRealmPath, realmUrl) {
    let parsedRealmUrl = url_parse(realmUrl);
    const url = auth_url(user.server);
    const options = {
        method: 'POST',
        body: JSON.stringify({
            data: user.token,
            path: parsedRealmUrl.pathname,
            provider: 'realm',
            app_id: ''
        }),
        headers: postHeaders
    };
    performFetch(url, options)
        // in case something lower in the HTTP stack breaks, try again in 10 seconds
        .catch(() => setTimeout(() => refreshAccessToken(user, localRealmPath, realmUrl), 10 * 1000))
        .then((response) => response.json().then((json) => { return { response, json }; }))
        .then((responseAndJson) => {
            const response = responseAndJson.response;
            const json = responseAndJson.json;
            // Look up a fresh instance of the user.
            // We do this because in React Native Remote Debugging
            // `Realm.clearTestState()` will have invalidated the user object
            let newUser = user.constructor.all[user.identity];
            if (newUser) {
                let session = newUser._sessionForOnDiskPath(localRealmPath);
                if (session) {
                    const errorHandler = session.config.error;
                    if (response.status != 200) {
                        let error = new AuthError(json);
                        if (errorHandler) {
                            errorHandler(session, error);
                        } else {
                            print_error('Unhandled session token refresh error', error);
                        }
                    } else if (session.state !== 'invalid') {
                        parsedRealmUrl.set('pathname', json.access_token.token_data.path);
                        session._refreshAccessToken(json.access_token.token, parsedRealmUrl.href);

                        if (errorHandler && errorHandler._notifyOnAccessTokenRefreshed) {
                            errorHandler(session, errorHandler._notifyOnAccessTokenRefreshed)
                        }

                        const tokenExpirationDate = new Date(json.access_token.token_data.expires * 1000);
                        scheduleAccessTokenRefresh(newUser, localRealmPath, realmUrl, tokenExpirationDate);
                    }
                } else {
                    print_error(`Unhandled session token refresh error: could not look up session at path ${localRealmPath}`);
                }
            }
        });
}

function _authenticate(userConstructor, server, json, callback) {
    json.app_id = '';
    const url = auth_url(server);
    const options = {
        method: 'POST',
        body: JSON.stringify(json),
        headers: postHeaders,
        open_timeout: 5000
    };
    performFetch(url, options)
        .then((response) => {
            if (response.status !== 200) {
                return response.json().then((body) => callback(new AuthError(body)));
            } else {
                return response.json().then(function (body) {
                    // TODO: validate JSON
                    const token = body.refresh_token.token;
                    const identity = body.refresh_token.token_data.identity;
                    const isAdmin = body.refresh_token.token_data.is_admin;
                    callback(undefined, userConstructor.createUser(server, identity, token, false, isAdmin));
                })
            }
        })
        .catch(callback);
}

module.exports = {
    static: {
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
            checkTypes(arguments, ['string']);
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            return this.createUser(server || '', uuid, token, true);
        },

        register(server, username, password, callback) {
            checkTypes(arguments, ['string', 'string', 'string', 'function']);
            _authenticate(this, server, {
                provider: 'password',
                user_info: { password: password, register: true },
                data: username
            }, callback);
        },

        login(server, username, password, callback) {
            checkTypes(arguments, ['string', 'string', 'string', 'function']);
            _authenticate(this, server, {
                provider: 'password',
                user_info: { password: password },
                data: username
            }, callback);
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

            let reqOptions = {
                provider: options.provider,
                data: options.providerToken,
            };

            if (options.userInfo) {
                reqOptions.user_info = options.userInfo;
            }

            _authenticate(this, server, reqOptions, callback);
        },

        _refreshAccessToken: refreshAccessToken
    },
    instance: {
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
            url.set('pathname', `/api/providers/${provider}/accounts/${provider_id}`);
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
    },
};