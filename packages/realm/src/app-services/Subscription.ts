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

import { BSON } from "../bson";
import { binding } from "../internal";

/**
 * Class representing a single query subscription in a set of flexible sync
 * {@link SubscriptionSet}. This class contains readonly information about the
 * subscription – any changes to the set of subscriptions must be carried out
 * in a {@link SubscriptionSet.update} callback.
 */
export class Subscription {
  /**@internal */
  constructor(/**@internal */ public internal: binding.SyncSubscription) {
    this.internal = internal;
  }

  /**
   * Get the ID of the subscription.
   *
   * @returns The ObjectId of the subscription.
   */
  get id(): BSON.ObjectId {
    return this.internal.id;
  }

  /**
   * Get date when this subscription was created.
   *
   * @returns The date when this subscription was created.
   */
  get createdAt(): Date {
    return this.internal.createdAt.toDate();
  }

  /**
   * Get the date when this subscription was last updated.
   *
   * @returns The date when this subscription was last updated.
   */
  get updatedAt(): Date {
    return this.internal.updatedAt.toDate();
  }

  /**
   * Get the name given to this subscription when it was created.
   *
   * @returns The name given to this subscription when it was created.
   *  If no name was set, this will return `null`.
   */
  get name(): string | null {
    return this.internal.name || null;
  }

  /**
   * Get the type of objects the subscription refers to.
   *
   * @returns The type of objects the subscription refers to.
   */
  get objectType(): string {
    return this.internal.objectClassName;
  }

  /**
   * Get the string representation of the query the subscription was created with.
   *
   * @returns The string representation of the query the subscription was created with.
   *  If no filter or sort was specified, this will return `"TRUEPREDICATE"`.
   */
  get queryString(): string {
    return this.internal.queryString;
  }
}
