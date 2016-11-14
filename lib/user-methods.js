'use strict';

const AuthError = require('./errors').AuthError;

function node_require(module) {
    return require(module);
}

var post;
if (typeof fetch !== 'undefined') {
    post = function(options, callback) {
        options.method = 'POST';
        // eslint-disable-next-line no-undef
        fetch(options.url, options)
            .then((response) => {
                if (response.status != 200) {
                    callback(undefined, {statusCode: response.status});
                }
                else {
                    return response.text();
                }
            })
            .then((body) => {
                callback(undefined, {statusCode: 200}, JSON.parse(body));
            })
            .catch((error) => {
                callback(error);
            });
    }
}
else {
    post = function(options, callback) {
        node_require('needle').post(options.url, options.body, options, callback);
    }
}

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

module.exports = function(realmConstructor) {
    function _authenticate(server, json, callback) {
        json.app_id = '';
        var options = {
            url: auth_url(server),
            body: JSON.stringify(json),
            headers: postHeaders,
            open_timeout: 5000
        };
        post(options, function(error, response, body) {
            if (error) {
                callback(error);
            }
            else if (response.statusCode != 200) {
                callback(new AuthError(JSON.parse(body)));
            }
            else {
                // TODO: validate JSON
                const token = body.refresh_token.token;
                const identity = body.refresh_token.token_data.identity;
                callback(undefined, realmConstructor.Sync.User.createUser(server, identity, token, false));
            }
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

    methods['_authenticateRealm'] = function(fileUrl, realmUrl, callback) {
        var options = {
            url: auth_url(this.server),
            body: JSON.stringify({
                data: this.token,
                path: url_parse(realmUrl).pathname,
                provider: 'realm',
                app_id: ''
            }),
            headers: postHeaders
        };
        post(options, function(error, response, body) {
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

    for (var name in methods) {
        methods[name] = {value: methods[name], configurable: true, writable: true}
    }

    return methods;
}