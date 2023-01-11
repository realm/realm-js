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

import { BaseSubscriptionSet, MutableSubscriptionSet, Realm, assert, binding } from "../internal";

/**
 * Class representing the set of all active flexible sync subscriptions for a Realm
 * instance.
 *
 * The server will continuously evaluate the queries that the instance is subscribed to
 * and will send data that matches them, as well as remove data that no longer does.
 *
 * The set of subscriptions can only be updated inside a {@link SubscriptionSet.update} callback,
 * by calling methods on the corresponding {@link MutableSubscriptionSet} instance.
 */
export class SubscriptionSet extends BaseSubscriptionSet {
  /**@internal */
  constructor(private realm: Realm, internal: binding.SyncSubscriptionSet) {
    super(internal);
  }

  /**
   * Wait for the server to acknowledge this set of subscriptions and return the
   * matching objects.
   *
   * If `state` is {@link SubscriptionsState.Complete}, the promise will be resolved immediately.
   *
   * If `state` is {@link SubscriptionsState.Error}, the promise will be rejected immediately.
   *
   * @returns A promise which is resolved when synchronization is complete, or is
   *  rejected if there is an error during synchronisation.
   */
  async waitForSynchronization(): Promise<void> {
    try {
      await this.internal.getStateChangeNotification(binding.SyncSubscriptionSetState.Complete);
    } finally {
      // TODO:
      // See if checking that the realm is not closed is enough to verify that
      // the SyncSession has not closed. Old code checks if sync_session.lock().
      if (!this.realm.isClosed) {
        this.internal.refresh();
      }
    }

    // TODO:
    // See if handling a KeyNotFound is necessary
    /** From js_subscriptions.hpp - wait_for_synchronization_impl()
    catch (KeyNotFound const& ex) {
      // TODO Waiting on https://github.com/realm/realm-core/issues/5165 to remove this
      auto error = Object::create_error(
          ctx, "`waitForSynchronisation` cannot be called before creating a SubscriptionSet using `update`");
      Function<T>::callback(protected_ctx, protected_callback, protected_this, {error});
    }
    */
  }

  /**
   * Update the SubscriptionSet and change this instance to point to the updated SubscriptionSet.
   *
   * Adding or removing subscriptions from the set must be performed inside
   * the callback argument of this method, and the mutating methods must be called on
   * the `mutableSubs` argument rather than the original {@link SubscriptionSet} instance.
   *
   * Any changes to the subscriptions after the callback has executed will be batched and sent
   * to the server. You can either `await` the call to `update`, or call {@link waitForSynchronization}
   * to wait for the new data to be available.
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
   * @param callback A callback function which receives a {@link Realm.App.Sync.MutableSubscriptionSet}
   *  instance as the first argument, which can be used to add or remove subscriptions
   *  from the set, and the {@link Realm} associated with the SubscriptionSet as the
   *  second argument (mainly useful when working with `initialSubscriptions` in
   *  {@link Realm.App.Sync.FlexibleSyncConfiguration}).
   *
   * @returns A promise which resolves when the SubscriptionSet is synchronized, or is rejected
   *  if there was an error during synchronization (see {@link waitForSynchronization})
   */
  update(callback: (mutableSubs: MutableSubscriptionSet, realm: Realm) => void): Promise<void> {
    assert.function(callback, "the argument to 'update()'");

    // Create a mutable copy of this instance (which copies the original and upgrades
    // its internal transaction to a write transaction) so that we can make updates to it.
    const internalMutableSubscriptions = this.internal.makeMutableCopy();
    const mutableSubscriptions = new MutableSubscriptionSet(internalMutableSubscriptions);

    callback(mutableSubscriptions, this.realm);

    // Commit the mutation, which downgrades its internal transaction to a read transaction
    // so no more changes can be made to it, and returns a new (immutable) SubscriptionSet
    // with the changes we made. Then update this SubscriptionSet instance to point to the
    // updated version.
    this.internal = internalMutableSubscriptions.commit();

    // Asynchronously wait for the SubscriptionSet to be synchronized.
    return this.waitForSynchronization();
  }
}
