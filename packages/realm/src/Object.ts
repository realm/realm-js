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

import { INTERNAL, getInternal } from "./internal";
import { Realm } from "./Realm";
import { Results } from "./Results";
import { CanonicalObjectSchema, Constructor, DefaultObject } from "./schema";
import { ObjectChangeCallback, ObjectListeners } from "./ObjectListeners";
import { INTERNAL_HELPERS, ClassHelpers } from "./ClassHelpers";

const INTERNAL_LISTENERS = Symbol("Realm.Object#listeners");
const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: true };

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const PROXY_HANDLER: ProxyHandler<RealmObject<any>> = {
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (typeof prop === "string" && target.keys().includes(prop)) {
      return DEFAULT_PROPERTY_DESCRIPTOR;
    } else {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  },
};

class RealmObject<T = DefaultObject> {
  /**
   * @internal
   * This property is stored on the per class prototype when transforming the schema.
   */
  public static [INTERNAL_HELPERS]: ClassHelpers<unknown>;

  /**
   * Create a `RealmObject` wrapping an `Obj` from the binding.
   * @internal
   * @param realm The Realm managing the object.
   * @param constructor The constructor of the object.
   * @param internal The internal Obj from the binding.
   */
  public constructor(realm: Realm, constructor: Constructor, internal: binding.Obj) {
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
      [INTERNAL_LISTENERS]: {
        enumerable: false,
        configurable: false,
        writable: true,
        value: new ObjectListeners(getInternal(realm), result),
      },
    });
    // TODO: Wrap in a proxy to trap keys, enabling the spread operator
    return new Proxy<RealmObject<T>>(result, PROXY_HANDLER);
    // return result;
  }

  /**
   * The Realm managing the object.
   */
  public readonly realm!: Realm;

  /**
   * @internal
   * The object's representation in the binding.
   */
  public readonly [INTERNAL]!: binding.Obj;

  /**
   * @internal
   * Wrapper for the object notifier.
   */
  private readonly [INTERNAL_LISTENERS]!: ObjectListeners<T>;

  // TODO: Find a way to bind this in
  keys(): string[] {
    throw new Error("This is expected to have a per-class implementation");
  }

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

  /**
   * @deprecated
   * TODO: Remove completely once the type tests are obandend.
   */
  _objectId(): string {
    throw new Error("This is now removed!");
  }

  /**
   * @internal
   * The ObjKey of the internal Obj.
   */
  _objectKey(): string {
    return this[INTERNAL].key.toString();
  }

  addListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_LISTENERS].addListener(callback);
  }
  removeListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_LISTENERS].removeListener(callback);
  }
  removeAllListeners(): void {
    this[INTERNAL_LISTENERS].removeAllListeners();
  }
  getPropertyType(): string {
    throw new Error("Not yet implemented");
  }
}

export { RealmObject as Object };
