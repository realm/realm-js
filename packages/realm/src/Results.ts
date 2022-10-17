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

import {
  binding,
  OrderedCollection,
  OrderedCollectionHelpers,
  IllegalConstructorError,
  Realm,
  assert,
} from "./internal";

export class Results<T = unknown> extends OrderedCollection<T> {
  /**
   * The representation in the binding.
   * @internal
   */
  public internal!: binding.Results;

  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   * @param internal The internal representation of the results.
   * @param internalRealm The internal representation of the Realm managing these results.
   * @param internalTable The internal representation of the table.
   */
  constructor(realm: Realm, internal: binding.Results, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.Results)) {
      throw new IllegalConstructorError("Results");
    }
    super(realm, internal, helpers);
    Object.defineProperties(this, {
      internal: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
      realm: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: realm,
      },
    });
  }

  get length(): number {
    return this.internal.size();
  }

  /**
   * Bulk update objects in the collection.
   * @param  {string} property
   * @param  {any} value
   * @returns void
   */
  update(propertyName: keyof T, value: T[typeof propertyName]): void {
    const {
      classHelpers,
      helpers: { get },
    } = this;
    assert.string(propertyName);
    assert(this.type === "object" && classHelpers, "Expected a result of Objects");
    const { set } = classHelpers.properties.get(propertyName);

    const snapshot = this.results.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const obj = get(snapshot, i);
      assert.instanceOf(obj, binding.Obj);
      set(obj, value);
    }
  }

  isValid(): boolean {
    return this.internal.isValid;
  }

  isEmpty(): boolean {
    return this.internal.size() === 0;
  }
}
