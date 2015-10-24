'use strict';

const constants = require('./constants');
const util = require('./util');

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
    return util.createList(List.prototype, realmId, info, true);
}
