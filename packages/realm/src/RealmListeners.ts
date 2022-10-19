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

import { Realm } from "./internal";

export type RealmEventName = "change" | "schema" | "beforenotify";
enum RealmEvent {
  Change = "change",
  Schema = "schema",
  BeforeNotify = "beforenotify",
}
export type RealmListenerCallback = (r: Realm, name: RealmEventName, schema?: Realm.ObjectSchema[]) => void;

// Temporary functions to work between event names and corresponding enums.
function eventFromName(name: RealmEventName): RealmEvent {
  switch (name) {
    case "change":
      return RealmEvent.Change;
    case "schema":
      return RealmEvent.Schema;
    case "beforenotify":
      return RealmEvent.BeforeNotify;
  }
}
////////////////////////////////////////////////////////////////////////////
/** @internal */
export class RealmListeners {
  /**
   * Keeps tracked of registered listener callbacks for Realm class notifications.
   */
  private eventType: RealmEvent;
  constructor(private realm: Realm, name: RealmEventName) {
    this.eventType = eventFromName(name);
  }
  private listeners = new Set<RealmListenerCallback>();

  // Combined callback which runs all listener callbacks in one call.
  callback(): void {
    let schema: Realm.ObjectSchema[] | undefined;
    if (this.eventType === RealmEvent.Schema) {
      schema = this.realm.schema;
    }
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
