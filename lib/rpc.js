'use strict';

const DEVICE_HOST = 'localhost:8082';

const typeConverters = {};

exports.registerTypeConverter = registerTypeConverter;

exports.createRealm = createRealm;
exports.createObject = createObject;

exports.getObjectProperty = getObjectProperty;
exports.setObjectProperty = setObjectProperty;

exports.getListItem = getListItem;
exports.setListItem = setListItem;
exports.getListSize = getListSize;
exports.callListMethod = callListMethod;

exports.beginTransaction = beginTransaction;
exports.cancelTransaction = cancelTransaction;
exports.commitTransaction = commitTransaction;

function registerTypeConverter(type, handler) {
    typeConverters[type] = handler;
}

function createRealm(config) {
    return sendRequest('create_realm', config);
}

function createObject(realmId, type, values) {
    return sendRequest('create_object', {realmId, type, values});
}

function getObjectProperty(realmId, objectId, name) {
    let result = sendRequest('get_property', {realmId, objectId, name});
    return convert(result);
}

function setObjectProperty(realmId, objectId, name, value) {
    sendRequest('set_property', {realmId, objectId, name, value});
}

function getListItem(realmId, listId, index) {
    let result = sendRequest('get_list_item', {realmId, listId, index});
    return convert(result);
}

function setListItem(realmId, listId, index, value) {
    sendRequest('set_list_item', {realmId, listId, index, value});
}

function getListSize(realmId, listId) {
    return sendRequest('get_list_size', {realmId, listId});
}

function callListMethod(realmId, listId, name, args) {
    let result = sendRequest('call_list_method', {realmId, listId, name, arguments: args});
    return convert(result);
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

function convert(realmId, info) {
    let handler = typeConverters[info.type];
    return handler ? handler(realmId, info) : info.value;
}

function sendRequest(command, data) {
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
        throw new Error((response && response.error) || 'Invalid response for "' + command + '"');
    }

    return response.result;
}
