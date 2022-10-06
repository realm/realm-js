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
import { INTERNAL } from "./internal";
import { IllegalConstructorError } from "./errors";

const INTERNAL_REALM = Symbol("Realm.Results#realm");
const INTERNAL_TABLE = Symbol("Realm.Results#table");

export class Results<T = unknown> extends OrderedCollection<T> {
  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   * @param internal The internal representation of the results.
   * @param internalRealm The internal representation of the Realm managing these results.
   * @param internalTable The internal representation of the table.
   */
  constructor(internal: binding.Results, internalRealm: binding.Realm, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.Results)) {
      throw new IllegalConstructorError("Results");
    }
    super(internal, helpers);
    Object.defineProperties(this, {
      [INTERNAL]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
      [INTERNAL_REALM]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internalRealm,
      },
    });
  }

  /**
   * The representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.Results;

  /**
   * The Realm's representation in the binding.
   * @internal
   */
  private [INTERNAL_REALM]!: binding.Realm;

  /**
   * The Realm's representation in the binding.
   * @internal
   */
  private [INTERNAL_TABLE]!: binding.TableRef;

  get length(): number {
    return this[INTERNAL].size();
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
    return this[INTERNAL].isValid;
  }

  isEmpty(): boolean {
    return this[INTERNAL].size() === 0;
  }

  filtered(queryString: string, ...args: any[]): Results<T> {
    const { [INTERNAL]: parent, [INTERNAL_REALM]: realm, helpers } = this;
    const kpMapping = Helpers.getKeypathMapping(realm);
    // TODO: Perform a mapping of the arguments
    const query = parent.query.table.query(queryString, args, kpMapping);
    const results = parent.filter(query);
    return new Results(results, realm, helpers);
  }

  sorted(arg0?: boolean | SortDescriptor[] | string, arg1?: boolean): Results<T> {
    if (Array.isArray(arg0)) {
      const { [INTERNAL]: parent, [INTERNAL_REALM]: realm, [INTERNAL_TABLE]: table, helpers } = this;
      // Map optional "reversed" to "accending" (expected by the binding)
      const descriptors = arg0.map<[string, boolean]>(([name, reversed]) => [name, reversed ? false : true]);
      // TODO: Call `parent.sort`, avoiding property name to colkey conversion to speed up performance here.
      const results = parent.sortByNames(descriptors);
      return new Results(results, realm, helpers);
    } else if (typeof arg0 === "string") {
      return this.sorted([[arg0, arg1 === true]]);
    } else {
      throw new Error("Expected either a property name and optional bool or an array of descriptors");
    }
  }
}
