import { assert, expect } from "chai";

import { importAppBefore, authenticateUserBefore, openRealmBefore } from "../../hooks";

import { itUploadsDeletesAndDownloads } from "./upload-delete-download";

type MixedClass = { _id: Realm.BSON.ObjectId, value: Realm.Mixed, list: Realm.List<Realm.Mixed> };
type TestOptions = { value: Realm.Mixed, test?: (actual: Realm.Mixed, inserted: Realm.Mixed) => void };

function describeSimpleRoundtrip(typeName: string, value: unknown) {
  return describeRoundtrip(typeName, { value });
}

function describeRoundtrip(typeName: string, options: TestOptions) {
  function testValue(actual: Realm.Mixed, inserted: Realm.Mixed) {
    if (options.test) {
      const result = options.test(actual, inserted);
      if (typeof result === "boolean") {
        expect(result).equals(true, `${options.test} failed!`);
      }
    } else {
      expect(actual).equals(inserted);
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
        this.value = typeof options.value === "function" ? options.value(this.realm) : options.value;
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
      testValue(obj.value, this.value);
      // Test the list of values
      expect(obj.list.length).equals(4);
      const firstElement = obj.list[0];
      testValue(firstElement, this.value);
      // No need to keep these around
      delete this._id;
      delete this.value;
    });
  });
}

describe("mixed", () => {
  importAppBefore("with-db");
  authenticateUserBefore();
  
  describeSimpleRoundtrip("null", null);

  // TODO: Provide an API to speficy storing this as an int
  describeSimpleRoundtrip("int", 123);
  
  // TODO: Provide an API to specify which of these to store
  describeSimpleRoundtrip("float / double", 123.456);
  
  describeSimpleRoundtrip("bool (true)", true);
  describeSimpleRoundtrip("bool (false)", false);
  
  describeSimpleRoundtrip("string", "test-string");

  // Unsupported:
  // describeSimpleRoundtrip("undefined", undefined);
  
  const buffer = new Uint8Array([ 4, 8, 12, 16 ]).buffer;
  describeRoundtrip("data", {
    value: buffer,
    test: (value: ArrayBuffer) => {
      expect(value.byteLength).equals(4);
      expect([...new Uint8Array(value)]).deep.equals([ 4, 8, 12, 16 ]);
    }
  });
  
  const date = new Date(1620768552979);
  describeRoundtrip("date", {
    value: date,
    test: (value: Date) => value.getTime() === date.getTime()
  });
  
  const objectId = new Realm.BSON.ObjectId("609afc1290a3c1818f04635e");
  describeRoundtrip("ObjectId", {
    value: objectId,
    test: (value: Realm.BSON.ObjectId) => objectId.equals(value),
  });
  
  const uuid = new Realm.BSON.UUID("9476a497-60ef-4439-bc8a-52b8ad0d4875");
  describeRoundtrip("UUID", {
    value: uuid,
    test: (value: Realm.BSON.UUID) => uuid.equals(value),
  });
  
  const decimal128 = Realm.BSON.Decimal128.fromString("1234.5678");
  describeRoundtrip("Decimal128", {
    value: decimal128,
    test: (value: Realm.BSON.Decimal128) => decimal128.bytes.equals(value.bytes),
  });
  
  const recursiveObjectId = new Realm.BSON.ObjectId();
  describeRoundtrip("object link", {
    value: (realm: Realm) => {
      // Create an object
      const result = realm.create<MixedClass>("MixedClass", { _id: recursiveObjectId, value: null });
      // Make it recursive
      result.value = result;
      return result;
    },
    test: (value: MixedClass) => recursiveObjectId.equals(value._id),
  });
});
