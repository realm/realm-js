'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = Symbol();
let realmKey = Symbol();
let prototype = util.createListPrototype(getterForLength, getterForIndex);

exports.create = create;

function create(realmId, info) {
    let results = Object.create(prototype);
    let size = info.size;

    results[realmKey] = realmId;
    results[idKey] = info.resultsId;

    results[util.growListPrototypeKey](size);

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
