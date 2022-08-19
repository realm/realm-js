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

import { INTERNAL, getInternal } from "./internal";
import { ClassHelpers } from "./ClassMap";
import { Realm } from "./Realm";
import { Results } from "./Results";
import { CanonicalObjectSchema, Constructor, DefaultObject } from "./schema";

export const INTERNAL_HELPERS = Symbol("Realm.Object#helpers");
const INTERNAL_NOTIFIER = Symbol("Realm.Object#notifier");
const INTERNAL_LISTENERS = Symbol("Realm.Object#listeners");

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
    [INTERNAL_NOTIFIER]: {
      enumerable: false,
      configurable: false,
      writable: true,
      value: null,
    },
    [INTERNAL_LISTENERS]: {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new Map(),
    },
  });
  // TODO: Wrap in a proxy to trap keys, enabling the spread operator
  return result;
}

/**
 * Get or create the object notifier for an object.
 * NOTE: This is a free function instead of a member of RealmObject to limit conflicts with user defined properties.
 * @param obj The object to get a notifier for.
 * @returns Cached notifier for the object.
 */
function getNotifier<T>(obj: RealmObject<T>): binding.ObjectNotifier {
  let notifier = obj[INTERNAL_NOTIFIER];
  if (notifier) {
    return notifier;
  } else {
    const internalRealm = getInternal(obj.realm);
    notifier = Helpers.makeObjectNotifier(internalRealm, obj[INTERNAL]);
    obj[INTERNAL_NOTIFIER] = notifier;
    return notifier;
  }
}

/**
 * Get internal helpers.
 * NOTE: This is a free function instead of a member of RealmObject to limit conflicts with user defined properties.
 * @param obj The object to get a helpers for.
 * @returns Helpers injected onto the class by the `ClassMap`.
 */
function getHelpers<T>(obj: RealmObject<T>): ClassHelpers<T> {
  return (obj.constructor as typeof RealmObject)[INTERNAL_HELPERS] as ClassHelpers<T>;
}

export type ObjectChangeSet<T> = { deleted: boolean; changedProperties: (keyof T)[] };
export type ObjectChangeCallback<T> = (object: RealmObject<T> & T, changes: ObjectChangeSet<T>) => void;

class RealmObject<T = DefaultObject> {
  /**
   * The Realm managing the object.
   */
  public realm!: Realm;

  /**
   * The object's representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.Obj;

  /**
   * @internal
   */
  private [INTERNAL_NOTIFIER]!: binding.ObjectNotifier | null;

  /**
   * @internal
   */
  private [INTERNAL_LISTENERS]!: Map<ObjectChangeCallback<T>, bigint>;

  /**
   * This property is stored on the per class prototype when transforming the schema
   * @internal
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
    const properties = getHelpers(this).properties;
    if (this[INTERNAL_LISTENERS].has(callback)) {
      // No need to add a listener twice
      return;
    }
    const token = getNotifier(this).addCallback((changes) => {
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
    // Store the notification token by the callback to enable later removal.
    this[INTERNAL_LISTENERS].set(callback, token);
  }
  removeListener(callback: ObjectChangeCallback<T>): void {
    const token = this[INTERNAL_LISTENERS].get(callback);
    if (typeof token !== "undefined") {
      getNotifier(this).removeCallback(token);
      this[INTERNAL_LISTENERS].delete(callback);
    }
  }
  removeAllListeners(): void {
    for (const [, token] of this[INTERNAL_LISTENERS]) {
      getNotifier(this).removeCallback(token);
    }
    this[INTERNAL_LISTENERS].clear();
  }
  getPropertyType(): string {
    throw new Error("Not yet implemented");
  }
}

export { RealmObject as Object };
