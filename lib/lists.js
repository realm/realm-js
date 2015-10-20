'use strict';

let constants = require('./constants');
let util = require('./util');

module.exports = {
    create,
};

class List {}

util.createMethods(List.prototype, constants.propTypes.LIST, [
    'pop',
    'shift',
    'push',
    'unshift',
    'splice',
], true);

function create(realmId, info) {
    let meta = util.createList(List.prototype, realmId, info, true);
    let list = Object.create(meta);

    // This will make attempts at assigning to out-of-bounds indices throw an exception.
    Object.preventExtensions(list);

    return list;
}
