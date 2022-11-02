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

import { INTERNAL, Listeners, PropertyMap, RealmObject, binding, getClassHelpers } from "./internal";

export type ObjectChangeSet<T> = { deleted: boolean; changedProperties: (keyof T)[] };
export type ObjectChangeCallback<T> = (object: RealmObject<T> & T, changes: ObjectChangeSet<T>) => void;

/** @internal */
export class ObjectListeners<T> {
  /**
   * Storage for the momoized, lacyly created object notifier.
   */
  private internal!: binding.ObjectNotifier | null;

  constructor(private realm: binding.Realm, private object: RealmObject<T> & T) {
    this.properties = getClassHelpers(this.object.constructor as typeof RealmObject).properties;
  }

  private properties: PropertyMap;

  private listeners = new Listeners<ObjectChangeCallback<T>, binding.NotificationToken>({
    register: (callback) => {
      const token = this.notifier.addCallback((changes) => {
        try {
          callback(this.object, {
            deleted: changes.isDeleted,
            changedProperties: changes.changedColumns.map(this.properties.getName),
          });
        } catch (err) {
          // Scheduling a throw on the event loop,
          // since throwing synchroniously here would result in an abort in the calling C++
          setImmediate(() => {
            throw err;
          });
        }
      }, []);
      // Get an actual NotificationToken for the bigint value
      return binding.NotificationToken.forObject(this.notifier, token);
    },
    unregister(token) {
      token.unregister();
    },
  });

  /**
   * A momoized, lacyly created object notifier.
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

  addListener(callback: ObjectChangeCallback<T>): void {
    this.listeners.add(callback);
  }

  removeListener(callback: ObjectChangeCallback<T>): void {
    this.listeners.remove(callback);
  }

  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
