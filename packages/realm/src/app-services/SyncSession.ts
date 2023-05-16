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
  ClientResetAfterCallback,
  ClientResetBeforeCallback,
  ClientResetError,
  ClientResetFallbackCallback,
  ClientResetMode,
  ErrorCallback,
  Listeners,
  PartitionValue,
  Realm,
  SessionStopPolicy,
  SyncConfiguration,
  TimeoutPromise,
  User,
  assert,
  binding,
  flags,
  fromBindingSyncError,
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
    return binding.ProgressDirection.Download;
  } else if (direction === ProgressDirection.Upload) {
    return binding.ProgressDirection.Upload;
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

// TODO: This mapping is an interpretation of the behavior of the legacy SDK we might want to revisit
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
  };
}

/** @internal */
export function toBindingErrorHandlerWithOnManual(
  onError: ErrorCallback | undefined,
  onManual: ClientResetFallbackCallback | undefined,
) {
  if (!onError && !onManual) {
    throw new Error("need to set either onError or onManual or both");
  }
  if (onError && onManual) {
    return toBindingErrorHandler((session, error) => {
      if (error instanceof ClientResetError) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onManual(session, error.config.path!);
      } else {
        onError(session, error);
      }
    });
  }
  if (onError) {
    // onError gets all errors
    return toBindingErrorHandler(onError);
  }
  if (onManual) {
    // onManual only gets ClientResetErrors
    return toBindingErrorHandler((session, error) => {
      if (error instanceof ClientResetError) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onManual(session, error.config.path!);
      }
    });
  }
}

/** @internal */
export function toBindingNotifyBeforeClientReset(onBefore: ClientResetBeforeCallback) {
  return (internal: binding.Realm) => {
    onBefore(new Realm(null, { internal }));
  };
}

/** @internal */
export function toBindingNotifyAfterClientReset(onAfter: ClientResetAfterCallback) {
  return (internal: binding.Realm, tsr: binding.ThreadSafeReference) => {
    onAfter(
      new Realm(null, { internal }),
      new Realm(null, { internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr) }),
    );
  };
}

/** @internal */
export function toBindingNotifyAfterClientResetWithFallback(
  onAfter: ClientResetAfterCallback,
  onFallback: ClientResetFallbackCallback | undefined,
) {
  return (internal: binding.Realm, tsr: binding.ThreadSafeReference, didRecover: boolean) => {
    if (didRecover) {
      onAfter(
        new Realm(null, { internal }),
        new Realm(null, { internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr) }),
      );
    } else {
      const realm = new Realm(null, { internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr) });
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
  switch (resetMode) {
    case ClientResetMode.Manual:
      return binding.ClientResetMode.Manual;
    case ClientResetMode.DiscardUnsyncedChanges:
      return binding.ClientResetMode.DiscardLocal;
    case ClientResetMode.RecoverUnsyncedChanges:
      return binding.ClientResetMode.Recover;
    case ClientResetMode.RecoverOrDiscardUnsyncedChanges:
      return binding.ClientResetMode.RecoverOrDiscard;
  }
}

type ListenerToken = {
  weakInternal: binding.WeakSyncSession;
  token: binding.Int64;
};

/**
 * With the current properties available through Core, it it's possible to construct an app from a user nor sync session internal.
 * TODO: Refactor to pass an app instance through to all places that constructs a SyncSession.
 */
const mockApp = new Proxy({} as App, {
  get() {
    throw new Error("Using user.app of a user returned through syncSession.config is not supported");
  },
});

/**
 * Progress listeners are shared across instances of the SyncSession, making it possible to deregister a listener on another session
 * TODO: Consider adding a check to verify that the callback is removed from the correct SyncSession (although that would break the API)
 */
const PROGRESS_LISTENERS = new Listeners<
  ProgressNotificationCallback,
  ListenerToken,
  [binding.WeakSyncSession, binding.SyncSession, ProgressDirection, ProgressMode]
>({
  throwOnReAdd: true,
  add(callback, weakInternal, internal, direction, mode) {
    const token = internal.registerProgressNotifier(
      (transferred, transferable) => callback(Number(transferred), Number(transferable)),
      toBindingDirection(direction),
      mode === ProgressMode.ReportIndefinitely,
    );
    return { weakInternal, token };
  },
  remove({ weakInternal, token }) {
    weakInternal.withDeref((internal) => internal?.unregisterProgressNotifier(token));
  },
});

/**
 * Connection listeners are shared across instances of the SyncSession, making it possible to deregister a listener on another session
 * TODO: Consider adding a check to verify that the callback is removed from the correct SyncSession (although that would break the API)
 */
const CONNECTION_LISTENERS = new Listeners<
  ConnectionNotificationCallback,
  ListenerToken,
  [binding.WeakSyncSession, binding.SyncSession]
>({
  throwOnReAdd: true,
  add(callback, weakInternal, internal) {
    const token = internal.registerConnectionChangeCallback((oldState, newState) =>
      callback(fromBindingConnectionState(newState), fromBindingConnectionState(oldState)),
    );
    return { weakInternal, token };
  },
  remove({ weakInternal, token }) {
    weakInternal.withDeref((internal) => internal?.unregisterConnectionChangeCallback(token));
  },
});

export class SyncSession {
  /** @internal */
  private weakInternal: binding.WeakSyncSession;
  /** @internal */
  public withInternal<Ret = void>(cb: (syncSession: binding.SyncSession) => Ret) {
    return this.weakInternal.withDeref((syncSession) => {
      assert(syncSession, "This SyncSession is no longer valid");
      return cb(syncSession);
    });
  }

  /** @internal */
  constructor(internal: binding.SyncSession) {
    this.weakInternal = internal.weaken();
  }

  // TODO: Return the `error_handler`
  // TODO: Figure out a way to avoid passing a mocked app instance when constructing the User.
  get config(): SyncConfiguration {
    return this.withInternal((internal) => {
      const user = new User(internal.user, mockApp);
      const { partitionValue, flxSyncRequested, customHttpHeaders, clientValidateSsl, sslTrustCertificatePath } =
        internal.config;
      if (flxSyncRequested) {
        return {
          user,
          flexible: true,
          customHttpHeaders,
          ssl: { validate: clientValidateSsl, certificatePath: sslTrustCertificatePath },
        };
      } else {
        return {
          user,
          partitionValue: EJSON.parse(partitionValue) as PartitionValue,
          customHttpHeaders,
          ssl: { validate: clientValidateSsl, certificatePath: sslTrustCertificatePath },
        };
      }
    });
  }

  get state(): SessionState {
    return fromBindingSessionState(this.withInternal((internal) => internal.state));
  }

  get url() {
    const url = this.withInternal((internal) => internal.fullRealmUrl);
    if (url) {
      return url;
    } else {
      throw new Error("Unable to determine URL");
    }
  }

  get user() {
    return User.get(this.withInternal((internal) => internal.user));
  }

  get connectionState() {
    return fromBindingConnectionState(this.withInternal((internal) => internal.connectionState));
  }

  // TODO: Make this a getter instead of a method
  isConnected() {
    return this.withInternal((internal) => {
      const { connectionState, state } = internal;
      return (
        connectionState === binding.SyncSessionConnectionState.Connected &&
        (state === binding.SyncSessionState.Active || state === binding.SyncSessionState.Dying)
      );
    });
  }

  pause() {
    this.withInternal((internal) => internal.forceClose());
  }

  resume() {
    this.withInternal((internal) => internal.reviveIfNeeded());
  }

  addProgressNotification(direction: ProgressDirection, mode: ProgressMode, callback: ProgressNotificationCallback) {
    this.withInternal((internal) => PROGRESS_LISTENERS.add(callback, this.weakInternal, internal, direction, mode));
  }

  removeProgressNotification(callback: ProgressNotificationCallback) {
    PROGRESS_LISTENERS.remove(callback);
  }

  addConnectionNotification(callback: ConnectionNotificationCallback) {
    this.withInternal((internal) => CONNECTION_LISTENERS.add(callback, this.weakInternal, internal));
  }
  removeConnectionNotification(callback: ConnectionNotificationCallback) {
    CONNECTION_LISTENERS.remove(callback);
  }

  downloadAllServerChanges(timeoutMs?: number): Promise<void> {
    return this.withInternal(
      (internal) =>
        new TimeoutPromise(
          internal.waitForDownloadCompletion(),
          timeoutMs,
          `Downloading changes did not complete in ${timeoutMs} ms.`,
        ),
    );
  }

  uploadAllLocalChanges(timeoutMs?: number): Promise<void> {
    return this.withInternal(
      (internal) =>
        new TimeoutPromise(
          internal.waitForUploadCompletion(),
          timeoutMs,
          `Uploading changes did not complete in ${timeoutMs} ms.`,
        ),
    );
  }

  /** @internal */
  _simulateError(code: number, message: string, type: string, isFatal: boolean) {
    this.withInternal((internal) => binding.Helpers.simulateSyncError(internal, code, message, type, isFatal));
  }
}
