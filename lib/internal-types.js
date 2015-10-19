'use strict';

let types = {};

[
    'FUNCTION',
    'NOTIFICATION',
    'REALM',
    'RESULTS',
].forEach(function(type) {
    Object.defineProperty(types, type, {
        value: 'ObjectTypes' + type,
    });
});

module.exports = Object.freeze(types);
