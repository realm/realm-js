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

import { CanonicalRealmSchema, Realm } from "./internal";

export enum RealmEvent {
  Change = "change",
  Schema = "schema",
  BeforeNotify = "beforenotify",
}

export type RealmListenerCallback = (realm: Realm, name: RealmEvent, schema?: CanonicalRealmSchema) => void;

// Temporary functions to work between event names and corresponding enums
// TODO: We should update the external API to take a `RealmEvent` instead of a string.
export ////////////////////////////////////////////////////////////////////////////
/** @internal */
class RealmListeners {
  /**
   * Keeps tracked of registered listener callbacks for Realm class notifications.
   */

  constructor(private realm: Realm, private eventType: RealmEvent) {
    this.eventType = eventType;
  }
  private listeners = new Set<RealmListenerCallback>();

  // Combined callback which runs all listener callbacks in one call.
  notify(schema?: CanonicalRealmSchema): void {
    for (const callback of this.listeners) {
      callback(this.realm, this.eventType, schema);
    }
  }

  add(callback: RealmListenerCallback): void {
    if (this.listeners.has(callback)) {
      // No need to add a listener twice
      return;
    }
    // Store the listener.
    this.listeners.add(callback);
  }

  remove(callback: RealmListenerCallback): void {
    this.listeners.delete(callback);
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
