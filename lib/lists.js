'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = util.idKey;
let realmKey = util.realmKey;
let resizeListKey = util.resizeListKey;
let prototype = {};

exports.create = create;

[
    'pop',
    'shift',
    'push',
    'unshift',
    'splice',
].forEach(function(name) {
    Object.defineProperty(prototype, name, {
        value: function() {
            let listId = this[idKey];
            let realmId = this[realmKey];

            if (!listId || !realmId) {
                throw new TypeError(name + ' method was not called on a List!');
            }

            let result = rpc.callListMethod(realmId, listId, name, Array.from(arguments));
            this[resizeListKey]();

            return result;
        }
    });
});

function create(realmId, info) {
    let list = util.createList(prototype, getterForLength, getterForIndex, setterForIndex);
    let size = info.size;

    list[realmKey] = realmId;
    list[idKey] = info.id;

    list[resizeListKey](size);

    return list;
}

function getterForLength() {
    return rpc.getListSize(this[realmKey], this[idKey]);
}

function getterForIndex(index) {
    return function() {
        let realmId = this[realmKey];
        return rpc.getListItem(realmId, this[idKey], index);
    };
}

function setterForIndex(index) {
    return function(value) {
        rpc.setListItem(this[realmKey], this[idKey], index, value);
    };
}
