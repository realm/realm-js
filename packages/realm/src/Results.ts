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
  IllegalConstructorError,
  OrderedCollection,
  Realm,
  RealmInsertionModel,
  SubscriptionOptions,
  TimeoutPromise,
  TypeHelpers,
  WaitForSync,
  assert,
  binding,
} from "./internal";

/**
 * Instances of this class are typically **live** collections returned by
 * objects() that will update as new objects are either
 * added to or deleted from the Realm that match the underlying query. Results returned by
 * snapshot()}, however, will **not** live update
 * (and listener callbacks added through addListener()
 * will thus never be called).
 */
export class Results<T = unknown> extends OrderedCollection<T> {
  /**
   * The representation in the binding.
   * @internal
   */
  public declare internal: binding.Results;
  /** @internal */
  public subscriptionName?: string;

  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   * @param internal The internal representation of the results.
   * @param internalRealm The internal representation of the Realm managing these results.
   * @param internalTable The internal representation of the table.
   */
  constructor(
    realm: Realm,
    internal: binding.Results,
    helpers: TypeHelpers,
    objectSchemaName: string | undefined | null,
  ) {
    if (arguments.length === 0 || !(internal instanceof binding.Results)) {
      throw new IllegalConstructorError("Results");
    }
    super(realm, internal, helpers, objectSchemaName);
    Object.defineProperty(this, "subscriptionName", {
      enumerable: false,
      configurable: false,
      writable: true,
    });
  }

  get length(): number {
    return this.internal.size();
  }

  set length(value: number) {
    throw new Error("Cannot assign to read only property 'length'");
  }

  description(): string {
    return binding.Helpers.getResultsDescription(this.internal);
  }

  /**
   * Bulk update objects in the collection.
   * @param propertyName The name of the property.
   * @param value The updated property value.
   * @throws {@link Error} If no property with the name exists.
   * @since 2.0.0-rc20
   */
  update(propertyName: keyof RealmInsertionModel<T>, value: RealmInsertionModel<T>[typeof propertyName]): void {
    const { classHelpers } = this;
    assert.string(propertyName);
    assert(this.type === "object" && classHelpers, "Expected a result of Objects");
    const { set } = classHelpers.properties.get(propertyName);

    const snapshot = this.internal.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const obj = snapshot.getObj(i);
      assert.instanceOf(obj, binding.Obj);
      set(obj, value);
    }
  }

  /**
   * Add this query result to the set of active subscriptions. The query will be joined
   * via an `OR` operator with any existing queries for the same type.
   *
   * @param options Options to use when adding this subscription (e.g. a name or wait behavior).
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
   *
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

  isValid(): boolean {
    return this.internal.isValid;
  }

  isEmpty(): boolean {
    return this.internal.size() === 0;
  }
}
