////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import { toASCII } from "punycode";
import Realm from "realm";
import { authenticateUserBefore, importAppBefore, openRealmBefore } from "../../hooks";
import { expectDecimalEqual } from "../../utils/comparisons";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

describe.skipIf(environment.missingServer, "Type roundtrip tests", () => {
  importAppBefore("with-db");
  authenticateUserBefore();
  describe("roundtrip of UUID object", function () {
    const { UUID } = Realm.BSON;

    class UUIDObject extends Realm.Object {
      _id!: Realm.Types.UUID;
      mandatory!: Realm.Types.UUID;
      optional?: Realm.Types.UUID;
      list?: Realm.List<Realm.Types.UUID>;

      static schema = {
        name: "UUIDObject",
        primaryKey: "_id",
        properties: {
          _id: "uuid",
          mandatory: "uuid",
          optional: "uuid?",
          list: "uuid[]",
        },
      };
    }

    openRealmBefore({
      schema: [UUIDObject],
      sync: { partitionValue: "uuid-test" },
    });

    const uuidTestArray = [
      new UUID("183f85f5-9fbc-4010-8566-85b9b2a91464"),
      new UUID("283f85f5-9fbc-4010-8566-85b9b2a91464"),
      new UUID("383f85f5-9fbc-4010-8566-85b9b2a91464"),
    ];

    it("writes", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("UUIDObject", {
          _id: new UUID("a2a26ae1-3ba0-4c2c-a730-52f7e0825b85"),
          mandatory: new UUID("176845e7-b463-4735-a125-82a926e298b4"),
          optional: new UUID("1af1761a-566f-434d-b1a9-2ad38165db68"),
        });
        this.realm.create("UUIDObject", {
          _id: new UUID("b283c9fd-2821-4582-8f1c-04bc0e680ecf"),
          mandatory: new UUID("22515690-186b-4c24-a2a6-a84d991ace9e"),
        });
        this.realm.create("UUIDObject", {
          _id: new UUID("c2a26ae1-3ba0-4c2c-a730-52f7e0825b85"),
          mandatory: new UUID("3ecad6e1-3fab-4a51-ade9-d0f733221adb"),
          list: uuidTestArray,
        });
      });
    });

    itUploadsDeletesAndDownloads();

    it("reads", function (this: RealmContext) {
      expect(this.realm.objects(UUIDObject).length).equals(3);

      const objects = this.realm.objects(UUIDObject);

      expect(objects.length).equals(3);

      const first = objects[0];
      expect(first._id).instanceOf(UUID);
      expect(first._id.toString()).equals("a2a26ae1-3ba0-4c2c-a730-52f7e0825b85");
      expect(first.mandatory).instanceOf(UUID);
      expect(first.mandatory.toString()).equals("176845e7-b463-4735-a125-82a926e298b4");
      expect(first.optional).instanceOf(UUID);
      expect(first.optional?.toString()).equals("1af1761a-566f-434d-b1a9-2ad38165db68");
      expect(first.list).to.be.empty;

      const second = objects[1];
      expect(second._id).instanceOf(UUID);
      expect(second._id.toString()).equals("b283c9fd-2821-4582-8f1c-04bc0e680ecf");
      expect(second.mandatory).instanceOf(UUID);
      expect(second.mandatory.toString()).equals("22515690-186b-4c24-a2a6-a84d991ace9e");
      expect(second.optional).equal(null);
      expect(second.list).to.be.empty;

      const third = objects[2];
      expect(third._id).instanceOf(UUID);
      expect(third._id.toString()).equals("c2a26ae1-3ba0-4c2c-a730-52f7e0825b85");
      expect(third.mandatory).instanceOf(UUID);
      expect(third.mandatory.toString()).equals("3ecad6e1-3fab-4a51-ade9-d0f733221adb");
      expect(third.optional).equal(null);
      expect(third.list?.length).equal(uuidTestArray.length);
      for (let i = 0; i < uuidTestArray.length; i++) {
        expect(third.list && third.list[i]).deep.equals(uuidTestArray[i]);
      }
    });
  });

  describe("roundtrip of Dictionary object", function () {
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

  describe("roundtrip of Set object", function () {
    class SetObject extends Realm.Object {
      _id!: Realm.Types.Int;
      numbers!: Realm.Set<Realm.Types.Int>;

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
      sync: { partitionValue: "dictionary-test" },
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
});
