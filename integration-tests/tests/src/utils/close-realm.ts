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

import { Realm } from "realm";

/**
 * Close a Realm instance, and optionally delete its Realm file and clear the test state
 *
 * @param realm Realm instance
 * @param config Realm config
 * @param deleteRealmFile If false, do not delete the Realm file before reopening.
 * @param clearTestState If false, do not clear test state before reopening.
 */
export function closeRealm(
  realm: Realm,
  config: Realm.Configuration,
  deleteRealmFile = true,
  clearTestState = true,
): void {
  realm.close();

  if (deleteRealmFile) {
    Realm.deleteFile(config);
  }

  if (clearTestState) {
    // Clearing the test state to ensure the sync session gets completely reset and nothing is cached between tests
    Realm.clearTestState();
  }
}

/**
 * Close the Realm instance on the current `this` context
 *
 * @param this Mocha `this` context
 */
export function closeThisRealm(this: Partial<RealmContext> & Mocha.Context): void {
  if (!("realm" in this) && !("config" in this)) {
    return;  // Assume we failed to open the realm, so there is nothing to close.
  }

  if (!this.realm) {
    throw new Error("Expected a 'realm' to close");
  }
  if (!this.config) {
    throw new Error("Expected a 'config' to close");
  }

  closeRealm(this.realm, this.config);

  delete this.realm;
  delete this.config;
}

/**
 * Close a Realm instance then re-open it. By default this will delete the Realm file in
 * between, but you can specify that we should reopen the same file without deleting.
 *
 * @param realm Realm instance
 * @param config Realm config
 * @param clearRealm If false, do not clear the Realm (delete file and clear test state) before
 * reopening. This will result in the same Realm file being reopened, as the nonce is stored on
 * the config. Useful for testing if something has been persisted between sessions. Defaults to true.
 * @returns New re-opened Realm instance
 */
export function closeAndReopenRealm(realm: Realm, config: Realm.Configuration, clearRealm = true): Promise<Realm> {
  closeRealm(realm, config, clearRealm, clearRealm);
  return Realm.open(config);
}
