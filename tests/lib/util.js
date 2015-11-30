/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

var Realm = require('realm');

exports.realmPathForFile = function(str) {
    var path = Realm.defaultPath;
    return path.substring(0, path.lastIndexOf("/") + 1) + str;
};
