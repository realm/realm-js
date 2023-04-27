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
  BaseSubscriptionSet,
  FlexibleSyncConfiguration,
  MutableSubscriptionSet,
  Realm,
  SubscriptionSetState,
  assert,
  binding,
} from "../internal";

/**
 * Represents the set of all active flexible sync subscriptions for a Realm instance.
 *
 * The server will continuously evaluate the queries that the instance is subscribed to
 * and will send data that matches them, as well as remove data that no longer does.
 *
 * The set of subscriptions can only be modified inside a {@link SubscriptionSet.update} callback,
 * by calling methods on the corresponding {@link MutableSubscriptionSet} instance.
 */
export class SubscriptionSet extends BaseSubscriptionSet {
  /**@internal */
  constructor(/**@internal */ private realm: Realm, internal: binding.SyncSubscriptionSet) {
    super(internal);

    Object.defineProperties(this, {
      realm: {
        enumerable: false,
        configurable: false,
        writable: false,
      },
    });
  }

  /**
   * Wait for the server to acknowledge this set of subscriptions and return the
   * matching objects.
   *
   * If `state` is {@link SubscriptionSetState.Complete}, the promise will be resolved immediately.
   *
   * If `state` is {@link SubscriptionSetState.Error}, the promise will be rejected immediately.
   *
   * @returns A promise which is resolved when synchronization is complete, or is
   *  rejected if there is an error during synchronization.
   */
  async waitForSynchronization(): Promise<void> {
    try {
      const state = await this.internal.getStateChangeNotification(binding.SyncSubscriptionSetState.Complete);
      if (state === binding.SyncSubscriptionSetState.Error) {
        throw new Error(this.error || "Encountered an error when waiting for synchronization.");
      }
    } finally {
      if (!this.realm.isClosed) {
        this.internal.refresh();
      }
    }
  }

  /**
   * Call this to make changes to this SubscriptionSet from inside the callback,
   * such as adding or removing subscriptions from the set.
   *
   * The MutableSubscriptionSet argument can only be used from the callback and must
   * not be used after it returns.
   *
   * All changes done by the callback will be batched and sent to the server. You can either
   * `await` the call to `update`, or call {@link SubscriptionSet.waitForSynchronization}
   * to wait for the new data to be available.
   *
   * @param callback A callback function which receives a {@link MutableSubscriptionSet}
   *  instance as the first argument, which can be used to add or remove subscriptions
   *  from the set, and the {@link Realm} associated with the SubscriptionSet as the
   *  second argument (mainly useful when working with `initialSubscriptions` in
   *  {@link FlexibleSyncConfiguration}).
   *
   * @returns A promise which resolves when the SubscriptionSet is synchronized, or is rejected
   *  if there was an error during synchronization (see {@link SubscriptionSet.waitForSynchronization})
   *
   * @example
   * await realm.subscriptions.update(mutableSubscriptions => {
   *   mutableSubscriptions.add(realm.objects("Cat").filtered("age > 10"));
   *   mutableSubscriptions.add(realm.objects("Dog").filtered("age > 20"), { name: "oldDogs" });
   *   mutableSubscriptions.removeByName("youngDogs");
   * });
   * // `realm` will now return the expected results based on the updated subscriptions
   */
  async update(callback: (mutableSubscriptions: MutableSubscriptionSet, realm: Realm) => void): Promise<void> {
    this.updateNoWait(callback);
    await this.waitForSynchronization();
  }

  /**@internal */
  updateNoWait(callback: (mutableSubscriptions: MutableSubscriptionSet, realm: Realm) => void): void {
    assert.function(callback, "callback");

    // Create a mutable copy of this instance (which copies the original and upgrades
    // its internal transaction to a write transaction) so that we can make updates to it.
    const mutableSubscriptions = this.internal.makeMutableCopy();

    callback(new MutableSubscriptionSet(mutableSubscriptions), this.realm);

    // Commit the mutation, which downgrades its internal transaction to a read transaction
    // so no more changes can be made to it, and returns a new (immutable) SubscriptionSet
    // with the changes we made. Then update this SubscriptionSet instance to point to the
    // updated version.
    this.internal = mutableSubscriptions.commit();
  }
}
