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
    types[type] = 'PropTypes' + type;
});

types['RESULTS'] = 'PrivateTypesRESULTS';

module.exports = Object.freeze(types);
