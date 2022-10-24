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

import { binding } from "../internal";

const cache = new WeakMap<binding.SyncSession, SyncSession>();

export class SyncSession {
  /** @internal */
  public internal: binding.SyncSession;

  /** @internal */
  public static get(internal: binding.SyncSession) {
    const result = cache.get(internal);
    if (result) {
      return result;
    } else {
      const result = new SyncSession(internal);
      cache.set(internal, result);
      return result;
    }
  }

  /** @internal */
  constructor(internal: binding.SyncSession) {
    this.internal = internal;
  }

  /*
  get config(): SyncConfiguration;
  readonly state: 'invalid' | 'active' | 'inactive';
  readonly url: string;
  readonly user: User;
  readonly connectionState: ConnectionState;

  addProgressNotification(direction: ProgressDirection, mode: ProgressMode, progressCallback: ProgressNotificationCallback): void;
  removeProgressNotification(progressCallback: ProgressNotificationCallback): void;

  addConnectionNotification(callback: ConnectionNotificationCallback): void;
  removeConnectionNotification(callback: ConnectionNotificationCallback): void;

  isConnected(): boolean;

  resume(): void;
  pause(): void;

  downloadAllServerChanges(timeoutMs?: number): Promise<void>;
  uploadAllLocalChanges(timeoutMs?: number): Promise<void>;
  */
}
