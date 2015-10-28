'use strict';

let keys = {};
let objectTypes = {};
let propTypes = {};

[
    'id',
    'realm',
    'type',
].forEach(function(name) {
    keys[name] = Symbol();
});

[
    'FUNCTION',
    'REALM',
    'RESULTS',
].forEach(function(type) {
    Object.defineProperty(objectTypes, type, {
        value: 'ObjectTypes' + type,
    });
});

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
    Object.defineProperty(propTypes, type, {
        value: 'PropTypes' + type,
        enumerable: true,
    });
});

module.exports = {
    keys,
    objectTypes,
    propTypes
};
