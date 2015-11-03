/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const base64 = require('./base64');
const constants = require('./constants');

const DEVICE_HOST = 'localhost:8082';

const {keys, objectTypes} = constants;
const {id: idKey, realm: realmKey} = keys;
const typeConverters = {};

let XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
let sessionId;

// Check if XMLHttpRequest has been overridden, and get the native one if that's the case.
if (XMLHttpRequest.__proto__ != global.XMLHttpRequestEventTarget) {
    let fakeXMLHttpRequest = XMLHttpRequest;
    delete global.XMLHttpRequest;
    XMLHttpRequest = global.XMLHttpRequest;
    global.XMLHttpRequest = fakeXMLHttpRequest;
}

module.exports = {
    registerTypeConverter,

    createSession,
    createRealm,
    callMethod,
    getProperty,
    setProperty,
    beginTransaction,
    cancelTransaction,
    commitTransaction,

    clearTestState,
};

registerTypeConverter(objectTypes.DATA, (_, {value}) => base64.decode(value));
registerTypeConverter(objectTypes.DATE, (_, {value}) => new Date(value));
registerTypeConverter(objectTypes.DICT, deserializeDict);

function registerTypeConverter(type, handler) {
    typeConverters[type] = handler;
}

function createSession() {
    sessionId = sendRequest('create_session');
    return sessionId;
}

function createRealm(args) {
    if (args) {
        args = args.map((arg) => serialize(null, arg));
    }

    return sendRequest('create_realm', {arguments: args});
}

function callMethod(realmId, id, name, args) {
    if (args) {
        args = args.map((arg) => serialize(realmId, arg));
    }

    let result = sendRequest('call_method', {realmId, id, name, arguments: args});
    return deserialize(realmId, result);
}

function getProperty(realmId, id, name) {
    let result = sendRequest('get_property', {realmId, id, name});
    return deserialize(realmId, result);
}

function setProperty(realmId, id, name, value) {
    value = serialize(realmId, value);
    sendRequest('set_property', {realmId, id, name, value});
}

function beginTransaction(realmId) {
    sendRequest('begin_transaction', {realmId});
}

function cancelTransaction(realmId) {
    sendRequest('cancel_transaction', {realmId});
}

function commitTransaction(realmId) {
    sendRequest('commit_transaction', {realmId});
}

function clearTestState() {
    sendRequest('clear_test_state');
}

function serialize(realmId, value) {
    if (typeof value == 'undefined') {
        return {type: objectTypes.UNDEFINED};
    }
    if (typeof value == 'function') {
        return {type: objectTypes.FUNCTION};
    }
    if (!value || typeof value != 'object') {
        return {value: value};
    }

    let id = value[idKey];
    if (id) {
        if (value[realmKey] != realmId) {
            throw new Error('Unable to serialize value from another Realm');
        }

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

function deserialize(realmId, info) {
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
        object[keys[i]] = values[i];
    }

    return object;
}

function sendRequest(command, data) {
    data = Object.assign({}, data, sessionId ? {sessionId} : null);

    let body = JSON.stringify(data);
    let request = new XMLHttpRequest();
    let url = 'http://' + DEVICE_HOST + '/' + command;

    request.open('POST', url, false);
    request.send(body);

    if (request.status != 200) {
        throw new Error(request.responseText);
    }

    let response = JSON.parse(request.responseText);

    if (!response || response.error) {
        let error = response && response.error;

        // Remove the type prefix from the error message (e.g. "Error: ").
        if (error) {
            error = error.replace(/^[a-z]+: /i, '');
        }

        throw new Error(error || `Invalid response for "${command}"`);
    }

    return response.result;
}
