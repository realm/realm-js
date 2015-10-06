'use strict';

let rpc = require('./rpc');

let idKey = Symbol();
let realmKey = Symbol();
let prototype = {};

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
                defineIndexProperties(this.length);
            }

            return result;
        }
    });
});

Object.defineProperty(prototype, 'length', {
    get() {
        return rpc.getListSize(this[realmKey], this[idKey]);
    }
});

function create(realmId, info) {
    let list = Object.create(prototype);
    let size = info.size;

    list[realmKey] = realmId;
    list[idKey] = info.id;

    defineIndexProperties(size);
}

let maxSize = 0;
function defineIndexProperties(size) {
    if (size < maxSize) {
        return;
    }

    let props = {};
    for (let i = maxSize; i <= size; i++) {
        props[i] = {
            get: getterForIndex(i),
            set: setterForIndex(i),
        };
    }

    // TODO: Use ES6 Proxy once it's supported on Chrome!
    Object.defineProperties(prototype, props);

    maxSize = size + 1;
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
