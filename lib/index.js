'use strict';

if (typeof Realm != 'undefined') {
    module.exports = Realm;  // eslint-disable-line no-undef
} else {
    module.exports = require('./shim');
}
