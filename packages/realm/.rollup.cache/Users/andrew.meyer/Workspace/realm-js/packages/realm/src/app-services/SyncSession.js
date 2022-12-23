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
import { EJSON } from "bson";
import { ClientResetMode, Listeners, SessionStopPolicy, TimeoutPromise, User, assert, binding, fromBindingSyncError, Realm, ClientResetError, } from "../internal";
export var ProgressDirection;
(function (ProgressDirection) {
    ProgressDirection["Download"] = "download";
    ProgressDirection["Upload"] = "upload";
})(ProgressDirection || (ProgressDirection = {}));
export var ProgressMode;
(function (ProgressMode) {
    ProgressMode["ReportIndefinitely"] = "reportIndefinitely";
    ProgressMode["ForCurrentlyOutstandingWork"] = "forCurrentlyOutstandingWork";
})(ProgressMode || (ProgressMode = {}));
export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["Disconnected"] = "disconnected";
    ConnectionState["Connecting"] = "connecting";
    ConnectionState["Connected"] = "connected";
})(ConnectionState || (ConnectionState = {}));
export var SessionState;
(function (SessionState) {
    SessionState["Invalid"] = "invalid";
    SessionState["Active"] = "active";
    SessionState["Inactive"] = "inactive";
})(SessionState || (SessionState = {}));
function toBindingDirection(direction) {
    if (direction === ProgressDirection.Download) {
        return 1 /* binding.ProgressDirection.download */;
    }
    else if (direction === ProgressDirection.Upload) {
        return 0 /* binding.ProgressDirection.upload */;
    }
    else {
        throw new Error(`Unexpected direction: ${direction}`);
    }
}
function fromBindingConnectionState(state) {
    if (state === 2 /* binding.SyncSessionConnectionState.Connected */) {
        return ConnectionState.Connected;
    }
    else if (state === 1 /* binding.SyncSessionConnectionState.Connecting */) {
        return ConnectionState.Connecting;
    }
    else if (state === 0 /* binding.SyncSessionConnectionState.Disconnected */) {
        return ConnectionState.Disconnected;
    }
    else {
        throw new Error(`Unexpected state: ${state}`);
    }
}
// TODO: This mapping is an interpretation of the behaviour of the legacy SDK we might want to revisit
function fromBindingSessionState(state) {
    if (state === 2 /* binding.SyncSessionState.Inactive */) {
        return SessionState.Inactive;
    }
    else {
        return SessionState.Active;
    }
}
/** @internal */
export function toBindingErrorHandler(onError) {
    return (sessionInternal, bindingError) => {
        // TODO: Return some cached sync session, instead of creating a new wrapper on every error
        // const session = App.Sync.getSyncSession(user, partitionValue);
        const session = new SyncSession(sessionInternal);
        const error = fromBindingSyncError(bindingError);
        onError(session, error);
        session.resetInternal();
    };
}
/** @internal */
export function toBindingErrorHandlerWithOnManual(onError, onManual) {
    if (!onError && !onManual) {
        throw new Error("need to set either onError or onManual or both");
    }
    if (onError && onManual) {
        return toBindingErrorHandler((session, error) => {
            if (error instanceof ClientResetError) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onManual(session, error.config.path);
            }
            else {
                onError(session, error);
            }
        });
    }
    if (onError) { // onError gets all errors
        return toBindingErrorHandler(onError);
    }
    if (onManual) { // onManual only gets ClientResetErrors
        return toBindingErrorHandler((session, error) => {
            if (error instanceof ClientResetError) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onManual(session, error.config.path);
            }
        });
    }
}
/** @internal */
export function toBindingNotifyBeforeClientReset(onBefore) {
    return (localRealmInternal) => {
        onBefore(new Realm(localRealmInternal));
    };
}
/** @internal */
export function toBindingNotifyAfterClientReset(onAfter) {
    return (localRealmInternal, tsr) => {
        onAfter(new Realm(localRealmInternal), new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr)));
    };
}
/** @internal */
export function toBindingNotifyAfterClientResetWithfallback(onAfter, onFallback) {
    return (localRealmInternal, tsr, didRecover) => {
        if (didRecover) {
            onAfter(new Realm(localRealmInternal), new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr)));
        }
        else {
            const realm = new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr));
            if (onFallback) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onFallback(realm.syncSession, realm.path);
            }
            else {
                throw new Error("onFallback is undefined");
            }
        }
    };
}
/** @internal */
export function toBindingStopPolicy(policy) {
    if (policy === SessionStopPolicy.AfterUpload) {
        return 2 /* binding.SyncSessionStopPolicy.AfterChangesUploaded */;
    }
    else if (policy === SessionStopPolicy.Immediately) {
        return 0 /* binding.SyncSessionStopPolicy.Immediately */;
    }
    else if (policy === SessionStopPolicy.Never) {
        return 1 /* binding.SyncSessionStopPolicy.LiveIndefinitely */;
    }
    else {
        throw new Error(`Unexpected policy (get ${policy})`);
    }
}
/** @internal */
export function toBindingClientResetMode(resetMode) {
    switch (resetMode) {
        case ClientResetMode.Manual:
            return 0 /* binding.ClientResetMode.Manual */;
        case ClientResetMode.DiscardUnsyncedChanges:
            return 1 /* binding.ClientResetMode.DiscardLocal */;
        case ClientResetMode.RecoverUnsyncedChanges:
            return 2 /* binding.ClientResetMode.Recover */;
        case ClientResetMode.RecoverOrDiscardUnsyncedChanges:
            return 3 /* binding.ClientResetMode.RecoverOrDiscard */;
    }
}
/**
 * Progress listeners are shared across instances of the SyncSession, making it possible to deregister a listener on another session
 * TODO: Consider adding a check to verify that the callback is removed from the correct SynsSession (although that would break the API)
 */
const PROGRESS_LISTENERS = new Listeners({
    throwOnReAdd: true,
    register(callback, internal, direction, mode) {
        const token = internal.registerProgressNotifier((transferred, transferable) => callback(Number(transferred), Number(transferable)), toBindingDirection(direction), mode === ProgressMode.ReportIndefinitely);
        return { internal, token };
    },
    unregister({ internal, token }) {
        return internal.unregisterProgressNotifier(token);
    },
});
/**
 * Connection listeners are shared across instances of the SyncSession, making it possible to deregister a listener on another session
 * TODO: Consider adding a check to verify that the callback is removed from the correct SynsSession (although that would break the API)
 */
const CONNECTION_LISTENERS = new Listeners({
    throwOnReAdd: true,
    register(callback, internal) {
        const token = internal.registerConnectionChangeCallback((oldState, newState) => callback(fromBindingConnectionState(newState), fromBindingConnectionState(oldState)));
        return { internal, token };
    },
    unregister({ internal, token }) {
        internal.unregisterConnectionChangeCallback(token);
    },
});
export class SyncSession {
    /** @internal */
    _internal;
    /** @internal */
    get internal() {
        assert(this._internal, "This SyncSession is no longer valid");
        return this._internal;
    }
    /** @internal */
    constructor(internal) {
        this._internal = internal;
    }
    /**@internal*/
    resetInternal() {
        if (!this._internal)
            return;
        this._internal.$resetSharedPtr();
        this._internal = null;
    }
    // TODO: Return the `error_handler` and `custom_http_headers`
    get config() {
        const user = new User(this.internal.user, {});
        const { partitionValue, flxSyncRequested, customHttpHeaders } = this.internal.config;
        if (flxSyncRequested) {
            return { user, flexible: true, customHttpHeaders };
        }
        else {
            return { user, partitionValue: EJSON.parse(partitionValue), customHttpHeaders };
        }
    }
    get state() {
        return fromBindingSessionState(this.internal.state);
    }
    get url() {
        const url = this.internal.fullRealmUrl;
        if (url) {
            return url;
        }
        else {
            throw new Error("Unable to determine URL");
        }
    }
    get user() {
        return User.get(this.internal.user);
    }
    get connectionState() {
        return fromBindingConnectionState(this.internal.connectionState);
    }
    // TODO: Make this a getter instead of a method
    isConnected() {
        const { connectionState, state } = this.internal;
        return (connectionState === 2 /* binding.SyncSessionConnectionState.Connected */ &&
            (state === 0 /* binding.SyncSessionState.Active */ || state === 1 /* binding.SyncSessionState.Dying */));
    }
    pause() {
        this.internal.logOut();
    }
    resume() {
        this.internal.reviveIfNeeded();
    }
    addProgressNotification(direction, mode, callback) {
        PROGRESS_LISTENERS.add(callback, this.internal, direction, mode);
    }
    removeProgressNotification(callback) {
        PROGRESS_LISTENERS.remove(callback);
    }
    addConnectionNotification(callback) {
        CONNECTION_LISTENERS.add(callback, this.internal);
    }
    removeConnectionNotification(callback) {
        CONNECTION_LISTENERS.remove(callback);
    }
    downloadAllServerChanges(timeoutMs) {
        return new TimeoutPromise(this.internal.waitForDownloadCompletion(), timeoutMs, `Downloading changes did not complete in ${timeoutMs} ms.`);
    }
    uploadAllLocalChanges(timeoutMs) {
        return new TimeoutPromise(this.internal.waitForUploadCompletion(), timeoutMs, `Uploading changes did not complete in ${timeoutMs} ms.`);
    }
    /** @internal */
    _simulateError(code, message, type, isFatal) {
        binding.Helpers.simulateSyncError(this.internal, code, message, type, isFatal);
    }
}
//# sourceMappingURL=SyncSession.js.map