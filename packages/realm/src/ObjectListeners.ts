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

import { binding } from "../binding";
import { INTERNAL, type RealmObject } from "./Object";
import { Listeners } from "./Listeners";
import type { PropertyMap } from "./PropertyMap";
import { getClassHelpers } from "./ClassHelpers";

export type ObjectChangeSet<T> = {
  /**
   * Is `true` if the object has been deleted.
   */
  deleted: boolean;
  /**
   * An array of properties that have changed their value.
   */
  changedProperties: (keyof T)[];
};

export type ObjectChangeCallback<T> = (
  /**
   * The object that changed.
   */
  object: RealmObject<T> & T,
  /**
   * A dictionary with information about the changes.
   */
  changes: ObjectChangeSet<T>,
) => void;

/** @internal */
export class ObjectListeners<T> {
  /**
   * Storage for the memoized, lazily created object notifier.
   */
  private internal!: binding.ObjectNotifier | null;

  constructor(private realm: binding.Realm, private object: RealmObject<T>) {
    this.properties = getClassHelpers(this.object.constructor as typeof RealmObject).properties;
  }

  private properties: PropertyMap;

  private listeners = new Listeners<ObjectChangeCallback<T>, binding.NotificationToken, [string[] | undefined]>({
    add: (callback, keyPaths) => {
      const token = this.notifier.addCallback(
        (changes) => {
          try {
            callback(this.object as RealmObject<T> & T, {
              deleted: changes.isDeleted,
              changedProperties: changes.changedColumns.map(this.properties.getName),
            });
          } catch (err) {
            // Scheduling a throw on the event loop,
            // since throwing synchronously here would result in an abort in the calling C++
            setImmediate(() => {
              throw err;
            });
          }
        },
        keyPaths ? this.mapKeyPaths(keyPaths) : undefined,
      );
      // Get an actual NotificationToken for the bigint value
      return binding.NotificationToken.forObject(this.notifier, token);
    },
    remove(token) {
      token.unregister();
    },
  });

  /**
   * A memoized, lazily created object notifier.
   */
  private get notifier() {
    let notifier = this.internal;
    if (notifier) {
      return notifier;
    } else {
      notifier = binding.Helpers.makeObjectNotifier(this.realm, this.object[INTERNAL]);
      this.internal = notifier;
      return notifier;
    }
  }

  addListener(callback: ObjectChangeCallback<T>, keyPaths: undefined | string[]): void {
    this.listeners.add(callback, keyPaths);
  }

  removeListener(callback: ObjectChangeCallback<T>): void {
    this.listeners.remove(callback);
  }

  removeAllListeners(): void {
    this.listeners.removeAll();
  }

  private mapKeyPaths(keyPaths: string[]) {
    return this.realm.createKeyPathArray(this.object.objectSchema().name, keyPaths);
  }
}
