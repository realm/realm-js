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
import Realm from "realm";

// Either the sync property is left out (local Realm)
type LocalConfiguration = Omit<Realm.Configuration, "sync"> & { sync?: never };
// Or the sync parameter is present
type SyncedConfiguration = Omit<Realm.Configuration, "sync"> & {
  sync?: Partial<Realm.SyncConfiguration>;
};

export function openRealmHook(config: LocalConfiguration | SyncedConfiguration = {}) {
  return async function openRealm(this: Partial<RealmContext> & Mocha.Context): Promise<void> {
    const nonce = new Realm.BSON.ObjectID().toHexString();
    const path = `temp-${nonce}.realm`;
    if (this.realm) {
      throw new Error("Unexpected realm on context, use only one openRealmBefore per test");
    } else if (!config.sync) {
      this.config = { ...config, path } as LocalConfiguration;
      this.realm = new Realm(this.config);
    } else {
      this.config = {
        ...config,
        path,
        sync: {
          user: this.user,
          ...(!config.sync.flexible && { partitionValue: nonce }),
          _sessionStopPolicy: "immediately",
          ...config.sync,
        },
      } as Realm.Configuration;
      this.realm = new Realm(this.config);
      // Upload the schema, ensuring a valid connection
      await this.realm.syncSession.uploadAllLocalChanges();
    }
  };
}

export function closeRealm(this: RealmContext): void {
  if (this.realm) {
    this.realm.close();
    delete this.realm;
  } else {
    throw new Error("Expected a 'realm' in the context");
  }
  if (this.config) {
    Realm.deleteFile(this.config);
    delete this.config;
  } else {
    throw new Error("Expected a 'config' in the context");
  }
  // Clearing the test state to ensure the sync session gets completely reset and nothing is cached between tests
  Realm.clearTestState();
}

export function openRealmBeforeEach(config: LocalConfiguration | SyncedConfiguration = {}): void {
  beforeEach(openRealmHook(config));
  afterEach(closeRealm);
}

export function openRealmBefore(config: LocalConfiguration | SyncedConfiguration = {}): void {
  before(openRealmHook(config));
  after(closeRealm);
}
