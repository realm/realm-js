'use strict';

function node_require(module) {
    return require(module);
}

var post;
if (typeof fetch != 'undefined') {
    post = function(options, callback) {
        options.method = 'POST';
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
                callback(undefined, {statusCode: 200}, body)
            })
            .catch((error) => {
                callback(error);
            });
    }
}
else {
    post = node_require('request').post;
}

const url = require("url");

const postHeaders =  {
    'content-type': 'application/json;charset=utf-8',
    'accept': 'application/json'
};

function _authenticate(server, json, callback) {
    json.app_id = '';
    var options = {
        url: server + 'auth',
        body: JSON.stringify(json),
        headers: postHeaders
    };
    post(options, function(error, response, body) {
        if (error) {
            console.log(error);
            callback(error);
        }
        else if (response.statusCode != 200) {
            console.log('Bad response: ' + response.statusCode);
            callback(new Error('Bad response: ' + response.statusCode));
        }
        else {
            var rjson = JSON.parse(body);
            // TODO: validate JSON

            const token = rjson.refresh_token.token;
            const identity = rjson.refresh_token.token_data.identity;
            callback(undefined, new User(server, identity, token));
        }
    });
}

function User(server, identity, token) {
    this.server = server;
    this.identity = identity;
    this.token = token;
    this.isAdmin = false;

    User.activeUsers[identity] = this;
}

User.adminUser = function(server, token) {
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
    var user = new User(server, uuid, token);
    user.isAdmin = true;
    return user;
}

User.activeUsers = {};

User.login = function(server, username, password, callback) {
    _authenticate(server, { 
        provider: 'password', 
        user_info: { password: password }, 
        data: username
    }, callback);
}

User.loginWithProvider = function(server, provider, providerToken, callback) {
    _authenticate(server, { 
        provider: provider, 
        data: providerToken
    }, callback);
}

User.create = function(server, username, password, callback) {
    _authenticate(server, { 
        provider: 'password', 
        user_info: { password: password, register: true }, 
        data: username
    }, callback);
}

User.authenticateRealm = function(fileUrl, realmUrl, callback) {
    var options = {
        url: this.server + 'auth',
        body: JSON.stringify({
            data: this.token,
            path: url.parse(realmUrl).path,
            provider: 'realm',
            app_id: ''
        }),
        headers: postHeaders
    };
    post(options, function(error, response, body) {
        if (error) {
            console.log(error);
            callback(error);
        }
        else if (response.statusCode != 200) {
            console.log('Bad response: ' + response.statusCode + body);
            callback(new Error('Bad response: ' + response.statusCode));
        }
        else {
            var json = JSON.parse(body);
            // TODO: validate JSON

            callback(undefined, {
                token: json.access_token.token,
                file_url: url.parse(fileUrl).path,
                resolved_realm_url: 'realm://' + url.parse(realmUrl).host + json.access_token.token_data.path
            });
        }
    });
} 

exports['User'] = User;
