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
import Realm from "realm";
import { importApp } from "./dist/utils/import-app.js";
// import { authenticateUserBefore } from "../../hooks";
let user;

/**
 * The default tester of values.
 * @param actual The value downloaded from the server.
 * @param inserted The value inserted locally before upload.
 */
function defaultTester(actual, inserted) {
  expect(actual).equals(inserted);
}

function log(...args) {
  console.log("");
  console.log("");
  console.log("");
  console.log("----------");
  console.log(...args);
  console.log("----------");
  console.log("");
  console.log("");
  console.log("");
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
async function describeRoundtrip({ typeName, value, testValue = defaultTester, flexibleSync }) {
  function performTest(actual, inserted) {
    const result = testValue(actual, inserted);
    if (typeof result === "boolean") {
      expect(result).equals(true, `${testValue} failed!`);
    }
  }
  async function setupTest(realm) {
    if (flexibleSync) {
      log("setupTest: before update");
      realm.subscriptions.update((mutableSubs) => {
        log("doing update");

        mutableSubs.add(realm.objects("MixedClass"));
      });
      log("waiting for sync after update");

      await realm.subscriptions.waitForSynchronization();
      log("setupTest: sync done");
    }
  }
  log(`roundtrip of '${typeName}'`);

  const config = {
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
    sync: { user, ...(flexibleSync ? { flexible: true } : { partitionValue: "mixed-test" }) },
  };
  log("opening realm...");
  let realm = await Realm.open(config);
  log("opened realm...");

  log("setting up sub");
  await setupTest(realm);
  log("starting write");
  const stuff = {};
  stuff._id = new Realm.BSON.ObjectId();
  realm.write(() => {
    stuff.value = typeof value === "function" ? value(stuff.realm) : value;
    realm.create("MixedClass", {
      _id: stuff._id,
      value: stuff.value,
      // Adding a few other unrelated elements to the list
      list: [stuff.value, 123, false, "something-else"],
    });
  });

  log("upload");
  await realm.syncSession.uploadAllLocalChanges();

  log("close");
  realm.close();
  Realm.deleteFile(config);

  log("re-open");
  realm = await Realm.open(config);

  // itUploadsDeletesAndDownloads();
  log("reads");
  await setupTest(realm);
  const obj = realm.objectForPrimaryKey("MixedClass", stuff._id);
  if (!obj) throw new Error("Object not found");
  log({ obj });
  // expect(typeof obj).equals("object");
  // // Test the single value
  // performTest(obj.value, this.value);
  // // Test the list of values
  // expect(obj.list.length).equals(4);
  // const firstElement = obj.list[0];
  // performTest(firstElement, this.value);
  // // No need to keep these around
  // delete this._id;
  // delete this.value;

  log("close2");
  realm.close();
  Realm.deleteFile(config);
}
async function describeTypes(flexibleSync) {
  // authenticateUserBefore();
  await describeRoundtrip({ typeName: "null", value: null, flexibleSync });
  // TODO: Provide an API to speficy storing this as an int
  await describeRoundtrip({ typeName: "int", value: 123, flexibleSync });
  // TODO: Provide an API to specify which of these to store
  await describeRoundtrip({ typeName: "float / double", value: 123.456, flexibleSync });
  await describeRoundtrip({ typeName: "bool (true)", value: true, flexibleSync });
  await describeRoundtrip({ typeName: "bool (false)", value: false, flexibleSync });
  await describeRoundtrip({ typeName: "string", value: "test-string", flexibleSync });
  // Unsupported:
  // describeSimpleRoundtrip("undefined", undefined);
  const buffer = new Uint8Array([4, 8, 12, 16]).buffer;
  await describeRoundtrip({
    typeName: "data",
    value: buffer,
    testValue: (value) => {
      expect(value.byteLength).equals(4);
      expect([...new Uint8Array(value)]).deep.equals([4, 8, 12, 16]);
    },
    flexibleSync,
  });
  const date = new Date(1620768552979);
  await describeRoundtrip({
    typeName: "date",
    value: date,
    testValue: (value) => value.getTime() === date.getTime(),
    flexibleSync,
  });
  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  await describeRoundtrip({
    typeName: "ObjectId",
    value: objectId,
    testValue: (value) => objectId.equals(value),
    flexibleSync,
  });
  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  await describeRoundtrip({
    typeName: "UUID",
    value: uuid,
    testValue: (value) => uuid.equals(value),
    flexibleSync,
  });
  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  await describeRoundtrip({
    typeName: "Decimal128",
    value: decimal128,
    testValue: (value) => decimal128.bytes.equals(value.bytes),
    flexibleSync,
  });
  const recursiveObjectId = new Realm.BSON.ObjectId();
  await describeRoundtrip({
    typeName: "object link",
    value: (realm) => {
      // Create an object
      const result = realm.create("MixedClass", {
        _id: recursiveObjectId,
        value: null,
      });
      // Make it recursive
      result.value = result;
      return result;
    },
    testValue: (value) => recursiveObjectId.equals(value._id),
    flexibleSync,
  });
}
const go = async () => {
  const appId = (await importApp("with-db-flx", {}, "all")).id;
  log(`using app ${appId}`);
  const app = new Realm.App(appId);

  log("waiting 10 secs after app creation");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  log("wait done after app creation");

  Realm.App.Sync.setLogger(app, (level, message) => {
    const date = new Date();
    console.log(date.toString(), date.getMilliseconds(), level, message);
  });
  Realm.App.Sync.setLogLevel(app, "all");

  user = await app.logIn(Realm.Credentials.anonymous());
  // describeTypes(false);
  describeTypes(true);
};
go();

// describe.skipIf(environment.missingServer, "mixed", () => {
//   describe("parition-based sync", function () {
//     importAppBefore("with-db");
//     describeTypes(false);
//   });
//   describe("flexible sync", function () {
//     importAppBefore("with-db-flx");
// describeTypes(true);
//   });
// });
