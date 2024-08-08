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

import { binding } from "../binding";
import { assert } from "./assert";
import { IllegalConstructorError } from "./errors";
import { injectIndirect } from "./indirect";
import { COLLECTION_ACCESSOR as ACCESSOR } from "./Collection";
import { OrderedCollection } from "./OrderedCollection";
import type { Realm } from "./Realm";
import { type SubscriptionOptions, WaitForSync } from "./app-services/MutableSubscriptionSet";
import { TimeoutPromise } from "./TimeoutPromise";
import type { TypeHelpers } from "./TypeHelpers";
import type { Unmanaged } from "./Unmanaged";
import type { ResultsAccessor } from "./collection-accessors/Results";

/**
 * Instances of this class are typically **live** collections returned by
 * objects() that will update as new objects are either
 * added to or deleted from the Realm that match the underlying query. Results returned by
 * snapshot()}, however, will **not** live update
 * (and listener callbacks added through addListener()
 * will thus never be called).
 * @see https://www.mongodb.com/docs/realm/sdk/react-native/model-data/data-types/collections/
 */
export class Results<T = unknown> extends OrderedCollection<
  T,
  [number, T],
  /** @internal */
  ResultsAccessor<T>
> {
  /**
   * The representation in the binding.
   * @internal
   */
  public declare readonly internal: binding.Results;

  /** @internal */
  public subscriptionName?: string;

  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   */
  constructor(realm: Realm, internal: binding.Results, accessor: ResultsAccessor<T>, typeHelpers: TypeHelpers<T>) {
    if (arguments.length === 0 || !(internal instanceof binding.Results)) {
      throw new IllegalConstructorError("Results");
    }
    super(realm, internal, accessor, typeHelpers);

    Object.defineProperty(this, "internal", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: internal,
    });
    Object.defineProperty(this, "realm", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    });
    Object.defineProperty(this, "subscriptionName", {
      enumerable: false,
      configurable: false,
      writable: true,
    });
  }

  /** @internal */
  public get(index: number): T {
    return this[ACCESSOR].get(this.internal, index);
  }

  /** @internal */
  public set(): never {
    throw new Error("Modifying a Results collection is not supported.");
  }

  get length(): number {
    return this.internal.size();
  }

  set length(value: number) {
    throw new Error("Cannot assign to read only property 'length'");
  }

  /*
   * @returns A string representation of the query and sorting bound to the results.
   */
  description(): string {
    return binding.Helpers.getResultsDescription(this.internal);
  }

  /**
   * Bulk update objects in the collection.
   * @param propertyName - The name of the property.
   * @param value - The updated property value.
   * @throws An {@link Error} if no property with the name exists.
   * @since 2.0.0
   */
  update(propertyName: keyof Unmanaged<T>, value: Unmanaged<T>[typeof propertyName]): void {
    assert.string(propertyName);
    const { classHelpers, type, results } = this;
    assert(type === "object" && classHelpers, "Expected a result of Objects");
    const { set: objectSet } = classHelpers.properties.get(propertyName);
    const snapshot = results.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const obj = snapshot.getObj(i);
      assert.instanceOf(obj, binding.Obj);
      objectSet(obj, value);
    }
  }

  /**
   * Add this query result to the set of active subscriptions. The query will be joined
   * via an `OR` operator with any existing queries for the same type.
   * @param options - Options to use when adding this subscription (e.g. a name or wait behavior).
   * @returns A promise that resolves to this {@link Results} instance.
   * @experimental This API is experimental and may change or be removed.
   */
  async subscribe(options: SubscriptionOptions = { behavior: WaitForSync.FirstTime }): Promise<this> {
    const subs = this.realm.subscriptions;
    const shouldWait =
      options.behavior === WaitForSync.Always || (options.behavior === WaitForSync.FirstTime && !subs.exists(this));
    if (shouldWait) {
      if (typeof options.timeout === "number") {
        await new TimeoutPromise(
          subs.update((mutableSubs) => mutableSubs.add(this, options)),
          { ms: options.timeout, rejectOnTimeout: false },
        );
      } else {
        await subs.update((mutableSubs) => mutableSubs.add(this, options));
      }
    } else {
      subs.updateNoWait((mutableSubs) => mutableSubs.add(this, options));
    }

    return this;
  }

  /**
   * Unsubscribe from this query result. It returns immediately without waiting
   * for synchronization.
   *
   * If the subscription is unnamed, the subscription matching the query will
   * be removed.
   * @experimental This API is experimental and may change or be removed.
   */
  unsubscribe(): void {
    this.realm.subscriptions.updateNoWait((mutableSubs) => {
      if (this.subscriptionName) {
        mutableSubs.removeByName(this.subscriptionName);
      } else {
        mutableSubs.remove(this);
      }
    });
  }

  /**
   * Checks if this results collection has not been deleted and is part of a valid Realm.
   * @returns `true` if the collection can be safely accessed.
   */
  isValid(): boolean {
    return this.internal.isValid;
  }

  /**
   * Checks if this collection result is empty.
   * @returns `true` if the collection result is empty, `false` if not.
   */
  isEmpty(): boolean {
    return this.internal.size() === 0;
  }
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Useful for APIs taking any `Results` */
export type AnyResults = Results<any>;

injectIndirect("Results", Results);
