'use strict';

let constants = require('./constants');

let DEVICE_HOST = 'localhost:8082';

let {keys, objectTypes, propTypes} = constants;
let typeConverters = {};
let XMLHttpRequest = window.XMLHttpRequest;

// Check if XMLHttpRequest has been overridden, and get the native one if that's the case.
if (XMLHttpRequest.__proto__ != window.XMLHttpRequestEventTarget) {
    let override = XMLHttpRequest;
    delete window.XMLHttpRequest;
    XMLHttpRequest = window.XMLHttpRequest;
    window.XMLHttpRequest = override;
}

module.exports = {
    registerTypeConverter,

    getDefaultPath,
    setDefaultPath,
    createRealm,
    callMethod,
    getProperty,
    setProperty,
    beginTransaction,
    cancelTransaction,
    commitTransaction,

    clearTestState,
};

function registerTypeConverter(type, handler) {
    typeConverters[type] = handler;
}

function getDefaultPath() {
    return sendRequest('get_default_path');
}

function setDefaultPath(path) {
    sendRequest('set_default_path', {path});
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
    if (typeof value == 'function') {
        return {type: objectTypes.FUNCTION};
    }

    if (!value || typeof value != 'object') {
        return {value: value};
    }

    let id = value[keys.id];
    if (id) {
        if (value[keys.realm] != realmId) {
            throw new Error('Unable to serialize value from another Realm');
        }

        return {id};
    }

    if (value instanceof Date) {
        return {type: propTypes.DATE, value: value.getTime()};
    }

    if (Array.isArray(value)) {
        let array = value.map((item) => serialize(realmId, item));
        return {value: array};
    }

    let object = {};
    for (let key in value) {
        object[key] = serialize(realmId, value[key]);
    }
    return {value: object};
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

function sendRequest(command, data) {
    let body = JSON.stringify(data || {});
    let request = new XMLHttpRequest();
    let url = 'http://' + DEVICE_HOST + '/' + command;

    request.open('POST', url, false);
    request.send(body);

    if (request.status != 200) {
        throw new Error(request.responseText);
    }

    let response = JSON.parse(request.responseText);

    if (!response || response.error) {
        throw new Error((response && response.error) || 'Invalid response for "' + command + '"');
    }

    return response.result;
}
