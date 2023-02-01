////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { closeThisRealm } from "../utils/close-realm";
import { openRealm, OpenRealmConfiguration } from "../utils/open-realm";

/**
 * Hook for use in before/beforeEach which opens a Realm with the specified config
 * and stores the Realm instance and the final config used to open it on the `this`
 * context.
 *
 * @param config Realm config
 * @returns Promise which resolves when complete
 */
export function openRealmHook(config: OpenRealmConfiguration = {}) {
  return async function openRealmHandler(
    this: Partial<RealmContext> & Partial<UserContext> & Mocha.Context,
  ): Promise<void> {
    this.longTimeout();
    if (this.realm) {
      throw new Error("Unexpected realm on context, use only one openRealmBefore per test");
    } else {
      const result = await openRealm(config, this.user);
      this.realm = result.realm;
      this.config = result.config;
    }
  };
}

export function openRealmBeforeEach(config: OpenRealmConfiguration = {}): void {
  beforeEach("openRealmBeforeEach", openRealmHook(config));
  afterEach("closeRealmAfterEach", closeThisRealm);
}

export function openRealmBefore(config: OpenRealmConfiguration = {}): void {
  before("openRealmBefore", openRealmHook(config));
  after("closeRealmAfter", closeThisRealm);
}
