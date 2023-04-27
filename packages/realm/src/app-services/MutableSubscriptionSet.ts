////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { BaseSubscriptionSet, Realm, Results, Subscription, SubscriptionSet, assert, binding } from "../internal";

export enum WaitForSync {
  /**
   * Waits until the objects have been downloaded from the server
   * the first time the subscription is created. If the subscription
   * already exists, the `Results` is returned immediately.
   */
  FirstTime = "first-time",
  /**
   * Always waits until the objects have been downloaded from the server.
   */
  Always = "always",
  /**
   * Never waits for the download to complete, but keeps downloading the
   * objects in the background.
   */
  Never = "never",
}

/**
 * Options for {@link MutableSubscriptionSet.add}.
 */
export type SubscriptionOptions = {
  /**
   * Sets the name of the subscription being added. This allows you to later refer
   * to the subscription by name, e.g. when calling {@link MutableSubscriptionSet.removeByName}.
   */
  name?: string;
  /**
   * By default, adding a subscription with the same name as an existing one
   * but a different query will update the existing subscription with the new
   * query. If `throwOnUpdate` is set to true, adding a subscription with the
   * same name but a different query will instead throw an exception.
   * Adding a subscription with the same name and query is always a no-op.
   */
  throwOnUpdate?: boolean;
  /**
   * Specifies how to wait or not wait for subscribed objects to be downloaded.
   */
  behavior?: WaitForSync;
  /**
   * The maximum number of milliseconds to wait for objects to be downloaded.
   * If the time exceeds this limit, the `Results` is returned and the download
   * continues in the background.
   */
  timeout?: number;
};

/**
 * The mutable version of a given SubscriptionSet. The {@link MutableSubscriptionSet}
 * instance can only be used from inside the {@link SubscriptionSet.update} callback.
 */
export class MutableSubscriptionSet extends BaseSubscriptionSet {
  // This class overrides the BaseSubscriptionSet's `internal` field (by having
  // `declare internal`) in order to be able to write `this.internal.someOwnMember`
  // rather than `(this.internal as binding.MutableSyncSubscriptionSet).someOwnMember`.
  // (`this.internal = internal` cannot be used in the constructor due to the proxy
  // handler in BaseSubscriptionSet making it non-writable.)
  /**@internal */
  protected declare internal: binding.MutableSyncSubscriptionSet;

  /**@internal */
  constructor(/**@internal */ internal: binding.MutableSyncSubscriptionSet) {
    super(internal);
  }

  /**
   * Add a query to the set of active subscriptions. The query will be joined via
   * an `OR` operator with any existing queries for the same type.
   *
   * A query is represented by a {@link Results} instance returned from {@link Realm.objects},
   * for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.
   *
   * @param query A {@link Results} instance representing the query to subscribe to.
   * @param options An optional {@link SubscriptionOptions} object containing options to
   *  use when adding this subscription (e.g. to give the subscription a name).
   * @returns A `Subscription` instance for the new subscription.
   */
  add(query: Results<any>, options?: SubscriptionOptions): Subscription {
    assert.instanceOf(query, Results, "query");
    if (options) {
      validateSubscriptionOptions(options);
    }

    const subscriptions = this.internal;
    const results = query.internal;
    const queryInternal = results.query;

    if (options?.throwOnUpdate && options.name) {
      const existingSubscription = subscriptions.findByName(options.name);
      if (existingSubscription) {
        const isSameQuery =
          existingSubscription.queryString === queryInternal.description &&
          existingSubscription.objectClassName === results.objectType;
        assert(
          isSameQuery,
          `A subscription with the name '${options.name}' already exists but has a different query. If you meant to update it, remove 'throwOnUpdate: true' from the subscription options.`,
        );
      }
    }

    const [subscription] = options?.name
      ? subscriptions.insertOrAssignByName(options.name, queryInternal)
      : subscriptions.insertOrAssignByQuery(queryInternal);

    return new Subscription(subscription);
  }

  /**
   * Remove a subscription with the given query from the SubscriptionSet.
   *
   * @param query A {@link Results} instance representing the query to remove a subscription to.
   * @returns `true` if the subscription was removed, `false` if it was not found.
   */
  remove(query: Results<any>): boolean {
    assert.instanceOf(query, Results, "query");

    return this.internal.eraseByQuery(query.internal.query);
  }

  /**
   * Remove a subscription with the given name from the SubscriptionSet.
   *
   * @param name The name of the subscription to remove.
   * @returns `true` if the subscription was removed, `false` if it was not found.
   */
  removeByName(name: string): boolean {
    assert.string(name, "name");

    return this.internal.eraseByName(name);
  }

  /**
   * Remove the specified subscription from the SubscriptionSet.
   *
   * @param subscription The {@link Subscription} instance to remove.
   * @returns `true` if the subscription was removed, `false` if it was not found.
   */
  removeSubscription(subscription: Subscription): boolean {
    assert.instanceOf(subscription, Subscription, "subscription");

    return binding.Helpers.eraseSubscription(this.internal, subscription.internal);
  }

  /**
   * Remove all subscriptions for the specified object type from the SubscriptionSet.
   *
   * @param objectType The string name of the object type to remove all subscriptions for.
   * @returns The number of subscriptions removed.
   */
  removeByObjectType(objectType: string): number {
    assert.string(objectType, "objectType");

    return this.removeByPredicate((subscription) => subscription.objectClassName === objectType);
  }

  /**
   * Remove all subscriptions from the SubscriptionSet.
   *
   * @param unnamedOnly Whether to only remove unnamed/anonymous subscriptions. (Default: `false`)
   * @returns The number of subscriptions removed.
   */
  removeAll(unnamedOnly = false): number {
    if (unnamedOnly) {
      return this.removeByPredicate((subscription) => !subscription.name);
    }
    const numRemoved = this.internal.size;
    this.internal.clear();

    return numRemoved;
  }

  /** @internal */
  private removeByPredicate(predicate: (subscription: binding.SyncSubscription) => boolean): number {
    // TODO: This is currently O(n^2) because each erase call is O(n). Once Core has
    //       fixed https://github.com/realm/realm-core/issues/6241, we can update this.

    // Removing the subscription (calling `eraseSubscription()`) invalidates all current
    // iterators, so it would be illegal to continue iterating. Instead, we push it to an
    // array to remove later.
    const subscriptionsToRemove: binding.SyncSubscription[] = [];
    for (const subscription of this.internal) {
      if (predicate(subscription)) {
        subscriptionsToRemove.push(subscription);
      }
    }
    let numRemoved = 0;
    for (const subscription of subscriptionsToRemove) {
      const isRemoved = binding.Helpers.eraseSubscription(this.internal, subscription);
      if (isRemoved) {
        numRemoved++;
      }
    }

    return numRemoved;
  }
}

function validateSubscriptionOptions(input: unknown): asserts input is SubscriptionOptions {
  assert.object(input, "options", { allowArrays: false });
  if (input.name !== undefined) {
    assert.string(input.name, "'name' on 'SubscriptionOptions'");
  }
  if (input.throwOnUpdate !== undefined) {
    assert.boolean(input.throwOnUpdate, "'throwOnUpdate' on 'SubscriptionOptions'");
  }
}
