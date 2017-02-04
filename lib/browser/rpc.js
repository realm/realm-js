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

import * as base64 from './base64';
import { keys, objectTypes } from './constants';

const {id: idKey, realm: _realmKey} = keys;
let registeredCallbacks = [];
const typeConverters = {};

// Callbacks that are registered initially (currently only refreshAccessToken) will
// carry this symbol so they are not wiped in clearTestState.
const persistentCallback = Symbol("persistentCallback");

let XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
let sessionHost;
let sessionId;

// Check if XMLHttpRequest has been overridden, and get the native one if that's the case.
if (XMLHttpRequest.__proto__ != global.XMLHttpRequestEventTarget) {
    let fakeXMLHttpRequest = XMLHttpRequest;
    delete global.XMLHttpRequest;
    XMLHttpRequest = global.XMLHttpRequest;
    global.XMLHttpRequest = fakeXMLHttpRequest;
}

registerTypeConverter(objectTypes.DATA, (_, {value}) => base64.decode(value));
registerTypeConverter(objectTypes.DATE, (_, {value}) => new Date(value));
registerTypeConverter(objectTypes.DICT, deserializeDict);
registerTypeConverter(objectTypes.FUNCTION, deserializeFunction);

export function registerTypeConverter(type, handler) {
    typeConverters[type] = handler;
}

export function createSession(refreshAccessToken, host) {
    refreshAccessToken[persistentCallback] = true;
    sessionId = sendRequest('create_session', { refreshAccessToken: serialize(undefined, refreshAccessToken) }, host);
    sessionHost = host;

    return sessionId;
}

export function createRealm(args) {
    if (args) {
        args = args.map((arg) => serialize(null, arg));
    }

    return sendRequest('create_realm', {arguments: args});
}

export function createUser(args) {
    args = args.map((arg) => serialize(null, arg));
    const result = sendRequest('create_user', {arguments: args});
    return deserialize(undefined, result);
}

export function callMethod(realmId, id, name, args) {
    if (args) {
        args = args.map((arg) => serialize(realmId, arg));
    }

    let result = sendRequest('call_method', {realmId, id, name, arguments: args});
    return deserialize(realmId, result);
}

export function getProperty(realmId, id, name) {
    let result = sendRequest('get_property', {realmId, id, name});
    return deserialize(realmId, result);
}

export function setProperty(realmId, id, name, value) {
    value = serialize(realmId, value);
    sendRequest('set_property', {realmId, id, name, value});
}

export function getAllUsers() {
    let result = sendRequest('get_all_users');
    return deserialize(undefined, result);
}

export function clearTestState() {
    sendRequest('clear_test_state');

    // Clear all registered callbacks that are specific to this session.
    registeredCallbacks = registeredCallbacks.filter(cb => Reflect.has(cb, persistentCallback));
}

function registerCallback(callback) {
    let key = registeredCallbacks.indexOf(callback);
    return key >= 0 ? key : (registeredCallbacks.push(callback) - 1);
}

function serialize(realmId, value) {
    if (typeof value == 'undefined') {
        return {type: objectTypes.UNDEFINED};
    }
    if (typeof value == 'function') {
        return {type: objectTypes.FUNCTION, value: registerCallback(value)};
    }
    if (!value || typeof value != 'object') {
        return {value: value};
    }

    let id = value[idKey];
    if (id) {
        return {id};
    }

    if (value instanceof Date) {
        return {type: objectTypes.DATE, value: value.getTime()};
    }

    if (Array.isArray(value)) {
        let array = value.map((item) => serialize(realmId, item));
        return {value: array};
    }

    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        return {type: objectTypes.DATA, value: base64.encode(value)};
    }

    let keys = Object.keys(value);
    let values = keys.map((key) => serialize(realmId, value[key]));
    return {type: objectTypes.DICT, keys, values};
}

export function deserialize(realmId, info) {
    let type = info.type;
    let handler = type && typeConverters[type];
    if (handler) {
        return handler(realmId, info);
    }

    let value = info.value;
    if (value && Array.isArray(value)) {
        return value.map((item) => deserialize(realmId, item));
    }

    return value;
}

function deserializeDict(realmId, info) {
    let {keys, values} = info;
    let object = {};

    for (let i = 0, len = keys.length; i < len; i++) {
        object[keys[i]] = deserialize(realmId, values[i]);
    }

    return object;
}

function deserializeFunction(realmId, info) {
    return registeredCallbacks[info.value];
}

function makeRequest(url, data) {
    let statusCode;
    let responseText;

    // The global __debug__ object is provided by Visual Studio Code.
    if (global.__debug__) {
        let request = global.__debug__.require('sync-request');
        let response = request('POST', url, {json: data});

        statusCode = response.statusCode;
        responseText = response.body.toString('utf-8');
    } else {
        let body = JSON.stringify(data);
        let request = new XMLHttpRequest();

        request.open('POST', url, false);
        request.send(body);

        statusCode = request.status;
        responseText = request.responseText;
    }

    if (statusCode != 200) {
        throw new Error(responseText);
    }

    return JSON.parse(responseText);
}

function sendRequest(command, data, host = sessionHost) {
    if (!host) {
        throw new Error('Must first create RPC session with a valid host');
    }

    data = Object.assign({}, data, sessionId ? {sessionId} : null);

    let url = 'http://' + host + '/' + command;
    let response = makeRequest(url, data);

    if (!response || response.error) {
        let error = response && response.error;

        // Remove the type prefix from the error message (e.g. "Error: ").
        if (error) {
            error = error.replace(/^[a-z]+: /i, '');
        }

        throw new Error(error || `Invalid response for "${command}"`);
    }

    let callback = response.callback;
    if (callback != null) {
        let result;
        let error;
        try {
            let realmId = data.realmId;
            let thisObject = deserialize(realmId, response.this);
            let args = deserialize(realmId, response.arguments);
            result = registeredCallbacks[callback].apply(thisObject, args);
            result = serialize(realmId, result);
        } catch (e) {
            error = e.message || ('' + e);
        }
        return sendRequest('callback_result', {callback, result, error});
    }

    return response.result;
}
