/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const constants = require('./constants');
const util = require('./util');

module.exports = {
    create,
};

class Results {}

util.createMethods(Results.prototype, constants.objectTypes.RESULTS, [
    'snapshot',
    'sortByProperty',
]);

function create(realmId, info) {
    return util.createList(Results.prototype, realmId, info);
}
