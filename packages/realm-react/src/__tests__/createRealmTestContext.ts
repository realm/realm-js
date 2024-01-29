////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import assert from "node:assert";
import Realm, { Configuration } from "realm";
import { act } from "@testing-library/react-native";

import { randomRealmPath } from "./helpers";

export type RealmTestContext = {
  realm: Realm;
  useRealm: () => Realm;
  write(cb: () => void): void;
  openRealm(config?: Configuration): Realm;
  cleanup(): void;
};

/**
 * Opens a test realm at a randomized and temporary path.
 * @returns The `realm` and a `write` function, which will wrap `realm.write` with an `act` and prepand a second `realm.write` to force notifications to trigger synchronously.
 */
export function createRealmTestContext(rootConfig: Configuration = {}): RealmTestContext {
  let realm: Realm | null = null;
  const context = {
    get realm(): Realm {
      assert(realm, "Open the Realm first");
      return realm;
    },
    useRealm() {
      return context.realm;
    },
    openRealm(config: Configuration = {}) {
      if (realm) {
        // Close any realm, previously opened
        realm.close();
      }
      realm = new Realm({ ...rootConfig, ...config, path: randomRealmPath() });
      return realm;
    },
    write(callback: () => void) {
      act(() => {
        context.realm.write(callback);
        // Starting another write transaction will force notifications to fire synchronously
        context.realm.beginTransaction();
        context.realm.cancelTransaction();
      });
    },
    cleanup() {
      Realm.clearTestState();
    }
  };
  return context;
}
