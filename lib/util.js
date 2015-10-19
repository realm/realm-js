'use strict';

let keys = require('./keys');
let rpc = require('./rpc');

module.exports = {
    createList,
    createMethods,
};

function createList(prototype, realmId, info, getterForLength, getterForIndex, setterForIndex) {
    let list = Object.create(prototype);
    let size = 0;

    Object.defineProperty(list, 'length', {get: getterForLength});

    list[keys.resize] = function(length) {
        if (length == null) {
            length = this.length;
        }
        if (length == size) {
            return;
        }

        if (length > size) {
            let props = {};

            for (let i = size; i < length; i++) {
                props[i] = {
                    get: getterForIndex(i),
                    set: setterForIndex && setterForIndex(i),
                    enumerable: true,
                    configurable: true,
                };
            }

            Object.defineProperties(this, props);
        }
        else if (length < size) {
            for (let i = size - 1; i >= length; i--) {
                delete this[i];
            }
        }

        size = length;
    };

    list[keys.realm] = realmId;
    list[keys.id] = info.id;
    list[keys.type] = info.type;
    list[keys.resize](info.size);

    return list;
}

function createMethods(prototype, type, methodNames, resize) {
    let props = {};

    for (let name of methodNames) {
        props[name] = {
            value: function() {
                let realmId = this[keys.realm];
                let id = this[keys.id];

                if (!realmId || !id) {
                    throw new TypeError(name + ' method was not called a Realm object!');
                }
                if (this[keys.type] !== type) {
                    throw new TypeError(name + ' method was called on an object of the wrong type!');
                }

                let result = rpc.callMethod(realmId, id, type, name, Array.from(arguments));

                if (resize) {
                    this[keys.resize]();
                }

                return result;
            }
        };
    }

    Object.defineProperties(prototype, props);
}
