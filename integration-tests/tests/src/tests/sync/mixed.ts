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
import Realm, { ObjectSchema } from "realm";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";

import { itUploadsDeletesAndDownloads } from "./upload-delete-download";
import { buildAppConfig } from "../../utils/build-app-config";

type Value = Realm.Mixed | ((realm: Realm) => Realm.Mixed);
type ValueTester = (actual: Realm.Mixed, inserted: Realm.Mixed) => void | boolean;

class MixedClass extends Realm.Object<MixedClass> {
  _id!: Realm.BSON.ObjectId;
  value: Realm.Mixed;
  list!: Realm.List<Realm.Mixed>;

  static schema: ObjectSchema = {
    name: "MixedClass",
    properties: {
      _id: "objectId",
      value: "mixed",
      list: "mixed[]",
    },
    primaryKey: "_id",
  };
}

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
 * @param typeName Name of the mixed type (only used for the test name)
 * @param value The value to be used for the test, or a function to obtain it
 * @param testValue The function used to assert equality
 * @param useFlexibleSync Boolean to indicate the use of flexible sync (otherwise partition based sync will be used)
 */
function describeRoundtrip({
  typeName,
  value,
  valueTester = defaultTester,
  useFlexibleSync,
}: {
  typeName: string;
  value: Value;
  valueTester?: ValueTester;
  useFlexibleSync: boolean;
}) {
  function performTest(actual: Realm.Mixed, inserted: Realm.Mixed) {
    const result = valueTester(actual, inserted);
    if (typeof result === "boolean") {
      //TODO If we use the default tester this is not necessary.
      expect(result).equals(true, `${valueTester} failed!`);
    }
  }

  // TODO: This might be a useful utility  //Should we keep this around if not used?
  function log(...args: [string]) {
    const date = new Date();
    console.log(date.toString(), date.getMilliseconds(), ...args);
  }

  async function setupTest(realm: Realm) {
    if (useFlexibleSync) {
      await realm.subscriptions.update((mutableSubs) => {
        mutableSubs.add(realm.objects("MixedClass"));
      });
      await realm.subscriptions.waitForSynchronization();
    }
  }

  describe(`roundtrip of '${typeName}'`, () => {
    openRealmBefore({
      schema: [MixedClass],
      sync: useFlexibleSync ? { flexible: true } : { partitionValue: "mixed-test" },
    });

    it("writes", async function (this: RealmContext) {
      await setupTest(this.realm);

      this._id = new Realm.BSON.ObjectId();
      this.realm.write(() => {
        this.value = typeof value === "function" ? value(this.realm) : value;
        this.realm.create(MixedClass, {
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

  describeRoundtrip({ typeName: "null", value: null, useFlexibleSync: flexibleSync });

  // TODO: Provide an API to specify storing this as an int
  describeRoundtrip({ typeName: "int", value: 123, useFlexibleSync: flexibleSync });

  // TODO: Provide an API to specify which of these to store
  describeRoundtrip({ typeName: "float / double", value: 123.456, useFlexibleSync: flexibleSync });

  describeRoundtrip({ typeName: "bool (true)", value: true, useFlexibleSync: flexibleSync });
  describeRoundtrip({ typeName: "bool (false)", value: false, useFlexibleSync: flexibleSync });

  describeRoundtrip({ typeName: "string", value: "test-string", useFlexibleSync: flexibleSync });

  // Unsupported:
  // describeSimpleRoundtrip("undefined", undefined);

  const buffer = new Uint8Array([4, 8, 12, 16]).buffer;
  describeRoundtrip({
    typeName: "data",
    value: buffer,
    valueTester: (value: ArrayBuffer) => {
      expect(value.byteLength).equals(4);
      expect([...new Uint8Array(value)]).deep.equals([4, 8, 12, 16]);
    },
    useFlexibleSync: flexibleSync,
  });

  const date = new Date(1620768552979);
  describeRoundtrip({
    typeName: "date",
    value: date,
    valueTester: (value: Date) => value.getTime() === date.getTime(),
    useFlexibleSync: flexibleSync,
  });

  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip({
    typeName: "ObjectId",
    value: objectId,
    valueTester: (value: Realm.BSON.ObjectId) => objectId.equals(value),
    useFlexibleSync: flexibleSync,
  });

  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip({
    typeName: "UUID",
    value: uuid,
    valueTester: (value: Realm.BSON.UUID) => uuid.equals(value),
    useFlexibleSync: flexibleSync,
  });

  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip({
    typeName: "Decimal128",
    value: decimal128,
    valueTester: (value: Realm.BSON.Decimal128) => decimal128.bytes.equals(value.bytes),
    useFlexibleSync: flexibleSync,
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
    valueTester: (value: MixedClass) => recursiveObjectId.equals(value._id),
    useFlexibleSync: flexibleSync,
  });
}

describe("mixed synced", () => {
  describe("partition-based sync roundtrip", function () {
    this.longTimeout();
    importAppBefore(buildAppConfig("with-pbs").anonAuth().partitionBasedSync());
    describeTypes(false);
  });

  describe.skipIf(environment.skipFlexibleSync, "flexible sync roundtrip", function () {
    this.longTimeout();
    importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
    describeTypes(true);
  });
});
