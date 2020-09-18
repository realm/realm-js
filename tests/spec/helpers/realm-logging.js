"use strict";

const debug = require('debug');

const REALM_LOG_LEVELS = ['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off'];
const realmDebug = debug('realm');

/**
 * Sets up the Realm.App.Sync logger and log level
 */
function setupLogging(Realm) {
    Realm.App.Sync.setLogger((level, message) => {
        const levelName = REALM_LOG_LEVELS[level];
        realmDebug(`[${levelName}] ${message}`);
    });
    // Set the log level if running on NodeJS
    if (process && process.env) {
        Realm.App.Sync.setLogLevel(process.env.REALM_LOG_LEVEL || 'info');
    }
}

function patch(Realm) {
    // Run only if Realm was build with sync enabled.
    if (Realm.App.Sync) {
        // Monkey-patching clearTestState, because the sync sessions logger gets reset.
        // @see https://github.com/realm/realm-object-store/blob/d7e0867626a6868749e7e8bf55c64c6fbb2e3189/src/sync/sync_manager.cpp#L239-L240
        const originalClearTestState = Realm.clearTestState;
        Realm.clearTestState = function patchedClearTestState() {
            originalClearTestState.call(Realm);
            // FIXME: enable logging (setupLogging(Realm))
        }

        // FIXME: enable logging: setupLogging(Realm);
    }
}

module.exports = { patch };
