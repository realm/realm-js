/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

/* global Realm */

'use strict';

// Synchronous request is required since cordova.exec is asynchronous.
var request = new XMLHttpRequest();
request.open('GET', 'realm://initialize', false);
request.send();

// Now Realm should be globally available, so export it merely as a convenience.
module.exports = Realm;
