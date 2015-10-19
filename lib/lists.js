'use strict';

let keys = require('./keys');
let rpc = require('./rpc');
let types = require('./types');
let util = require('./util');

module.exports = {
    create,
};

class List {}

util.createMethods(List.prototype, types.LIST, [
    'pop',
    'shift',
    'push',
    'unshift',
    'splice',
], true);

function create(realmId, info) {
    return util.createList(List.prototype, realmId, info, getterForLength, getterForIndex, setterForIndex);
}

function getterForLength() {
    return rpc.getListSize(this[keys.realm], this[keys.id]);
}

function getterForIndex(index) {
    return function() {
        return rpc.getListItem(this[keys.realm], this[keys.id], index);
    };
}

function setterForIndex(index) {
    return function(value) {
        rpc.setListItem(this[keys.realm], this[keys.id], index, value);
    };
}
