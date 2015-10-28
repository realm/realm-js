/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

if (typeof Realm != 'undefined') {
    module.exports = Realm;  // eslint-disable-line no-undef
} else {
    module.exports = require('./realm');
}
