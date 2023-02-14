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
import Realm, { BSON } from "realm";
import { openRealmBeforeEach } from "../hooks";
import { select } from "../utils/select";
const { Decimal128, ObjectId, UUID } = Realm.BSON;

class TestObject extends Realm.Object {
  doubleCol!: Realm.Types.Double;
  static schema = {
    name: "TestObject",
    properties: {
      doubleCol: "double",
    },
  };
}

const IntPrimarySchema = {
  name: "IntPrimaryObject",
  primaryKey: "primaryCol",
  properties: {
    primaryCol: "int",
    valueCol: "string",
  },
};

interface IntPrimaryObject {
  primaryCol: Realm.Types.Int;
  valueCol: string;
}

const BasicTypesSchema = {
  name: "BasicTypesObject",
  properties: {
    boolCol: "bool",
    intCol: "int",
    floatCol: "float",
    doubleCol: "double",
    stringCol: "string",
    dateCol: "date",
    dataCol: "data",
    decimal128Col: "decimal128",
    objectIdCol: "objectId",
    uuidCol: "uuid",
  },
};

interface BasicTypesObject {
  boolCol: boolean;
  intCol: Realm.Types.Int;
  floatCol: Realm.Types.Float;
  doubleCol: Realm.Types.Double;
  stringCol: Realm.Types.String;
  dateCol: Realm.Types.Date;
  dataCol: Realm.Types.Data;
  decimal128Col: Realm.Types.Decimal128;
  objectIdCol: Realm.Types.ObjectId;
  uuidCol: Realm.Types.UUID;
}

const LinkTypesSchema = {
  name: "LinkTypesObject",
  properties: {
    objectCol: "TestObject",
    objectCol1: { type: "object", objectType: "TestObject" },
    arrayCol: "TestObject[]",
    arrayCol1: { type: "list", objectType: "TestObject" },
  },
};

const NullableBasicTypesSchema = {
  name: "NullableBasicTypesObject",
  properties: {
    boolCol: "bool?",
    intCol: "int?",
    floatCol: "float?",
    doubleCol: "double?",
    stringCol: "string?",
    dateCol: "date?",
    dataCol: "data?",
    decimal128Col: "decimal128?",
    objectIdCol: "objectId?",
    uuidCol: "uuid?",
  },
};

describe("Results", () => {
  describe("General functionality", () => {
    openRealmBeforeEach({ schema: [TestObject] });

    it("should have a valid constructor", function (this: RealmContext) {
      const objects = this.realm.objects<TestObject>("TestObject");

      expect(objects).instanceOf(Realm.Results);
      expect(objects).instanceOf(Realm.Collection);

      expect(() => {
        new Realm.Results();
      }).throws("Illegal constructor");

      expect(typeof Realm.Results).equals("function");
      expect(Realm.Results).instanceOf(Function);
    });

    it("should return the correct length", function (this: RealmContext) {
      const objects = this.realm.objects("TestObject");
      expect(objects.length).equals(0);

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        expect(objects.length).equals(1);
      });
      expect(objects.length).equals(1);
    });

    it("implements isEmpty", function (this: RealmContext) {
      const result = this.realm.objects("TestObject");
      expect(result.isEmpty()).equals(true);
      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 42 });
      });
      expect(result.isEmpty()).equals(false);
      this.realm.close();
    });

    it("implements indexOf", function (this: RealmContext) {
      const [object1, object2, object3] = this.realm.write(() => {
        return [
          this.realm.create<TestObject>("TestObject", { doubleCol: 1 }),
          this.realm.create<TestObject>("TestObject", { doubleCol: 2 }),
          this.realm.create<TestObject>("TestObject", { doubleCol: 2 }),
        ];
      });

      // Search in base table
      const objects = this.realm.objects("TestObject");
      expect(objects.indexOf(object1)).equals(0);
      expect(objects.indexOf(object2)).equals(1);
      expect(objects.indexOf(object3)).equals(2);

      // Search in filtered query
      const results = objects.filtered("doubleCol == 2");
      expect(results.indexOf(object1)).equals(-1);
      expect(results.indexOf(object2)).equals(0);
      expect(results.indexOf(object3)).equals(1);

      // Searching for object from the wrong realm
      const realm2 = new Realm({ path: "2.realm", schema: this.realm.schema });
      const object4 = realm2.write(() => {
        return realm2.create<TestObject>("TestObject", { doubleCol: 1 });
      });

      expect(() => {
        objects.indexOf(object4);
      }).throws("Realm object is from another Realm");
    });

    it("should be read-only", function (this: RealmContext) {
      const objects = this.realm.objects<TestObject>("TestObject");

      this.realm.write(() => {
        this.realm.create<TestObject>("TestObject", { doubleCol: 1 });
      });

      expect(() => {
        //@ts-expect-error Should be an invalid write to read-only object.
        objects[-1] = { doubleCol: 0 };
      }).throws("Index -1 cannot be less than zero.");
      expect(() => {
        //@ts-expect-error Should be an invalid write to read-only object.
        objects[0] = { doubleCol: 0 };
      }).throws(select({ reactNative: "Cannot assign to index", default: "Cannot assign to read only index 0" }));
      expect(() => {
        //@ts-expect-error Should be an invalid write to read-only object.
        objects[1] = { doubleCol: 0 };
      }).throws(select({ reactNative: "Cannot assign to index", default: "Cannot assign to read only index 1" }));
      expect(() => {
        //@ts-expect-error Should be an invalid write to read-only object.
        objects.length = 0;
      }).throws("Cannot assign to read only property 'length'");
    });

    it("should use correct subscript", function (this: RealmContext) {
      expect(this.realm.objects("TestObject")[0]).equals(undefined);

      this.realm.write(() => {
        this.realm.create<TestObject>("TestObject", { doubleCol: 1 });
        this.realm.create<TestObject>("TestObject", { doubleCol: 2 });
      });

      const results = this.realm.objects<TestObject>("TestObject");
      expect(results[0].doubleCol).equals(1.0);
      expect(results[1].doubleCol).equals(2.0);
      expect(results[2]).equals(undefined);
      expect(results[-1]).equals(undefined);
      expect(results[0]).instanceOf(TestObject);
      expect(results[0]).instanceOf(Realm.Object);
    });

    it("should handle invalidated objects", function (this: RealmContext) {
      this.realm.write(() => {
        for (let i = 10; i > 0; i--) {
          this.realm.create("TestObject", [i]);
        }
      });

      const resultsVariants = [
        this.realm.objects("TestObject"),
        this.realm.objects("TestObject").filtered("doubleCol > 1"),
        this.realm.objects("TestObject").filtered("doubleCol > 1").sorted("doubleCol"),
        this.realm.objects("TestObject").filtered("doubleCol > 1").snapshot(),
      ];

      // test isValid
      resultsVariants.forEach(function (objects) {
        expect(objects.isValid()).equals(true);
      });

      // close and test invalidated accessors
      this.realm.close();
      const reopenedRealm = new Realm({
        schemaVersion: 1,
        schema: [TestObject],
      });

      resultsVariants.forEach(function (objects) {
        expect(objects.isValid()).equals(false);
        expect(() => {
          objects[0];
        }).throws("Access to invalidated Results objects");
        expect(() => {
          objects.filtered("doubleCol < 42");
        }).throws("Access to invalidated Results objects");
        expect(() => {
          objects.sorted("doubleCol", true);
        }).throws("Access to invalidated Results objects");
        expect(() => {
          objects.snapshot();
        }).throws("Access to invalidated Results objects");
      });

      reopenedRealm.close();
    });

    it("should return undefined with invalid properties", function (this: RealmContext) {
      const objects = this.realm.objects("TestObject");
      //@ts-expect-error Should be an invalid property.
      expect(objects.ablasdf).equals(undefined);
    });

    it("should throw on incorrect object types", function (this: RealmContext) {
      expect(() => {
        this.realm.objects("NotTestObject");
      }).throws("Object type 'NotTestObject' not found in schema.");
    });

    it("should enumarate", function (this: RealmContext) {
      const objects = this.realm.objects("TestObject");

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ in objects) {
        throw "No objects should have been enumerated";
      }

      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 1 });
        expect(objects.length).equals(1);
      });

      let count = 0;
      const keys = Object.keys(objects);
      for (const index in objects) {
        expect(count++).equals(+index);
        expect(keys[index]).equals(index);
      }

      expect(count).equals(1);
      expect(keys.length).equals(1);
    });

    it("should work when deleting objects", function (this: RealmContext) {
      const createTestObjects = (n: number) => {
        for (let i = 0; i < n; i++) {
          this.realm.create("TestObject", { doubleCol: i });
        }

        return this.realm.objects("TestObject");
      };

      this.realm.write(() => {
        const objects = createTestObjects(10);
        const snapshot = objects.snapshot();

        this.realm.deleteAll();
        expect(objects.length).equals(0);
        expect(snapshot.length).equals(10);
        expect(snapshot[0]).equals(null);
      });

      this.realm.write(() => {
        const objects = createTestObjects(10);
        this.realm.deleteAll();

        const snapshot = objects.snapshot();
        expect(objects.length).equals(0);
        expect(snapshot.length).equals(0);
      });

      this.realm.write(() => {
        const objects = createTestObjects(10);
        const snapshot = objects.snapshot();

        this.realm.delete(snapshot);
        expect(objects.length).equals(0);
        expect(snapshot.length).equals(10);
        expect(snapshot[0]).equals(null);
      });

      this.realm.write(() => {
        const objects = createTestObjects(10);
        this.realm.delete(objects);

        const snapshot = objects.snapshot();
        expect(objects.length).equals(0);
        expect(snapshot.length).equals(0);
      });
    });

    it("should iterate", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 2 });
        this.realm.create("TestObject", { doubleCol: 3 });
      });

      const results = this.realm.objects<TestObject>("TestObject").filtered("doubleCol >= 2");
      expect(results.length).equals(2);
      let calls = 0;
      for (const obj of results) {
        this.realm.write(() => {
          obj.doubleCol = 1;
        });
        calls++;
      }
      expect(results.length).equals(0);
      expect(calls).equals(2);
    });

    it("should iterate correctly when deleting objects", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("TestObject", { doubleCol: 2 });
        this.realm.create("TestObject", { doubleCol: 3 });
      });

      const results = this.realm.objects("TestObject");
      expect(results.length).equals(2);
      let calls = 0;
      for (const obj of results) {
        this.realm.write(() => {
          this.realm.delete(obj);
          calls++;
        });
      }
      expect(calls).equals(2);
      expect(this.realm.objects("TestObject").length).equals(0);
    });
  });

  describe("Filtering and sorting", () => {
    class PersonObject extends Realm.Object {
      name!: string;
      age!: Realm.Types.Double;
      married!: boolean;
      children!: Realm.List<PersonObject>;
      parents!: Realm.List<PersonObject>;
      static schema = {
        name: "PersonObject",
        properties: {
          name: "string",
          age: "double",
          married: { type: "bool", default: false },
          children: { type: "list", objectType: "PersonObject" },
          parents: { type: "linkingObjects", objectType: "PersonObject", property: "children" },
        },
      };
    }

    it("implements filtered", () => {
      const realm = new Realm({ schema: [PersonObject] });

      realm.write(function () {
        realm.create("PersonObject", { name: "Ari", age: 10 });
        realm.create("PersonObject", { name: "Tim", age: 11 });
        realm.create("PersonObject", { name: "Bjarne", age: 12 });
        realm.create("PersonObject", { name: "Alex", age: 12, married: true });
      });

      // Covered more throughly in Queries tests.
      expect(realm.objects("PersonObject").filtered("name = $0", "Tim").length).equals(1);
      expect(realm.objects("PersonObject").filtered("age > $1 && age < $0", 13, 10).length).equals(3);

      expect(() => {
        realm.objects("PersonObject").filtered("age > $2 && age < $0", 13, 10);
      }).throws("Request for argument at index 2 but only 2 arguments are provided");
      expect(() => {
        realm.objects("PersonObject").filtered("invalidQuery");
      }).throws("Invalid predicate: 'invalidQuery'");

      realm.close();
    });

    it("should throw when filtering foreign object", () => {
      const realm = new Realm({ schema: [LinkTypesSchema, TestObject] });
      const realm2 = new Realm({ path: "2.realm", schema: realm.schema });
      const object = realm2.write(function () {
        return realm2.create<TestObject>("TestObject", { doubleCol: 1 });
      });

      expect(() => {
        realm.objects("LinkTypesObject").filtered("objectCol = $0", object);
      }).throws("Realm object is from another Realm");

      realm2.close();
      realm.close();
    });

    it("implements sorted", () => {
      const realm = new Realm({ schema: [IntPrimarySchema] });
      let objects = realm.objects<IntPrimaryObject>("IntPrimaryObject");

      realm.write(function () {
        realm.create("IntPrimaryObject", { primaryCol: 2, valueCol: "a" });
        realm.create("IntPrimaryObject", { primaryCol: 3, valueCol: "a" });
        realm.create("IntPrimaryObject", { primaryCol: 1, valueCol: "b" });
        realm.create("IntPrimaryObject", { primaryCol: 4, valueCol: "c" });
        realm.create("IntPrimaryObject", { primaryCol: 0, valueCol: "c" });
      });

      const primaries = function (results: Realm.Results<IntPrimaryObject>) {
        return results.map(function (object) {
          return object.primaryCol;
        });
      };

      objects = objects.sorted("primaryCol");
      expect(primaries(objects)).deep.equal([0, 1, 2, 3, 4]);

      objects = objects.sorted("primaryCol", true);
      expect(primaries(objects)).deep.equal([4, 3, 2, 1, 0]);

      objects = objects.sorted(["primaryCol", "valueCol"]);
      expect(primaries(objects)).deep.equal([0, 1, 2, 3, 4]);

      objects = objects.sorted([
        ["primaryCol", true],
        ["valueCol", true],
      ]);
      expect(primaries(objects)).deep.equal([4, 3, 2, 1, 0]);

      objects = objects.sorted([["primaryCol", false], "valueCol"]);
      expect(primaries(objects)).deep.equal([0, 1, 2, 3, 4]);

      objects = objects.sorted(["valueCol", "primaryCol"]);
      expect(primaries(objects)).deep.equal([2, 3, 1, 0, 4]);

      objects = objects.sorted([
        ["valueCol", false],
        ["primaryCol", true],
      ]);
      expect(primaries(objects)).deep.equal([3, 2, 1, 4, 0]);

      objects = objects.sorted([
        ["valueCol", true],
        ["primaryCol", false],
      ]);
      expect(primaries(objects)).deep.equal([0, 4, 1, 2, 3]);

      objects = objects.sorted([
        ["valueCol", true],
        ["primaryCol", true],
      ]);
      expect(primaries(objects)).deep.equal([4, 0, 1, 3, 2]);

      expect(() => {
        objects.sorted();
      }).throws("property 'IntPrimaryObject.self' does not exist.");

      expect(() => {
        //@ts-expect-error Expected to be an invalid sorted argument.
        objects.sorted(1);
      }).throws("JS value must be of type 'string'");
      expect(() => {
        //@ts-expect-error Expected to be an invalid sorted argument.
        objects.sorted([1]);
      }).throws("JS value must be of type 'string'");

      expect(() => {
        objects.sorted("fish");
      }).throws("property 'IntPrimaryObject.fish' does not exist");
      expect(() => {
        objects.sorted(["valueCol", "fish"]);
      }).throws("property 'IntPrimaryObject.fish' does not exist");

      expect(() => {
        //@ts-expect-error Expected to be an invalid sorted argument.
        objects.sorted(["valueCol", "primaryCol"], true);
      }).throws("Second argument is not allowed if passed an array of sort descriptors");

      realm.close();
    });

    it("implements sorted correctly with all types", () => {
      const realm = new Realm({ schema: [BasicTypesSchema] });
      let objects = realm.objects<BasicTypesObject>("BasicTypesObject");

      const decimals: BSON.Decimal128[] = [];
      const oids: BSON.ObjectId[] = [];
      const uuids: BSON.UUID[] = [];
      for (let i = 0; i < 3; i++) {
        decimals.push(Decimal128.fromString(`${i}`));
        oids.push(new ObjectId(`0000002a9a7969d24bea4cf${i}`));
        uuids.push(new UUID(`f7adc509-49be-466f-b3d5-449696d9a60${i}`));
      }

      realm.write(function () {
        realm.create("BasicTypesObject", {
          boolCol: false,
          intCol: 0,
          floatCol: 0,
          doubleCol: 0,
          stringCol: "0",
          dateCol: new Date(0),
          dataCol: new ArrayBuffer(1),
          decimal128Col: decimals[0],
          objectIdCol: oids[0],
          uuidCol: uuids[0],
        });
        realm.create("BasicTypesObject", {
          boolCol: true,
          intCol: 2,
          floatCol: 2,
          doubleCol: 2,
          stringCol: "2",
          dateCol: new Date(2),
          dataCol: new ArrayBuffer(1),
          decimal128Col: decimals[2],
          objectIdCol: oids[2],
          uuidCol: uuids[2],
        });
        realm.create("BasicTypesObject", {
          boolCol: false,
          intCol: 1,
          floatCol: 1,
          doubleCol: 1,
          stringCol: "1",
          dateCol: new Date(1),
          dataCol: new ArrayBuffer(1),
          decimal128Col: decimals[1],
          objectIdCol: oids[1],
          uuidCol: uuids[1],
        });
      });

      const numberProps = ["intCol", "floatCol", "doubleCol", "stringCol"];
      for (const prop of numberProps) {
        objects = objects.sorted(prop, false);
        //@ts-expect-error Should have property from loop
        expect("" + objects[0][prop]).equals("0", "first element ascending for " + prop);
        //@ts-expect-error Should have property from loop
        expect("" + objects[2][prop]).equals("2", "second element ascending for " + prop);

        objects = objects.sorted(prop, true);
        //@ts-expect-error Should have property from loop
        expect("" + objects[0][prop]).equals("2", "first element descending for " + prop);
        //@ts-expect-error Should have property from loop
        expect("" + objects[2][prop]).equals("0", "second element descending for " + prop);
      }

      objects = objects.sorted("dateCol", false);
      expect(objects[0].dateCol.getTime()).equals(0);
      expect(objects[2].dateCol.getTime()).equals(2);

      objects = objects.sorted("dateCol", true);
      expect(objects[0].dateCol.getTime()).equals(2);
      expect(objects[2].dateCol.getTime()).equals(0);

      objects = objects.sorted("boolCol", false);
      expect(objects[0].boolCol).equals(false, "first element ascending for boolCol");
      expect(objects[0].boolCol).equals(false, "second element ascending for boolCol");
      expect(objects[2].boolCol).equals(true, "third element ascending for boolCol");

      objects = objects.sorted("boolCol", true);
      expect(objects[0].boolCol).equals(true, "first element descending for boolCol");
      expect(objects[1].boolCol).equals(false, "second element descending for boolCol");
      expect(objects[2].boolCol).equals(false, "third element descending for boolCol");

      const testSortingWithToStringEquals = (
        propKey: string,
        compareArray: BSON.Decimal128[] | BSON.ObjectId[] | BSON.UUID[],
      ) => {
        const max = compareArray.length - 1;

        const ascending = objects.sorted(propKey, false);
        for (let i = 0; i <= max; i++) {
          //@ts-expect-error Should have given propKey property.
          expect(ascending[i][propKey].toString()).equals(
            compareArray[i].toString(),
            `element ${i} ascending for ${propKey}`,
          );
        }

        const descending = objects.sorted(propKey, true);
        for (let i = 0; i <= max; i++) {
          //@ts-expect-error Should have given propKey property.
          expect(descending[i][propKey].toString()).equals(
            compareArray[max - i].toString(),
            `element ${i} descending for ${propKey}`,
          );
        }
      };

      testSortingWithToStringEquals("decimal128Col", decimals);
      testSortingWithToStringEquals("objectIdCol", oids);
      testSortingWithToStringEquals("uuidCol", uuids);

      realm.close();
    });
  });
  describe("Aggregation", () => {
    openRealmBeforeEach({ schema: [NullableBasicTypesSchema] });

    it("supports aggregate functions", function (this: RealmContext) {
      const N = 50;
      this.realm.write(() => {
        for (let i = 0; i < N; i++) {
          this.realm.create("NullableBasicTypesObject", {
            intCol: i + 1,
            floatCol: i + 1,
            doubleCol: i + 1,
            dateCol: new Date(i + 1),
          });
        }
      });

      const results = this.realm.objects("NullableBasicTypesObject");
      expect(results.length).equals(N);

      // int, float & double columns support all aggregate functions
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(results.min(colName)).equals(1);
        expect(results.max(colName)).equals(N);
        expect(results.sum(colName)).equals((N * (N + 1)) / 2);
        expect(results.avg(colName)).equals((N + 1) / 2);
      });

      // date columns support only 'min' & 'max'
      expect((results.min("dateCol") as Date).getTime()).equals(new Date(1).getTime());
      expect((results.max("dateCol") as Date).getTime()).equals(new Date(N).getTime());
    });

    it("handles null fields", function (this: RealmContext) {
      const N = 50;
      const M = 10;

      this.realm.write(() => {
        for (let i = 0; i < N; i++) {
          this.realm.create("NullableBasicTypesObject", {
            intCol: i + 1,
            floatCol: i + 1,
            doubleCol: i + 1,
            dateCol: new Date(i + 1),
          });
        }

        // add some null valued data, which should be ignored by the aggregate functions
        for (let j = 0; j < M; j++) {
          this.realm.create("NullableBasicTypesObject", {
            intCol: null,
            floatCol: null,
            doubleCol: null,
            dateCol: null,
          });
        }
      });

      const results = this.realm.objects("NullableBasicTypesObject");

      expect(results.length).equals(N + M);

      // int, float & double columns support all aggregate functions
      // the M null valued objects should be ignored
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(results.min(colName)).equals(1);
        expect(results.max(colName)).equals(N);
        expect(results.sum(colName)).equals((N * (N + 1)) / 2);
        expect(results.avg(colName)).equals((N + 1) / 2);
      });

      // date columns support only 'min' & 'max'
      expect((results.min("dateCol") as Date).getTime()).equals(new Date(1).getTime());
      expect((results.max("dateCol") as Date).getTime()).equals(new Date(N).getTime());

      // call aggregate functions on empty results
      const emptyResults = this.realm.objects("NullableBasicTypesObject").filtered("intCol < 0");
      expect(emptyResults.length).equals(0);
      ["intCol", "floatCol", "doubleCol"].forEach((colName) => {
        expect(emptyResults.min(colName)).equal(undefined);
        expect(emptyResults.max(colName)).equal(undefined);
        expect(emptyResults.sum(colName)).equals(0);
        expect(emptyResults.avg(colName)).equal(undefined);
      });

      expect(emptyResults.min("dateCol")).equal(undefined);
      expect(emptyResults.max("dateCol")).equal(undefined);
    });

    it("handles unsupported aggregate functions", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("NullableBasicTypesObject", {
          boolCol: true,
          stringCol: "hello",
          dataCol: new ArrayBuffer(12),
        });
      });

      const results = this.realm.objects("NullableBasicTypesObject");

      // bool, string & data columns don't support 'min'
      ["boolCol", "stringCol", "dataCol"].forEach((colName) => {
        expect(() => {
          results.min(colName);
        }).throws(`Cannot min property '${colName}'`);
      });

      // bool, string & data columns don't support 'max'
      ["boolCol", "stringCol", "dataCol"].forEach((colName) => {
        expect(() => {
          results.max(colName);
        }).throws(`Cannot max property '${colName}'`);
      });

      // bool, string, date & data columns don't support 'avg'
      ["boolCol", "stringCol", "dateCol", "dataCol"].forEach((colName) => {
        expect(() => {
          results.avg(colName);
        }).throws(`Cannot avg property '${colName}'`);
      });

      // bool, string, date & data columns don't support 'sum'
      ["boolCol", "stringCol", "dateCol", "dataCol"].forEach((colName) => {
        expect(() => {
          results.sum(colName);
        }).throws(`Cannot sum property '${colName}'`);
      });
    });

    it("handles invalid field names", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("NullableBasicTypesObject", { doubleCol: 42 });
      });
      const results = this.realm.objects("NullableBasicTypesObject");
      expect(() => {
        results.min("foo");
      }).throws("Property 'foo' does not exist on object 'NullableBasicTypesObject'");
      expect(() => {
        results.max("foo");
      }).throws("Property 'foo' does not exist on object 'NullableBasicTypesObject'");
      expect(() => {
        results.sum("foo");
      }).throws("Property 'foo' does not exist on object 'NullableBasicTypesObject'");
      expect(() => {
        results.avg("foo");
      }).throws("Property 'foo' does not exist on object 'NullableBasicTypesObject'");
    });
  });

  describe("Updating Results", () => {
    openRealmBeforeEach({ schema: [NullableBasicTypesSchema] });
    it("should update correctly", function (this: RealmContext) {
      const N = 5;

      this.realm.write(() => {
        for (let i = 0; i < N; i++) {
          this.realm.create("NullableBasicTypesObject", { intCol: 10 });
        }
      });

      // update should work on a basic result set
      let results = this.realm.objects("NullableBasicTypesObject");
      expect(results.length).equals(5);
      this.realm.write(() => {
        results.update("intCol", 20);
      });
      expect(results.length).equals(5);
      expect(this.realm.objects("NullableBasicTypesObject").filtered("intCol = 20").length).equals(5);

      // update should work on a filtered result set
      results = this.realm.objects("NullableBasicTypesObject").filtered("intCol = 20");
      this.realm.write(() => {
        results.update("intCol", 10);
      });
      expect(results.length).equals(0);
      expect(this.realm.objects("NullableBasicTypesObject").filtered("intCol = 10").length).equals(5);

      // update should work on a sorted result set
      results = this.realm.objects("NullableBasicTypesObject").filtered("intCol == 10").sorted("intCol");
      this.realm.write(() => {
        results.update("intCol", 20);
      });
      expect(results.length).equals(0);
      expect(this.realm.objects("NullableBasicTypesObject").filtered("intCol = 20").length).equals(5);

      // update should work on a result snapshot
      results = this.realm.objects("NullableBasicTypesObject").filtered("intCol == 20").snapshot();
      this.realm.write(() => {
        results.update("intCol", 10);
      });
      expect(results.length).equals(5); // snapshot length should not change
      expect(this.realm.objects("NullableBasicTypesObject").filtered("intCol = 10").length).equals(5);
    });

    it("should update correctly with all types", function (this: RealmContext) {
      const objectsCreated = 5;
      /**
       * We are using BasicTypesObject instead of NullableBasicTypes object to make sure
       * if the basic types change this test gets updated.
       */
      const initialObjectValues: BasicTypesObject = {
        boolCol: false,
        stringCol: "hello",
        intCol: 10,
        floatCol: 10.0,
        doubleCol: 10.0,
        dateCol: new Date(10),
        dataCol: new Uint8Array([0xd8, 0x21, 0xd6]),
        decimal128Col: Decimal128.fromString("3e-10"),
        objectIdCol: new ObjectId(`0000002a9a7969d24bea4cf1`),
        uuidCol: new UUID(`f7adc509-49be-466f-b3d5-449696d9a601`),
      };

      this.realm.write(() => {
        for (let i = 0; i < objectsCreated; i++) {
          this.realm.create("NullableBasicTypesObject", initialObjectValues);
        }
      });

      const updatedObjectValues: BasicTypesObject = {
        boolCol: true,
        stringCol: "world",
        intCol: 20,
        floatCol: 20.0,
        doubleCol: 20.0,
        dateCol: new Date(20),
        dataCol: new Uint8Array([0x12, 0x81, 0xd6]),
        decimal128Col: Decimal128.fromString("6e-20"),
        objectIdCol: new ObjectId(`0000002a9a7969d24bea4cf2`),
        uuidCol: new UUID(`f7adc509-49be-466f-b3d5-449696d9a602`),
      };

      const allObjects = this.realm.objects("NullableBasicTypesObject");

      Object.entries(updatedObjectValues).forEach(([fieldName, updatedValue]) => {
        //@ts-expect-error Field name will exist.
        const initialValueResults = allObjects.filtered(`${fieldName} = $0`, initialObjectValues[fieldName]);
        expect(initialValueResults.length).equals(
          objectsCreated,
          "Filtering with initial value before the update should be equal to object count",
        );

        //@ts-expect-error Field name will exist.
        const updatedValueResults = allObjects.filtered(`${fieldName} = $0`, updatedObjectValues[fieldName]);
        expect(updatedValueResults.length).equals(
          0,
          "Filtering with updated value before the update should be equal to 0",
        );

        // Update the field to match updatedObjectValues
        this.realm.write(() => {
          initialValueResults.update(fieldName, updatedValue);
        });

        expect(initialValueResults.length).equals(
          0,
          "Filtering with initial value after the update should be equal to 0",
        );
        expect(updatedValueResults.length).equals(
          objectsCreated,
          "Filtering with updated value after the update should be equal to object count",
        );
      });
    });

    it("should work with empty results", function (this: RealmContext) {
      const emptyResults = this.realm.objects("NullableBasicTypesObject").filtered('stringCol = "hello"');
      expect(emptyResults.length).equals(0);

      this.realm.write(() => {
        emptyResults.update("stringCol", "no-op");
      });

      expect(emptyResults.length).equals(0);
      expect(this.realm.objects("NullableBasicTypesObject").filtered('stringCol = "no-op"').length).equals(0);

      this.realm.close();
    });

    it("should handle invalidated results", function (this: RealmContext) {
      this.realm.write(() => {
        for (let i = 10; i > 0; i--) {
          this.realm.create("NullableBasicTypesObject", { doubleCol: i });
        }
      });

      const resultsVariants = [
        this.realm.objects("NullableBasicTypesObject"),
        this.realm.objects("NullableBasicTypesObject").filtered("doubleCol > 1"),
        this.realm.objects("NullableBasicTypesObject").filtered("doubleCol > 1").sorted("doubleCol"),
        this.realm.objects("NullableBasicTypesObject").filtered("doubleCol > 1").snapshot(),
      ];

      // test isValid
      resultsVariants.forEach(function (objects) {
        expect(objects.isValid()).equals(true);
      });

      // close and test update
      this.realm.close();
      const updatedRealm = new Realm({
        schemaVersion: 1,
        schema: [TestObject, BasicTypesSchema],
      });

      resultsVariants.forEach(function (objects) {
        expect(objects.isValid()).equals(false);
        expect(() => {
          objects.update("doubleCol", 42);
        }).throws("Access to invalidated Results objects");
      });
      updatedRealm.close();
    });

    it("should throw on invalid property updates", function (this: RealmContext) {
      const N = 5;
      this.realm.write(() => {
        for (let i = 0; i < N; i++) {
          this.realm.create("NullableBasicTypesObject", {
            stringCol: "hello",
          });
        }
      });

      const results = this.realm.objects("NullableBasicTypesObject").filtered('stringCol = "hello"');
      expect(results.length).equals(N);

      expect(() => {
        this.realm.write(() => {
          results.update("unknownCol", "world");
        });
      }).throws("No such property: unknownCol");

      expect(() => {
        results.update("stringCol", "world");
      }).throws("Can only 'update' objects within a transaction.");
    });
  });
});
