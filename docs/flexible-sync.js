////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/* eslint getter-return: "off" */

/**
 * Class representing a single query subscription in a set of flexible sync
 * {@link Realm.App.Sync.Subscriptions}. This class contains readonly information about the
 * subscription – any changes to the set of subscriptions must be carried out
 * in a {@link Realm.App.Sync.Subscriptions#update} callback.
 *
 * @memberof Realm.App.Sync
 */
class Subscription {
  /**
   * The ObjectId of the subscription
   *
   * @type {BSON.ObjectId}
   * @readonly
   */
  get id() {}

  /**
   * The date when this subscription was created
   *
   * @type {Date}
   * @readonly
   */
  get createdAt() {}

  /**
   * The date when this subscription was last update.
   *
   * @type {Date}
   * @readonly
   */
  get updatedAt() {}

  /**
   * The name given to this subscription when it was created.
   *
   * @type {string|null}
   * @readonly
   */
  get name() {}

  /**
   * The type of objects the subscription refers to.
   *
   * @type {string}
   * @readonly
   */
  get objectType() {}

  /**
   * The string representation of the query the subscription was created with.
   * If no filter or sort was specified, this will return "TRUEPREDICATE".
   *
   * @type {string}
   * @readonly
   */
  get queryString() {}
}

/**
 * Enum representing the state of a {@link Realm.App.Sync.Subscriptions} set.
 *
 * @readonly
 * @enum {("pending"|"complete"|"error"|"superceded")}
 * @memberof Realm.App.Sync
 */
var SubscriptionsState = {
  /**
   * The subscription update has been persisted locally, but the server hasn't
   * yet returned all the data that matched the updated subscription queries.
   */
  Pending: "pending",

  /**
   * The server has acknowledged the subscription and sent all the data that
   * matched the subscription queries at the time the subscription set was
   * updated. The server is now in steady-state synchronization mode where it
   * will stream updates as they come.
   */
  Complete: "complete",

  /**
   * The server has returned an error and synchronization is paused for this
   * Realm. To view the actual error, use `Subscriptions.error`.
   *
   * You can still use {@link Realm.App.Sync.Subscriptions#update} to update the subscriptions,
   * and if the new update doesn't trigger an error, synchronization
   * will be restarted.
   */
  Error: "error",

  /**
   * The subscription set has been superceded by an updated one. This typically means
   * that someone has called {@link Realm.App.Sync.Subscriptions#update} on a different instance
   * of the `Subscriptions`. You should not use a superseded subscription set,
   * and instead obtain a new instance by calling {@link Realm.App.Sync.Subscriptions.getSubscriptions()}.
   */
  Superceded: "superceded",
};

/**
 * Options for {@link Realm.App.Sync.Subscriptions.add}
 *
 * @typedef {Object} Realm.App.Sync.SubscriptionOptions
 * @property {string|undefined} name Sets the name of the subscription being added.
 * This allows you to  later refer to the subscription by name, e.g. when calling
 * {@link Realm.App.Sync.MutableSubscriptions#removeByName}.
 * @property {boolean|undefined} throwOnUpdate  By default, adding a subscription
 * with the same name as an existing one but a different query will update the existing
 * subscription with the new query. If `throwOnUpdate` is set to true, adding a subscription
 * with the same name but a different query will instead throw an exception.
 * Adding a subscription with the same name and query is always a no-op.
 */

/**
 * Class representing the common functionality for the {@link Realm.App.Sync.Subscriptions} and
 * {@link Realm.App.Sync.Subscriptions} classes
 *
 * @memberof Realm.App.Sync
 */
class BaseSubscriptions {
  /**
   * Returns `true` if there are no subscriptions in the set, `false` otherwise.
   *
   * @type boolean
   * @readonly
   */
  get empty() {}

  /**
   * The version of the subscription set. This is incremented every time a
   * {@link Realm.App.Sync.Subscriptions#update} is applied.
   *
   * @type {number}
   * @readonly
   */
  get version() {}

  /**
   * Returns a readonly array snapshot of all the subscriptions in the set.
   * Any changes to the set of subscriptions must be performed in a
   * {@link Realm.App.Sync.Subscriptions#update} callback.
   *
   * @returns {Array<Realm.App.Sync.Subscriptions>} an array of subscriptions.
   * @readonly
   */
  snapshot() {}

  /**
   * Find a subscription by name.
   *
   * @param {string} name The name to search for.
   * @returns {Realm.App.Sync.Subscription|null} The named subscription, or `null`
   * if the subscription is not found.
   */
  findByName(name) {}

  /**
   * Find a subscription by query. Will match both named and unnamed subscriptions.
   *
   * @param {Realm.Results} query The query to search for, represented as a {@link Realm.Results} instance,
   * e.g. `Realm.objects("Cat").filtered("age > 10")`.
   * @returns {Realm.App.Sync.Subscription|null} The subscription with the specified query,
   * or `null` if the subscription is not found.
   */
  find(query) {}

  /**
   * The state of the subscription set.
   *
   * @type {Realm.App.Sync.SubscriptionsState}
   * @readonly
   */
  get state() {}

  /**
   * If `state` is {@link Realm.App.Sync.SubscriptionsState.Error}, this is a `string`
   * representing why the subscription set is in an error state. `null` if there is no error.
   *
   * @type {string|null}
   * @readonly
   */
  get error() {}
}

/**
 * Class representing the set of all active flexible sync subscriptions for a Realm
 * instance.
 *
 * The server will continuously evaluate the queries that the instance is subscribed to
 * and will send data that matches them, as well as remove data that no longer does.
 *
 * The set of subscriptions can only be updated inside a {@link Realm.App.Sync.Subscriptions#update}
 * callback, by calling methods on the corresponding {@link Realm.App.Sync.MutableSubscriptions} instance.
 *
 * @extends Realm.App.Sync.BaseSubscriptions
 * @memberof Realm.App.Sync
 */
class Subscriptions {
  /**
   * Wait for the server to acknowledge this set of subscriptions and return the
   * matching objects.
   *
   * If `state` is {@link Realm.App.Sync.SubscriptionsState.Complete}, the promise will be
   * resolved immediately.
   *
   * If `state` is {@link Realm.App.Sync.SubscriptionsState.Error}, the promise will be
   * rejected immediately.
   *
   * @returns {Promise<void>} A promise which is resolved when synchronization is complete, or is
   * rejected if there is an error during synchronisation.
   */
  waitForSynchronization() {}

  /**
   * Update the subscription set and change this instance to point to the updated subscription set.
   *
   * Adding or removing subscriptions from the set set must be performed inside
   * the callback argument of this method, and the mutating methods must be called on
   * the `mutableSubs` argument rather than the original {@link Realm.App.Sync.Subscriptions} instance.
   *
   * Any changes to the subscriptions after the callback has executed will be batched and sent
   * to the server, at which point you can call {@link Realm.App.Sync.Subscriptions#waitForSynchronization}
   * to wait for the new data to be available.
   *
   * Example:
   * ```
   * const subs = realm.getSubscriptions();
   * subs.update(mutableSubs => {
   *   mutableSubs.add(realm.objects("Cat").filtered("age > 10"));
   *   mutableSubs.add(realm.objects("Dog").filtered("age > 20"));
   *   mutableSubs.removeByName("personSubs");
   * });
   * await subs.waitForSynchronization();
   * // `realm` will now return the expected results based on the updated subscriptions
   * ```
   *
   * @param {function} callback A callback function which receives a {@link Realm.App.Sync.MutableSubscriptions}
   * instance as its only argument, which can be used to add or remove subscriptions from
   * the set.
   */
  update(callback) {}
}

/**
 * The mutable version of a given subscription set. The mutable methods of a given
 * {@link Realm.App.Sync.Subscriptions} instance can only be accessed from inside the
 * {@link Realm.App.Sync.Subscriptions#update} callback.
 *
 * @extends Realm.App.Sync.BaseSubscriptions
 * @memberof Realm.App.Sync
 */
class MutableSubscriptions {
  /**
   * Adds a query to the set of active subscriptions. The query will be joined via
   * an `OR` operator with any existing queries for the same type.
   *
   * A query is represented  by a {@link Realm.Results} instance returned from {@link Realm#objects},
   * for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.
   *
   * @param {Realm.Results} query A {@link Realm.Results} instance representing the query to subscribe to.
   * @param {Realm.App.Sync.SubscriptionOptions} options An optional {@link Realm.App.Sync.SubscriptionOptions}
   * object containing options to use when adding this subscription (e.g. to give the subscription a name).
   * @returns {Realm.App.Sync.Subscription} The new subscription.
   */
  add(query, options) {}

  /**
   * Removes a subscription with the given query from the subscription set.
   *
   * @param {Realm.Results} query A {@link Realm.Results} instance representing the query to remove a subscription to.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  remove(query) {}

  /**
   * Removes a subscription with the given name from the subscription set.
   *
   * @param {string} name The name of the subscription to remove.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  removeByName(name) {}

  /**
   * Removes the specified subscription from the subscription set.
   *
   * @param {Realm.App.Sync.Subscription} subscription The {@link Realm.App.Sync.Subscription} instance to remove.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  removeSubscription(subscription) {}

  /**
   * Removes all subscriptions for the specified object type from the subscription set.
   *
   * @param {string} objectType The string name of the object type to remove all subscriptions for.
   * @returns {number} The number of subscriptions removed.
   */
  removeByObjectType(objectType) {}

  /**
   * Removes all subscriptions from the subscription set.
   *
   * @returns {number} The number of subscriptions removed.
   */
  removeAll() {}
}
