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
import {
  App,
  ClientResetMode,
  ErrorCallback,
  Listeners,
  PartitionValue,
  SessionStopPolicy,
  SyncConfiguration,
  TimeoutPromise,
  User,
  assert,
  binding,
  fromBindingSyncError,
  ClientResetBeforeCallback,
  Realm,
  ClientResetAfterCallback,
  ClientResetFallbackCallback,
  ClientResetError,
} from "../internal";

export enum ProgressDirection {
  Download = "download",
  Upload = "upload",
}

export enum ProgressMode {
  ReportIndefinitely = "reportIndefinitely",
  ForCurrentlyOutstandingWork = "forCurrentlyOutstandingWork",
}

export type ProgressNotificationCallback = (transferred: number, transferable: number) => void;

export enum ConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
}

export type ConnectionNotificationCallback = (newState: ConnectionState, oldState: ConnectionState) => void;

export enum SessionState {
  Invalid = "invalid",
  Active = "active",
  Inactive = "inactive",
}

function toBindingDirection(direction: ProgressDirection) {
  if (direction === ProgressDirection.Download) {
    return binding.ProgressDirection.download;
  } else if (direction === ProgressDirection.Upload) {
    return binding.ProgressDirection.upload;
  } else {
    throw new Error(`Unexpected direction: ${direction}`);
  }
}

function fromBindingConnectionState(state: binding.SyncSessionConnectionState) {
  if (state === binding.SyncSessionConnectionState.Connected) {
    return ConnectionState.Connected;
  } else if (state === binding.SyncSessionConnectionState.Connecting) {
    return ConnectionState.Connecting;
  } else if (state === binding.SyncSessionConnectionState.Disconnected) {
    return ConnectionState.Disconnected;
  } else {
    throw new Error(`Unexpected state: ${state}`);
  }
}

// TODO: This mapping is an interpretation of the behaviour of the legacy SDK we might want to revisit
function fromBindingSessionState(state: binding.SyncSessionState) {
  if (state === binding.SyncSessionState.Inactive) {
    return SessionState.Inactive;
  } else {
    return SessionState.Active;
  }
}

/** @internal */
export function toBindingErrorHandler(onError: ErrorCallback) {
  return (sessionInternal: binding.SyncSession, bindingError: binding.SyncError) => {
    // TODO: Return some cached sync session, instead of creating a new wrapper on every error
    // const session = App.Sync.getSyncSession(user, partitionValue);
    const session = new SyncSession(sessionInternal);
    const error = fromBindingSyncError(bindingError);
    onError(session, error);
    session.resetInternal();
  };
}

/** @internal */
export function toBindingErrorHandlerWithOnManual(
  onError: ErrorCallback | undefined,
  onManual: ClientResetFallbackCallback | undefined,
) {
  if (!onError && !onManual) {
    throw new Error("need either onError or onManual");
  }
  if (onError && onManual) {
    return (sessionInternal: binding.SyncSession, bindingError: binding.SyncError) => {
      const session = new SyncSession(sessionInternal);
      const error = fromBindingSyncError(bindingError);
      if (error instanceof ClientResetError) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onManual(session, error.config.path!);
      } else {
        onError(session, error);
      }
      session.resetInternal();
    };
  }
  if (onError) {
    return (sessionInternal: binding.SyncSession, bindingError: binding.SyncError) => {
      const session = new SyncSession(sessionInternal);
      const error = fromBindingSyncError(bindingError);
      if (error instanceof ClientResetError) {
        onError(session, error);
      }
      session.resetInternal();
    };
  }
  // onManual must be true here
  return (sessionInternal: binding.SyncSession, bindingError: binding.SyncError) => {
    const session = new SyncSession(sessionInternal);
    const error = fromBindingSyncError(bindingError);
    if (error instanceof ClientResetError) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      onManual!(session, error.config.path!);
    }
    session.resetInternal();
  };
}

/** @internal */
export function toBindingNotifyBeforeClientReset(onBefore: ClientResetBeforeCallback) {
  return (localRealmInternal: binding.Realm) => {
    onBefore(new Realm(localRealmInternal));
  };
}

/** @internal */
export function toBindingNotifyAfterClientReset(onAfter: ClientResetAfterCallback) {
  return (localRealmInternal: binding.Realm, tsr: binding.ThreadSafeReference) => {
    onAfter(new Realm(localRealmInternal), new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr)));
  };
}

/** @internal */
export function toBindingNotifyAfterClientResetWithfallback(
  onAfter: ClientResetAfterCallback,
  onFallback: ClientResetFallbackCallback | undefined,
) {
  return (localRealmInternal: binding.Realm, tsr: binding.ThreadSafeReference, didRecover: boolean) => {
    if (didRecover) {
      onAfter(new Realm(localRealmInternal), new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr)));
    } else {
      const realm = new Realm(binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr));
      if (onFallback) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onFallback(realm.syncSession!, realm.path);
      } else {
        throw new Error("onFallback is undefined");
      }
    }
  };
}

/** @internal */
export function toBindingStopPolicy(policy: SessionStopPolicy): binding.SyncSessionStopPolicy {
  if (policy === SessionStopPolicy.AfterUpload) {
    return binding.SyncSessionStopPolicy.AfterChangesUploaded;
  } else if (policy === SessionStopPolicy.Immediately) {
    return binding.SyncSessionStopPolicy.Immediately;
  } else if (policy === SessionStopPolicy.Never) {
    return binding.SyncSessionStopPolicy.LiveIndefinitely;
  } else {
    throw new Error(`Unexpected policy (get ${policy})`);
  }
}

/** @internal */
export function toBindingClientResetMode(resetMode: ClientResetMode): binding.ClientResetMode {
  if (resetMode === ClientResetMode.Manual) {
    return binding.ClientResetMode.Manual;
  } else if (resetMode === ClientResetMode.DiscardUnsyncedChanges) {
    return binding.ClientResetMode.DiscardLocal;
  } else if (resetMode === ClientResetMode.RecoverUnsyncedChanges) {
    return binding.ClientResetMode.Recover;
  } else if (resetMode === ClientResetMode.RecoverOrDiscardUnsyncedChanges) {
    return binding.ClientResetMode.RecoverOrDiscard;
  } else {
    throw new Error(`Unexpected clientResetMode (get ${resetMode})`);
  }
}

type ListenerToken = {
  internal: binding.SyncSession;
  token: bigint;
};

/**
 * Progress listeners are shared across instances of the SyncSession, making it possible to deregister a listener on another session
 * TODO: Consider adding a check to verify that the callback is removed from the correct SynsSession (although that would break the API)
 */
const PROGRESS_LISTENERS = new Listeners<
  ProgressNotificationCallback,
  ListenerToken,
  [binding.SyncSession, ProgressDirection, ProgressMode]
>({
  throwOnReAdd: true,
  register(callback, internal, direction, mode) {
    const token = internal.registerProgressNotifier(
      (transferred, transferable) => callback(Number(transferred), Number(transferable)),
      toBindingDirection(direction),
      mode === ProgressMode.ReportIndefinitely,
    );
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
const CONNECTION_LISTENERS = new Listeners<ConnectionNotificationCallback, ListenerToken, [binding.SyncSession]>({
  throwOnReAdd: true,
  register(callback, internal) {
    const token = internal.registerConnectionChangeCallback((oldState, newState) =>
      callback(fromBindingConnectionState(newState), fromBindingConnectionState(oldState)),
    );
    return { internal, token };
  },
  unregister({ internal, token }) {
    internal.unregisterConnectionChangeCallback(token);
  },
});

export class SyncSession {
  /** @internal */
  private _internal: binding.SyncSession | null;
  /** @internal */
  public get internal() {
    assert(this._internal, "This SyncSession is no longer valid");
    return this._internal;
  }

  /** @internal */
  constructor(internal: binding.SyncSession) {
    this._internal = internal;
  }

  /**@internal*/
  resetInternal() {
    if (!this._internal) return;
    this._internal.$resetSharedPtr();
    this._internal = null;
  }

  // TODO: Return the `error_handler` and `custom_http_headers`
  get config(): SyncConfiguration {
    const user = new User(this.internal.user, {} as unknown as App);
    const { partitionValue, flxSyncRequested, customHttpHeaders } = this.internal.config;
    if (flxSyncRequested) {
      return { user, flexible: true, customHttpHeaders };
    } else {
      return { user, partitionValue: EJSON.parse(partitionValue) as PartitionValue, customHttpHeaders };
    }
  }

  get state(): SessionState {
    return fromBindingSessionState(this.internal.state);
  }

  get url() {
    const url = this.internal.fullRealmUrl;
    if (url) {
      return url;
    } else {
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
    return (
      connectionState === binding.SyncSessionConnectionState.Connected &&
      (state === binding.SyncSessionState.Active || state === binding.SyncSessionState.Dying)
    );
  }

  pause() {
    this.internal.logOut();
  }

  resume() {
    this.internal.reviveIfNeeded();
  }

  addProgressNotification(direction: ProgressDirection, mode: ProgressMode, callback: ProgressNotificationCallback) {
    PROGRESS_LISTENERS.add(callback, this.internal, direction, mode);
  }

  removeProgressNotification(callback: ProgressNotificationCallback) {
    PROGRESS_LISTENERS.remove(callback);
  }

  addConnectionNotification(callback: ConnectionNotificationCallback) {
    CONNECTION_LISTENERS.add(callback, this.internal);
  }
  removeConnectionNotification(callback: ConnectionNotificationCallback) {
    CONNECTION_LISTENERS.remove(callback);
  }

  downloadAllServerChanges(timeoutMs?: number): Promise<void> {
    return new TimeoutPromise(
      this.internal.waitForDownloadCompletion(),
      timeoutMs,
      `Downloading changes did not complete in ${timeoutMs} ms.`,
    );
  }

  uploadAllLocalChanges(timeoutMs?: number): Promise<void> {
    return new TimeoutPromise(
      this.internal.waitForUploadCompletion(),
      timeoutMs,
      `Uploading changes did not complete in ${timeoutMs} ms.`,
    );
  }

  /** @internal */
  _simulateError(code: number, message: string, type: string, isFatal: boolean) {
    binding.Helpers.simulateSyncError(this.internal, code, message, type, isFatal);
  }
}
