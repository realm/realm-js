'use strict';

const mockery = require('mockery');

module.exports = function(realmModulePath) {
    if (typeof REALM_MODULE_PATH !== 'undefined')
        return;

    global.REALM_MODULE_PATH = realmModulePath;

    mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false
    });
    mockery.registerSubstitute('realm', REALM_MODULE_PATH); // eslint-disable-line no-undef
}
