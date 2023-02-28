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

import { expect } from "chai";
import { SyncError } from "realm";
import { openRealm } from "./open-realm";

/**
 * Open a new Realm and perform an action, expecting a sync error to occur. Will
 * never resolve and therefore timeout if a sync error does not occur.
 *
 * @param config The Realm config to use
 * @param user The Realm user to use
 * @param action Callback receiving a Realm instance and containing the action(s) to
 * take which should trigger a sync error
 * @param expectation Callback receiving the sync error, in order to make assertions about it
 * @returns Promise which resolves if the sync error occurs
 */
export async function expectSyncError(
  config: Realm.Configuration,
  user: Realm.User,
  action: (realm: Realm) => void,
  expectation: (error: SyncError) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!config.sync) {
      throw new Error("Expected a sync config");
    }

    // Shallow copy the sync configuration to modifying the original
    const modifiedConfig: Realm.Configuration = {
      ...config,
      sync: {
        ...config.sync,
        onError(_, error: SyncError) {
          try {
            expectation(error);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      },
    };

    openRealm(modifiedConfig, user).then(({ realm }) => action(realm), reject);
  });
}

/**
 * Expect a sync error to occur with a message about an invalid write.
 * Optionally specify more expectations about the sync error.  Will
 * never resolve and therefore timeout if a sync error does not occur.
 *
 * @param config The Realm config to use
 * @param user The Realm user to use
 * @param action Callback receiving a Realm instance and containing the
 * action(s) to take which should trigger a client reset error
 * @param extraExpectation Optional callback receiving the sync error, in order to make more
 * assertions about it
 * @returns Promise which resolves if the sync error occurs
 */
export async function expectInvalidWriteSyncError(
  config: Realm.Configuration,
  user: Realm.User,
  action: (realm: Realm) => void,
  extraExpectation?: (error: Error) => void,
): Promise<void> {
  return expectSyncError(config, user, action, (error) => {
    expect(error.name).to.equal("Error");
    expect(error.message).to.match(
      /Client attempted a write that is outside of permissions or query filters; it has been reverted.*/,
    );
    if (extraExpectation) extraExpectation(error);
  });
}

/**
 * Expect a client reset sync error to occur when performing an action. Optionally specify
 * more expectations about the sync error.  Will never resolve and therefore timeout if a
 * sync error does not occur.
 *
 * @param config The Realm config to use
 * @param user The Realm user to use
 * @param action Callback receiving a Realm instance and containing the action(s) to
 * take which should trigger a client reset error
 * @param extraExpectation Optional callback receiving the sync error, in order to make more
 * assertions about it
 * @returns Promise which resolves if the sync error occurs
 */
export async function expectClientResetError(
  config: Realm.Configuration,
  user: Realm.User,
  action: (realm: Realm) => void,
  extraExpectation?: (error: Error) => void,
): Promise<void> {
  return expectSyncError(config, user, action, (error) => {
    expect(error.name).to.equal("ClientReset");
    if (extraExpectation) extraExpectation(error);
  });
}
