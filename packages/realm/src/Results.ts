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
import { Helpers } from "./binding";

import { OrderedCollection, SortDescriptor, OrderedCollectionHelpers } from "./OrderedCollection";
import { getInternal } from "./internal";
import { IllegalConstructorError } from "./errors";
import type { Realm } from "./Realm";

export class Results<T = unknown> extends OrderedCollection<T> {
  /**
   * The Realm's representation in the binding.
   * @internal
   */
  private realm!: Realm;

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
    super(internal, helpers);
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
  update(property: string, value: any): void {
    throw new Error("Not yet implemented");
  }

  isValid(): boolean {
    return this.internal.isValid;
  }

  isEmpty(): boolean {
    return this.internal.size() === 0;
  }

  filtered(queryString: string, ...args: any[]): Results<T> {
    const { internal: parent, realm, helpers } = this;
    const kpMapping = Helpers.getKeypathMapping(realm.internal);
    // TODO: Perform a mapping of the arguments
    const query = parent.query.table.query(queryString, args, kpMapping);
    const results = parent.filter(query);
    return new Results(realm, results, helpers);
  }

  sorted(arg0?: boolean | SortDescriptor[] | string, arg1?: boolean): Results<T> {
    if (Array.isArray(arg0)) {
      const { internal: parent, realm, helpers } = this;
      // Map optional "reversed" to "accending" (expected by the binding)
      const descriptors = arg0.map<[string, boolean]>(([name, reversed]) => [name, reversed ? false : true]);
      // TODO: Call `parent.sort`, avoiding property name to colkey conversion to speed up performance here.
      const results = parent.sortByNames(descriptors);
      return new Results(realm, results, helpers);
    } else if (typeof arg0 === "string") {
      return this.sorted([[arg0, arg1 === true]]);
    } else {
      throw new Error("Expected either a property name and optional bool or an array of descriptors");
    }
  }
}
