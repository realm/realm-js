/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

if (typeof Realm != 'undefined') {
    // The global Realm constructor should be available on device (using JavaScriptCore).
    module.exports = Realm;  // eslint-disable-line no-undef
} else if (navigator.userAgent) {
    // The userAgent will be defined when running in a browser (such as Chrome debugging mode).
    module.exports = require('./realm');
} else {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}
