'use strict';

const constants = require('./constants');
const rpc = require('./rpc');

const {keys} = constants;
const mutationListeners = {};

module.exports = {
    addMutationListener,
    fireMutationListeners,
    createList,
    createMethods,
    createMethod,
    getterForProperty,
    setterForProperty,
};

function addMutationListener(realmId, callback) {
    let listeners = mutationListeners[realmId] || (mutationListeners[realmId] = new Set());
    listeners.add(callback);
}

function fireMutationListeners(realmId) {
    let listeners = mutationListeners[realmId];
    if (listeners) {
        for (let callback of listeners) {
            callback();
        }
    }
}

function createList(prototype, realmId, info, mutable) {
    let list = Object.create(prototype);
    let size = 0;

    Object.defineProperties(list, {
        'length': {
            get: getterForProperty('length'),
        },
        '-1': {
            value: undefined,
        },
    });

    let resize = function(length) {
        if (length == null) {
            length = list.length;
        }
        if (length == size) {
            return;
        }

        let props = {};

        if (length > size) {
            for (let i = size; i < length; i++) {
                props[i] = {
                    get: getterForProperty(i),
                    set: mutable ? setterForProperty(i) : undefined,
                    enumerable: true,
                    configurable: true,
                };
            }
        }
        else if (length < size) {
            for (let i = size; i >= length; i--) {
                delete list[i];
            }
        }

        // Helpfully throw an exception on attempts to set to list[list.length].
        props[length] = {
            value: undefined,
            configurable: true,
        };

        Object.defineProperties(list, props);

        size = length;
    };

    list[keys.realm] = realmId;
    list[keys.id] = info.id;
    list[keys.type] = info.type;

    resize(info.size);
    addMutationListener(realmId, resize);

    return list;
}

function createMethods(prototype, type, methodNames, mutates) {
    let props = {};

    for (let name of methodNames) {
        props[name] = {
            value: createMethod(type, name, mutates),
        };
    }

    Object.defineProperties(prototype, props);
}

function createMethod(type, name, mutates) {
    return function() {
        let realmId = this[keys.realm];
        let id = this[keys.id];

        if (!realmId || !id) {
            throw new TypeError(name + ' method was not called a Realm object!');
        }
        if (this[keys.type] !== type) {
            throw new TypeError(name + ' method was called on an object of the wrong type!');
        }

        let result = rpc.callMethod(realmId, id, name, Array.from(arguments));

        if (mutates) {
            fireMutationListeners(realmId);
        }

        return result;
    };
}

function getterForProperty(name) {
    return function() {
        return rpc.getProperty(this[keys.realm], this[keys.id], name);
    };
}

function setterForProperty(name) {
    return function(value) {
        let realmId = this[keys.realm];

        rpc.setProperty(realmId, this[keys.id], name, value);

        // If this isn't a primitive value, then it might create a new object in the Realm.
        if (value && typeof value == 'object') {
            fireMutationListeners(realmId);
        }
    };
}
