'use strict';

let internal = require('./internal-types');
let util = require('./util');

module.exports = {
    create,
};

class Results {}

util.createMethods(Results.prototype, internal.RESULTS, [
    'sortByProperty',
]);

function create(realmId, info) {
    return util.createList(Results.prototype, realmId, info);
}
