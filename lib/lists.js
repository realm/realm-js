'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = Symbol();
let realmKey = Symbol();
let prototype = util.createListPrototype(getterForLength, getterForIndex, setterForIndex);

exports.create = create;

[
    'pop',
    'shift',
    'push',
    'unshift',
    'splice',
].forEach(function(name, i) {
    let growthMethod = (i >= 2);

    Object.defineProperty(prototype, name, {
        value: function() {
            let listId = this[idKey];
            let realmId = this[realmKey];

            if (!listId || !realmId) {
                throw new TypeError(name + ' method was not called on a List!');
            }

            let result = rpc.callListMethod(realmId, listId, name, Array.from(arguments));

            // Since this method might have grown the list, ensure index properties are defined.
            if (growthMethod) {
                prototype[util.growListPrototypeKey](this.length);
            }

            return result;
        }
    });
});

function create(realmId, info) {
    let list = Object.create(prototype);
    let size = info.size;

    list[realmKey] = realmId;
    list[idKey] = info.id;

    list[util.growListPrototypeKey](size);

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
