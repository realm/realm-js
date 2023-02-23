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

import Realm from "realm";

// Either the sync property is left out (local Realm)
export type LocalConfiguration = Omit<Realm.Configuration, "sync"> & { sync?: never };
// Or the sync parameter is present
export type SyncedConfiguration = Omit<Realm.Configuration, "sync"> & {
  sync?: Partial<Realm.SyncConfiguration>;
};
export type OpenRealmConfiguration = LocalConfiguration | SyncedConfiguration;

/**
 * Open a Realm for test usage with the specified config. By default this will use
 * a unique path for each Realm to avoid conflicts.
 *
 * @param partialConfig Realm config
 * @param user Realm user
 * @returns
 */
export async function openRealm(
  partialConfig: LocalConfiguration | SyncedConfiguration = {},
  user: Realm.User | undefined,
): Promise<{ config: Realm.Configuration; realm: Realm }> {
  const nonce = new Realm.BSON.ObjectID().toHexString();
  const path = `temp-${nonce}.realm`;

  if (!partialConfig.sync) {
    const config = { ...partialConfig, path } as LocalConfiguration;
    const realm = await Realm.open(config);
    return { config, realm };
  } else {
    const config = {
      ...partialConfig,
      path,
      sync: {
        user: user,
        ...(partialConfig.sync.flexible ? { flexible: true } : { partitionValue: nonce }),
        _sessionStopPolicy: "immediately",
        ...partialConfig.sync,
      },
    } as Realm.Configuration;
    const realm = await Realm.open(config);

    // Upload the schema, ensuring a valid connection. uploadAllLocalChanges
    // will not resolve with flexible sync enabled until we have created an
    // initial subscription set, so skip it if we have a flexible config.
    // There is an issue on the cloud side which will fix this.
    if (!config.sync?.flexible) {
      if (!realm.syncSession) {
        throw new Error("No syncSession found on realm");
      }

      await realm.syncSession.uploadAllLocalChanges();
    }

    // TODO: This should probably be done in Realm.open()
    if (config.sync?.flexible) {
      await realm.subscriptions.waitForSynchronization();
    }

    return { config, realm };
  }
}
