'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = util.idKey;
let realmKey = util.realmKey;
let resizeListKey = util.resizeListKey;

exports.create = create;

function create(realmId, info) {
    let results = util.createList(null, getterForLength, getterForIndex);
    let size = info.size;

    results[realmKey] = realmId;
    results[idKey] = info.id;

    results[resizeListKey](size);

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
