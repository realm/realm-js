'use strict';

let growListPrototypeKey = exports.growListPrototypeKey = Symbol();

exports.createListPrototype = createListPrototype;

function createListPrototype(getterForLength, getterForIndex, setterForIndex) {
    let prototype = {};
    let maxSize = 0;

    Object.defineProperty(prototype, 'length', {
        get: getterForLength
    });

    prototype[growListPrototypeKey] = function(size) {
        if (size < maxSize) {
            return;
        }

        let props = {};
        for (let i = maxSize; i <= size; i++) {
            props[i] = {
                get: getterForIndex(i),
                set: setterForIndex && setterForIndex(i),
            };
        }

        // TODO: Use ES6 Proxy once it's supported on Chrome!
        Object.defineProperties(prototype, props);

        maxSize = size + 1;
    }

    return prototype;
}
