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
import Realm, { BSON, Mixed, ObjectSchema } from "realm";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";
import { buildAppConfig } from "../../utils/build-app-config";

/**
 * A function type that generates values to inserted and expected values used with the default tester.
 * The input realm is necessary to create and add objects to the realm before using them in the tests.
 * The distinction between "values" and "expected" is necessary because most tests here close the realm after using
 * the objects in "values", so they can't be used with the default tester (that happens at a later time).
 * "expected" contains just an object instead of a RealmObject that can be used for testing.
 */
type ValueAndExpectedGenerator = (realm: Realm) => { values: Mixed; expected: Mixed };

type Value = Realm.Mixed | ((realm: Realm) => Realm.Mixed) | ValueAndExpectedGenerator;
type ValueTester = (actual: Realm.Mixed, inserted: Realm.Mixed) => void;

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

const bool = true;
const int = 1;
const double = 123.456;
const d128 = BSON.Decimal128.fromString("6.022e23");
const string = "hello";
const date = new Date();
const oid = new BSON.ObjectId();
const uuid = new BSON.UUID();
const nullValue = null;
const data = new Uint8Array([0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15]).buffer;

function getMixedList(realm: Realm) {
  const expectedObj = { _id: new BSON.ObjectId() };
  const obj = realm.create(MixedClass, expectedObj);

  const values = [bool, int, double, d128, string, oid, uuid, nullValue, date, data, obj];
  const expected = [bool, int, double, d128, string, oid, uuid, nullValue, date, data, expectedObj];

  return { values, expected };
}

function getMixedDict(realm: Realm) {
  const expectedObj = { _id: new BSON.ObjectId() };
  const obj = realm.create(MixedClass, expectedObj);

  const values = {
    bool,
    int,
    double,
    d128,
    string,
    oid,
    uuid,
    nullValue,
    date,
    data,
    obj,
  };

  const expected = {
    bool,
    int,
    double,
    d128,
    string,
    oid,
    uuid,
    nullValue,
    date,
    data,
    obj: expectedObj,
  };

  return { values, expected };
}

function getNestedMixedList(realm: Realm) {
  const mixList1 = getMixedList(realm);
  const mixList2 = getMixedList(realm);
  const mixDict = getMixedDict(realm);

  const values = [...mixList1.values, mixList2.values, mixDict.values];
  const expected = [...mixList1.expected, mixList2.expected, mixDict.expected];

  return { values, expected };
}

function getNestedMixedDict(realm: Realm) {
  const mixDict1 = getMixedDict(realm);
  const mixDict2 = getMixedDict(realm);
  const mixList = getMixedList(realm);

  const values = {
    ...mixDict1.values,
    innerDict: mixDict2.values,
    innerList: mixList.values,
  };

  const expected = {
    ...mixDict1.expected,
    innerDict: mixDict2.expected,
    innerList: mixList.expected,
  };

  return { values, expected };
}

function expectRealmList(value: unknown): asserts value is Realm.List<unknown> {
  expect(value).instanceOf(Realm.List);
}

function expectRealmDictionary(value: unknown): asserts value is Realm.Dictionary<unknown> {
  expect(value).instanceOf(Realm.Dictionary);
}

/**
 * The default tester of values.
 * @param actual The value downloaded from the server.
 * @param inserted The value inserted locally before upload.
 */
function defaultTester(actual: unknown, inserted: unknown) {
  if (inserted instanceof Array) {
    expectRealmList(actual);
    expect(actual.length).equals(inserted.length);
    inserted.forEach((item, index) => defaultTester(actual[index], item));
  } else if (inserted != null && typeof inserted === "object" && "d128" in inserted) {
    expectRealmDictionary(actual);
    const insertedKeys = Object.keys(actual);
    const actualKeys = Object.keys(actual);
    expect(insertedKeys).members(actualKeys);
    insertedKeys.forEach((key) => defaultTester(actual[key], (inserted as Record<string, unknown>)[key]));
  } else if (inserted instanceof ArrayBuffer) {
    const actualBinaryView = new Uint8Array(actual as ArrayBuffer);
    const insertedBinaryView = new Uint8Array(inserted as ArrayBuffer);
    expect(actualBinaryView.byteLength).equals(insertedBinaryView.byteLength);
    insertedBinaryView.forEach((item, index) => defaultTester(item, actualBinaryView[index]));
  } else if (inserted != null && typeof inserted === "object" && "_id" in inserted) {
    expect(actual).instanceOf(MixedClass);
    const actualMixed = actual as MixedClass;
    const insertedMixed = inserted as MixedClass;
    defaultTester(actualMixed._id, insertedMixed._id);
  } else {
    expect(String(actual)).equals(String(inserted));
  }
}

async function setupIfFlexiblySync(realm: Realm, useFlexibleSync: boolean) {
  if (useFlexibleSync) {
    await realm.subscriptions.update((mutableSubs) => {
      mutableSubs.add(realm.objects(MixedClass));
    });
    await realm.subscriptions.waitForSynchronization();
  }
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
 * @param valueTester The function used to assert equality
 * @param useFlexibleSync Whether to use flexible sync (otherwise partition based sync will be used)
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
    valueTester(actual, inserted);
  }

  describe(`roundtrip of '${typeName}'`, () => {
    openRealmBefore({
      schema: [MixedClass],
      sync: useFlexibleSync ? { flexible: true } : { partitionValue: "mixed-test" },
    });

    it("writes", async function (this: RealmContext) {
      await setupIfFlexiblySync(this.realm, useFlexibleSync);
      this._id = new Realm.BSON.ObjectId();
      this.realm.write(() => {
        if (typeof value === "function") {
          const valueResult = value(this.realm);
          if ("expected" in valueResult && "values" in valueResult) {
            this.value = valueResult.values;
            this.expected = valueResult.expected;
          } else {
            this.value = valueResult;
          }
        } else {
          this.value = value;
        }
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
      await setupIfFlexiblySync(this.realm, useFlexibleSync);

      const obj = await new Promise<MixedClass>((resolve) => {
        this.realm
          .objects(MixedClass)
          .filtered("_id = $0", this._id)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      expect(typeof obj).equals("object");

      const testVal = this.expected === undefined ? this.value : this.expected;
      // Test the single value
      performTest(obj.value, testVal);
      // Test the list of values
      expect(obj.list.length).equals(4);
      const firstElement = obj.list[0];
      performTest(firstElement, testVal);
      // No need to keep these around
      delete this._id;
      delete this.value;
    });
  });
}

function describeTypes(useFlexibleSync: boolean) {
  authenticateUserBefore();

  describeRoundtrip({ typeName: "null", value: null, useFlexibleSync });

  // TODO: Provide an API to specify storing this as an int
  describeRoundtrip({ typeName: "int", value: 123, useFlexibleSync });

  // TODO: Provide an API to specify which of these to store
  describeRoundtrip({ typeName: "float / double", value: 123.456, useFlexibleSync });
  describeRoundtrip({ typeName: "bool (true)", value: true, useFlexibleSync });
  describeRoundtrip({ typeName: "bool (false)", value: false, useFlexibleSync });
  describeRoundtrip({ typeName: "string", value: "test-string", useFlexibleSync });

  const buffer = new Uint8Array([4, 8, 12, 16]).buffer;
  describeRoundtrip({
    typeName: "data",
    value: buffer,
    useFlexibleSync,
  });

  const date = new Date(1620768552979);
  describeRoundtrip({
    typeName: "date",
    value: date,
    useFlexibleSync,
  });

  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip({
    typeName: "ObjectId",
    value: objectId,
    useFlexibleSync,
  });

  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip({
    typeName: "UUID",
    value: uuid,
    useFlexibleSync,
  });

  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip({
    typeName: "Decimal128",
    value: decimal128,
    useFlexibleSync,
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
    valueTester: (value: MixedClass) => {
      expect(recursiveObjectId.equals(value._id)).to.be.true;
    },
    useFlexibleSync,
  });

  if (useFlexibleSync) {
    describe("collections in mixed", () => {
      describeRoundtrip({
        typeName: "list",
        value: getMixedList,
        useFlexibleSync: true,
      });

      describeRoundtrip({
        typeName: "nested list",
        value: getNestedMixedList,
        useFlexibleSync: true,
      });

      describeRoundtrip({
        typeName: "dictionary",
        value: getMixedDict,
        useFlexibleSync: true,
      });

      describeRoundtrip({
        typeName: "nested dictionary",
        value: getNestedMixedDict,
        useFlexibleSync: true,
      });
    });
  }
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
