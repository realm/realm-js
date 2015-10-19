'use strict';

let types = require('./types');
let util = require('./util');

module.exports = {
    create,
};

class List {}

util.createMethods(List.prototype, types.LIST, [
    'pop',
    'shift',
    'push',
    'unshift',
    'splice',
], true);

function create(realmId, info) {
    return util.createList(List.prototype, realmId, info, true);
}
