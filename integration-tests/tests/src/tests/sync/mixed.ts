import { assert, expect } from "chai";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";

import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

type MixedClass = { _id: Realm.BSON.ObjectId, value: Realm.Mixed, list: Realm.List<Realm.Mixed> };
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
function describeRoundtrip(typeName: string, value: Value, testValue: ValueTester = defaultTester) {
  function performTest(actual: Realm.Mixed, inserted: Realm.Mixed) {
    const result = testValue(actual, inserted);
    if (typeof result === "boolean") {
      expect(result).equals(true, `${testValue} failed!`);
    }
  }

  describe(`roundtrip of '${typeName}'`, () => {
    openRealmBefore({
      schema: [{
        name: "MixedClass",
        primaryKey: "_id",
        properties: {
          _id: "objectId",
          value: "mixed?",
          list: "mixed[]",
        },
      }],
      sync: { partitionValue: "mixed-test" },
    });

    it("writes", function(this: RealmContext) {
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
  
    it("reads", function(this: RealmContext) {
      const obj = this.realm.objectForPrimaryKey<MixedClass>("MixedClass", this._id);
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

describe.skipIf(environment.missingServer, "mixed", () => {
  importAppBefore("with-db");
  authenticateUserBefore();
  
  describeRoundtrip("null", null);

  // TODO: Provide an API to speficy storing this as an int
  describeRoundtrip("int", 123);
  
  // TODO: Provide an API to specify which of these to store
  describeRoundtrip("float / double", 123.456);
  
  describeRoundtrip("bool (true)", true);
  describeRoundtrip("bool (false)", false);
  
  describeRoundtrip("string", "test-string");

  // Unsupported:
  // describeSimpleRoundtrip("undefined", undefined);
  
  const buffer = new Uint8Array([ 4, 8, 12, 16 ]).buffer;
  describeRoundtrip("data", buffer, (value: ArrayBuffer) => {
    expect(value.byteLength).equals(4);
    expect([...new Uint8Array(value)]).deep.equals([ 4, 8, 12, 16 ]);
  });
  
  const date = new Date(1620768552979);
  describeRoundtrip("date", date, (value: Date) => value.getTime() === date.getTime());
  
  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip("ObjectId", objectId, (value: Realm.BSON.ObjectId) => objectId.equals(value));
  
  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip("UUID", uuid, (value: Realm.BSON.UUID) => uuid.equals(value));
  
  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip("Decimal128", decimal128, (value: Realm.BSON.Decimal128) => decimal128.bytes.equals(value.bytes));
  
  const recursiveObjectId = new Realm.BSON.ObjectId();
  describeRoundtrip(
    "object link", 
    (realm: Realm) => {
      // Create an object
      const result = realm.create<MixedClass>("MixedClass", { _id: recursiveObjectId, value: null });
      // Make it recursive
      result.value = result;
      return result;
    },
    (value: MixedClass) => recursiveObjectId.equals(value._id),
  );
});
