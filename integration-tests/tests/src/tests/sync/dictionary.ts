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
import { expectDecimalEqual } from "../../utils/comparisons";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";
import { appConfigs } from "../../app-configs";

describe.skipIf(environment.missingServer, "Type roundtrip of Dictionary object", () => {
  importAppBefore(appConfigs.partitionBased());
  authenticateUserBefore();

  class DictionaryObject extends Realm.Object {
    _id!: Realm.Types.Int;
    columnStringDictionary!: Realm.Dictionary<string>;
    columnIntegerDictionary!: Realm.Dictionary<Realm.Types.Int>;
    columnFloatDictionary!: Realm.Dictionary<Realm.Types.Float>;

    static schema = {
      name: "DictionaryObject",
      primaryKey: "_id",
      properties: {
        _id: "int",
        columnStringDictionary: "string{}",
        columnIntegerDictionary: "int{}",
        columnFloatDictionary: "float{}",
      },
    };
  }

  openRealmBefore({
    schema: [DictionaryObject],
    sync: { partitionValue: "dictionary-test" },
  });

  const expectedObject = {
    _id: 1,
    columnStringDictionary: { foo: "bar" },
    columnIntegerDictionary: { n: 3 },
    columnFloatDictionary: { x: 3.14 },
  };

  it("writes", function (this: RealmContext) {
    this.realm.write(() => {
      this.realm.create(DictionaryObject, expectedObject);
    });
  });

  itUploadsDeletesAndDownloads();

  it("reads", function (this: RealmContext) {
    const dictionaryObjects = this.realm.objects(DictionaryObject);
    expect(dictionaryObjects.length).equals(1, "There should be 1 object");

    const dictionaryObject = dictionaryObjects[0];

    Object.entries(expectedObject.columnIntegerDictionary).forEach(([property, expectedValue]) => {
      expect(dictionaryObject.columnIntegerDictionary[property]).equal(expectedValue);
    });

    Object.entries(expectedObject.columnFloatDictionary).forEach(([property, expectedValue]) => {
      expectDecimalEqual(dictionaryObject.columnFloatDictionary[property], expectedValue);
    });

    Object.entries(expectedObject.columnStringDictionary).forEach(([property, expectedValue]) => {
      expect(dictionaryObject.columnStringDictionary[property]).equal(expectedValue);
    });
  });
});
