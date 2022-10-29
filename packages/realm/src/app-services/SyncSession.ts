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

import { Listeners, SyncConfiguration, TimeoutPromise, User, binding } from "../internal";

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

export class SyncSession {
  /** @internal */
  public internal: binding.SyncSession;

  private progressListeners = new Listeners<ProgressNotificationCallback, bigint, [ProgressDirection, ProgressMode]>(
    (callback, direction, mode) => {
      return this.internal.registerProgressNotifier(
        (transferred, transferable) => callback(Number(transferred), Number(transferable)),
        toBindingDirection(direction),
        mode === ProgressMode.ReportIndefinitely,
      );
    },
    (token) => this.internal.unregisterProgressNotifier(token),
  );

  private connectionListeners = new Listeners<ConnectionNotificationCallback, bigint>(
    (callback) => {
      return this.internal.registerConnectionChangeCallback((oldState, newState) =>
        callback(fromBindingConnectionState(oldState), fromBindingConnectionState(newState)),
      );
    },
    (token) => this.internal.unregisterProgressNotifier(token),
  );

  /** @internal */
  constructor(internal: binding.SyncSession, public readonly config: SyncConfiguration) {
    this.internal = internal;
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
    this.progressListeners.add(callback, direction, mode);
  }

  removeProgressNotification(callback: ProgressNotificationCallback) {
    this.progressListeners.remove(callback);
  }

  addConnectionNotification(callback: ConnectionNotificationCallback) {
    this.connectionListeners.add(callback);
  }
  removeConnectionNotification(callback: ConnectionNotificationCallback) {
    this.connectionListeners.remove(callback);
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
