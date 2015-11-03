/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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
    'DATA',
    'DATE',
    'DICT',
    'FUNCTION',
    'LIST',
    'OBJECT',
    'REALM',
    'RESULTS',
    'UNDEFINED',
].forEach(function(type) {
    Object.defineProperty(objectTypes, type, {
        value: type.toLowerCase(),
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
        value: type.toLowerCase(),
        enumerable: true,
    });
});

module.exports = {
    keys,
    objectTypes,
    propTypes
};
