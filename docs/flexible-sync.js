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

/* eslint getter-return: "off" */

/**
 * Class representing a single query subscription in a flexible sync
 * {@link Realm.App.Sync.SubscriptionSet}. This class contains readonly information
 * about the subscription – any changes to the set of subscriptions must be carried out
 * in a {@link Realm.App.Sync.SubscriptionSet#update} callback.
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
   * The date when this subscription was last updated.
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
 * Enum representing the state of a {@link Realm.App.Sync.SubscriptionSet} set.
 *
 * @readonly
 * @enum {("pending"|"complete"|"error"|"superseded")}
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
   * matched the subscription queries at the time the SubscriptionSet was
   * updated. The server is now in steady-state synchronization mode where it
   * will stream updates as they come.
   */
  Complete: "complete",

  /**
   * The server has returned an error and synchronization is paused for this
   * Realm. To view the actual error, use `Subscriptions.error`.
   *
   * You can still use {@link Realm.App.Sync.SubscriptionSet#update} to update the subscriptions,
   * and if the new update doesn't trigger an error, synchronization
   * will be restarted.
   */
  Error: "error",

  /**
   * The SubscriptionSet has been superseded by an updated one. This typically means
   * that someone has called {@link Realm.App.Sync.SubscriptionSet#update} on a different instance
   * of the `Subscriptions`. You should not use a superseded SubscriptionSet,
   * and instead obtain a new instance from {@link Realm.subscriptions}.
   */
  Superseded: "superseded",
};

/**
 * Options for {@link Realm.App.Sync.SubscriptionSet.add}
 *
 * @typedef {Object} Realm.App.Sync.SubscriptionOptions
 * @property {string|undefined} name Sets the name of the subscription being added.
 * This allows you to later refer to the subscription by name, e.g. when calling
 * {@link Realm.App.Sync.MutableSubscriptionSet#removeByName}.
 * @property {boolean|undefined} throwOnUpdate  By default, adding a subscription
 * with the same name as an existing one but a different query will update the existing
 * subscription with the new query. If `throwOnUpdate` is set to true, adding a subscription
 * with the same name but a different query will instead throw an exception.
 * Adding a subscription with the same name and query is always a no-op.
 */

/**
 * Class representing the common functionality for the {@link Realm.App.Sync.SubscriptionSet} and
 * {@link Realm.App.Sync.SubscriptionSet} classes
 *
 * SubscriptionSets can only be modified inside a {@link SubscriptionSet.update} callback.
 *
 * The SubscriptionSet is an iterable; thus, the contained {@link Subscription}s can be
 * accessed in `for-of` loops or spread into an `Array` for access to the ECMAScript Array API,
 * e.g. `[...realm.subscriptions][0]`. Directly accessing the SubscriptionSet as if it was an
 * array is deprecated.
 *
 * @memberof Realm.App.Sync
 */
class BaseSubscriptionSet {
  /**
   * Returns `true` if there are no subscriptions in the set, `false` otherwise.
   *
   * @type boolean
   * @readonly
   */
  get isEmpty() {}

  /**
   * The number of subscriptions in the set.
   *
   * @type number
   * @readonly
   */
  get length() {}

  /**
   * The version of the SubscriptionSet. This is incremented every time a
   * {@link Realm.App.Sync.SubscriptionSet#update} is applied.
   *
   * @type {number}
   * @readonly
   */
  get version() {}

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
  findByQuery(query) {}

  /**
   * The state of the SubscriptionSet.
   *
   * @type {Realm.App.Sync.SubscriptionSetState}
   * @readonly
   */
  get state() {}

  /**
   * If `state` is {@link Realm.App.Sync.SubscriptionsState.Error}, this will return a `string`
   * representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.
   *
   * @type {string|null}
   * @readonly
   */
  get error() {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach Array.prototype.forEach}
   * @param {function} callback - Function to execute on each object in the SubscriptionSet.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @since 0.11.0
   */
  forEach(callback, thisArg) {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every Array.prototype.every}
   * @param {function} callback - Function to execute on each object in the SubscriptionSet.
   *   If this function returns `true` for every object, then this method will return `true`.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {boolean} representing if `callback` returned `true` for every object in the
   *   SubscriptionSet.
   * @since 0.11.0
   */
  every(callback, thisArg) {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some Array.prototype.some}
   * @param {function} callback - Function to execute on each object in the SubscriptionSet.
   *   If this function ever returns `true`, then this method will return `true`.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {boolean} – `true` when `callback` returns `true` for an object in the SubscriptionSet,
   *   otherwise `false`.
   * @since 0.11.0
   */
  some(callback, thisArg) {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map Array.prototype.map}
   * @param {function} callback - Function to execute on each object in the SubscriptionSet.
   *   This function takes three arguments:
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [thisArg] - The value of `this` when `callback` is called.
   * @returns {any[]} – the return values of `callback` after being called on every object
   *   in the SubscriptionSet.
   * @since 0.11.0
   */
  map(callback, thisArg) {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce Array.prototype.reduce}
   * @param {function} callback - Function to execute on each object in the SubscriptionSet.
   *   This function takes four arguments:
   *   - `previousValue` – The value previously returned in the last invocation of the callback,
   *     or `initialValue`, if supplied.
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [initialValue] - The value to use as the first argument to the first call
   *   of the `callback`.
   * @throws {TypeError} If the SubscriptionSet is empty and no `initialValue` was supplied.
   * @returns {any} – the value returned by the final invocation of `callback`, _except_ for
   *   the following special cases:
   *   - If SubscriptionSet consists of a single object, and no `initalValue` was supplied, then
   *     that object will be returned.
   *   - If the SubscriptionSet is empty, then `initialValue` _must_ be supplied and will be returned.
   * @since 0.11.0
   */
  reduce(callback, initialValue) {}

  /**
   * @deprecated Will be removed in v12.0.0.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight Array.prototype.reduceRight}
   * @param {function} callback - Function to execute on each object, from **right to left**,
   *   in the SubscriptionSet. This function takes four arguments:
   *   - `previousValue` – The value previously returned in the last invocation of the callback,
   *     or `initialValue`, if supplied.
   *   - `object` – The current object being processed in the SubscriptionSet.
   *   - `index` – The index of the object being processed in the SubscriptionSet.
   *   - `subscriptionSet` – The SubscriptionSet itself.
   * @param {object} [initialValue] - The value to use as the first argument to the first call
   *   of the `callback`.
   * @throws {TypeError} If the SubscriptionSet is empty and no `initialValue` was supplied.
   * @returns {any} – the value returned by the final invocation of `callback`, _except_ for
   *   the following special cases:
   *   - If SubscriptionSet consists of a single object, and no `initalValue` was supplied, then
   *     that object will be returned.
   *   - If the SubscriptionSet is empty, then `initialValue` _must_ be supplied and will be returned.
   * @since 0.11.0
   */
  reduceRight(callback, initialValue) {}
}

/**
 * Class representing the set of all active flexible sync subscriptions for a Realm
 * instance.
 *
 * The server will continuously evaluate the queries that the instance is subscribed to
 * and will send data that matches them, as well as remove data that no longer does.
 *
 * The set of subscriptions can only be updated inside a {@link Realm.App.Sync.SubscriptionSet#update}
 * callback, by calling methods on the corresponding {@link Realm.App.Sync.MutableSubscriptionSet} instance.
 *
 * @extends Realm.App.Sync.BaseSubscriptionSet
 * @memberof Realm.App.Sync
 */
class SubscriptionSet {
  /**
   * Wait for the server to acknowledge this set of subscriptions and return the
   * matching objects.
   *
   * If `state` is {@link Realm.App.Sync.SubscriptionSetState.Complete}, the promise will be
   * resolved immediately.
   *
   * If `state` is {@link Realm.App.Sync.SubscriptionSetState.Error}, the promise will be
   * rejected immediately.
   *
   * @returns {Promise<void>} A promise which is resolved when synchronization is complete, or is
   * rejected if there is an error during synchronisation.
   */
  waitForSynchronization() {}

  /**
   * Update the SubscriptionSet and change this instance to point to the updated SubscriptionSet.
   *
   * Adding or removing subscriptions from the set must be performed inside
   * the callback argument of this method, and the mutating methods must be called on
   * the `mutableSubs` argument rather than the original {@link Realm.App.Sync.SubscriptionSet} instance.
   *
   * Any changes to the subscriptions after the callback has executed will be batched and sent
   * to the server. You can either `await` the call to `update`, or call
   * {@link Realm.App.Sync.SubscriptionSet#waitForSynchronization}  to wait for the new data to be available.
   *
   * Example:
   * ```
   * await realm.subscriptions.update(mutableSubs => {
   *   mutableSubs.add(realm.objects("Cat").filtered("age > 10"));
   *   mutableSubs.add(realm.objects("Dog").filtered("age > 20"));
   *   mutableSubs.removeByName("personSubs");
   * });
   * // `realm` will now return the expected results based on the updated subscriptions
   * ```
   *
   * @param {function} callback A callback function which receives a
   * {@link Realm.App.Sync.MutableSubscriptionSet} instance as the first
   * argument, which can be used to add or remove subscriptions from the set,
   * and the Realm associated with the SubscriptionSet as the second argument
   * (mainly useful when working with `initialSubscriptions` in
   * {@link Realm.App.Sync~FlexibleSyncConfiguration}).
   *
   * Note: the callback should not be asynchronous.
   *
   * @returns {Promise<void>} A promise which resolves when the SubscriptionSet is synchronized, or is rejected
   * if there was an error during synchronization (see {@link waitForSynchronisation})
   */
  update(callback) {}
}

/**
 * The mutable version of a given SubscriptionSet. The mutable methods of a given
 * {@link Realm.App.Sync.SubscriptionSet} instance can only be accessed from inside the
 * {@link Realm.App.Sync.SubscriptionSet#update} callback.
 *
 * @extends Realm.App.Sync.BaseSubscriptionSet
 * @memberof Realm.App.Sync
 */
class MutableSubscriptionSet {
  /**
   * Adds a query to the set of active subscriptions. The query will be joined via
   * an `OR` operator with any existing queries for the same type.
   *
   * A query is represented by a {@link Realm.Results} instance returned from {@link Realm#objects},
   * for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.
   *
   * @param {Realm.Results} query A {@link Realm.Results} instance representing the query to subscribe to.
   * @param {Realm.App.Sync.SubscriptionOptions} options An optional {@link Realm.App.Sync.SubscriptionOptions}
   * object containing options to use when adding this subscription (e.g. to give the subscription a name).
   * @returns {Realm.App.Sync.Subscription} The new subscription.
   */
  add(query, options) {}

  /**
   * Removes a subscription with the given query from the SubscriptionSet.
   *
   * @param {Realm.Results} query A {@link Realm.Results} instance representing the query to remove a subscription to.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  remove(query) {}

  /**
   * Removes a subscription with the given name from the SubscriptionSet.
   *
   * @param {string} name The name of the subscription to remove.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  removeByName(name) {}

  /**
   * Removes the specified subscription from the SubscriptionSet.
   *
   * @param {Realm.App.Sync.Subscription} subscription The {@link Realm.App.Sync.Subscription} instance to remove.
   * @returns {boolean} `true` if the subscription was removed, `false` if it was not found.
   */
  removeSubscription(subscription) {}

  /**
   * Removes all subscriptions for the specified object type from the SubscriptionSet.
   *
   * @param {string} objectType The string name of the object type to remove all subscriptions for.
   * @returns {number} The number of subscriptions removed.
   */
  removeByObjectType(objectType) {}

  /**
   * Removes all subscriptions from the SubscriptionSet.
   *
   * @returns {number} The number of subscriptions removed.
   */
  removeAll() {}
}
