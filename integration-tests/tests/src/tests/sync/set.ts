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
import { authenticateUserBefore, importAppBefore, openRealmBefore } from "../../hooks";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

describe.skipIf(environment.missingServer, "Type roundtrip of set object", () => {
  importAppBefore("with-db");
  authenticateUserBefore();

  class SetObject extends Realm.Object {
    declare _id: Realm.Types.Int;
    declare numbers: Realm.Set<Realm.Types.Int>;

    static schema = {
      name: "SyncedNumbers",
      primaryKey: "_id",
      properties: {
        _id: "int",
        numbers: "int<>",
      },
    };
  }

  openRealmBefore({
    schema: [SetObject],
    sync: { partitionValue: "set-test" },
  });

  const expectedObject = {
    _id: 1,
    numbers: [2],
  };

  it("writes", function (this: RealmContext) {
    this.realm.write(() => {
      this.realm.create(SetObject, expectedObject);
    });
  });

  itUploadsDeletesAndDownloads();

  it("reads", function (this: RealmContext) {
    const setObjects = this.realm.objects(SetObject);
    expect(setObjects.length).equals(1, "There should be 1 object");

    const setObject = setObjects[0];
    expect(setObject._id).equals(1);
    expect(setObject.numbers.has(2)).to.be.true;
  });
});
