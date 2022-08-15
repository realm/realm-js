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
import { Realm } from "./Realm";

import { Results } from "./Results";
import { CanonicalObjectSchema, Constructor, DefaultObject } from "./schema";

const INTERNAL = Symbol("Realm.Object#internal");

export function getInternal(object: InstanceType<Constructor>): binding.Obj {
  return object[INTERNAL];
}

export function setInternal(object: InstanceType<Constructor>, internal: binding.Obj) {
  object[INTERNAL] = internal;
}

export function createWrapper(realm: Realm, constructor: Constructor, internal: binding.Obj) {
  const result = Object.create(constructor.prototype);
  result.realm = realm;
  result[INTERNAL] = internal;
  // TODO: Wrap in a proxy to trap keys, enabling the spread operator
  return result;
}

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
  addListener(): void {
    throw new Error("Not yet implemented");
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
}

export { RealmObject as Object };
