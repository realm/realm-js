'use strict';

let internal = require('./internal-types');
let keys = require('./keys');
let rpc = require('./rpc');
let util = require('./util');

module.exports = {
    create,
};

class Results {}

util.createMethods(Results.prototype, internal.RESULTS, [
    'sortByProperty',
]);

function create(realmId, info) {
    return util.createList(Results.prototype, realmId, info, getterForLength, getterForIndex);
}

function getterForLength() {
    return rpc.getResultsSize(this[keys.realm], this[keys.id]);
}

function getterForIndex(index) {
    return function() {
        return rpc.getResultsItem(this[keys.realm], this[keys.id], index);
    };
}
