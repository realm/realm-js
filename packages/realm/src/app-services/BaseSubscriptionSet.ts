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

import { MutableSubscriptionSet, Realm, Subscription, SubscriptionSet, assert, binding } from "../internal";

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
   * of the {@link SubscriptionSet}. You should not use a superseded SubscriptionSet,
   * and instead obtain a new instance from {@link Realm.subscriptions}.
   */
  Superseded = "superseded",
}

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: false };
const PROXY_HANDLER: ProxyHandler<BaseSubscriptionSet> = {
  get(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
    }
    if (typeof prop === "string") {
      const BASE = 10;
      const index = Number.parseInt(prop, BASE);
      // TODO: Consider catching an error from access out of bounds, instead of checking the length, to optimize for the hot path
      if (!Number.isNaN(index) && index >= 0 && index < target.length) {
        return target.get(index);
      }
    }
  },
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    } else if (typeof prop === "string") {
      const BASE = 10;
      const index = Number.parseInt(prop, BASE);
      if (index < target.length) {
        return DEFAULT_PROPERTY_DESCRIPTOR;
      }
    }
  },
};

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
  protected constructor(/**@internal */ protected internal: binding.SyncSubscriptionSet) {
    Object.defineProperties(this, {
      internal: {
        enumerable: false,
        configurable: false,
        // `internal` needs to be writable due to `SubscriptionSet.updateSync`
        // overwriting `this.internal` with the new committed set.
        writable: true,
      },
    });
    return new Proxy<BaseSubscriptionSet>(this, PROXY_HANDLER);
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
      case 6: // AwaitingMark
        return SubscriptionsState.Pending;
      case 3:
        return SubscriptionsState.Complete;
      case 4:
        return SubscriptionsState.Error;
      case 5:
        return SubscriptionsState.Superseded;
      default:
        throw new Error(`Unsupported SubscriptionsState value: ${stateValue}`);
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
   * Get a Subscription by index.
   * (Needed by the ProxyHandler when the subscription set is accessed by index.)
   *
   * @param index The index.
   * @returns The subscription.
   * @internal
   */
  get(index: number): Subscription {
    return new Subscription(this.internal.at(index));
  }

  /**
   * Get an iterator that contains the keys for each index in the subscription set.
   *
   * @internal
   */
  *keys() {
    const size = this.length;
    for (let i = 0; i < size; i++) {
      yield i;
    }
  }

  /**
   * Makes the set iterable.
   */
  *[Symbol.iterator](): IterableIterator<Subscription> {
    for (const subscription of this.internal) {
      yield new Subscription(subscription);
    }
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
