'use strict';

let util = require('./util');

let DEVICE_HOST = 'localhost:8082';

let idKey = util.idKey;
let realmKey = util.realmKey;
let typeConverters = {};
let XMLHttpRequest = window.XMLHttpRequest;

// Check if XMLHttpRequest has been overridden, and get the native one if that's the case.
if (XMLHttpRequest.__proto__ != window.XMLHttpRequestEventTarget) {
    let override = XMLHttpRequest;
    delete window.XMLHttpRequest;
    XMLHttpRequest = window.XMLHttpRequest;
    window.XMLHttpRequest = override;
}

exports.registerTypeConverter = registerTypeConverter;

exports.createRealm = createRealm;
exports.callRealmMethod = callRealmMethod;

exports.getObjectProperty = getObjectProperty;
exports.setObjectProperty = setObjectProperty;

exports.getListItem = getListItem;
exports.setListItem = setListItem;
exports.getListSize = getListSize;
exports.callListMethod = callListMethod;

exports.getResultsItem = getResultsItem;
exports.getResultsSize = getResultsSize;

exports.beginTransaction = beginTransaction;
exports.cancelTransaction = cancelTransaction;
exports.commitTransaction = commitTransaction;

exports.clearTestState = clearTestState;

function registerTypeConverter(type, handler) {
    typeConverters[type] = handler;
}

function createRealm(args) {
    if (args) {
        args = args.map((arg) => serialize(null, arg));
    }

    return sendRequest('create_realm', {arguments: args});
}

function callRealmMethod(realmId, name, args) {
    if (args) {
        args = args.map((arg) => serialize(realmId, arg));
    }

    let result = sendRequest('call_realm_method', {realmId, name, arguments: args});
    return deserialize(realmId, result);
}

function getObjectProperty(realmId, objectId, name) {
    let result = sendRequest('get_property', {realmId, objectId, name});
    return deserialize(realmId, result);
}

function setObjectProperty(realmId, objectId, name, value) {
    value = serialize(realmId, value);
    sendRequest('set_property', {realmId, objectId, name, value});
}

function getListItem(realmId, listId, index) {
    let result = sendRequest('get_list_item', {realmId, listId, index});
    return deserialize(realmId, result);
}

function setListItem(realmId, listId, index, value) {
    sendRequest('set_list_item', {realmId, listId, index, value: serialize(realmId, value)});
}

function getListSize(realmId, listId) {
    return sendRequest('get_list_size', {realmId, listId});
}

function callListMethod(realmId, listId, name, args) {
    if (args) {
        args = args.map((arg) => serialize(realmId, arg));
    }

    let result = sendRequest('call_list_method', {realmId, listId, name, arguments: args});
    return deserialize(realmId, result);
}

function getResultsItem(realmId, resultsId, index) {
    let result = sendRequest('get_results_item', {realmId, resultsId, index});
    return deserialize(realmId, result);
}

function getResultsSize(realmId, resultsId) {
    return sendRequest('get_results_size', {realmId, resultsId});
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
