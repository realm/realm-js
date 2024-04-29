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
import Realm, { BSON, Configuration, Mixed, ObjectSchema } from "realm";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";
import { itUploadsDeletesAndDownloads } from "./upload-delete-download";
import { buildAppConfig } from "../../utils/build-app-config";
import { OpenRealmConfiguration, openRealm } from "../../utils/open-realm";

type Value = Realm.Mixed | ((realm: Realm) => Realm.Mixed);
type ValueTester = (actual: Realm.Mixed, inserted: Realm.Mixed, realm?: Realm) => void;

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
  const obj = realm.create(MixedClass, { _id: new BSON.ObjectId() });

  return [bool, int, double, d128, string, oid, uuid, nullValue, date, data, obj];
}

function getMixedDict(realm: Realm) {
  const obj = realm.create(MixedClass, { _id: new BSON.ObjectId() });

  return {
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
}

function getNestedMixedList(realm: Realm) {
  return [...getMixedList(realm), getMixedList(realm), getMixedDict(realm)];
}

function getNestedMixedDict(realm: Realm) {
  return {
    ...getMixedDict(realm),
    innerList: getMixedList(realm),
    innerDict: getMixedDict(realm),
  };
}

function expectJsArray(value: unknown): asserts value is unknown[] {
  expect(value).to.be.an("array");
}

function expectJsObject(value: unknown): asserts value is Record<string, unknown> {
  expect(value).to.be.an("object");
}

/**
 * The default tester of values.
 * @param actual The value downloaded from the server.
 * @param inserted The value inserted locally before upload.
 */
function defaultTester(actual: unknown, inserted: unknown) {
  if (actual instanceof Realm.List) {
    expectJsArray(inserted);
    expect(actual.length).equals(inserted.length);
    actual.forEach((item, index) => defaultTester(item, inserted[index]));
  } else if (actual instanceof Realm.Dictionary) {
    expectJsObject(inserted);
    const actualKeys = Object.keys(actual);
    expect(actualKeys).members(Object.keys(inserted));
    actualKeys.forEach((key) => defaultTester(actual[key], inserted[key]));
  } else if (actual instanceof ArrayBuffer) {
    const actualBinaryView = new Uint8Array(actual);
    const insertedBinaryView = new Uint8Array(inserted as ArrayBuffer);
    expect(actualBinaryView.byteLength).equals(insertedBinaryView.byteLength);
    actualBinaryView.forEach((item, index) => defaultTester(item, insertedBinaryView[index]));
  } else if (actual instanceof Realm.Object) {
    expect(actual).instanceOf(MixedClass);
    expect(inserted).instanceOf(MixedClass);
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
  function performTest(actual: Realm.Mixed, inserted: Realm.Mixed, realm: Realm) {
    valueTester(actual, inserted, realm);
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
      // Test the single value
      performTest(obj.value, this.value, this.realm);
      // Test the list of values
      expect(obj.list.length).equals(4);
      const firstElement = obj.list[0];
      performTest(firstElement, this.value, this.realm);
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

describe.only("mixed synced", () => {
  // describe("partition-based sync roundtrip", function () {
  //   this.longTimeout();
  //   importAppBefore(buildAppConfig("with-pbs").anonAuth().partitionBasedSync());
  //   describeTypes(false);
  // });

  // describe.skipIf(environment.skipFlexibleSync, "flexible sync roundtrip", function () {
  //   this.longTimeout();
  //   importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
  //   describeTypes(true);
  // });

  describe.skipIf(environment.skipFlexibleSync, "mixed collections", function () {
    // const dirname = "/Users/papafe/Desktop";
    // const filePath = path.join(dirname, "logs.txt"); // Specify your log file path here

    // fs.unlink(filePath, (err) => {
    //   if (err) {
    //     console.error("Failed to delete file:", err);
    //   }
    // });

    // const callback: LoggerCallback2 = (entry: LogEntry) => {
    //   const message = `[${entry.category}-${entry.level}] - ${entry.message}`;
    //   // console.log(message);
    //   fs.appendFile(filePath, message, (err) => {
    //     if (err) {
    //       console.error("Error writing to log file:", err);
    //     }
    //   });
    // };

    // Realm.setLogger(callback);
    // Realm.setLogLevel("trace");

    this.longTimeout();
    importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());

    type MultiRealmContext = {
      realm1: Realm;
      realm2: Realm;
      config1: Configuration;
      config2: Configuration;
    } & AppContext &
      Mocha.Context;

    beforeEach(async function (this: MultiRealmContext) {
      const config = {
        schema: [MixedClass],
        sync: { flexible: true },
      } satisfies OpenRealmConfiguration;

      this.realm1 = await logInAndGetRealm(this.app, config);
      this.realm2 = await logInAndGetRealm(this.app, config);
      this.config1 = { ...config, sync: this.realm1.syncSession?.config };
      this.config2 = { ...config, sync: this.realm2.syncSession?.config };
    });

    afterEach(async function (this: MultiRealmContext) {
      closeAndDeleteRealms(this.config1, this.config2);
    });

    function closeAndDeleteRealms(...configs: Configuration[]) {
      for (const config of configs) {
        Realm.deleteFile(config);
      }
      Realm.clearTestState();
    }

    async function waitForSynchronization({
      uploadRealm,
      downloadRealm,
    }: {
      uploadRealm: Realm;
      downloadRealm: Realm;
    }) {
      await uploadRealm.syncSession?.uploadAllLocalChanges();
      await downloadRealm.syncSession?.downloadAllServerChanges();
    }

    async function logInAndGetRealm(app: Realm.App, config: OpenRealmConfiguration) {
      const user = await app.logIn(Realm.Credentials.anonymous(false));
      const realm = (await openRealm(config, user)).realm;

      await setupIfFlexiblySync(realm, true);

      // It seems that if I use this I don't get the same core crash, but the test doesn't complete
      // realm.write(() => {
      //   realm.delete(realm.objects(MixedClass));
      // });

      // await realm.syncSession?.uploadAllLocalChanges();

      return realm;
    }

    function getWaiter(obj: MixedClass, propertyName: keyof MixedClass): Promise<void> {
      return new Promise((resolve) => {
        obj.addListener((_, changes) => {
          if (changes.changedProperties.includes(propertyName)) {
            obj.removeAllListeners();
            resolve();
          }
        });
      });
    }

    function waitForMixedClassObj(realm: Realm, obId: Realm.BSON.ObjectId): Promise<MixedClass> {
      return new Promise<MixedClass>((resolve) => {
        realm
          .objects(MixedClass)
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });
    }

    async function getObjects(
      realm1: Realm,
      realm2: Realm,
      initialVal: Mixed,
    ): Promise<{ obj1: MixedClass; obj2: MixedClass }> {
      const obId = new Realm.BSON.ObjectId();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: initialVal,
        });
      });

      const obj2 = await waitForMixedClassObj(realm2, obId);
      return { obj1, obj2 };
    }

    it("value change", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;
      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, null);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      for (const val of valuesToInsert) {
        realm1.write(() => {
          obj1.value = val;
        });

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, val);
      }
    });

    it("list adding", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;
      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, []);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      //We will keep this list updated with the values we expect to find
      const expectedList = [];

      //Adding elements one by one and verifying the list is synchronized
      for (const val of valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.List).push(val);
        });
        expectedList.push(val);

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedList);
      }
    });

    it("list removing", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, valuesToInsert);

      //We will keep this list updated with the values we expect to find
      const expectedList = [...valuesToInsert];

      //Removing elements one by one and verifying the list is synchronized
      for (let i = 0; i < valuesToInsert.length; i++) {
        realm1.write(() => {
          (obj1.value as Realm.List).pop();
        });
        expectedList.pop();

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedList);
      }

      expect((obj1.value as Realm.List).length).equals(0);
      expect((obj2.value as Realm.List).length).equals(0);
    });

    it("list modification", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, ["test"]);

      //We will keep this list updated with the values we expect to find
      const expectedList: Mixed[] = ["test"];

      //Changing the first element and verifying the list is synchronized
      for (const val of valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.List)[0] = val;
        });
        expectedList[0] = val;

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedList);
      }

      obj2.removeAllListeners();
    });

    it.skip("dictionary adding", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, {});

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict: { [key: string]: any } = {};

      //Adding elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        const val = valuesToInsert[key];
        realm1.write(() => {
          (obj1.value as Realm.Dictionary)[key] = val;
        });
        expectedDict[key] = val;

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedDict);
      }
    });

    it.skip("dictionary removing", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, valuesToInsert);

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict = { ...valuesToInsert };

      //Removing elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.Dictionary).remove(key);
        });
        delete expectedDict[key];

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedDict, realm2);
      }
    });

    it.skip("dictionary modification", async function (this: MultiRealmContext) {
      const realm1 = this.realm1;
      const realm2 = this.realm2;

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const keyString = "keyString";
      const { obj1, obj2 } = await getObjects(this.realm1, this.realm2, { [keyString]: 1 });

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict: { [key: string]: any } = {};

      //Modifying elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        const val = valuesToInsert[key];
        realm1.write(() => {
          (obj1.value as Realm.Dictionary)[keyString] = val;
        });
        expectedDict[keyString] = val;

        const waitPromise = getWaiter(obj2, "value");
        await waitForSynchronization({ uploadRealm: realm1, downloadRealm: realm2 });
        await waitPromise;

        defaultTester(obj2.value, expectedDict);
      }
    });
  });
});
