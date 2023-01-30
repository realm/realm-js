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
import Realm from "realm";
import { importApp } from "../../utils/import-app";
import { generatePartition } from "../../utils/generators";
import { ObjectId } from "bson";

const DogForSyncSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    realm_id: "string?",
  },
};

describe("OpenBehaviour", () => {
  it("static references are defined", () => {
    expect(Realm.App.Sync.openLocalRealmBehavior).to.not.be.undefined;
    expect(Realm.App.Sync.downloadBeforeOpenBehavior).to.not.be.undefined;
  });
  it("opening local realm works", async () => {
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.
    const appConfig = await importApp("simple").then((app) => {
      return { id: app.appId, baseUrl: app.baseUrl };
    });

    const app = new Realm.App(appConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    const config = {
      schema: [],
      sync: {
        user,
        partitionValue,
        newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
      },
    };

    expect(Realm.exists(config)).to.be.false;

    const realm = await Realm.open(config);

    expect(realm.path).to.not.be.undefined;

    realm.close();
    await user.logOut();
  });
  it("reopening local realm works", async () => {
    const appConfig = await importApp("simple").then((app) => {
      return { id: app.appId, baseUrl: app.baseUrl };
    });
    // NOTE: this test no longer runs with a logged out user.
    // Reason: Error: User is no longer valid.

    const app = new Realm.App(appConfig);
    const user = await app.logIn(Realm.Credentials.anonymous());
    const partitionValue = generatePartition();

    {
      const config = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          newRealmFileBehavior: Realm.App.Sync.openLocalRealmBehavior,
        },
      };

      expect(Realm.exists(config)).to.be.false;

      const realm = new Realm(config);
      realm.write(() => {
        realm.create(DogForSyncSchema.name, { _id: new ObjectId(), name: "Bella" });
      });
      realm.close();
    }

    {
      const config = {
        schema: [DogForSyncSchema],
        sync: {
          user,
          partitionValue,
          existingRealmFileBehavior: { type: Realm.OpenRealmBehaviorType.OpenImmediately },
        },
      };

      const realm = await Realm.open(config);

      expect(realm.objects(DogForSyncSchema.name).length).equals(1);

      realm.close();

      await user.logOut();
    }
  });
});
