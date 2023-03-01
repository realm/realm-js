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

import Realm, { Configuration } from "realm";

function deriveConfig(realm: Realm): Configuration {
  const { path, syncSession } = realm;
  if (syncSession) {
    return { sync: syncSession.config };
  } else if (path) {
    return { path };
  } else {
    return {};
  }
}

/**
 * Close a Realm instance, and optionally delete its Realm file and clear the test state
 *
 * @param realm Realm instance
 * @param config Realm config
 * @param deleteRealmFile If false, do not delete the Realm file before reopening.
 * @param clearTestState If false, do not clear test state before reopening.
 */
export function closeRealm(realm: Realm, deleteRealmFile = true, clearTestState = true): void {
  const config = deriveConfig(realm);
  realm.close();

  if (deleteRealmFile) {
    Realm.deleteFile(config);
  }

  if (clearTestState) {
    // Clearing the test state to ensure the sync session gets completely reset and nothing is cached between tests
    Realm.clearTestState();
  }
}
