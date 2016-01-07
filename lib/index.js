/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

if (typeof Realm != 'undefined') {
    module.exports = Realm;  // eslint-disable-line no-undef
} else if (navigator.userAgent) {
    module.exports = require('./realm');
} else {
    throw new Error('Missing Realm constructor - please ensure RealmReact framework is included!');
}
