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

import * as binding from "@realm/bindgen";

import { ClassMap } from "./ClassMap";
import { getInternal, INTERNAL } from "./internal";
import type { Object as RealmObject } from "./Object";

export type ObjectChangeSet<T> = { deleted: boolean; changedProperties: (keyof T)[] };
export type ObjectChangeCallback<T> = (object: RealmObject<T> & T, changes: ObjectChangeSet<T>) => void;

export class ObjectNotifier<T> {
  constructor(private realm: binding.Realm, private object: RealmObject<T> & T) {}

  /**
   * Storage for the momoized, lacyly created object notifier.
   */
  private [INTERNAL]!: binding.ObjectNotifier | null;

  /**
   * @internal
   * Mapping of registered listener callbacks onto the their token in the bindings ObjectNotifier.
   */
  private listeners = new Map<ObjectChangeCallback<T>, bigint>();

  /**
   * A momoized, lacyly created object notifier.
   */
  private get notifier() {
    let notifier = this[INTERNAL];
    if (notifier) {
      return notifier;
    } else {
      notifier = binding.Helpers.makeObjectNotifier(this.realm, getInternal(this.object));
      this[INTERNAL] = notifier;
      return notifier;
    }
  }

  addListener(callback: ObjectChangeCallback<T>): void {
    if (this.listeners.has(callback)) {
      // No need to add a listener twice
      return;
    }
    const properties = ClassMap.getHelpers(this.object).properties;
    const token = this.notifier.addCallback((changes) => {
      try {
        callback(this.object, {
          deleted: changes.isDeleted,
          changedProperties: changes.changedColumns.map((columnKey) => properties.getName(columnKey)),
        });
      } catch (err) {
        // Scheduling a throw on the event loop,
        // since throwing synchroniously here would result in an abort in the calling C++
        setImmediate(() => {
          throw err;
        });
      }
    }, []);
    // Store the notification token by the callback to enable later removal.
    this.listeners.set(callback, token);
  }

  removeListener(callback: ObjectChangeCallback<T>): void {
    const token = this.listeners.get(callback);
    if (typeof token !== "undefined") {
      this.notifier.removeCallback(token);
      this.listeners.delete(callback);
    }
  }

  removeAllListeners(): void {
    for (const [, token] of this.listeners) {
      this.notifier.removeCallback(token);
    }
    this.listeners.clear();
  }
}
