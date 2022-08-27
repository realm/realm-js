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

import * as binding from "./binding";
import { NotificationToken } from "./binding";

import { ClassMap } from "./ClassMap";
import { getInternal, INTERNAL } from "./internal";
import { Listeners } from "./Listeners";
import type { Object as RealmObject } from "./Object";
import { PropertyMap } from "./PropertyMap";

export type ObjectChangeSet<T> = { deleted: boolean; changedProperties: (keyof T)[] };
export type ObjectChangeCallback<T> = (object: RealmObject<T> & T, changes: ObjectChangeSet<T>) => void;

export class ObjectListeners<T> {
  constructor(private realm: binding.Realm, private object: RealmObject<T> & T) {
    this.properties = ClassMap.getHelpers(this.object).properties;
  }

  /**
   * Storage for the momoized, lacyly created object notifier.
   */
  private [INTERNAL]!: binding.ObjectNotifier | null;

  private properties: PropertyMap<T>;

  private listeners = new Listeners<ObjectChangeCallback<T>>((callback) => {
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
    return NotificationToken.forObject(this.notifier, token);
  });

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
    this.listeners.add(callback);
  }

  removeListener(callback: ObjectChangeCallback<T>): void {
    this.listeners.remove(callback);
  }

  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
