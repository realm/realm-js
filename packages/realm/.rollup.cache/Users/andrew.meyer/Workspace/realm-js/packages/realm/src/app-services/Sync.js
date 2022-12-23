////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////
import { OpenRealmBehaviorType, OpenRealmTimeOutBehavior, SyncSession, assert, binding, toBindingSyncConfig, } from "../internal";
import * as internal from "../internal";
export var NumericLogLevel;
(function (NumericLogLevel) {
    NumericLogLevel[NumericLogLevel["All"] = 0] = "All";
    NumericLogLevel[NumericLogLevel["Trace"] = 1] = "Trace";
    NumericLogLevel[NumericLogLevel["Debug"] = 2] = "Debug";
    NumericLogLevel[NumericLogLevel["Detail"] = 3] = "Detail";
    NumericLogLevel[NumericLogLevel["Info"] = 4] = "Info";
    NumericLogLevel[NumericLogLevel["Warn"] = 5] = "Warn";
    NumericLogLevel[NumericLogLevel["Error"] = 6] = "Error";
    NumericLogLevel[NumericLogLevel["Fatal"] = 7] = "Fatal";
    NumericLogLevel[NumericLogLevel["Off"] = 8] = "Off";
})(NumericLogLevel || (NumericLogLevel = {}));
function toBindingLoggerLevel(arg) {
    const result = Object.entries(NumericLogLevel).find(([name]) => {
        return name.toLowerCase() === arg;
    });
    assert(result, `Unexpected log level: ${arg}`);
    const [, level] = result;
    assert.number(level, "Expected a numeric level");
    return level;
}
function fromBindingLoggerLevel(arg) {
    // For now, these map 1-to-1
    return arg;
}
// eslint-disable-next-line @typescript-eslint/no-namespace
export var Sync;
(function (Sync) {
    Sync.Session = SyncSession;
    Sync.ConnectionState = internal.ConnectionState;
    function setLogLevel(app, level) {
        const numericLevel = toBindingLoggerLevel(level);
        app.internal.syncManager.setLogLevel(numericLevel);
    }
    Sync.setLogLevel = setLogLevel;
    function setLogger(app, logger) {
        const factory = binding.Helpers.makeLoggerFactory((level, message) => {
            logger(fromBindingLoggerLevel(level), message);
        });
        app.internal.syncManager.setLoggerFactory(factory);
    }
    Sync.setLogger = setLogger;
    function getAllSyncSessions(user) {
        throw new Error("Not yet implemented");
    }
    Sync.getAllSyncSessions = getAllSyncSessions;
    function getSyncSession(user, partitionValue) {
        const config = toBindingSyncConfig({ user, partitionValue });
        const path = user.app.internal.syncManager.pathForRealm(config);
        const session = user.internal.sessionForOnDiskPath(path);
        if (session) {
            return new SyncSession(session);
        }
        else {
            return null;
        }
    }
    Sync.getSyncSession = getSyncSession;
    // TODO: Consider breaking the API, turning this into a property
    function setUserAgent(app, userAgent) {
        app.userAgent = userAgent;
    }
    Sync.setUserAgent = setUserAgent;
    // TODO: Consider breaking the API, turning this into an instance method
    function enableSessionMultiplexing(app) {
        app.internal.syncManager.enableSessionMultiplexing();
    }
    Sync.enableSessionMultiplexing = enableSessionMultiplexing;
    // TODO: Consider breaking the API, turning this into an instance method
    function initiateClientReset(app, path) {
        const success = app.internal.syncManager.immediatelyRunFileActions(path);
        // TODO: Consider a better error message
        assert(success, `Realm was not configured correctly. Client Reset could not be run for Realm at: ${path}`);
    }
    Sync.initiateClientReset = initiateClientReset;
    // TODO: Consider breaking the API, turning this into an instance method
    /** @internal */
    function _hasExistingSessions(app) {
        return app.internal.syncManager.hasExistingSessions;
    }
    Sync._hasExistingSessions = _hasExistingSessions;
    // TODO: Consider breaking the API, turning this into an instance method
    function reconnect(app) {
        app.internal.syncManager.reconnect();
    }
    Sync.reconnect = reconnect;
    Sync.openLocalRealmBehavior = {
        type: OpenRealmBehaviorType.OpenImmediately,
    };
    Sync.downloadBeforeOpenBehavior = {
        type: OpenRealmBehaviorType.DownloadBeforeOpen,
        timeOut: 30 * 1000,
        timeOutBehavior: OpenRealmTimeOutBehavior.ThrowException,
    };
})(Sync || (Sync = {}));
//# sourceMappingURL=Sync.js.map