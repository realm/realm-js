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
import { Helpers } from "@realm/bindgen";

import { ClassHelpers } from "./ClassMap";
import { Realm, getInternal as getRealmInternal } from "./Realm";
import { Results } from "./Results";
import { CanonicalObjectSchema, Constructor, DefaultObject, RealmObjectConstructor } from "./schema";

export const INTERNAL_HELPERS = Symbol("Realm.Object#helpers");
const INTERNAL = Symbol("Realm.Object#internal");
const INTERNAL_NOTIFIER = Symbol("Realm.Object#notifier");

export function getInternal<T>(object: InstanceType<RealmObjectConstructor<T>>): binding.Obj {
  return object[INTERNAL];
}

export function setInternal(object: InstanceType<RealmObjectConstructor>, internal: binding.Obj) {
  object[INTERNAL] = internal;
}

export function createWrapper<T extends RealmObject>(
  realm: Realm,
  constructor: Constructor,
  internal: binding.Obj,
): InstanceType<Constructor<T>> {
  const result = Object.create(constructor.prototype);
  Object.defineProperties(result, {
    realm: {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    },
    [INTERNAL]: {
      enumerable: false,
      configurable: false,
      writable: false,
      value: internal,
    },
  });
  // TODO: Wrap in a proxy to trap keys, enabling the spread operator
  return result;
}

export type ObjectChangeSet<T> = { deleted: boolean; changedProperties: (keyof T)[] };
export type ObjectChangeCallback<T> = (object: RealmObject<T> & T, changes: ObjectChangeSet<T>) => void;

class RealmObject<T = DefaultObject> {
  /**
   * The object's representation in the underlying database.
   */
  public realm!: Realm;

  /**
   * The object's representation in the underlying database.
   */
  private [INTERNAL]!: binding.Obj;

  /**
   * This property is stored on the per class prototype when transforming the schema
   */
  private static [INTERNAL_HELPERS]: ClassHelpers<unknown>;

  /**
   * FIXME: Use keyof in this methods return signature type signature
   */
  keys(): string[] {
    throw new Error("Not yet implemented");
  }
  /**
   * FIXME: Use keyof in this methods return signature type signature
   */
  entries(): [string, unknown][] {
    throw new Error("Not yet implemented");
  }
  toJSON(): unknown {
    throw new Error("Not yet implemented");
  }
  isValid(): boolean {
    return this[INTERNAL] && this[INTERNAL].isValid;
  }
  objectSchema(): CanonicalObjectSchema<T> {
    throw new Error("Not yet implemented");
  }
  linkingObjects<T>(): Results<T> {
    throw new Error("Not yet implemented");
  }
  linkingObjectsCount(): number {
    throw new Error("Not yet implemented");
  }
  _objectId(): string {
    throw new Error("Not yet implemented");
  }
  addListener(callback: ObjectChangeCallback<T>): void {
    const properties = this.helpers.properties;
    this.notifier.addCallback((changes) => {
      try {
        callback(this as unknown as RealmObject<T> & T, {
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
  }
  removeListener(): void {
    throw new Error("Not yet implemented");
  }
  removeAllListeners(): void {
    throw new Error("Not yet implemented");
  }
  getPropertyType(): string {
    throw new Error("Not yet implemented");
  }

  private [INTERNAL_NOTIFIER]: binding.ObjectNotifier | null = null;

  private get notifier(): binding.ObjectNotifier {
    let notifier = this[INTERNAL_NOTIFIER];
    if (notifier) {
      return notifier;
    } else {
      const internalRealm = getRealmInternal(this.realm);
      notifier = Helpers.makeObjectNotifier(internalRealm, this[INTERNAL]);
      return notifier;
    }
  }

  private get helpers() {
    return (this.constructor as typeof RealmObject)[INTERNAL_HELPERS];
  }
}

export { RealmObject as Object };
