'use strict';

let rpc = require('./rpc');
let util = require('./util');

let idKey = util.idKey;
let realmKey = util.realmKey;
let resizeListKey = util.resizeListKey;
let prototype = {};

exports.create = create;

[
    'sortByProperty',
].forEach(function(name) {
    Object.defineProperty(prototype, name, {
        value: function() {
            let resultsId = this[idKey];
            let realmId = this[realmKey];

            if (!resultsId || !realmId) {
                throw new TypeError(name + ' method was not called on Results!');
            }

            return rpc.callListMethod(realmId, resultsId, name, Array.from(arguments));
        }
    });
});

function create(realmId, info) {
    let results = util.createList(prototype, getterForLength, getterForIndex);
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
        return rpc.getResultsItem(this[realmKey], this[idKey], index);
    };
}
