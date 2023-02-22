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

import {
  Realm,
  Configuration,
  User,
  BSON,
  ConfigurationWithSync,
  ConfigurationWithoutSync,
  SyncConfiguration,
} from "realm";

type ConfigurationWithSyncPartial = Omit<ConfigurationWithSync, "sync"> & {
  sync: Partial<SyncConfiguration>;
};

export type OpenRealmConfiguration = ConfigurationWithoutSync | ConfigurationWithSyncPartial;

/**
 * Open a Realm for test usage with the specified config. By default this will use
 * a unique path for each Realm to avoid conflicts.
 *
 * @param partialConfig Realm config
 * @param user Realm user
 * @returns
 */
export async function openRealm(
  partialConfig: OpenRealmConfiguration = {},
  user: User,
): Promise<{ config: Configuration; realm: Realm }> {
  const nonce = new BSON.ObjectId().toHexString();
  const path = `temp-${nonce}.realm`;

  if (!partialConfig.sync) {
    const config = { ...partialConfig, path } as ConfigurationWithoutSync;
    const realm = await Realm.open(config);
    return { config, realm };
  } else {
    const config = {
      ...partialConfig,
      path,
      sync: {
        ...(partialConfig.sync.flexible ? { flexible: true } : { partitionValue: nonce }),
        ...partialConfig.sync,
        user: user,
        //@ts-expect-error Internal field
        _sessionStopPolicy: "immediately",
      },
    } as ConfigurationWithSync;
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
