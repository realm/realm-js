'use strict';

let resizeListKey = exports.resizeListKey = Symbol();

exports.createList = createList;

function createList(prototype, getterForLength, getterForIndex, setterForIndex) {
    var list = prototype ? Object.create(prototype) : {};
    var size = 0;

    Object.defineProperty(list, 'length', {get: getterForLength});

    list[resizeListKey] = function(length) {
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

    return list;
}
