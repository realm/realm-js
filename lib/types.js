'use strict';

let types = {};

[
    'BOOL',
    'INT',
    'FLOAT',
    'DOUBLE',
    'STRING',
    'DATE',
    'DATA',
    'OBJECT',
    'LIST',
].forEach(function(type) {
    Object.defineProperty(types, type, {
        value: 'PropTypes' + type,
        enumerable: true,
    });
});

module.exports = Object.freeze(types);
