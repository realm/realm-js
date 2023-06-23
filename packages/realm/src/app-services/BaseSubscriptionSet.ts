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

import {
  AnyResults,
  MutableSubscriptionSet,
  Realm,
  RealmObject,
  Results,
  Subscription,
  SubscriptionSet,
  assert,
  binding,
} from "../internal";

/**
 * Enum representing the state of a {@link SubscriptionSet}.
 */
export enum SubscriptionSetState {
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

/**
 * @deprecated Will be removed in v13.0.0. Please use {@link SubscriptionSetState}.
 */
export enum SubscriptionsState {
  Pending = SubscriptionSetState.Pending,
  Complete = SubscriptionSetState.Complete,
  Error = SubscriptionSetState.Error,
  Superseded = SubscriptionSetState.Superseded,
}

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: false };
const PROXY_HANDLER: ProxyHandler<BaseSubscriptionSet> = {
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
    if (typeof prop === "string") {
      const BASE = 10;
      const index = Number.parseInt(prop, BASE);
      if (index >= 0 && index < target.length) {
        return DEFAULT_PROPERTY_DESCRIPTOR;
      }
    }
  },
  // Not defining `set()` here will make e.g. `mySubscriptions[0] = someValue` a no-op
  // if strict mode (`"use strict"`) is used, or throw a TypeError if it is not used.
};

/**
 * Class representing the common functionality for the {@link SubscriptionSet} and
 * {@link MutableSubscriptionSet} classes.
 *
 * SubscriptionSets can only be modified inside a {@link SubscriptionSet.update} callback.
 *
 * The SubscriptionSet is an iterable; thus, the contained {@link Subscription}s can be
 * accessed in `for-of` loops or spread into an `Array` for access to the ECMAScript
 * Array API, e.g. `[...realm.subscriptions][0]`.
 */
export abstract class BaseSubscriptionSet {
  /** @internal */
  protected constructor(/** @internal */ protected internal: binding.SyncSubscriptionSet) {
    Object.defineProperty(this, "internal", {
      enumerable: false,
      configurable: false,
      // `internal` needs to be writable due to `SubscriptionSet.updateNoWait()`
      // overwriting `this.internal` with the new committed set.
      writable: true,
    });
    return new Proxy<BaseSubscriptionSet>(this, PROXY_HANDLER);
  }

  /**
   * Whether there are no subscriptions in the set.
   */
  get isEmpty(): boolean {
    return this.internal.size === 0;
  }

  /**
   * The version of the SubscriptionSet. This is incremented every time a
   * {@link SubscriptionSet.update} is applied.
   */
  get version(): number {
    return Number(this.internal.version);
  }

  /**
   * The state of the SubscriptionSet.
   */
  get state(): SubscriptionSetState {
    const state = this.internal.state;
    switch (state) {
      case binding.SyncSubscriptionSetState.Uncommitted:
      case binding.SyncSubscriptionSetState.Pending:
      case binding.SyncSubscriptionSetState.Bootstrapping:
      case binding.SyncSubscriptionSetState.AwaitingMark:
        return SubscriptionSetState.Pending;
      case binding.SyncSubscriptionSetState.Complete:
        return SubscriptionSetState.Complete;
      case binding.SyncSubscriptionSetState.Error:
        return SubscriptionSetState.Error;
      case binding.SyncSubscriptionSetState.Superseded:
        return SubscriptionSetState.Superseded;
      default:
        throw new Error(`Unsupported SubscriptionSetState value: ${state}`);
    }
  }

  /**
   * If `state` is {@link SubscriptionSetState.Error}, this will be a `string` representing
   * why the SubscriptionSet is in an error state. It will be `null` if there is no error.
   */
  get error(): string | null {
    return this.state === SubscriptionSetState.Error ? this.internal.errorStr : null;
  }

  /**
   * The number of subscriptions in the set.
   */
  get length(): number {
    return this.internal.size;
  }

  /**
   * Find a subscription by name.
   * @param name The name to search for.
   * @returns The named subscription, or `null` if the subscription is not found.
   */
  findByName(name: string): Subscription | null {
    assert.string(name, "name");

    const subscription = this.internal.findByName(name);
    return subscription ? new Subscription(subscription) : null;
  }

  /**
   * Find a subscription by query. Will match both named and unnamed subscriptions.
   * @param query The query to search for, represented as a {@link Results} instance,
   *  e.g. `Realm.objects("Cat").filtered("age > 10")`.
   * @returns The subscription with the specified query, or `null` if the subscription is not found.
   */
  findByQuery<Subscription>(query: Results<Subscription & RealmObject>): Subscription | null {
    assert.instanceOf(query, Results, "query");

    const subscription = this.internal.findByQuery(query.internal.query);
    return subscription ? (new Subscription(subscription) as Subscription) : null; // TODO: Remove the type assertion into Subscription
  }

  /** @internal */
  exists(query: AnyResults): boolean {
    if (query.subscriptionName === undefined) {
      return !!this.internal.findByQuery(query.internal.query);
    }
    return !!this.internal.findByName(query.subscriptionName);
  }

  /**
   * Makes the subscription set iterable.
   * @returns Iterable of each value in the set.
   * @example
   * for (const subscription of subscriptions) {
   *   // ...
   * }
   */
  *[Symbol.iterator](): IterableIterator<Subscription> {
    for (const subscription of this.internal) {
      yield new Subscription(subscription);
    }
  }

  /**
   * Get an iterator that contains each index in the subscription set.
   * @internal
   */
  *keys() {
    const size = this.length;
    for (let i = 0; i < size; i++) {
      yield i;
    }
  }
}
