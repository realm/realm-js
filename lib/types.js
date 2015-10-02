'use strict';

const types = {};

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
    types[type] = 'PropTypes' + type;
});

module.exports = Object.freeze(types);
