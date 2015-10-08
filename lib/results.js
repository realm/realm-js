'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = Symbol();
let realmKey = Symbol();

exports.create = create;

function create(realmId, info) {
    let results = util.createList(null, getterForLength, getterForIndex);
    let size = info.size;

    results[realmKey] = realmId;
    results[idKey] = info.resultsId;

    results[util.resizeListKey](size);

    return results;
}

function getterForLength() {
    return rpc.getResultsSize(this[realmKey], this[idKey]);
}

function getterForIndex(index) {
    return function() {
        let realmId = this[realmKey];
        return rpc.getResultsItem(realmId, this[idKey], index);
    };
}
