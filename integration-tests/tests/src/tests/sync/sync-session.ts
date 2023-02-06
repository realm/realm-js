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

import { expect } from "chai";
import { importAppBefore } from "../../hooks";
import { generatePartition } from "../../utils/generators";

function getSyncConfiguration(user: Realm.User, partition: any): Realm.ConfigurationWithSync {
  const realmConfig = {
    schema: [
      {
        name: "Dog",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          breed: "string?",
          name: "string",
          realm_id: "string?",
        },
      },
    ],
    sync: {
      user: user,
      partitionValue: partition,
    },
  };
  return realmConfig;
}

describe("SessionTest", () => {
  importAppBefore("with-db");
  describe("invalid syncsessions", () => {
    it("local realm", () => {
      const realm = new Realm();
      expect(realm.syncSession).to.be.null;
    });
    it("config with undefined sync property", () => {
      const config = {
        sync: undefined,
      };

      Realm.open(config).then((realm) => {
        expect(realm.syncSession).to.be.null;
      });
    });
    it("config with sync and inMemory set", () => {
      const config = {
        sync: true,
        inMemory: true,
      };
      return new Promise<void>((resolve, reject) => {
        //@ts-expect-error try config with mutually exclusive properties
        return Realm.open(config)
          .then(() => reject("Managed to open invalid Realm"))
          .catch((error) => {
            expect(error.message).equals("Options 'inMemory' and 'sync' are mutual exclusive.");
            resolve();
          });
      });
    });
    it("config with onMigration and sync set", function (this: AppContext) {
      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();

      return new Promise<void>((resolve, reject) => {
        return this.app.logIn(credentials).then((user) => {
          const config = getSyncConfiguration(user, partition);
          //@ts-expect-error setting invalid property onMigration when sync is enabled.
          config.onMigration = () => {
            /* empty function */
          };
          return Realm.open(config)
            .then(() => reject())
            .catch((error) => {
              expect(error.message).equals("Options 'onMigration' and 'sync' are mutual exclusive.");
              resolve();
            });
        });
      });
    });
    it("invalid sync user provided", async function (this: AppContext) {
      // test if an invalid object is used as user
      const partition = generatePartition();
      const credentials = Realm.Credentials.anonymous();
      const user = await this.app.logIn(credentials);
      const config = getSyncConfiguration(user, partition);
      //@ts-expect-error setting an invalid user object
      config.sync.user = { username: "John Doe" };
      expect(async () => {
        await Realm.open(config);
      }).throws("Option 'user' is not a Realm.User object.");
    });
  });
});
