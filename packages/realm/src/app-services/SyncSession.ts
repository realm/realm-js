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

import { binding } from "../binding";
import { assert } from "../assert";
import { ClientResetError, fromBindingSyncError } from "../errors";
import { indirect } from "../indirect";
import { Listeners } from "../Listeners";
import { TimeoutPromise } from "../TimeoutPromise";
import type { App } from "./App";
import {
  type ClientResetAfterCallback,
  type ClientResetBeforeCallback,
  type ClientResetFallbackCallback,
  ClientResetMode,
  type ErrorCallback,
  type PartitionValue,
  SessionStopPolicy,
  type SyncConfiguration,
} from "./SyncConfiguration";
import { User } from "./User";

/**
 * The progress direction to register the progress notifier for.
 */
export enum ProgressDirection {
  /**
   * Data going from the server to the client.
   */
  Download = "download",
  /**
   * Data going from the client to the server.
   */
  Upload = "upload",
}

/**
 * The progress notification mode to register the progress notifier for.
 */
export enum ProgressMode {
  /**
   * The registration will stay active until the callback is unregistered.
   */
  ReportIndefinitely = "reportIndefinitely",
  /**
   * The registration will be active until only the currently transferable bytes are synced.
   */
  ForCurrentlyOutstandingWork = "forCurrentlyOutstandingWork",
}

/**
 * A progress notification callback supporting Partition-Based Sync only.
 * @param transferred - The current number of bytes already transferred.
 * @param transferable - The total number of transferable bytes (i.e. the number of bytes already transferred plus the number of bytes pending transfer).
 * @deprecated - Will be removed in a future major version. Please use {@link EstimateProgressNotificationCallback} instead.
 * @since 1.12.0
 */
export type PartitionBasedSyncProgressNotificationCallback = (transferred: number, transferable: number) => void;

/**
 * A progress notification callback for Atlas Device Sync.
 * @param estimate - An estimate between 0.0 and 1.0 of how much have been transferred.
 */
export type EstimateProgressNotificationCallback = (estimate: number) => void;

/**
 * A callback that will be called when the synchronization progress gets updated.
 */
export type ProgressNotificationCallback =
  | EstimateProgressNotificationCallback
  | PartitionBasedSyncProgressNotificationCallback;

export enum ConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
}

export type ConnectionNotificationCallback = (newState: ConnectionState, oldState: ConnectionState) => void;

export enum SessionState {
  /**
   * The sync session encountered a non-recoverable error and is permanently invalid. Create a new Session to continue syncing.
   */
  Invalid = "invalid",
  /**
   * The sync session is actively communicating or attempting to communicate with Atlas App Services. A session may be considered active even if it is not currently connected. To find out if a session is online, check its connection state.
   */
  Active = "active",
  /**
   * The sync session is not attempting to communicate with Atlas App Services due to the user logging out or synchronization being paused.
   */
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

/** @internal */
export function isEstimateProgressNotificationCallback(
  callback: ProgressNotificationCallback,
): callback is EstimateProgressNotificationCallback {
  return callback.length === 1;
}

function toBindingProgressNotificationCallback(callback: ProgressNotificationCallback) {
  if (isEstimateProgressNotificationCallback(callback)) {
    return (_: binding.Int64, __: binding.Int64, progressEstimate: number) => callback(progressEstimate);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (transferredBytes: binding.Int64, transferrableBytes: binding.Int64, _: number) =>
      callback(binding.Int64.intToNum(transferredBytes), binding.Int64.intToNum(transferrableBytes));
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
    onBefore(new indirect.Realm(null, { internal }));
  };
}

/** @internal */
export function toBindingNotifyAfterClientReset(onAfter: ClientResetAfterCallback) {
  return (internal: binding.Realm, tsr: binding.ThreadSafeReference) => {
    onAfter(
      new indirect.Realm(null, { internal }),
      new indirect.Realm(null, { internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr) }),
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
        new indirect.Realm(null, { internal }),
        new indirect.Realm(null, { internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr) }),
      );
    } else {
      const realm = new indirect.Realm(null, {
        internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr),
      });
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
  add(callback, weakInternal, internal, direction, mode) {
    const token = internal.registerProgressNotifier(
      toBindingProgressNotificationCallback(callback),
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
  /**
   * Gets the Sync-part of the configuration that the corresponding Realm was constructed with.
   */
  get config(): SyncConfiguration {
    return this.withInternal((internal) => {
      const appUser = binding.Helpers.syncUserAsAppUser(internal.user);
      if (!appUser) {
        throw new Error("User is null");
      }
      const user = new User(appUser, mockApp);
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

  /**
   * Gets the current state of the session.
   */
  get state(): SessionState {
    return fromBindingSessionState(this.withInternal((internal) => internal.state));
  }

  /**
   * Gets the URL of the Realm Object Server that this session is connected to.
   */
  get url() {
    const url = this.withInternal((internal) => internal.fullRealmUrl);
    if (url) {
      return url;
    } else {
      throw new Error("Unable to determine URL");
    }
  }

  /**
   * Gets the User that this session was created with.
   */
  get user() {
    const appUser = this.withInternal((internal) => binding.Helpers.syncUserAsAppUser(internal.user));
    if (!appUser) {
      throw new Error("User is null");
    }
    return User.get(appUser);
  }

  /**
   * Gets the current state of the connection to the server. Multiple sessions might share the same underlying
   * connection. In that case, any connection change is sent to all sessions.
   *
   * Data will only be synchronized with the server if this method returns `Connected` and `state()` returns `Active` or `Dying`.
   */
  get connectionState() {
    return fromBindingConnectionState(this.withInternal((internal) => internal.connectionState));
  }

  /**
   * Get the identifier of the database file on the server.
   * @internal
   */
  get fileIdent() {
    const { ident } = this.withInternal((internal) => internal.getFileIdent());
    return ident;
  }

  // TODO: Make this a getter instead of a method
  /**
   * Returns `true` if the session is currently active and connected to the server, `false` if not.
   */
  isConnected() {
    return this.withInternal((internal) => {
      const { connectionState, state } = internal;
      return (
        connectionState === binding.SyncSessionConnectionState.Connected &&
        (state === binding.SyncSessionState.Active || state === binding.SyncSessionState.Dying)
      );
    });
  }

  /**
   * Pause a sync session.
   *
   * This method is asynchronous so in order to know when the session has started you will need
   * to add a connection notification with {@link SyncSession.addConnectionNotification | addConnectionNotification}.
   *
   * This method is idempotent so it will be a no-op if the session is already paused or if multiplexing
   * is enabled.
   * @since 2.16.0-rc.2
   */
  pause() {
    this.withInternal((internal) => internal.forceClose());
  }

  /**
   * Resumes a sync session that has been paused.
   *
   * This method is asynchronous so in order to know when the session has started you will need
   * to add a connection notification with {@link SyncSession.addConnectionNotification | addConnectionNotification}.
   *
   * This method is idempotent so it will be a no-op if the session is already started or if multiplexing
   * is enabled.
   * @since 2.16.0-rc.2
   */
  resume() {
    this.withInternal((internal) => internal.reviveIfNeeded());
  }

  /**
   * Reconnects to Atlas Device Sync.
   *
   * This method is asynchronous so in order to know when the session has started you will need
   * to add a connection notification with {@link SyncSession.addConnectionNotification | addConnectionNotification}.
   *
   * This method is idempotent so it will be a no-op if the session is already started.
   * @since 12.2.0
   */
  reconnect() {
    this.withInternal((internal) => internal.handleReconnect());
  }

  /**
   * Register a progress notification callback on a session object.
   * @param direction - The progress direction to register for.
   * @param mode - The progress notification mode to use for the registration.
   * @param callback - The function to call when the progress gets updated.
   * @since 1.12.0
   */
  addProgressNotification(
    direction: ProgressDirection,
    mode: ProgressMode,
    callback: ProgressNotificationCallback,
  ): void {
    assert.function(callback, "callback");
    this.withInternal((internal) => PROGRESS_LISTENERS.add(callback, this.weakInternal, internal, direction, mode));
  }

  /**
   * Unregister a progress notification callback that was previously registered with {@link SyncSession.addProgressNotification | addProgressNotification}.
   * Calling the function multiple times with the same callback is ignored.
   * @param callback - A previously registered progress callback.
   * @since 1.12.0
   */
  removeProgressNotification(callback: ProgressNotificationCallback): void {
    PROGRESS_LISTENERS.remove(callback);
  }

  /**
   * Registers a connection notification on the session object. This will be notified about changes to the
   * underlying connection to the Realm Object Server.
   * @param callback - Called with the following arguments:
   * 1. `newState`: The new state of the connection
   * 2. `oldState`: The state the connection transitioned from.
   * @since 2.15.0
   */
  addConnectionNotification(callback: ConnectionNotificationCallback) {
    this.withInternal((internal) => CONNECTION_LISTENERS.add(callback, this.weakInternal, internal));
  }

  /**
   * Unregister a state notification callback that was previously registered with addStateNotification.
   * Calling the function multiple times with the same callback is ignored.
   * @param callback - A previously registered state callback.
   * @since 2.15.0
   */
  removeConnectionNotification(callback: ConnectionNotificationCallback): void {
    CONNECTION_LISTENERS.remove(callback);
  }

  /**
   * This method returns a promise that does not resolve successfully until all known remote changes have been
   * downloaded and applied to the Realm or the specified timeout is hit in which case it will be rejected. If the method
   * times out, the download will still continue in the background.
   *
   * This method cannot be called before the Realm has been opened.
   * @param timeoutMs - maximum amount of time to wait in milliseconds before the promise will be rejected. If no timeout
   * is specified the method will wait forever.
   */
  downloadAllServerChanges(timeoutMs?: number): Promise<void> {
    return this.withInternal(
      (internal) =>
        new TimeoutPromise(internal.waitForDownloadCompletion(), {
          ms: timeoutMs,
          message: `Downloading changes did not complete in ${timeoutMs} ms.`,
        }),
    );
  }

  /**
   * This method returns a promise that does not resolve successfully until all known local changes have been uploaded
   * to the server or the specified timeout is hit in which case it will be rejected. If the method times out, the upload
   * will still continue in the background.
   *
   * This method cannot be called before the Realm has been opened.
   * @param timeoutMs - Maximum amount of time to wait in milliseconds before the promise is rejected. If no timeout is specified the method will wait forever.
   */
  uploadAllLocalChanges(timeoutMs?: number): Promise<void> {
    return this.withInternal(
      (internal) =>
        new TimeoutPromise(internal.waitForUploadCompletion(), {
          ms: timeoutMs,
          message: `Uploading changes did not complete in ${timeoutMs} ms.`,
        }),
    );
  }

  /** @internal */
  _simulateError(code: number, message: string, type: string, isFatal: boolean) {
    this.withInternal((internal) => binding.Helpers.simulateSyncError(internal, code, message, type, isFatal));
  }
}
