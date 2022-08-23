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

import { INTERNAL, getInternal } from "./internal";
import { ClassHelpers, INTERNAL_HELPERS } from "./ClassMap";
import { Realm } from "./Realm";
import { Results } from "./Results";
import { CanonicalObjectSchema, Constructor, DefaultObject } from "./schema";
import { ObjectChangeCallback, ObjectNotifier } from "./ObjectNotifier";

const INTERNAL_NOTIFIER = Symbol("Realm.Object#notifier");

class RealmObject<T = DefaultObject> {
  /**
   * @internal
   * This property is stored on the per class prototype when transforming the schema.
   */
  public static [INTERNAL_HELPERS]: ClassHelpers<unknown>;

  /**
   * @internal
   * Create a `RealmObject` wrapping an `Obj` from the binding.
   * @param realm The Realm managing the object.
   * @param constructor The constructor of the object.
   * @param internal The internal Obj from the binding.
   * @returns Returns a wrapping RealmObject.
   */
  public static create<T extends RealmObject>(
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
        value: new ObjectNotifier(getInternal(realm), result),
      },
    });
    // TODO: Wrap in a proxy to trap keys, enabling the spread operator
    return result;
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
  private readonly [INTERNAL_NOTIFIER]!: ObjectNotifier<T>;

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

  /**
   * @deprecated
   * @internal
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
    return this[INTERNAL].key.value.toString();
  }

  addListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_NOTIFIER].addListener(callback);
  }
  removeListener(callback: ObjectChangeCallback<T>): void {
    this[INTERNAL_NOTIFIER].removeListener(callback);
  }
  removeAllListeners(): void {
    this[INTERNAL_NOTIFIER].removeAllListeners();
  }
  getPropertyType(): string {
    throw new Error("Not yet implemented");
  }
}

export { RealmObject as Object };
