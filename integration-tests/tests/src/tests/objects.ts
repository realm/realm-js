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
import Realm from "realm";
import { IPerson, Person, PersonSchema } from "../schemas/person-and-dogs";
import {
  IPerson as IPersonWithId,
  Person as PersonWithId,
  PersonSchema as PersonSchemaWithId,
} from "../schemas/person-and-dog-with-object-ids";
import { openRealmBeforeEach } from "../hooks";
import { expectArraysEqual, expectSimilar } from "../utils/comparisons";
import jsrsasign from "jsrsasign";

const RANDOM_DATA = new Uint8Array([
  0xd8,
  0x21,
  0xd6,
  0xe8,
  0x00,
  0x57,
  0xbc,
  0xb2,
  0x6a,
  0x15,
  0x77,
  0x30,
  0xac,
  0x77,
  0x96,
  0xd9,
  0x67,
  0x1e,
  0x40,
  0xa7,
  0x6d,
  0x52,
  0x83,
  0xda,
  0x07,
  0x29,
  0x9c,
  0x70,
  0x38,
  0x48,
  0x4e,
  0xff,
]);

const allTypesValues = {
  boolCol: true,
  intCol: 1,
  floatCol: 1.1,
  doubleCol: 1.11,
  stringCol: "string",
  dateCol: new Date(1),
  dataCol: RANDOM_DATA,
  objectCol: { doubleCol: 2.2 },

  optBoolCol: true,
  optIntCol: 1,
  optFloatCol: 1.1,
  optDoubleCol: 1.11,
  optStringCol: "string",
  optDateCol: new Date(1),
  optDataCol: RANDOM_DATA,

  boolArrayCol: [true],
  intArrayCol: [1],
  floatArrayCol: [1.1],
  doubleArrayCol: [1.11],
  stringArrayCol: ["string"],
  dateArrayCol: [new Date(1)],
  dataArrayCol: [RANDOM_DATA],
  objectArrayCol: [{ doubleCol: 2.2 }],

  optBoolArrayCol: [true],
  optIntArrayCol: [1],
  optFloatArrayCol: [1.1],
  optDoubleArrayCol: [1.11],
  optStringArrayCol: ["string"],
  optDateArrayCol: [new Date(1)],
  optDataArrayCol: [RANDOM_DATA],
};

const nullPropertyValues = (() => {
  const values = {};
  for (const name in allTypesValues) {
    if (name.includes("opt")) {
      //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
      values[name] = name.includes("Array") ? [null] : null;
    } else {
      //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
      values[name] = allTypesValues[name];
    }
  }
  return values;
})();

const MixedSchema = {
  name: "MixedSchema",
  properties: {
    key: "string",
    value: "mixed",
  },
};

const AgeSchema = {
  name: "AgeSchema",
  properties: {
    age: "int",
  },
};

const StringOnlySchema = {
  name: "StringOnlyObject",
  properties: {
    stringCol: "string",
  },
};

const PrimaryIntSchema = {
  name: "PrimaryInt",
  primaryKey: "pk",
  properties: {
    pk: "int",
    value: "int",
  },
};

const PrimaryIntOptionalSchema = {
  name: "PrimaryOptionalInt",
  primaryKey: "pk",
  properties: {
    pk: "int?",
    value: "int",
  },
};

const PrimaryStringSchema = {
  name: "PrimaryString",
  primaryKey: "pk",
  properties: {
    pk: "string?",
    value: "int",
  },
};

const LinkSchemas = {
  name: "Links",
  properties: {
    intLink: "PrimaryInt",
    optIntLink: "PrimaryOptionalInt",
    stringLink: "PrimaryString",
  },
};

const DateObjectSchema = {
  name: "Date",
  properties: {
    currentDate: "date",
    nullDate: "date?",
  },
};

const DefaultValuesSchema = {
  name: "DefaultValuesObject",
  properties: {
    boolCol: { type: "bool", default: true },
    intCol: { type: "int", default: -1 },
    floatCol: { type: "float", default: -1.1 },
    doubleCol: { type: "double", default: -1.11 },
    stringCol: { type: "string", default: "defaultString" },
    dateCol: { type: "date", default: new Date(1.111) },
    dataCol: { type: "data", default: new ArrayBuffer(1) },
    objectCol: { type: "TestObject", default: { doubleCol: 1 } },
    nullObjectCol: { type: "TestObject", default: null },
    arrayCol: { type: "TestObject[]", default: [{ doubleCol: 2 }] },
  },
};

const LinkTypesSchema = {
  name: "LinkTypesObject",
  properties: {
    objectCol: "TestObject",
    objectCol1: { type: "object", objectType: "TestObject" },
    arrayCol: "TestObject[]",
    arrayCol1: { type: "list", objectType: "TestObject" },
  },
};

const LinkToAllTypesSchema = {
  name: "LinkToAllTypesObject",
  properties: {
    allTypesCol: "AllTypesObject",
  },
};

const TestObjectSchema = {
  name: "TestObject",
  properties: {
    doubleCol: "double",
  },
};

const AllTypesSchema = {
  name: "AllTypesObject",
  properties: {
    boolCol: "bool",
    intCol: "int",
    floatCol: "float",
    doubleCol: "double",
    stringCol: "string",
    dateCol: "date",
    dataCol: "data",
    objectCol: "TestObject",

    optBoolCol: "bool?",
    optIntCol: "int?",
    optFloatCol: "float?",
    optDoubleCol: "double?",
    optStringCol: "string?",
    optDateCol: "date?",
    optDataCol: "data?",

    boolArrayCol: "bool[]",
    intArrayCol: "int[]",
    floatArrayCol: "float[]",
    doubleArrayCol: "double[]",
    stringArrayCol: "string[]",
    dateArrayCol: "date[]",
    dataArrayCol: "data[]",
    objectArrayCol: "TestObject[]",

    optBoolArrayCol: "bool?[]",
    optIntArrayCol: "int?[]",
    optFloatArrayCol: "float?[]",
    optDoubleArrayCol: "double?[]",
    optStringArrayCol: "string?[]",
    optDateArrayCol: "date?[]",
    optDataArrayCol: "data?[]",

    linkingObjectsCol: { type: "linkingObjects", objectType: "LinkToAllTypesObject", property: "allTypesCol" },
  },
};

interface IMixed {
  key: string;
  value: Realm.Mixed;
}

interface IAge {
  age: number;
}

interface IStringOnly {
  stringCol: string;
}

interface ILink {
  intLink: IPrimaryInt;
  optIntLink: IPrimaryOptionalInt;
  stringLink: IPrimaryString;
}

interface IPrimaryInt {
  pk: number;
  value: number;
}

interface IPrimaryOptionalInt {
  pk: number | undefined;
  value: number;
}

interface IPrimaryString {
  pk: string | undefined;
  value: number;
}

interface IDateObject {
  currentDate: Date;
  nullDate: Date | undefined;
}

interface IDefaultValuesObject {
  boolCol: boolean;
  intCol: number;
  floatCol: number;
  doubleCol: number;
  stringCol: string;
  dateCol: Date;
  dataCol: ArrayBuffer | DataView | string;
  objectCol: ITestObject;
  nullObjectCol: ITestObject;
  arrayCol: ITestObject[];
}

interface ILinkTypes {
  objectCol: ITestObject | null;
  objectCol1: ITestObject | null;
  arrayCol: (ITestObject | null)[];
  arrayCol1: (ITestObject | null)[];
}
interface ITestObject {
  doubleCol: number;
}
interface INonPersistentTestObject extends ITestObject {
  ignored: boolean;
}

interface IAllTypes {
  boolCol: boolean;
  intCol: number;
  floatCol: number;
  doubleCol: number;
  stringCol: string;
  dateCol: Date;
  dataCol: ArrayBuffer;
  objectCol: ITestObject;

  optBoolCol: boolean | undefined;
  optIntCol: number | undefined;
  optFloatCol: number | undefined;
  optDoubleCol: number | undefined;
  optStringCol: string | undefined;
  optDateCol: Date | undefined;
  optDataCol: ArrayBuffer | undefined;

  boolArrayCol: boolean[];
  intArrayCol: number[];
  floatArrayCol: number[];
  doubleArrayCol: number[];
  stringArrayCol: string[];
  dateArrayCol: Date[];
  dataArrayCol: ArrayBuffer[];
  objectArrayCol: ITestObject[];

  optBoolArrayCol: (boolean | undefined)[];
  optIntArrayCol: (number | undefined)[];
  optFloatArrayCol: (number | undefined)[];
  optDoubleArrayCol: (number | undefined)[];
  optStringArrayCol: (string | undefined)[];
  optDateArrayCol: (Date | undefined)[];
  optDataArrayCol: (ArrayBuffer | undefined)[];
  linkingObjectsCol: IAllTypes[];
}

describe("Objectstest", () => {
  describe("Interface & object literal", () => {
    describe("without primary key", () => {
      openRealmBeforeEach({ schema: [PersonSchema] });
      it("can be created", function (this: Mocha.Context & RealmContext) {
        const john = this.realm.write(() => {
          return this.realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        // Expect John to be the one and only result
        const persons = this.realm.objects(PersonSchema.name);
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
      });

      it("can have it's properties read", function (this: Mocha.Context & RealmContext) {
        const john = this.realm.write(() => {
          return this.realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });

      it("can return a value on write", () => {
        const realm = new Realm({ schema: [PersonSchema] });

        const john = realm.write(() => {
          return realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
          });
        });

        // Expect John to be the one and only result
        const persons = realm.objects(PersonSchema.name);
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
      });
    });

    describe("with primary key", () => {
      openRealmBeforeEach({ schema: [PersonSchemaWithId] });
      it("can be fetched with objectForPrimaryKey", function (this: Mocha.Context & RealmContext) {
        const _id = new Realm.BSON.ObjectId();

        this.realm.write(() => {
          this.realm.create<PersonWithId>(PersonSchemaWithId.name, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        const john = this.realm.objectForPrimaryKey<IPersonWithId>(PersonSchemaWithId.name, _id);
        if (!john) throw new Error("Object not found");

        expect(john).instanceOf(Realm.Object);
        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });

      it("can be updated", function (this: Mocha.Context & RealmContext) {
        const _id = new Realm.BSON.ObjectId();

        const john = this.realm.write(() => {
          return this.realm.create<IPersonWithId>(PersonSchemaWithId.name, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);

        this.realm.write(() => {
          this.realm.create<IPersonWithId>(PersonSchemaWithId.name, { _id, age: 43 }, Realm.UpdateMode.All);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(43);

        const update: Partial<IPersonWithId> = {
          _id,
          name: "Mr. John Doe",
        };

        this.realm.write(() => {
          this.realm.create<IPersonWithId>(PersonSchemaWithId.name, update, Realm.UpdateMode.Modified);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("Mr. John Doe");
        expect(john.age).equals(43);

        expect(() =>
          this.realm.write(() => {
            this.realm.create<IPersonWithId>(
              PersonSchemaWithId.name,
              { _id, name: "John Doe", age: 42 },
              Realm.UpdateMode.Never,
            );
          }),
        ).throws(
          `Attempting to create an object of type '${PersonSchemaWithId.name}' with an existing primary key value '${_id}'.`,
        );

        // Expect only one instance of 'PersonSchemaWithId' in db after all updates
        const persons = this.realm.objects(PersonSchemaWithId.name);
        expect(persons.length).equals(1);
      });
    });
  });

  describe("Class Model", () => {
    describe("without primary key", () => {
      openRealmBeforeEach({ schema: [Person] });
      it("can be created", function (this: Mocha.Context & RealmContext) {
        const john = this.realm.write(() => {
          return this.realm.create(Person, {
            name: "John Doe",
            age: 42,
          });
        });
        // Expect John to be the one and only result
        const persons = this.realm.objects(Person);
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
        expect(firstPerson).instanceOf(Person);
      });

      it("can have it's properties read", () => {
        const realm = new Realm({ schema: [Person] });
        realm.write(() => {
          const john = realm.create(Person, {
            name: "John Doe",
            age: 42,
          });

          expect(john.name).equals("John Doe");
          expect(john.age).equals(42);
        });
      });
    });

    describe("with primary key", () => {
      openRealmBeforeEach({ schema: [PersonWithId] });
      it("can be fetched with objectForPrimaryKey", function (this: Mocha.Context & RealmContext) {
        const _id = new Realm.BSON.ObjectId();

        this.realm.write(() => {
          this.realm.create(PersonWithId, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        const john = this.realm.objectForPrimaryKey(PersonWithId, _id);
        if (!john) throw new Error("Object not found");

        expect(john).instanceOf(PersonWithId);
        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);
      });

      it("can be updated", function (this: Mocha.Context & RealmContext) {
        const _id = new Realm.BSON.ObjectId();

        const john = this.realm.write(() => {
          return this.realm.create(PersonWithId, {
            _id,
            name: "John Doe",
            age: 42,
          });
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(42);

        this.realm.write(() => {
          this.realm.create(PersonWithId, { _id, age: 43 }, Realm.UpdateMode.All);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("John Doe");
        expect(john.age).equals(43);

        const update: Partial<PersonWithId> = {
          _id,
          name: "Mr. John Doe",
        };

        this.realm.write(() => {
          this.realm.create(PersonWithId, update, Realm.UpdateMode.Modified);
        });

        expect(john._id.equals(_id)).equals(true);
        expect(john.name).equals("Mr. John Doe");
        expect(john.age).equals(43);

        expect(() =>
          this.realm.write(() => {
            this.realm.create(PersonWithId, { _id, name: "John Doe", age: 42 }, Realm.UpdateMode.Never);
          }),
        ).throws(
          `Attempting to create an object of type '${PersonWithId.schema.name}' with an existing primary key value '${_id}'.`,
        );

        // Expect only one instance of 'PersonWithId' in db after all updates
        const persons = this.realm.objects(PersonWithId);
        expect(persons.length).equals(1);
      });
    });
  });

  describe("properties", () => {
    openRealmBeforeEach({
      schema: [
        AllTypesSchema,
        TestObjectSchema,
        LinkToAllTypesSchema,
        MixedSchema,
        DefaultValuesSchema,
        DateObjectSchema,
        LinkSchemas,
        PrimaryIntOptionalSchema,
        PrimaryIntSchema,
        PrimaryStringSchema,
      ],
    });
    it("getters work on all types", function (this: Mocha.Context & RealmContext) {
      let object!: IAllTypes;
      let nullObject!: IAllTypes;

      this.realm.write(() => {
        object = this.realm.create<IAllTypes>("AllTypesObject", allTypesValues);
        nullObject = this.realm.create<IAllTypes>("AllTypesObject", nullPropertyValues);
      });

      const objectSchema = this.realm.schema[0];
      for (const name of Object.keys(objectSchema.properties)) {
        const type = objectSchema.properties[name].type;
        if (type === "linkingObjects") {
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(object[name].length).equals(0);
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(nullObject[name].length).equals(0);
          continue;
        }

        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        const objectTarget = object[name];
        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        const nullObjectTarget = nullObject[name];

        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        expectSimilar(type, objectTarget, allTypesValues[name]);
        //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
        expectSimilar(type, nullObjectTarget, nullPropertyValues[name]);
      }

      //@ts-expect-error: test to fetch non existing property.
      expect(object.nonexistent).equals(undefined);
    });

    it("setters work on all types", function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create<IAllTypes>("AllTypesObject", allTypesValues);
      });

      // can only set property in write transaction
      expect(function () {
        obj.boolCol = false;
      }).throws;

      expect(obj.boolCol).equals(true, "bool value changed outside transaction");

      this.realm.write(function () {
        //@ts-expect-error assign string to non matching type.
        expect(() => (obj.boolCol = "cat")).throws;
        //@ts-expect-error assign string to non matching type.
        expect(() => (obj.intCol = "dog")).throws;

        // Non-optional properties should complain about null
        for (const name of ["boolCol", "intCol", "floatCol", "doubleCol", "stringCol", "dataCol", "dateCol"]) {
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(() => (obj[name] = null), `Setting ${name} to null should throw`).throws;
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(() => (obj[name] = undefined), `Setting ${name} to undefined should throw`).throws;
        }

        // Optional properties should allow it
        for (const name of [
          "optBoolCol",
          "optIntCol",
          "optFloatCol",
          "optDoubleCol",
          "optStringCol",
          "optDataCol",
          "optDateCol",
          "objectCol",
        ]) {
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          obj[name] = null;
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(obj[name]).equals(null);
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          obj[name] = undefined;
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expect(obj[name]).equals(null);
        }

        function tryAssign(name: string, value: any) {
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          const prop = AllTypesSchema.properties[name];
          const type = typeof prop == "object" ? prop.type : prop;
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          obj[name] = value;
          //@ts-expect-error TYPEBUG: indexing with string is not allowed by typesystem.
          expectSimilar(type, obj[name], value);
        }

        tryAssign("boolCol", false);
        tryAssign("intCol", 10);
        tryAssign("floatCol", 2.2);
        tryAssign("doubleCol", 3.3);
        tryAssign("stringCol", "new str");
        tryAssign("dateCol", new Date(2));
        tryAssign("dataCol", RANDOM_DATA);

        tryAssign("optBoolCol", null);
        tryAssign("optIntCol", null);
        tryAssign("optFloatCol", null);
        tryAssign("optDoubleCol", null);
        tryAssign("optStringCol", null);
        tryAssign("optDateCol", null);
        tryAssign("optDataCol", null);

        tryAssign("optBoolCol", false);
        tryAssign("optIntCol", 10);
        tryAssign("optFloatCol", 2.2);
        tryAssign("optDoubleCol", 3.3);
        tryAssign("optStringCol", "new str");
        tryAssign("optDateCol", new Date(2));
        tryAssign("optDataCol", RANDOM_DATA);
      });
    });

    it("data-type works", function (this: Mocha.Context & RealmContext) {
      // Should be be able to set a data property with a typed array.
      const object = this.realm.write(() => {
        return this.realm.create<IDefaultValuesObject>(DefaultValuesSchema.name, { dataCol: RANDOM_DATA });
      });

      // Data properties should return an instance of an ArrayBuffer.
      expect(object.dataCol).instanceof(ArrayBuffer);
      expectArraysEqual(new Uint8Array(object.dataCol as ArrayBuffer), RANDOM_DATA);

      // Should be able to also set a data property to an ArrayBuffer.
      this.realm.write(function () {
        object.dataCol = RANDOM_DATA.buffer;
      });

      expectArraysEqual(new Uint8Array(object.dataCol as ArrayBuffer), RANDOM_DATA);

      if (Realm.App.Sync) {
        // Should be able to also set a data property to base64-encoded string.
        this.realm.write(function () {
          const hex = jsrsasign.ArrayBuffertohex(RANDOM_DATA.buffer);
          const b64string = jsrsasign.hextob64(hex);
          object.dataCol = b64string;
        });
        expectArraysEqual(new Uint8Array(object.dataCol as ArrayBuffer), RANDOM_DATA);
      }

      // Should be to set a data property to a DataView.
      this.realm.write(function () {
        object.dataCol = new DataView(RANDOM_DATA.buffer);
      });

      expectArraysEqual(new Uint8Array(object.dataCol as ArrayBuffer), RANDOM_DATA);

      // Test that a variety of size and slices of data still work.
      [
        [0, -1],
        [0, -2],
        [1, 0],
        [1, -1],
        [1, -2],
        [2, 0],
        [2, -1],
        [2, -2],
      ].forEach((range) => {
        const array = RANDOM_DATA.subarray(range[0], range[1]);
        this.realm.write(function () {
          // Use a partial "view" of the underlying ArrayBuffer.
          if (array.length > 0) {
            object.dataCol = new Uint8Array(RANDOM_DATA.buffer, range[0], array.length);
          }
        });

        if (array.length > 0) {
          expectArraysEqual(new Uint8Array(object.dataCol as ArrayBuffer), array);
        }
      });

      // Test other TypedArrays to make sure they all work for setting data properties.
      [
        Int8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
      ].forEach((TypedArray) => {
        const array = new TypedArray(RANDOM_DATA.buffer);
        this.realm.write(function () {
          object.dataCol = array;
        });
        expectArraysEqual(new TypedArray(object.dataCol as ArrayBuffer), array);
      });

      this.realm.write(function () {
        expect(function () {
          //@ts-expect-error assigning bool to data-type.
          object.dataCol = true;
        }).throws;
        expect(function () {
          //@ts-expect-error assigning number to data-type.
          object.dataCol = 1;
        }).throws;
        expect(function () {
          object.dataCol = "some binary data";
        }).throws;
        expect(function () {
          //@ts-expect-error assigning number[] to data-type.
          object.dataCol = [1];
        }).throws;
      });
    });

    it("supports date type", function (this: Mocha.Context & RealmContext) {
      const stringifiedDate = new Date();
      this.realm.write(() => {
        this.realm.create(DateObjectSchema.name, { currentDate: new Date(10000) });
        this.realm.create(DateObjectSchema.name, { currentDate: new Date(-10000) });
        this.realm.create(DateObjectSchema.name, { currentDate: new Date(1000000000000) });
        this.realm.create(DateObjectSchema.name, { currentDate: new Date(-1000000000000) });
        this.realm.create(DateObjectSchema.name, { currentDate: stringifiedDate.toString() });
      });
      expect(this.realm.objects<IDateObject>(DateObjectSchema.name)[0].currentDate.getTime()).equals(10000);
      expect(this.realm.objects<IDateObject>(DateObjectSchema.name)[1].currentDate.getTime()).equals(-10000);
      expect(this.realm.objects<IDateObject>(DateObjectSchema.name)[2].currentDate.getTime()).equals(1000000000000);
      expect(this.realm.objects<IDateObject>(DateObjectSchema.name)[3].currentDate.getTime()).equals(-1000000000000);
      expect(this.realm.objects<IDateObject>(DateObjectSchema.name)[4].currentDate.toString()).equals(
        stringifiedDate.toString(),
      );
      const obj = this.realm.write(() => {
        return this.realm.create<IDateObject>(DateObjectSchema.name, {
          currentDate: new Date("2017-12-07T20:16:03.837Z"),
        });
      });
      expect(new Date("2017-12-07T20:16:03.837Z").getTime()).equals(obj.currentDate.getTime());
      expect(new Date("2017-12-07T20:16:03.837Z").toISOString() === obj.currentDate.toISOString()).to.be.true;
    });

    it("supports link type", function (this: Mocha.Context & RealmContext) {
      this.realm.write(() => {
        this.realm.create("PrimaryInt", { pk: 1, value: 2 });
        this.realm.create("PrimaryInt", { pk: 2, value: 4 });
        this.realm.create("PrimaryOptionalInt", { pk: 1, value: 2 });
        this.realm.create("PrimaryOptionalInt", { pk: 2, value: 4 });
        this.realm.create("PrimaryOptionalInt", { pk: null, value: 6 });
        this.realm.create("PrimaryString", { pk: "a", value: 2 });
        this.realm.create("PrimaryString", { pk: "b", value: 4 });
        this.realm.create("PrimaryString", { pk: null, value: 6 });

        const obj = this.realm.create<ILink>("Links", {});

        //@ts-expect-error private method
        obj._setLink("intLink", 3);
        expect(obj.intLink).equals(null);
        //@ts-expect-error private method
        obj._setLink("intLink", 1);
        expect(obj.intLink.value).equals(2);
        //@ts-expect-error private method
        obj._setLink("intLink", 2);
        expect(obj.intLink.value).equals(4);
        //@ts-expect-error private method
        obj._setLink("intLink", 3);
        expect(obj.intLink).equals(null);

        //@ts-expect-error private method
        obj._setLink("optIntLink", 3);
        expect(obj.optIntLink).equals(null);
        //@ts-expect-error private method
        obj._setLink("optIntLink", 1);
        expect(obj.optIntLink.value).equals(2);
        //@ts-expect-error private method
        obj._setLink("optIntLink", 2);
        expect(obj.optIntLink.value).equals(4);
        //@ts-expect-error private method
        obj._setLink("optIntLink", null);
        expect(obj.optIntLink.value).equals(6);
        //@ts-expect-error private method
        obj._setLink("optIntLink", 3);
        expect(obj.optIntLink).equals(null);

        //@ts-expect-error private method
        obj._setLink("stringLink", "c");
        expect(obj.stringLink).equals(null);
        //@ts-expect-error private method
        obj._setLink("stringLink", "a");
        expect(obj.stringLink.value).equals(2);
        //@ts-expect-error private method
        obj._setLink("stringLink", "b");
        expect(obj.stringLink.value).equals(4);
        //@ts-expect-error private method
        obj._setLink("stringLink", null);
        expect(obj.stringLink.value).equals(6);
        //@ts-expect-error private method
        obj._setLink("stringLink", "c");
        expect(obj.stringLink).equals(null);
      });
    });

    it("can enumerate properties", function (this: Mocha.Context & RealmContext) {
      const object = this.realm.write(() => {
        return this.realm.create("AllTypesObject", allTypesValues);
      });

      const propNames = Object.keys(AllTypesSchema.properties);
      expectArraysEqual(Object.keys(Object.getPrototypeOf(object)), propNames);

      for (const key in object) {
        expect(key).equals(propNames.shift());
      }

      expect(propNames.length).equals(0);
    });

    it("can set non-persistent properties", function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create<INonPersistentTestObject>(TestObjectSchema.name, { doubleCol: 1, ignored: true });
      });

      expect(obj.doubleCol).equals(1);
      expect(obj.ignored).equals(undefined);
      obj.ignored = true;
      expect(obj.ignored).equals(true);
    });

    it("getPropertyType gives correct properties", function (this: Mocha.Context & RealmContext) {
      let obj!: Realm.Object;
      let mixedNull!: Realm.Object;
      let mixedInt!: Realm.Object;
      let mixedString!: Realm.Object;
      let mixedFloat!: Realm.Object;
      let mixedBool!: Realm.Object;

      this.realm.write(() => {
        obj = this.realm.create<IAllTypes>(AllTypesSchema.name, allTypesValues);
        mixedNull = this.realm.create<IMixed>(MixedSchema.name, { key: "zero", value: null });
        mixedInt = this.realm.create<IMixed>(MixedSchema.name, { key: "one", value: 1 }); // for mixed, all JavaScript numbers are saved as "double"
        mixedString = this.realm.create<IMixed>(MixedSchema.name, { key: "two", value: "two" });
        mixedFloat = this.realm.create<IMixed>(MixedSchema.name, { key: "three", value: 3.0 });
        mixedBool = this.realm.create<IMixed>(MixedSchema.name, { key: "five", value: true });
      });

      expect(obj.getPropertyType("boolCol")).equals("bool");
      expect(obj.getPropertyType("floatCol")).equals("float");
      expect(obj.getPropertyType("doubleCol")).equals("double");
      expect(obj.getPropertyType("stringCol")).equals("string");
      expect(obj.getPropertyType("dateCol")).equals("date");
      expect(obj.getPropertyType("dataCol")).equals("data");
      expect(obj.getPropertyType("objectCol")).equals("<TestObject>");

      expect(obj.getPropertyType("boolArrayCol")).equals("array<bool>");
      expect(obj.getPropertyType("floatArrayCol")).equals("array<float>");
      expect(obj.getPropertyType("doubleArrayCol")).equals("array<double>");
      expect(obj.getPropertyType("stringArrayCol")).equals("array<string>");
      expect(obj.getPropertyType("dateArrayCol")).equals("array<date>");
      expect(obj.getPropertyType("dataArrayCol")).equals("array<data>");
      expect(obj.getPropertyType("objectArrayCol")).equals("array<TestObject>");

      expect(mixedNull.getPropertyType("value")).equals("null");
      expect(mixedInt.getPropertyType("value")).equals("double"); // see comment above
      expect(mixedString.getPropertyType("value")).equals("string");
      expect(mixedFloat.getPropertyType("value")).equals("double");
      expect(mixedBool.getPropertyType("value")).equals("bool");
      [mixedNull, mixedInt, mixedFloat, mixedString, mixedBool].forEach((mixed) => {
        expect(mixed.getPropertyType("key")).equals("string");
      });

      // property that does not exist
      expect(() => {
        obj.getPropertyType("foo");
      }).throws("No such property: foo");
    });
  });

  describe("linktype properties", () => {
    openRealmBeforeEach({ schema: [LinkTypesSchema, TestObjectSchema] });
    it("getters work", function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create<ILinkTypes>(LinkTypesSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: null,
          arrayCol: [{ doubleCol: 3 }],
        });
      });

      const objVal = obj.objectCol;
      expect(typeof objVal).equals("object");
      expect(objVal).to.not.be.null;
      expect(objVal?.doubleCol).equals(1);

      expect(obj.objectCol1).equals(null);

      const arrayVal = obj.arrayCol;
      expect(typeof arrayVal).equals("object");
      expect(arrayVal).to.not.be.null;
      expect(arrayVal.length).equals(1);
      expect(arrayVal[0]?.doubleCol).equals(3);
    });

    it("setters work", function (this: Mocha.Context & RealmContext) {
      const objects = this.realm.objects<ITestObject>(TestObjectSchema.name);

      const obj = this.realm.write(() => {
        return this.realm.create<ILinkTypes>(LinkTypesSchema.name, {
          objectCol: { doubleCol: 1 },
          objectCol1: null,
          arrayCol: [{ doubleCol: 3 }],
        });
      });

      expect(objects.length).equals(2);

      // can only set property in write transaction
      expect(function () {
        obj.objectCol1 = obj.objectCol;
      }).throws;

      // set/reuse object property
      this.realm.write(function () {
        obj.objectCol1 = obj.objectCol;
      });
      expect(obj.objectCol1?.doubleCol).equals(1);
      //TestCase.assertEqual(obj.objectCol, obj.objectCol1);
      expect(objects.length).equals(2);

      this.realm.write(function () {
        obj.objectCol = null;
        obj.objectCol1 = null;
      });
      expect(obj.objectCol).to.be.null;
      expect(obj.objectCol1).to.be.null;

      // set object as JSON
      this.realm.write(function () {
        obj.objectCol = { doubleCol: 1 };
      });
      expect(obj.objectCol?.doubleCol).equals(1);
      expect(objects.length).equals(3);

      // set array property
      this.realm.write(() => {
        obj.arrayCol = [obj.arrayCol[0], obj.objectCol, this.realm.create(TestObjectSchema.name, { doubleCol: 2 })];
      });

      expect(objects.length).equals(4);
      expect(obj.arrayCol.length).equals(3);
      expect(obj.arrayCol[0]?.doubleCol).equals(3);
      expect(obj.arrayCol[1]?.doubleCol).equals(1);
      expect(obj.arrayCol[2]?.doubleCol).equals(2);

      // set object from another realm
      const another = new Realm({ path: "another.realm", schema: this.realm.schema });
      const anotherObj = another.write(function () {
        return another.create<ITestObject>(TestObjectSchema.name, { doubleCol: 3 });
      });
      this.realm.write(function () {
        obj.objectCol = anotherObj;
      });
      expect(obj.objectCol?.doubleCol).equals(3);
    });
  });

  describe("isValid", () => {
    openRealmBeforeEach({ schema: [TestObjectSchema] });
    it("works", function (this: Mocha.Context & RealmContext) {
      const object = this.realm.write(() => {
        const obj = this.realm.create<ITestObject>(TestObjectSchema.name, { doubleCol: 1 });
        expect(obj.isValid()).to.be.true;
        this.realm.delete(obj);
        expect(obj.isValid()).to.be.false;
        return obj;
      });

      expect(object.isValid()).to.be.false;
      expect(function () {
        object.doubleCol;
      }).throws;
    });
  });

  describe("object conversion", () => {
    openRealmBeforeEach({ schema: [TestObjectSchema] });
    it("works", function (this: Mocha.Context & RealmContext) {
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object("This is a string")).instanceOf(
        String,
        "__to_object(string) should return String Object",
      );
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object("Foo") == String("Foo")).to.be.true;
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object(12345)).instanceOf(Number);
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object(12345) == Number(12345)).to.be.true;
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object(false)).instanceOf(Boolean);
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object(false) == Boolean(false)).to.be.true;
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_object(new Date())).instanceOf(Date);

      expect(() => {
        //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
        this.realm.__to_object(null);
      }).throws(TypeError);

      expect(() => {
        //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
        this.realm.__to_object(undefined);
      }).throws(TypeError);
    });
  });

  describe("boolean conversion", () => {
    openRealmBeforeEach({ schema: [TestObjectSchema] });
    it("converts to expected value", function (this: Mocha.Context & RealmContext) {
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean("")).equals(false, '__to_boolean("") should return false');
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(0)).equals(false, "__to_boolean(0) should return false");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(-0)).equals(false, "__to_boolean(-0) should return false");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(null)).equals(false, "__to_boolean(null) should return false");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(false)).equals(false, "__to_boolean(false) should return false");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(NaN)).equals(false, "__to_boolean(NaN) should return false");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(undefined)).equals(false, "__to_boolean(undefined) should return false");

      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean("false")).equals(true, '__to_boolean("false") should return true');
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(1)).equals(true, "__to_boolean(1) should return true");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(-1)).equals(true, "__to_boolean(-1) should return true");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean([])).equals(true, "__to_boolean([]) should return true");
      //@ts-expect-error TYPEBUG: __to_object does not exist on realm.
      expect(this.realm.__to_boolean(Object())).equals(true, "__to_boolean(Object()) should return true");
    });
  });

  describe("schema", () => {
    openRealmBeforeEach({ schema: [TestObjectSchema] });
    it("schema fetched from object is correct type", function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create<ITestObject>("TestObject", { doubleCol: 1 });
      });

      const schema = obj.objectSchema();
      expect(schema.name).equals(TestObjectSchema.name);
      expectArraysEqual(Object.keys(schema.properties), Object.keys(TestObjectSchema.properties));
      expect((schema.properties.doubleCol as Realm.ObjectSchemaProperty).type).equals("double");
    });
  });
  //TODO move this to notofications test
  describe("notifications", () => {
    openRealmBeforeEach({ schema: [StringOnlySchema] });
    it("fires correct changeset", async function (this: Mocha.Context & RealmContext) {
      let calls = 0;
      let resolve: any;
      let reject: any;

      let promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      const obj = this.realm.write(() => {
        return this.realm.create<IStringOnly>(StringOnlySchema.name, { stringCol: "foo" });
      });

      obj.addListener((obj: IStringOnly, changes) => {
        try {
          calls++;
          switch (calls) {
            case 1:
              break;
            case 2:
              expect(changes.deleted).to.be.false;
              expect(changes.changedProperties.length).equals(1);
              expect(changes.changedProperties[0]).equals("stringCol");
              expect(obj["stringCol"]).equals("bar");
              break;
            case 3:
              expect(changes.deleted).to.be.true;
              expect(changes.changedProperties.length).equals(0);
              this.realm.close();
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      await promise;

      promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      this.realm.write(() => {
        obj["stringCol"] = "bar";
      });
      await promise;

      promise = new Promise((res, rej) => {
        (resolve = res), (reject = rej);
      });
      this.realm.write(() => {
        this.realm.delete(obj);
      });
      await promise;
    });

    it("can add and remove listeners", function (this: Mocha.Context & RealmContext, done) {
      const obj = this.realm.write(() => {
        return this.realm.create<IStringOnly>(StringOnlySchema.name, { stringCol: "foo" });
      });

      let calls = 0;

      const listener = (object: IStringOnly) => {
        calls++;
        if (calls === 1) {
          expect(object["stringCol"]).equals("foo");
          this.realm.write(() => {
            obj["stringCol"] = "bar";
          });
        } else if (calls === 2) {
          expect(object["stringCol"]).equals("bar");
          obj.removeListener(listener);
          let isFirstRun = true;
          obj.addListener(() => {
            if (isFirstRun) {
              isFirstRun = false;
            } else {
              expect(this.realm.objects<IStringOnly>(StringOnlySchema.name)[0]["stringCol"]).equals("foobar");
              done();
            }
          });
          this.realm.write(function () {
            obj["stringCol"] = "foobar";
          });
        } else {
          done(new Error("Listener ran too many times"));
        }
      };
      obj.addListener(listener);
    });

    it("can add and remove listeners with removeAllListeners", function (this: Mocha.Context & RealmContext, done) {
      const obj = this.realm.write(() => {
        return this.realm.create<IStringOnly>(StringOnlySchema.name, { stringCol: "foo" });
      });

      let calls = 0;

      const listener = (object: IStringOnly) => {
        calls++;
        if (calls === 2) {
          expect(object["stringCol"]).equals("bar");
          obj.removeAllListeners();
          let isFirstRun = true;
          obj.addListener(() => {
            if (isFirstRun) {
              isFirstRun = false;
            } else {
              expect(this.realm.objects<IStringOnly>(StringOnlySchema.name)[0]["stringCol"]).equals("foobar");
              expect(calls).equals(2); // listener only called twice
              done();
            }
          });
          this.realm.write(function () {
            obj["stringCol"] = "foobar";
          });
        }
      };

      obj.addListener(listener);

      this.realm.write(function () {
        obj["stringCol"] = "bar";
      });
    });
  });

  describe("keys", () => {
    openRealmBeforeEach({ schema: [AgeSchema] });
    it("can find object with key", async function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create(AgeSchema.name, { age: 5 });
      });

      const objKey = obj._objectKey();
      //@ts-expect-error uses private method.
      const objFromKey = this.realm._objectForObjectKey(AgeSchema.name, objKey);

      expect(objFromKey).to.not.be.undefined;
    });

    it("non existing objects fetched from key are undefined", async function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create(AgeSchema.name, { age: 1 });
      });

      const freeKey = obj._objectKey();
      //@ts-expect-error uses private method.
      const obj1 = this.realm._objectForObjectKey(AgeSchema.name, "1" + freeKey);
      //@ts-expect-error uses private method.
      const obj2 = this.realm._objectForObjectKey(AgeSchema.name, "invalid int64_t");
      expect(obj1).to.be.undefined;
      expect(obj2).to.be.undefined;
    });

    it("modifying object fetched from key propagates", async function (this: Mocha.Context & RealmContext) {
      const obj = this.realm.write(() => {
        return this.realm.create<IAge>(AgeSchema.name, { age: 5 });
      });

      const objKey = obj._objectKey();
      //@ts-expect-error uses private method.
      const objFromKey = this.realm._objectForObjectKey(AgeSchema.name, objKey);

      this.realm.write(() => {
        objFromKey.age = 7;
      });

      expect(obj.age).equals(7);
      expect(objFromKey.age).equals(7);
    });
  });
});
