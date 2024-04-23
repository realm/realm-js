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
import Realm, { Mixed, ObjectSchema } from "realm";

import {
  importAppBefore,
  authenticateUserBefore,
  openRealmBefore,
  setupMultiRealmsBeforeAndAfterEach as setupMultiRealmsBeforeAndAfterEach,
} from "../../hooks";

import { itUploadsDeletesAndDownloads } from "./upload-delete-download";
import { buildAppConfig } from "../../utils/build-app-config";
import { OpenRealmConfiguration } from "../../utils/open-realm";
import { sleep } from "../../utils/sleep";

type Value = Realm.Mixed | ((realm: Realm) => Realm.Mixed);
type ValueTester = (actual: Realm.Mixed, inserted: Realm.Mixed, realm?: Realm) => void;

class MixedClass extends Realm.Object<MixedClass> {
  _id!: Realm.BSON.ObjectId;
  value: Realm.Mixed;
  list!: Realm.List<Realm.Mixed>;
  dict!: Realm.Dictionary<Realm.Mixed>;

  static schema: ObjectSchema = {
    name: "MixedClass",
    properties: {
      _id: "objectId",
      value: "mixed",
      list: "mixed[]",
      dict: "mixed{}",
    },
    primaryKey: "_id",
  };
}

/**
 * The default tester of values.
 * @param actual The value downloaded from the server.
 * @param inserted The value inserted locally before upload.
 */
function defaultTester(actual: Realm.Mixed, inserted: Realm.Mixed, realm?: Realm) {
  if (actual instanceof Realm.List) {
    const insertedVal = inserted as Realm.Mixed[];
    actual.forEach((item, index) => defaultTester(item, insertedVal[index], realm));
  } else if (actual instanceof Realm.Dictionary) {
    const insertedVal = inserted as { [key: string]: any };
    Object.keys(actual).forEach((key) => defaultTester(actual[key], insertedVal[key], realm));
  } else if (actual instanceof Realm.BSON.Decimal128) {
    const insertedVal = inserted as Realm.BSON.Decimal128;
    expect(actual.bytes.equals(insertedVal.bytes)).equals(true);
  } else if (actual instanceof Realm.BSON.ObjectID) {
    const insertedVal = inserted as Realm.BSON.ObjectID;
    expect(actual.equals(insertedVal)).equals(true);
  } else if (actual instanceof Realm.BSON.UUID) {
    const insertedVal = inserted as Realm.BSON.UUID;
    expect(actual.equals(insertedVal)).equals(true);
  } else if (actual instanceof Date) {
    const insertedVal = inserted as Date;
    expect(actual.getTime() == insertedVal.getTime()).equals(true);
  } else if (actual instanceof ArrayBuffer) {
    const actualBinaryView = new Uint8Array(actual);
    const insertedBynaryView = new Uint8Array(inserted as ArrayBuffer);
    expect(actualBinaryView.byteLength).equals(insertedBynaryView.byteLength);
    actualBinaryView.forEach((item, index) => defaultTester(item, insertedBynaryView[index]));
  } else if (actual instanceof MixedClass && realm) {
    const insertedVal = realm.objects<MixedClass>("MixedClass").filtered("_id = $0", actual._id)[0];
    expect(actual._id.equals(insertedVal._id)).equals(true);
    defaultTester(actual.value, insertedVal.value);
  } else {
    expect(actual).equals(inserted);
  }
}

async function setupTest(realm: Realm, useFlexibleSync: boolean) {
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
  function performTest(actual: Realm.Mixed, inserted: Realm.Mixed, realm: Realm) {
    valueTester(actual, inserted, realm);
  }

  describe(`roundtrip of '${typeName}'`, () => {
    openRealmBefore({
      schema: [MixedClass],
      sync: useFlexibleSync ? { flexible: true } : { partitionValue: "mixed-test" },
    });

    it("writes", async function (this: RealmContext) {
      await setupTest(this.realm, useFlexibleSync);
      //TODO Maybe I could also check that the dictionary can change value
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
      await setupTest(this.realm, useFlexibleSync);

      const obj = await new Promise<MixedClass>((resolve) => {
        this.realm
          .objects(MixedClass) //TODO Remember to do it in other places
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
    useFlexibleSync: useFlexibleSync,
  });

  const date = new Date(1620768552979);
  describeRoundtrip({
    typeName: "date",
    value: date,
    useFlexibleSync: useFlexibleSync,
  });

  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip({
    typeName: "ObjectId",
    value: objectId,
    useFlexibleSync: useFlexibleSync,
  });

  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip({
    typeName: "UUID",
    value: uuid,
    useFlexibleSync: useFlexibleSync,
  });

  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip({
    typeName: "Decimal128",
    value: decimal128,
    useFlexibleSync: useFlexibleSync,
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
      expect(recursiveObjectId.equals(value._id)).equals(true); //TODO I should be able to put this into the default tester
    },
    useFlexibleSync: useFlexibleSync,
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

const data = new Uint8Array([0xd8, 0x21, 0xd6, 0xe8, 0x00, 0x57, 0xbc, 0xb2, 0x6a, 0x15]).buffer;

const getMixedList = (realm: Realm) => {
  const ob = realm.create<MixedClass>("MixedClass", {
    _id: new Realm.BSON.ObjectId(),
  });

  return [
    null,
    true,
    1,
    5.0,
    "string",
    Realm.BSON.Decimal128.fromString("1234.5678"),
    new Realm.BSON.ObjectId("609afc1290a3c1818f04635e"),
    new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875"),
    new Date(1620768552979),
    data,
    ob,
  ];
};

const getMixedDict = (realm: Realm) => {
  const ob = realm.create<MixedClass>("MixedClass", {
    _id: new Realm.BSON.ObjectId(),
  });

  return {
    null: null,
    bool: true,
    int: 1,
    float: 5.0,
    string: "stringVal",
    decimal: Realm.BSON.Decimal128.fromString("1234.5678"),
    objectId: new Realm.BSON.ObjectId("609afc1290a3c1818f04635e"),
    uuid: new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875"),
    date: new Date(1620768552979),
    data: data,
    obj: ob,
  };
};

const getNestedMixedList = (realm: Realm) => {
  return [...getMixedList(realm), getMixedList(realm), getMixedDict(realm)];
};

const getNestedMixedDict = (realm: Realm) => {
  return {
    ...getMixedDict(realm),
    innerList: getMixedList(realm),
    innerDict: getMixedDict(realm),
  };
};

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

  describe.skipIf(environment.skipFlexibleSync, "mixed collections", function () {
    this.longTimeout();
    importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
    setupMultiRealmsBeforeAndAfterEach();

    const realmConfig = {
      schema: [MixedClass],
      sync: { flexible: true },
    } satisfies OpenRealmConfiguration;

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

    it("value change", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const obId = new Realm.BSON.ObjectId();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });
      expect(obj2.value).equals(obj1.value);

      for (const val of valuesToInsert) {
        realm1.write(() => {
          obj1.value = val;
        });

        defaultTester(obj1.value, val, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        // If I use sleep, then obj1 and obj2 become invalid after
        // await sleep(500);
        await waitPromise;

        defaultTester(obj2.value, val, realm2);
      }
    });

    it("list adding", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: [],
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this list updated with the values we expect to find
      const expectedList = [];

      //Adding elements one by one and verifying the list is synchronized
      for (const val of valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.List).push(val);
        });
        expectedList.push(val);

        defaultTester(obj1.value, expectedList, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedList, realm2);
      }
    });

    it("list removing", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: valuesToInsert,
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this list updated with the values we expect to find
      const expectedList = [...valuesToInsert];

      //Removing elements one by one and verifying the list is synchronized
      for (let i = 0; i < valuesToInsert.length; i++) {
        realm1.write(() => {
          (obj1.value as Realm.List).pop();
        });
        expectedList.pop();

        defaultTester(obj1.value, expectedList, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedList, realm2);
      }

      expect((obj1.value as Realm.List).length).equals(0);
      expect((obj2.value as Realm.List).length).equals(0);
    });

    it("list modification", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert = realm1.write(() => {
        return getNestedMixedList(realm1);
      });

      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: ["test"],
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this list updated with the values we expect to find
      const expectedList: Mixed[] = ["test"];

      //Changing the first element and verifying the list is synchronized
      for (const val of valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.List)[0] = val;
        });
        expectedList[0] = val;

        defaultTester(obj1.value, expectedList, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedList, realm2);
      }

      obj2.removeAllListeners();
    });

    it("dictionary adding", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: {},
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict: { [key: string]: any } = {};

      //Adding elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        const val = valuesToInsert[key];
        realm1.write(() => {
          (obj1.value as Realm.Dictionary)[key] = val;
        });
        expectedDict[key] = val;

        defaultTester(obj1.value, expectedDict, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedDict, realm2);
      }
    });

    it("dictionary removing", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: valuesToInsert,
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict = { ...valuesToInsert };

      //Removing elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        realm1.write(() => {
          (obj1.value as Realm.Dictionary).remove(key);
        });
        delete expectedDict[key];

        defaultTester(obj1.value, expectedDict, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedDict, realm2);
      }
    });

    it("dictionary modification", async function (this: Mocha.Context & AppContext & MultiRealmContext) {
      const realm1 = await this.getRealm(realmConfig);
      await setupTest(realm1, true);

      const valuesToInsert: { [key: string]: any } = realm1.write(() => {
        return getNestedMixedDict(realm1);
      });

      const keyString = "keyString";
      const obId = new Realm.BSON.ObjectID();
      const obj1 = realm1.write(() => {
        return realm1.create(MixedClass, {
          _id: obId,
          value: { [keyString]: 1 },
        });
      });

      await realm1.syncSession?.uploadAllLocalChanges();
      const realm2 = await this.getRealm(realmConfig);
      await setupTest(realm2, true);

      const obj2 = await new Promise<MixedClass>((resolve) => {
        realm2
          .objects<MixedClass>("MixedClass")
          .filtered("_id = $0", obId)
          .addListener(([obj]) => {
            if (obj) {
              resolve(obj);
            }
          });
      });

      //We will keep this dictionary updated with the values we expect to find
      const expectedDict: { [key: string]: any } = {};

      //Modifying elements one by one and verifying the dictionary is synchronized
      for (const key in valuesToInsert) {
        const val = valuesToInsert[key];
        realm1.write(() => {
          (obj1.value as Realm.Dictionary)[keyString] = val;
        });
        expectedDict[keyString] = val;

        defaultTester(obj1.value, expectedDict, realm2);

        const waitPromise = getWaiter(obj2, "value");
        await realm1.syncSession?.uploadAllLocalChanges();
        await realm2.syncSession?.downloadAllServerChanges();
        await waitPromise;

        defaultTester(obj2.value, expectedDict, realm2);
      }
    });
  });
});
