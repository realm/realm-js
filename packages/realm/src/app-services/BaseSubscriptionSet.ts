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

import { MutableSubscriptionSet, Realm, Subscription, assert, binding } from "../internal";

/**
 * Enum representing the state of a {@link SubscriptionSet}.
 */
export enum SubscriptionsState {
  /**
   * The subscription update has been persisted locally, but the server hasn't
   * yet returned all the data that matched the updated subscription queries.
   */
  Pending = "pending",

  /**
   * The server has acknowledged the subscription and sent all the data that
   * matched the subscription queries at the time the SubscriptionSet was
   * updated. The server is now in steady-state synchronization mode where it
   * will stream updates as they come.
   */
  Complete = "complete",

  /**
   * The server has returned an error and synchronization is paused for this
   * Realm. To view the actual error, use `Subscriptions.error`.
   *
   * You can still use {@link SubscriptionSet.update} to update the subscriptions,
   * and if the new update doesn't trigger an error, synchronization will be restarted.
   */
  Error = "error",

  /**
   * The SubscriptionSet has been superseded by an updated one. This typically means
   * that someone has called {@link SubscriptionSet.update} on a different instance
   * of the `Subscriptions`. You should not use a superseded SubscriptionSet,
   * and instead obtain a new instance from {@link Realm.subscriptions}.
   */
  Superseded = "superseded",
}

/**
 * Class representing the common functionality for the {@link SubscriptionSet} and
 * {@link MutableSubscriptionSet} classes.
 *
 * The {@link Subscription}s in a SubscriptionSet can be accessed as an array, e.g.
 * `realm.subscriptions[0]`. This array is readonly – SubscriptionSets can only be
 * modified inside a {@link SubscriptionSet.update} callback.
 */
export abstract class BaseSubscriptionSet {
  // Enables index accessing when combined with the proxy handler's `get()` method
  readonly [n: number]: Subscription;

  /**@internal */
  protected internal: binding.SyncSubscriptionSet;

  /**@internal */
  protected constructor(internal: binding.SyncSubscriptionSet) {
    this.internal = internal;
  }

  /**
   * Determine whether the SubscriptionSet is empty.
   *
   * @returns `true` if there are no subscriptions in the set, otherwise `false`.
   */
  get isEmpty(): boolean {
    return this.internal.size === 0;
  }

  /**
   * Get the version of the SubscriptionSet.
   *
   * @returns The version of the SubscriptionSet. This is incremented every time an
   *  {@link SubscriptionSet.update} is applied.
   */
  get version(): number {
    return Number(this.internal.version);
  }

  /**
   * Get the state of the SubscriptionSet.
   *
   * @returns The state of the SubscriptionSet.
   */
  get state(): SubscriptionsState {
    const stateValue = this.internal.state.valueOf();
    switch (stateValue) {
      case 0: // Uncommitted
      case 1: // Pending
      case 2: // Bootstrapping
      case 6: // AwaitingMark   // TODO: This was not used in the previous implementation. Keep?
        return SubscriptionsState.Pending;
      case 3:
        return SubscriptionsState.Complete;
      case 4:
        return SubscriptionsState.Error;
      case 5:
        return SubscriptionsState.Superseded;
      default:
        throw new Error(`Unsupported SubscriptionsState value: ${stateValue}`); // TODO: How to handle?
    }
  }

  /**
   * Get the state of the SubscriptionSet.
   *
   * @returns If `state` is {@link SubscriptionsState.Error}, this will return a `string`
   *  representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.
   */
  get error(): string | null {
    return this.state === SubscriptionsState.Error ? this.internal.errorStr : null;
  }

  /**
   * Get the number of subscriptions in the set.
   *
   * @returns The number of subscriptions in the set.
   * @internal
   */
  get length(): number {
    return this.internal.size;
  }

  /**
   * Find a subscription by name.
   *
   * @param name The name to search for.
   * @returns The named subscription, or `null` if the subscription is not found.
   */
  findByName(name: string): Subscription | null {
    assert.string(name, "the argument to 'findByName()'");

    const subscription = this.internal.findByName(name);
    return subscription ? new Subscription(subscription) : null;
  }

  /**
   * Find a subscription by query. Will match both named and unnamed subscriptions.
   *
   * @param query The query to search for, represented as a {@link Realm.Results} instance,
   *  e.g. `Realm.objects("Cat").filtered("age > 10")`.
   * @returns The subscription with the specified query, or `null` if the subscription is not found.
   */
  findByQuery<T>(query: Realm.Results<T & Realm.Object>): Subscription | null {
    assert.instanceOf(query, Realm.Results, "the argument to 'findByQuery()'");

    const subscription = this.internal.findByQuery(query.internal.query);
    return subscription ? new Subscription(subscription) : null;
  }
}
