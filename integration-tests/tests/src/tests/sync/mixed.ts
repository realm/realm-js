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
import { expect } from "chai";
import { Realm } from "realm";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";

import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

type MixedClass = {
  _id: Realm.BSON.ObjectId;
  value: Realm.Mixed;
  list: Realm.List<Realm.Mixed>;
};
type Value = Realm.Mixed | ((realm: Realm) => Realm.Mixed);
type ValueTester = (actual: Realm.Mixed, inserted: Realm.Mixed) => void | boolean;

/**
 * The default tester of values.
 * @param actual The value downloaded from the server.
 * @param inserted The value inserted locally before upload.
 */
function defaultTester(actual: Realm.Mixed, inserted: Realm.Mixed) {
  expect(actual).equals(inserted);
}

/**
 * Registers a test suite that:
 * - Opens a synced Realm
 * - Performs an object creation
 * - Uploads the local Realm
 * - Deletes the Realm locally
 * - Reopens and downloads the Realm
 * - Performs a test to ensure the downloaded value match the value created locally.
 * @param typeName
 * @param options
 */
function describeRoundtrip({
  typeName,
  value,
  testValue = defaultTester,
  flexibleSync,
}: {
  typeName: string;
  value: Value;
  testValue?: ValueTester;
  flexibleSync: boolean;
}) {
  function performTest(actual: Realm.Mixed, inserted: Realm.Mixed) {
    const result = testValue(actual, inserted);
    if (typeof result === "boolean") {
      expect(result).equals(true, `${testValue} failed!`);
    }
  }

  // TODO: This might be a useful utility
  function log(...args: [string]) {
    const date = new Date();
    console.log(date.toString(), date.getMilliseconds(), ...args);
  }

  async function setupTest(realm: Realm) {
    if (flexibleSync) {
      await realm.subscriptions.update((mutableSubs) => {
        mutableSubs.add(realm.objects("MixedClass"));
      });
      await realm.subscriptions.waitForSynchronization();
    }
  }

  describe(`roundtrip of '${typeName}'`, () => {
    openRealmBefore({
      schema: [
        {
          name: "MixedClass",
          primaryKey: "_id",
          properties: {
            _id: "objectId",
            value: "mixed?",
            list: "mixed[]",
          },
        },
      ],
      sync: flexibleSync
        ? {
            flexible: true,
          }
        : { partitionValue: "mixed-test" },
    });

    it("writes", async function (this: RealmContext) {
      await setupTest(this.realm);

      this._id = new Realm.BSON.ObjectId();
      this.realm.write(() => {
        this.value = typeof value === "function" ? value(this.realm) : value;
        this.realm.create<MixedClass>("MixedClass", {
          _id: this._id,
          value: this.value,
          // Adding a few other unrelated elements to the list
          list: [this.value, 123, false, "something-else"],
        });
      });
    });

    itUploadsDeletesAndDownloads();

    it("reads", async function (this: RealmContext) {
      await setupTest(this.realm);

      const obj = await new Promise<MixedClass>((resolve) => {
        this.realm
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", this._id)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      expect(typeof obj).equals("object");
      // Test the single value
      performTest(obj.value, this.value);
      // Test the list of values
      expect(obj.list.length).equals(4);
      const firstElement = obj.list[0];
      performTest(firstElement, this.value);
      // No need to keep these around
      delete this._id;
      delete this.value;
    });
  });
}

function describeTypes(flexibleSync: boolean) {
  authenticateUserBefore();

  describeRoundtrip({ typeName: "null", value: null, flexibleSync });

  // TODO: Provide an API to speficy storing this as an int
  describeRoundtrip({ typeName: "int", value: 123, flexibleSync });

  // TODO: Provide an API to specify which of these to store
  describeRoundtrip({ typeName: "float / double", value: 123.456, flexibleSync });

  describeRoundtrip({ typeName: "bool (true)", value: true, flexibleSync });
  describeRoundtrip({ typeName: "bool (false)", value: false, flexibleSync });

  describeRoundtrip({ typeName: "string", value: "test-string", flexibleSync });

  // Unsupported:
  // describeSimpleRoundtrip("undefined", undefined);

  const buffer = new Uint8Array([4, 8, 12, 16]).buffer;
  describeRoundtrip({
    typeName: "data",
    value: buffer,
    testValue: (value: ArrayBuffer) => {
      expect(value.byteLength).equals(4);
      expect([...new Uint8Array(value)]).deep.equals([4, 8, 12, 16]);
    },
    flexibleSync,
  });

  const date = new Date(1620768552979);
  describeRoundtrip({
    typeName: "date",
    value: date,
    testValue: (value: Date) => value.getTime() === date.getTime(),
    flexibleSync,
  });

  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip({
    typeName: "ObjectId",
    value: objectId,
    testValue: (value: Realm.BSON.ObjectId) => objectId.equals(value),
    flexibleSync,
  });

  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip({
    typeName: "UUID",
    value: uuid,
    testValue: (value: Realm.BSON.UUID) => uuid.equals(value),
    flexibleSync,
  });

  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip({
    typeName: "Decimal128",
    value: decimal128,
    testValue: (value: Realm.BSON.Decimal128) => decimal128.bytes.equals(value.bytes),
    flexibleSync,
  });

  const recursiveObjectId = new Realm.BSON.ObjectId();
  describeRoundtrip({
    typeName: "object link",
    value: (realm: Realm) => {
      // Create an object
      const result = realm.create<MixedClass>("MixedClass", {
        _id: recursiveObjectId,
        value: null,
      });
      // Make it recursive
      result.value = result;
      return result;
    },
    testValue: (value: MixedClass) => recursiveObjectId.equals(value._id),
    flexibleSync,
  });
}

describe.skipIf(environment.missingServer, "mixed", () => {
  describe("partition-based sync roundtrip", function () {
    this.longTimeout();
    importAppBefore("with-db");
    describeTypes(false);
  });

  describe.skipIf(environment.skipFlexibleSync, "flexible sync roundtrip", function () {
    this.longTimeout();
    importAppBefore("with-db-flx");
    describeTypes(true);
  });
});
