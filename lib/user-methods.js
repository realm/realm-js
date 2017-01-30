'use strict';

const AuthError = require('./errors').AuthError;

function node_require(module) {
    return require(module);
}

const performFetch = typeof fetch === 'undefined' ? node_require('node-fetch') : fetch;

const url_parse = require("url-parse");

const postHeaders =  {
    'content-type': 'application/json;charset=utf-8',
    'accept': 'application/json'
};

function auth_url(server) {
    if (server.charAt(server.length-1) != '/') {
        return server + '/auth';
    }
    return server + 'auth';
}

function authenticateRealm(user, fileUrl, realmUrl, callback) {
    var url = auth_url(user.server);
    var options = {
        method: 'POST',
        body: JSON.stringify({
            data: user.token,
            path: url_parse(realmUrl).pathname,
            provider: 'realm',
            app_id: ''
        }),
        headers: postHeaders
    };
    performFetch(url, options, function(error, response, body) {
        if (error) {
            callback(error);
        }
        else if (response.statusCode != 200) {
            callback(new AuthError('Bad response: ' + response.statusCode));
        }
        else {
            // TODO: validate JSON

            callback(undefined, {
                token: body.access_token.token,
                file_url: url_parse(fileUrl).pathname,
                resolved_realm_url: 'realm://' + url_parse(realmUrl).host + body.access_token.token_data.path
            });
        }
    });
}

module.exports = function(realmConstructor) {
    function _authenticate(server, json, callback) {
        json.app_id = '';
        var url = auth_url(server);
        var options = {
            method: 'POST',
            body: JSON.stringify(json),
            headers: postHeaders,
            open_timeout: 5000
        };
        performFetch(url, options)
            .then(function(response) { 
                if (response.status !== 200) {
                    response.json().then(function (body) { 
                        callback(new AuthError(body)); 
                    });
                } else {
                    response.json().then(function (body) {
                        // TODO: validate JSON
                        const token = body.refresh_token.token;
                        const identity = body.refresh_token.token_data.identity;
                        callback(undefined, realmConstructor.Sync.User.createUser(server, identity, token, false));
                    }) 
                }
            })
            .catch(function (err) {
                callback(err);
            });
    }

    var methods = {};
    methods['adminUser'] = function(token) {
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        var user = realmConstructor.Sync.User.createUser('', uuid, token, true);
        return user;
    }

    methods['register'] = function(server, username, password, callback) {
        _authenticate(server, { 
            provider: 'password', 
            user_info: { password: password, register: true }, 
            data: username
        }, callback);
    }

    methods['login'] = function(server, username, password, callback) {
        _authenticate(server, { 
            provider: 'password', 
            user_info: { password: password }, 
            data: username
        }, callback);
    }

    methods['registerWithProvider'] = function(server, provider, providerToken, callback) {
        _authenticate(server, { 
            provider: provider, 
            data: providerToken
        }, callback);
    }

    methods['_authenticateRealm'] = authenticateRealm;

    for (var name in methods) {
        methods[name] = {value: methods[name], configurable: true, writable: true}
    }

    methods['current'] = {
        get: function () {
            const keys = Object.keys(realmConstructor.Sync.User.all);
            if (keys.length === 0) {
                return undefined;
            } else if (keys.length > 1) {
                throw new Error("Multiple users are logged in");
            }

            return realmConstructor.Sync.User.all[keys[0]];
        }
    }

    return methods;
}

module.exports._authenticateRealm = authenticateRealm;