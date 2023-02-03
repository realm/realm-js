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
import { CollectionChangeSet } from "realm";
import { importAppBefore, openRealmBeforeEach } from "../../hooks";
import { expectArraysEqual, expectDecimalEqual } from "../../utils/comparisons";
import { sleep } from "../../utils/sleep";

const CarSchema = {
  name: "Car",
  properties: {
    make: "string",
    model: "string",
    kilometers: { type: "int", default: 0 },
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

const LinkToAllTypesObjectSchema = {
  name: "LinkToAllTypesObject",
  properties: {
    allTypesCol: "AllTypesObject",
  },
};

const IntOnlySchema = {
  name: "IntOnlyObject",
  properties: {
    intCol: "int",
  },
};

const IntPrimarySchema = {
  name: "IntPrimaryObject",
  primaryKey: "primaryCol",
  properties: {
    primaryCol: "int",
    valueCol: "string",
  },
};

const AllPrimaryTypesSchema = {
  name: "AllPrimaryTypesObject",
  primaryKey: "primaryCol",
  properties: {
    primaryCol: "string",
    boolCol: "bool",
    intCol: "int",
    floatCol: "float",
    doubleCol: "double",
    stringCol: "string",
    dateCol: "date",
    dataCol: "data",
    objectCol: "TestObject",
    arrayCol: { type: "list", objectType: "TestObject" },
  },
};

const StringPrimarySchema = {
  name: "StringPrimaryObject",
  primaryKey: "primaryCol",
  properties: {
    primaryCol: "string",
    valueCol: "int",
  },
};

const OptionalStringSchema = {
  name: "OptionalString",
  properties: {
    name: "string",
    age: { type: "int", optional: true, default: 0 },
  },
};

const IndexedTypesSchema = {
  name: "IndexedTypesObject",
  properties: {
    boolCol: { type: "bool", indexed: true },
    intCol: { type: "int", indexed: true },
    stringCol: { type: "string", indexed: true },
    dateCol: { type: "date", indexed: true },
    optBoolCol: { type: "bool?", indexed: true },
    optIntCol: { type: "int?", indexed: true },
    optStringCol: { type: "string?", indexed: true },
    optDateCol: { type: "date?", indexed: true },
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

const ObjectSchema = {
  name: "IntObject",
  properties: {
    intCol: { type: "int", default: 1 },
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

const LinkingObjectsObjectSchema = {
  name: "LinkingObjectsObject",
  properties: {
    value: "int",
    links: "LinkingObjectsObject[]",
    linkingObjects: { type: "linkingObjects", objectType: "LinkingObjectsObject", property: "links" },
  },
};

const DateObjectSchema = {
  name: "Date",
  properties: {
    currentDate: "date",
    nullDate: "date?",
  },
};

const StringOnlySchema = {
  name: "StringOnlyObject",
  properties: {
    stringCol: "string",
  },
};

const TestObjectWithPkSchema = {
  name: "TestObject",
  primaryKey: "_id",
  properties: {
    _id: "int?",
    doubleCol: "double",
  },
};

const ObjectWithoutPropertiesSchema = {
  name: "ObjectWithoutProperties",
  properties: {},
};

const EmbeddedObjectSchemas: Realm.ObjectSchema[] = [
  {
    name: "Person",
    properties: {
      id: "int",
      dog: "Dog",
      cars: "Car[]",
      truck: "Car",
      vans: { type: "list", objectType: "Car" },
      cat: {
        type: "list",
        objectType: "Cat",
      },
    },
  },
  {
    name: "Car",
    primaryKey: "id",
    properties: {
      id: "int",
      model: "string",
      mileage: { type: "int", optional: true, indexed: true },
      owners: { type: "linkingObjects", objectType: "Person", property: "cars" },
    },
  },
  {
    name: "Dog",
    embedded: true,
    properties: {
      name: "string",
      color: "string",
    },
  },
  {
    name: "Cat",
    embedded: true,
    properties: {
      name: "string",
    },
  },
];

const PersonSchema = {
  name: "Person",
  primaryKey: "name",
  properties: {
    age: "int",
    name: "string",
    friends: "Person[]",
  },
};

const DogSchema = {
  name: "Dog",
  properties: {
    age: "int",
    name: "string",
    owner: "Person",
  },
};

interface ICar {
  make: string;
  model: string;
  kilometers: number;
}

interface ITestObject {
  doubleCol: number;
}

interface IIntOnly {
  intCol: number;
}

interface IIntPrimary {
  primaryCol: number;
  valueCol: string;
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

interface IAllPrimaryTypes {
  primaryCol: string;
  boolCol: boolean;
  intCol: number;
  floatCol: number;
  doubleCol: number;
  stringCol: string;
  dateCol: Date;
  dataCol: ArrayBuffer;
  objectCol: ITestObject;
  arrayCol: ITestObject[];
}
interface IStringPrimary {
  primaryCol: string;
  valueCol: number;
}

interface IOptionalString {
  name: string;
  age: number;
}

interface IDefaultValues {
  boolCol: boolean;
  intCol: number;
  floatCol: number;
  doubleCol: number;
  stringCol: string;
  dateCol: Date;
  dataCol: ArrayBuffer;
  objectCol: ITestObject;
  nullObjectCol: ITestObject | undefined;
  arrayCol: ITestObject[];
}

interface IObject {
  intCol: number;
}
interface IDateObject {
  currentDate: Date;
  nullDate: Date | undefined;
}

class TestObject extends Realm.Object {
  doubleCol!: number;
  static schema: Realm.ObjectSchema = {
    name: "TestObject",
    properties: {
      doubleCol: "double",
    },
  };
}

class PersonObject extends Realm.Object {
  name!: string;
  age!: number;
  married!: boolean;
  children!: PersonObject[];
  parents!: PersonObject[];
  static schema: Realm.ObjectSchema = {
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

const originalSchema: (Realm.ObjectSchema | typeof PersonObject)[] = [
  TestObjectSchema,
  AllTypesSchema,
  LinkToAllTypesObjectSchema,
  IndexedTypesSchema,
  IntPrimarySchema,
  PersonObject,
  LinkTypesSchema,
  LinkingObjectsObjectSchema,
];

describe("Realmtest", () => {
  describe("function overwrite", () => {
    it("bind works on realm", () => {
      const realm = new Realm({ schema: [] });
      const oldClose = realm.close.bind(realm);
      let newCloseCalled = false;
      realm.close = () => {
        newCloseCalled = true;
      };
      realm.close();
      expect(newCloseCalled, "The new function should be called").to.be.true;

      expect(realm.isClosed, "The realm should not be closed").to.be.false;

      oldClose();

      expect(realm.isClosed, "The realm should be closed").to.be.true;
    });
  });

  describe("object creation", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("by object works", () => {
      const realm = new Realm({ schema: [CarSchema] });
      realm.write(() => {
        const car = realm.create<ICar>(CarSchema.name, { make: "Audi", model: "A4", kilometers: 24 });
        expect(car.make).equals("Audi");
        expect(car.model).equals("A4");
        expect(car.kilometers).equals(24);
        expect(car instanceof Realm.Object).to.be.true;

        const cars = realm.objects<ICar>(CarSchema.name);
        //@ts-expect-error TYPEBUG: indexing by string on results is not allowed typewise
        expect(cars[""]).to.be.undefined;
        const carZero = cars[0];
        expect(carZero.make).equals("Audi");
        expect(carZero.model).equals("A4");
        expect(carZero.kilometers).equals(24);

        const car2 = realm.create<ICar>(CarSchema.name, { make: "VW", model: "Touareg", kilometers: 13 });
        expect(car2.make).equals("VW");
        expect(car2.model).equals("Touareg");
        expect(car2.kilometers).equals(13);
        expect(car2 instanceof Realm.Object).to.be.true;
      });
      realm.close();
    });

    it("by constructor works", () => {
      let constructorCalled = false;
      //test class syntax support
      class Car extends Realm.Object {
        constructor(realm: Realm) {
          //@ts-expect-error TYPEBUG: Realm.Object expects values as second argument.
          super(realm);
          constructorCalled = true;
        }
        static schema = {
          name: "Car",
          properties: {
            make: "string",
            model: "string",
            otherType: { type: "string", mapTo: "type", optional: true },
            kilometers: { type: "int", default: 0 },
          },
        };
      }

      interface ICarSchema {
        make: string;
        model: string;
        otherType: string;
        kilometers: number;
      }

      let calledAsConstructor = false;

      //test constructor function support
      function Car2() {
        if (new.target) {
          calledAsConstructor = true;
        }
      }

      Car2.schema = {
        name: "Car2",
        properties: {
          make: "string",
          model: "string",
          kilometers: { type: "int", default: 0 },
        },
      };

      interface ICar2Schema {
        make: string;
        model: string;
        kilometers: number;
      }

      Object.setPrototypeOf(Car2.prototype, Realm.Object.prototype);
      Object.setPrototypeOf(Car2, Realm.Object);

      //@ts-expect-error TYPEBUG: constructor function is not part of the typesystem for schema.
      const realm = new Realm({ schema: [Car, Car2] });
      realm.write(() => {
        const car = realm.create<ICarSchema>("Car", { make: "Audi", model: "A4", kilometers: 24 });
        expect(constructorCalled).to.be.false;
        expect(car.make).equals("Audi");
        expect(car.model).equals("A4");
        expect(car.kilometers).equals(24);
        expect(car).instanceOf(Realm.Object, "car not an instance of Realm.Object");

        const cars = realm.objects<ICarSchema>("Car");
        //@ts-expect-error TYPEBUG: indexation by string in results is not allowed by typesystem.
        expect(cars[""]).to.be.undefined;
        const carZero = cars[0];
        expect(carZero.make).equals("Audi");
        expect(carZero.model).equals("A4");
        expect(carZero.kilometers).equals(24);
        expect(carZero).instanceOf(Realm.Object, "carZero not an instance of Realm.Object");

        constructorCalled = false;
        const car1 = realm.create<ICarSchema>("Car", { make: "VW", model: "Touareg", kilometers: 13 });
        expect(constructorCalled).to.be.false;
        expect(car1.make).equals("VW");
        expect(car1.model).equals("Touareg");
        expect(car1.kilometers).equals(13);
        expect(car1).instanceOf(Realm.Object, "car1 not an instance of Realm.Object");

        const car2 = realm.create<ICar2Schema>("Car2", { make: "Audi", model: "A4", kilometers: 24 });
        expect(calledAsConstructor).to.be.false;
        expect(car2.make).equals("Audi");
        expect(car2.model).equals("A4");
        expect(car2.kilometers).equals(24);
        expect(car2).instanceOf(Realm.Object, "car2 not an instance of Realm.Object");

        const car2_1 = realm.create<ICar2Schema>("Car2", { make: "VW", model: "Touareg", kilometers: 13 });
        expect(calledAsConstructor).to.be.false;
        expect(car2_1.make).equals("VW");
        expect(car2_1.model).equals("Touareg");
        expect(car2_1.kilometers).equals(13);
        expect(car2_1).instanceOf(Realm.Object, "car2_1 not an instance of Realm.Object");
      });
      realm.close();
    });

    it("by primitive array works", () => {
      const Primitive = {
        name: "Primitive",
        properties: {
          intArray: "int[]",
        },
      };

      interface IPrimitive {
        intArray: number[];
      }

      const realm = new Realm({ schema: [Primitive] });
      realm.write(() => {
        const primitive = realm.create<IPrimitive>(Primitive.name, { intArray: [1, 2, 3] });
        expect(primitive.intArray[0]).equals(1);
        primitive.intArray[0] = 5;
        expect(primitive.intArray[0]).equals(5);
      });
    });
  });

  describe("methods", () => {
    describe("close", () => {
      openRealmBeforeEach({ schema: [] });

      it("yields correct value from isClosed", function (this: RealmContext) {
        expect(this.realm.isClosed).to.be.false;
        this.realm.close();
        expect(this.realm.isClosed).to.be.true;
      });
    });

    describe("write", () => {
      openRealmBeforeEach({
        schema: [
          IntPrimarySchema,
          TestObjectSchema,
          AllTypesSchema,
          LinkToAllTypesObjectSchema,
          DefaultValuesSchema,
          PersonObject,
        ],
      });

      it("exceptions behave correctly", function (this: RealmContext) {
        expect(() =>
          this.realm.write(() => {
            throw new Error("Inner exception message");
          }),
        ).throws("Inner exception message");

        // writes should be possible after caught exception
        this.realm.write(() => {
          this.realm.create("TestObject", { doubleCol: 1 });
        });
        expect(1).equals(this.realm.objects("TestObject").length);

        this.realm.write(() => {
          // nested transactions not supported, ts-expect-error does not work here.
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          expect(() => this.realm.write(() => {})).throws("The Realm is already in a write transaction");
        });
      });

      it("returns from write callback work", function (this: RealmContext) {
        const foobar = this.realm.write(() => {
          return { foo: "bar" };
        });
        expect(foobar.foo).equals("bar", "wrong foobar object property value");

        const testObject = this.realm.write(() => {
          return this.realm.create<ITestObject>(TestObjectSchema.name, { doubleCol: 1 });
        });
        // object was created
        expect(1).equals(this.realm.objects(TestObjectSchema.name).length);
        // object was returned
        const objects = this.realm.objects<ITestObject>("TestObject");
        expect(objects[0].doubleCol).equals(testObject.doubleCol, "wrong test object property value");
      });

      it("error message form invalid write is correct", function (this: RealmContext) {
        expect(() => {
          this.realm.write(() => {
            const p1 = this.realm.create<PersonObject>(PersonObject.schema.name, { name: "Ari", age: 10 });
            //@ts-expect-error assigning string to int
            p1.age = "Ten";
          });
        }).throws("PersonObject.age must be of type 'number', got 'string' ('Ten')");
      });
    });

    describe("create and update", () => {
      openRealmBeforeEach({
        schema: [
          TestObjectSchema,
          AllPrimaryTypesSchema,
          StringPrimarySchema,
          IntPrimarySchema,
          OptionalStringSchema,
          DefaultValuesSchema,
          ObjectSchema,
          AllTypesSchema,
          LinkToAllTypesObjectSchema,
          ObjectWithoutPropertiesSchema,
          PersonObject,
        ],
      });

      it("Creating object with wrong property types throw correct error message", function (this: RealmContext) {
        expect(() => {
          this.realm.write(() => {
            this.realm.create(PersonObject.schema.name, { name: "Ari", age: "Ten" });
          });
        }).throws("PersonObject.age must be of type 'number', got 'string' ('Ten')");
      });

      it("create only works within transaction", function (this: RealmContext) {
        expect(() => this.realm.create<ITestObject>(TestObjectSchema.name, { doubleCol: 1 })).throws(
          "Cannot modify managed objects outside of a write transaction.",
        );

        this.realm.write(() => {
          this.realm.create("TestObject", { doubleCol: 1 });
          this.realm.create("TestObject", { doubleCol: 2 });
        });

        const objects = this.realm.objects<ITestObject>(TestObjectSchema.name);
        expect(objects.length).equals(2, "wrong object count");
        expect(objects[0].doubleCol).equals(1, "wrong object property value");
        expect(objects[1].doubleCol).equals(2, "wrong object property value");
      });

      it("with invalid arguments throw", function (this: RealmContext) {
        this.realm.write(() => {
          //@ts-expect-error testing realm create with invalid arguments
          expect(() => this.realm.create(TestObjectSchema.name, { doubleCol: 1 }, "foo")).throws(
            "Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.",
          );
        });
      });

      it("create updates already existing object with new properties", function (this: RealmContext) {
        this.realm.write(() => {
          const objects = this.realm.objects(AllPrimaryTypesSchema.name);

          // Create Initial object
          const obj1 = this.realm.create(AllPrimaryTypesSchema.name, {
            primaryCol: "33",
            boolCol: false,
            intCol: 1,
            floatCol: 1.1,
            doubleCol: 1.11,
            stringCol: "1",
            dateCol: new Date(1),
            dataCol: new ArrayBuffer(1),
            objectCol: { doubleCol: 1 },
            arrayCol: [{ doubleCol: 1 }],
          });

          // Update object
          const obj2 = this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "33",
              boolCol: true,
              intCol: 2,
              floatCol: 2.2,
              doubleCol: 2.22,
              stringCol: "2",
              dateCol: new Date(2),
              dataCol: new ArrayBuffer(2),
              objectCol: { doubleCol: 2 },
              arrayCol: [{ doubleCol: 2 }],
            },
            Realm.UpdateMode.All,
          );

          expect(objects.length).equals(1);
          expect(obj2.stringCol).equals("2");
          expect(obj2.boolCol).equals(true);
          expect(obj2.intCol).equals(2);
          expectDecimalEqual(obj2.floatCol, 2.2);
          expectDecimalEqual(obj2.doubleCol, 2.22);
          expect(obj2.dateCol.getTime()).equals(2);
          expect(obj2.dataCol.byteLength).equals(2);
          expect(obj2.objectCol.doubleCol).equals(2);
          expect(obj2.arrayCol.length).equals(1);
          expect(obj2.arrayCol[0].doubleCol).equals(2);
        });
      });

      it("create updates already existing object with same properties", function (this: RealmContext) {
        this.realm.write(() => {
          const objects = this.realm.objects(AllPrimaryTypesSchema.name);
          expect(objects.length).equals(0);
          // Create Initial object
          const obj1 = this.realm.create(AllPrimaryTypesSchema.name, {
            primaryCol: "34",
            boolCol: false,
            intCol: 1,
            floatCol: 1.1,
            doubleCol: 1.11,
            stringCol: "1",
            dateCol: new Date(1),
            dataCol: new ArrayBuffer(1),
            objectCol: { doubleCol: 1 },
            arrayCol: [{ doubleCol: 1 }],
          });
          // Update object
          const obj2 = this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "34",
              boolCol: false,
              intCol: 1,
              floatCol: 1.1,
              doubleCol: 1.11,
              stringCol: "1",
              dateCol: new Date(1),
              dataCol: new ArrayBuffer(1),
              objectCol: { doubleCol: 1 },
              arrayCol: [{ doubleCol: 1 }],
            },
            Realm.UpdateMode.Modified,
          );
          expect(objects.length).equals(1);
          expect(obj2.stringCol).equals("1");
          expect(obj2.boolCol).equals(false);
          expect(obj2.intCol).equals(1);
          expectDecimalEqual(obj2.floatCol, 1.1);
          expectDecimalEqual(obj2.doubleCol, 1.11);
          expect(obj2.dateCol.getTime()).equals(1);
          expect(obj2.dataCol.byteLength).equals(1);
          expect(obj2.objectCol.doubleCol).equals(1);
          expect(obj2.arrayCol.length).equals(1);
          expect(obj2.arrayCol[0].doubleCol).equals(1);
        });
      });

      it("diffed updates only trigger notificaitons for changed values", async function (this: RealmContext) {
        type iAllPrimaryTypesChanges = [Realm.Collection<IAllPrimaryTypes>, CollectionChangeSet];
        let resolve: ((value: iAllPrimaryTypesChanges) => void) | undefined;
        this.realm.objects<IAllPrimaryTypes>(AllPrimaryTypesSchema.name).addListener((objects, changes) => {
          resolve?.([objects, changes]);
          resolve = undefined;
        });

        let [objects, changes] = await new Promise<iAllPrimaryTypesChanges>((r) => (resolve = r));
        expect(changes.insertions.length).equals(0);
        expect(objects.length).equals(0);

        const template = Realm.createTemplateObject(AllPrimaryTypesSchema);

        // First notification -> Object created
        this.realm.write(() => {
          // Create Initial object
          this.realm.create(
            AllPrimaryTypesSchema.name,
            Object.assign(template, {
              primaryCol: "35",
              dataCol: new ArrayBuffer(1),
              boolCol: false,
            }),
          );
          this.realm.create(
            AllPrimaryTypesSchema.name,
            Object.assign(template, {
              primaryCol: "36",
              boolCol: false,
            }),
          );
        });
        [objects, changes] = await new Promise((r) => (resolve = r));
        expect(changes.insertions.length).equals(2);
        expect(objects[0].boolCol).equals(false);

        this.realm.write(() => {
          // Update object with a change in value.
          this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "35",
              boolCol: true,
            },
            Realm.UpdateMode.Modified,
          );
        });
        [objects, changes] = await new Promise((r) => (resolve = r));
        expect(changes.newModifications.length).equals(1);
        expect(objects[0].boolCol).equals(true);

        this.realm.write(() => {
          // Update object with no change in value
          this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "35",
              boolCol: true,
            },
            Realm.UpdateMode.Modified,
          );

          // Update other object to ensure that notifications are triggered
          this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "36",
              boolCol: true,
            },
            Realm.UpdateMode.All,
          );
        });
        [objects, changes] = await new Promise((r) => (resolve = r));
        expect(changes.newModifications.length).equals(1);
        expect(changes.newModifications[0]).equals(1);

        this.realm.write(() => {
          // Update object with no change in value and no diffed update.
          // This should still trigger a notification
          this.realm.create(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "35",
              boolCol: true,
            },
            Realm.UpdateMode.All,
          );
        });
        [objects, changes] = await new Promise((r) => (resolve = r));
        expect(changes.newModifications.length).equals(1);
        expect(changes.newModifications[0]).equals(0);
        expect(objects[0].boolCol).equals(true);
      });

      it("partial default values are set correctly", async function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create(OptionalStringSchema.name, { name: "Alex" });
          this.realm.create(OptionalStringSchema.name, { name: "Birger" }, Realm.UpdateMode.Modified);
        });

        const objs = this.realm.objects<IOptionalString>(OptionalStringSchema.name);

        expect(objs[0]["name"]).equals("Alex");
        expect(objs[0]["age"]).equals(0);

        expect(objs[1]["name"]).equals("Birger");
        expect(objs[1]["age"]).equals(0);

        this.realm.close();
      });

      it("with primarykeys", async function (this: RealmContext) {
        this.realm.write(() => {
          const obj0 = this.realm.create<IIntPrimary>(IntPrimarySchema.name, {
            primaryCol: 0,
            valueCol: "val0",
          });

          expect(() => {
            this.realm.create(IntPrimarySchema.name, {
              primaryCol: 0,
              valueCol: "val0",
            });
          }).throws(
            "Attempting to create an object of type 'IntPrimaryObject' with an existing primary key value '0'.",
          );

          this.realm.create(
            IntPrimarySchema.name,
            {
              primaryCol: 1,
              valueCol: "val1",
            },
            Realm.UpdateMode.All,
          );

          const objects = this.realm.objects(IntPrimarySchema.name);
          expect(objects.length).equals(2);

          this.realm.create(
            IntPrimarySchema.name,
            {
              primaryCol: 0,
              valueCol: "newVal0",
            },
            Realm.UpdateMode.All,
          );

          expect(obj0.valueCol).equals("newVal0");
          expect(objects.length).equals(2);

          this.realm.create(IntPrimarySchema.name, { primaryCol: 0 }, Realm.UpdateMode.All);
          expect(obj0.valueCol).equals("newVal0");
        });
      });

      it("upsert works", async function (this: RealmContext) {
        this.realm.write(() => {
          const values = {
            primaryCol: "0",
            boolCol: true,
            intCol: 1,
            floatCol: 1.1,
            doubleCol: 1.11,
            stringCol: "1",
            dateCol: new Date(1),
            dataCol: new ArrayBuffer(1),
            objectCol: { doubleCol: 1 },
            arrayCol: [],
          };
          const obj0 = this.realm.create<IAllPrimaryTypes>(AllPrimaryTypesSchema.name, values);
          expect(() => this.realm.create(AllPrimaryTypesSchema.name, values)).throws(
            "Attempting to create an object of type 'AllPrimaryTypesObject' with an existing primary key value ''0''.",
          );
          const obj1 = this.realm.create<IAllPrimaryTypes>(
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "1",
              boolCol: false,
              intCol: 2,
              floatCol: 2.2,
              doubleCol: 2.22,
              stringCol: "2",
              dateCol: new Date(2),
              dataCol: new ArrayBuffer(2),
              objectCol: { doubleCol: 0 },
              arrayCol: [{ doubleCol: 2 }],
            },
            //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
            true,
          );
          const objects = this.realm.objects(AllPrimaryTypesSchema.name);
          expect(objects.length).equals(2);
          this.realm.create(
            //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "0",
              boolCol: false,
              intCol: 2,
              floatCol: 2.2,
              doubleCol: 2.22,
              stringCol: "2",
              dateCol: new Date(2),
              dataCol: new ArrayBuffer(2),
              objectCol: null,
              arrayCol: [{ doubleCol: 2 }],
            },
            true,
          );
          expect(objects.length).equals(2);
          expect(obj0.stringCol).equals("2");
          expect(obj0.boolCol).equals(false);
          expect(obj0.intCol).equals(2);
          expectDecimalEqual(obj0.floatCol, 2.2);
          expectDecimalEqual(obj0.doubleCol, 2.22);
          expect(obj0.dateCol.getTime()).equals(2);
          expect(obj0.dataCol.byteLength).equals(2);
          expect(obj0.objectCol).equals(null);
          expect(obj0.arrayCol.length).equals(1);
          //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
          this.realm.create(AllPrimaryTypesSchema.name, { primaryCol: "0" }, true);
          //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
          this.realm.create(AllPrimaryTypesSchema.name, { primaryCol: "1" }, true);
          expect(obj0.stringCol).equals("2");
          expect(obj0.objectCol).equals(null);
          expect(obj1.objectCol.doubleCol).equals(0);
          this.realm.create(
            //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
            AllPrimaryTypesSchema.name,
            {
              primaryCol: "0",
              stringCol: "3",
              objectCol: { doubleCol: 0 },
            },
            true,
          );
          expect(obj0.stringCol).equals("3");
          expect(obj0.boolCol).equals(false);
          expect(obj0.intCol).equals(2);
          expectDecimalEqual(obj0.floatCol, 2.2);
          expectDecimalEqual(obj0.doubleCol, 2.22);
          expect(obj0.dateCol.getTime()).equals(2);
          expect(obj0.dataCol.byteLength).equals(2);
          expect(obj0.objectCol.doubleCol).equals(0);
          expect(obj0.arrayCol.length).equals(1);
          //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
          this.realm.create(AllPrimaryTypesSchema.name, { primaryCol: "0", objectCol: undefined }, true);
          //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
          this.realm.create(AllPrimaryTypesSchema.name, { primaryCol: "1", objectCol: null }, true);
          expect(obj0.objectCol.doubleCol).equals(0);
          expect(obj1.objectCol).equals(null);
          // test with string primaries
          const obj = this.realm.create<IStringPrimary>(StringPrimarySchema.name, {
            primaryCol: "0",
            valueCol: 0,
          });
          expect(obj.valueCol).equals(0);
          this.realm.create(
            //@ts-expect-error: TYPEBUG: expects a Realm.UpdateMode instead of boolean "true"
            StringPrimarySchema.name,
            {
              primaryCol: "0",
              valueCol: 1,
            },
            true,
          );
          expect(obj.valueCol).equals(1);
        });
      });

      it("all default values are set correctly on object", async function (this: RealmContext) {
        const createAndTestObject = () => {
          const obj = this.realm.create<IDefaultValues>(DefaultValuesSchema.name, {});
          const properties = DefaultValuesSchema.properties;

          expect(obj.boolCol).equals(properties.boolCol.default);
          expect(obj.intCol).equals(properties.intCol.default);
          expectDecimalEqual(obj.floatCol, properties.floatCol.default);
          expectDecimalEqual(obj.doubleCol, properties.doubleCol.default);
          expect(obj.stringCol).equals(properties.stringCol.default);
          expect(obj.dateCol.getTime()).equals(properties.dateCol.default.getTime());
          expect(obj.dataCol.byteLength).equals(properties.dataCol.default.byteLength);
          expect(obj.objectCol.doubleCol).equals(properties.objectCol.default.doubleCol);
          expect(obj.nullObjectCol).equals(null);
          expect(obj.arrayCol.length).equals(properties.arrayCol.default.length);
          expect(obj.arrayCol[0].doubleCol).equals(properties.arrayCol.default[0].doubleCol);
        };

        this.realm.write(createAndTestObject);
        this.realm.close();
      });

      it("creating an object after changing default values reflect changes", async function (this: RealmContext) {
        let realm = new Realm({ schema: [ObjectSchema] });

        const createAndTestObject = () => {
          const object = realm.create<IObject>(ObjectSchema.name, {});
          expect(object.intCol).equals(ObjectSchema.properties.intCol.default);
        };

        realm.write(createAndTestObject);

        ObjectSchema.properties.intCol.default++;

        realm = new Realm({ schema: [ObjectSchema] });
        realm.write(createAndTestObject);
      });

      it("with constructors work", async function (this: RealmContext) {
        let customCreated = 0;
        class CustomObject extends Realm.Object {
          constructor(realm: Realm) {
            //@ts-expect-error TYPEBUG: Realm.Object expects values as second argument.
            super(realm);
            customCreated++;
          }
          static schema = {
            name: "CustomObject",
            properties: {
              intCol: "int",
            },
          };
        }
        class InvalidObject extends Realm.Object {
          static schema: Realm.ObjectSchema;
        }

        expect(() => new Realm({ schema: [InvalidObject] })).throws(
          "Realm object constructor must have a 'schema' property.",
        );

        InvalidObject.schema = {
          name: "InvalidObject",
          properties: {
            intCol: "int",
          },
        };
        Object.setPrototypeOf(InvalidObject, Realm.Object);
        let realm = new Realm({ schema: [CustomObject, InvalidObject] });

        realm.write(() => {
          let object = realm.create("CustomObject", { intCol: 1 });
          expect(object).instanceof(CustomObject);
          expect(Object.getPrototypeOf(object) == CustomObject.prototype).to.be.true;
          expect(customCreated).equals(0);

          // Should be able to create object by passing in constructor.
          object = realm.create(CustomObject, { intCol: 2 });
          expect(object).instanceof(CustomObject);
          expect(Object.getPrototypeOf(object) == CustomObject.prototype).to.be.true;
          expect(customCreated).equals(0);
        });

        realm.write(() => {
          realm.create("InvalidObject", { intCol: 1 });
        });

        // Only the original constructor should be valid.
        class InvalidCustomObject extends Realm.Object {
          static schema: Realm.ObjectSchema;
        }
        InvalidCustomObject.schema = CustomObject.schema;

        expect(() => {
          realm.write(() => {
            realm.create(InvalidCustomObject, { intCol: 1 });
          });
        }).throws("Constructor was not registered in the schema for this Realm");
        realm.close();

        realm = new Realm({ schema: [CustomObject, InvalidObject] });
        const obj = realm.objects("CustomObject")[0];
        expect(realm.objects("CustomObject")[0]).instanceof(CustomObject);
        expect(realm.objects(CustomObject).length > 0).to.be.true;
        realm.close();
      });

      it("with changing constructors", async function (this: RealmContext) {
        class CustomObject extends Realm.Object {
          static schema = {
            name: "CustomObject",
            properties: {
              intCol: "int",
            },
          };
        }

        let realm = new Realm({ schema: [CustomObject] });
        realm.write(() => {
          const object = realm.create("CustomObject", { intCol: 1 });
          expect(object).instanceof(CustomObject);
        });

        class NewCustomObject extends Realm.Object {
          static schema: Realm.ObjectSchema;
        }
        NewCustomObject.schema = CustomObject.schema;

        realm = new Realm({ schema: [NewCustomObject] });
        realm.write(() => {
          const object = realm.create("CustomObject", { intCol: 1 });
          expect(object).instanceof(NewCustomObject);
        });
      });

      it("createWithTemplate works", async function (this: RealmContext) {
        this.realm.write(() => {
          // Test all simple data types
          const template = Realm.createTemplateObject(AllTypesSchema);
          expect(Object.keys(template).length).equals(7);
          let unmanagedObj = Object.assign(template, { boolCol: true, dataCol: new ArrayBuffer(1) });
          const managedObj1 = this.realm.create<IAllTypes>(AllTypesSchema.name, unmanagedObj);
          expect(managedObj1.boolCol).to.be.true;

          // Default values
          unmanagedObj = Realm.createTemplateObject(DefaultValuesSchema);
          expect(Object.keys(unmanagedObj).length).equals(10);
          const managedObj = this.realm.create<IDefaultValues>(DefaultValuesSchema.name, unmanagedObj);
          expect(managedObj.boolCol).equals(true);
          expect(managedObj.intCol).equals(-1);
          expectDecimalEqual(managedObj.floatCol, -1.1);
          expectDecimalEqual(managedObj.doubleCol, -1.11);
          expect(managedObj.stringCol).equals("defaultString");
          expect(managedObj.dateCol.getTime()).equals(1);
          expect(managedObj.dataCol.byteLength).equals(1);
          expect(managedObj.objectCol.doubleCol).equals(1);
          expect(managedObj.nullObjectCol).equals(null);
          expect(managedObj.arrayCol[0].doubleCol).equals(2);
        });
      });

      it("creating objects without properties work", async function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create(ObjectWithoutPropertiesSchema.name, {});
        });
        this.realm.objects(ObjectWithoutPropertiesSchema.name);
        this.realm.close();
      });
    });
  });

  describe("static methods", () => {
    describe("open", () => {
      afterEach(() => {
        Realm.clearTestState();
      });

      it("Can open a realm", () => {
        const realm = new Realm({ schema: [TestObjectSchema], schemaVersion: 1 });
        realm.write(() => {
          realm.create("TestObject", [1]);
        });
        realm.close();

        return Realm.open({ schema: [TestObjectSchema], schemaVersion: 2 }).then((realm) => {
          const objects = realm.objects<ITestObject>("TestObject");
          expect(objects.length).equals(1);
          expect(objects[0].doubleCol).equals(1.0);
          realm.close();
        });
      });

      it("can open a realm with shouldCompactOnLaunch", () => {
        let called = false;
        const shouldCompact = () => {
          called = true;
          return true;
        };

        return Realm.open({ schema: [TestObjectSchema], shouldCompact }).then((realm) => {
          expect(called).to.be.true;
          realm.close();
        });
      });

      it("with no config works", () => {
        const realm = new Realm({ schema: [TestObjectSchema], schemaVersion: 1 });
        realm.write(() => {
          realm.create("TestObject", [1]);
        });
        realm.close();

        //@ts-expect-error TYPEBUG: opening without a config works in legacy test but is not accepted by typesystem.
        return Realm.open().then((realm) => {
          const objects = realm.objects<ITestObject>("TestObject");
          expect(objects.length).equals(1);
          expect(objects[0].doubleCol).equals(1.0);
          realm.close();
        });
      });
    });

    describe("exists", () => {
      importAppBefore("with-db");

      it("yields correct value on a local realm", () => {
        const config = { schema: [TestObject] };

        expect(Realm.exists(config)).to.be.false;
        new Realm(config).close();
        expect(Realm.exists(config)).to.be.true;
      });

      it.skipIf(environment.missingServerm, "yields correct value on a synced realm", function (this: AppContext) {
        const credentials = Realm.Credentials.anonymous();

        return this.app.logIn(credentials).then((user) => {
          const config = {
            schema: [TestObjectWithPkSchema],
            sync: {
              user,
              partitionValue: "LoLo",
            },
          };
          expect(Realm.exists(config)).to.be.false;
          new Realm(config).close();
          expect(Realm.exists(config)).to.be.true;
        });
      });
    });

    describe("objects", () => {
      openRealmBeforeEach({ schema: [PersonObject, DefaultValuesSchema, TestObjectSchema] });

      it("throws on invalid operations", function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create(PersonObject.schema.name, { name: "Ari", age: 10 });
          this.realm.create(PersonObject.schema.name, { name: "Tim", age: 11 });
          this.realm.create(PersonObject.schema.name, { name: "Bjarne", age: 12 });
          this.realm.create(PersonObject.schema.name, { name: "Alex", age: 12, married: true });
        });

        // Should be able to pass constructor for getting objects.
        const objects = this.realm.objects(PersonObject.schema.name);
        expect(objects[0]).instanceof(PersonObject);

        class InvalidPerson extends Realm.Object {
          static schema = PersonObject.schema;
        }

        //@ts-expect-error object without specifying type
        expect(() => this.realm.objects()).throws("objectType must be of type 'string', got (undefined)");
        //@ts-expect-error object without specifying type
        expect(() => this.realm.objects([])).throws("objectType must be of type 'string', got ()");
        expect(() => this.realm.objects("InvalidClass")).throws("Object type 'InvalidClass' not found in schema.");
        //@ts-expect-error testing too many arguments for objects
        expect(() => this.realm.objects(PersonObject.schema.name, "truepredicate")).throws(
          "Invalid arguments: at most 1 expected, but 2 supplied.",
        );
        expect(() => this.realm.objects(InvalidPerson)).throws(
          "Constructor was not registered in the schema for this Realm",
        );

        const person = this.realm.objects<PersonObject>(PersonObject.schema.name)[0];
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const listenerCallback = () => {};
        this.realm.addListener("change", listenerCallback);

        // The tests below assert that everthing throws when
        // operating on a closed realm
        this.realm.close();

        expect(() => console.log("Name: ", person.name)).throws(
          "Accessing object of type PersonObject which has been invalidated or deleted",
        );

        expect(() => this.realm.objects(PersonObject.schema.name)).throws("Cannot access realm that has been closed");
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        expect(() => this.realm.addListener("change", () => {})).throws("Cannot access realm that has been closed");
        expect(() => this.realm.create(PersonObject.schema.name, { name: "Ari", age: 10 })).throws(
          "Cannot access realm that has been closed",
        );
        expect(() => this.realm.delete(person)).throws("Cannot access realm that has been closed");
        expect(() => this.realm.deleteAll()).throws("Cannot access realm that has been closed");
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        expect(() => this.realm.write(() => {})).throws("Cannot access realm that has been closed");
        expect(() => this.realm.removeListener("change", listenerCallback)).throws(
          "Cannot access realm that has been closed",
        );
        expect(() => this.realm.removeAllListeners()).throws("Cannot access realm that has been closed");
      });
    });

    describe("deleteFile", () => {
      beforeEach(() => {
        Realm.clearTestState();
      });

      function expectDeletion(path?: string) {
        // Create the Realm with a schema
        const realm = new Realm({ path, schema: [PersonSchema, DogSchema] });
        realm.close();
        // Delete the Realm
        Realm.deleteFile({ path });
        // Re-open the Realm without a schema and expect it to be empty
        const reopenedRealm = new Realm({ path });
        expect(reopenedRealm.schema).deep.equals([]);
      }

      it("deletes the default Realm", () => {
        expectDeletion();
      });

      // TODO: Fix the issue on Android that prevents this from passing
      // @see https://github.com/realm/realm-js-private/issues/507

      it.skipIf(environment.android, "deletes a Realm with a space in its path", () => {
        expectDeletion("my realm.realm");
      });
    });
  });

  describe("indexed properties", () => {
    openRealmBeforeEach({ schema: [IndexedTypesSchema] });

    it("works", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(IndexedTypesSchema.name, {
          boolCol: true,
          intCol: 1,
          stringCol: "1",
          dateCol: new Date(1),
        });
      });

      const NotIndexed = {
        name: "NotIndexedObject",
        properties: {
          floatCol: { type: "float", indexed: false },
        },
      };

      new Realm({ schema: [NotIndexed], path: "1.realm" });

      const IndexedSchema: Realm.ObjectSchema = {
        name: "IndexedSchema",
        properties: {},
      };
      expect(() => {
        IndexedSchema.properties = { floatCol: { type: "float", indexed: true } };
        new Realm({ schema: [IndexedSchema], path: "2.realm" });
      }).throws("Property 'IndexedSchema.floatCol' of type 'float' cannot be indexed.");

      expect(() => {
        IndexedSchema.properties = { doubleCol: { type: "double", indexed: true } };
        new Realm({ schema: [IndexedSchema], path: "3.realm" });
      }).throws("Property 'IndexedSchema.doubleCol' of type 'double' cannot be indexed.");

      expect(() => {
        IndexedSchema.properties = { dataCol: { type: "data", indexed: true } };
        new Realm({ schema: [IndexedSchema], path: "4.realm" });
      }).throws("Property 'IndexedSchema.dataCol' of type 'data' cannot be indexed.");

      // primary key
      IndexedSchema.properties = { intCol: { type: "int", indexed: true } };
      IndexedSchema.primaryKey = "intCol";

      // Test this doesn't throw
      new Realm({ schema: [IndexedSchema], path: "5.realm" });
    });
  });

  describe("stackTrace", () => {
    openRealmBeforeEach({ schema: [] });

    it("gives correct function and error message", function (this: RealmContext) {
      function failingFunction() {
        throw new Error("not implemented");
      }

      try {
        this.realm.write(() => {
          failingFunction();
        });
      } catch (e: any) {
        expect(e.stack).not.equals(undefined, "e.stack should not be undefined");
        expect(e.stack).not.equals(null, "e.stack should not be null");
        expect(e.stack.indexOf("at failingFunction (") !== -1).to.be.true;
        expect(e.stack.indexOf("not implemented") !== -1).to.be.true;
      }
    });
  });

  describe("data initialization", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("onFirstOpen properly intializes data", () => {
      const data = [1, 2, 3];
      const initializer = (r: Realm) => {
        data.forEach((n) => r.create(IntOnlySchema.name, { intCol: n }));
      };

      const config = {
        schema: [IntOnlySchema],
        onFirstOpen: initializer,
      };
      Realm.deleteFile(config);

      const validateRealm = (realm: Realm) => {
        let pass = 1;
        return function () {
          pass++;
          const ints = realm.objects<IIntOnly>(IntOnlySchema.name);
          expect(ints.length).equals(data.length, `Length (pass: ${pass})`);
          for (let i = 0; i < data.length; i++) {
            expect(data[i]).equals(ints[i].intCol, `data[${i}] (pass: ${pass})`);
          }
        };
      };

      const realm1 = new Realm(config);
      validateRealm(realm1);
      realm1.close();

      // Open a second time and no new data is written
      const realm2 = new Realm(config);
      validateRealm(realm2);
      realm2.close();
    });
  });

  describe("delete operations", () => {
    openRealmBeforeEach({ schema: [TestObjectSchema, IntPrimarySchema] });

    it("delete successfully removes elements and throws on invalid operations", function (this: RealmContext) {
      this.realm.write(() => {
        for (let i = 0; i < 10; i++) {
          this.realm.create(TestObjectSchema.name, { doubleCol: i });
        }
      });

      const objects = this.realm.objects<ITestObject>(TestObjectSchema.name);
      expect(() => this.realm.delete(objects[0])).throws("Can only delete objects within a transaction.");

      this.realm.write(() => {
        //@ts-expect-error tests delete without specifying object
        expect(() => this.realm.delete()).throws("object must be of type 'object', got (undefined)");

        this.realm.delete(objects[0]);
        expect(objects.length).equals(9, "wrong object count");
        expect(objects[0].doubleCol).equals(1, "wrong property value");
        expect(objects[1].doubleCol).equals(2, "wrong property value");

        this.realm.delete([objects[0], objects[1]]);
        expect(objects.length).equals(7, "wrong object count");
        expect(objects[0].doubleCol).equals(3, "wrong property value");
        expect(objects[1].doubleCol).equals(4, "wrong property value");

        const twoObjects = this.realm.objects(TestObjectSchema.name).filtered("doubleCol < 5");
        expect(twoObjects.length).equals(2, "wrong results count");
        this.realm.delete(twoObjects);
        expect(objects.length).equals(5, "wrong object count");
        expect(twoObjects.length).equals(0, "threeObject should have been deleted");

        const o = objects[0];
        this.realm.delete(o);
        expect(() => this.realm.delete(o)).throws(
          "Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.",
        );
      });
    });

    it("deleteAll successfully removes elements and throws on invalid operations", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(TestObjectSchema.name, { doubleCol: 1 });
        this.realm.create(TestObjectSchema.name, { doubleCol: 2 });
        this.realm.create(IntPrimarySchema.name, { primaryCol: 2, valueCol: "value" });
      });

      expect(this.realm.objects(TestObjectSchema.name).length).equals(2);
      expect(this.realm.objects(IntPrimarySchema.name).length).equals(1);

      expect(() => this.realm.deleteAll()).throws("Can only delete objects within a transaction.");

      this.realm.write(() => {
        this.realm.deleteAll();
      });

      expect(this.realm.objects(TestObjectSchema.name).length).equals(0);
      expect(this.realm.objects(IntPrimarySchema.name).length).equals(0);
    });

    it("deleteAll removes remaining objects after deleteModel", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create(TestObjectSchema.name, { doubleCol: 1 });
        this.realm.create(TestObjectSchema.name, { doubleCol: 2 });
        this.realm.create(IntPrimarySchema.name, { primaryCol: 2, valueCol: "value" });
      });

      expect(this.realm.objects(TestObjectSchema.name).length).equals(2);
      expect(this.realm.objects(IntPrimarySchema.name).length).equals(1);

      this.realm.write(() => {
        this.realm.deleteModel(IntPrimarySchema.name);
      });
      this.realm.write(() => {
        this.realm.deleteAll();
      });

      expect(this.realm.objects(TestObjectSchema.name).length).equals(0);
      expect(() => this.realm.objects("IntPrimaryObject")).throws;
    });
  });

  describe("objectsForPrimaryKey", () => {
    openRealmBeforeEach({ schema: [IntPrimarySchema, StringPrimarySchema, TestObjectSchema] });

    it("lookups work and throws on invalid operations", function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("IntPrimaryObject", { primaryCol: 0, valueCol: "val0" });
        this.realm.create("IntPrimaryObject", { primaryCol: 1, valueCol: "val1" });

        this.realm.create("StringPrimaryObject", { primaryCol: "", valueCol: -1 });
        this.realm.create("StringPrimaryObject", { primaryCol: "val0", valueCol: 0 });
        this.realm.create("StringPrimaryObject", { primaryCol: "val1", valueCol: 1 });

        this.realm.create("TestObject", { doubleCol: 0 });
      });

      expect(this.realm.objectForPrimaryKey<IIntPrimary>("IntPrimaryObject", -1)).equals(null);
      expect(this.realm.objectForPrimaryKey<IIntPrimary>("IntPrimaryObject", 0)?.valueCol).equals("val0");
      expect(this.realm.objectForPrimaryKey<IIntPrimary>("IntPrimaryObject", 1)?.valueCol).equals("val1");

      expect(this.realm.objectForPrimaryKey<IStringPrimary>("StringPrimaryObject", "invalid")).equals(null);
      expect(this.realm.objectForPrimaryKey<IStringPrimary>("StringPrimaryObject", "")?.valueCol).equals(-1);
      expect(this.realm.objectForPrimaryKey<IStringPrimary>("StringPrimaryObject", "val0")?.valueCol).equals(0);
      expect(this.realm.objectForPrimaryKey<IStringPrimary>("StringPrimaryObject", "val1")?.valueCol).equals(1);

      expect(() => this.realm.objectForPrimaryKey("TestObject", 0)).throws(
        "'TestObject' does not have a primary key defined",
      );
      //@ts-expect-error objectForprimaryKey without arguments
      expect(() => this.realm.objectForPrimaryKey()).throws("objectType must be of type 'string', got (undefined)");
      //@ts-expect-error objectForprimaryKey without key
      expect(() => this.realm.objectForPrimaryKey("IntPrimaryObject")).throws(
        "Invalid null value for non-nullable primary key.",
      );
      expect(() => this.realm.objectForPrimaryKey("InvalidClass", 0)).throws(
        "Object type 'InvalidClass' not found in schema.",
      );

      //@ts-expect-error objectForprimaryKey with object as key
      expect(() => this.realm.objectForPrimaryKey("IntPrimaryObject", { foo: "bar" })).throws(
        "Property must be of type 'number', got ([object Object])",
      );
    });
  });

  describe("listener", () => {
    openRealmBeforeEach({ schema: [] });

    it("fires correctly from write transactions", function (this: RealmContext) {
      let notificationCount = 0;
      let notificationName;

      this.realm.addListener("change", (realm, name) => {
        notificationCount++;
        notificationName = name;
      });

      expect(notificationCount).equals(0);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.realm.write(() => {});
      expect(notificationCount).equals(1);
      expect(notificationName).equals("change");

      let secondNotificationCount = 0;
      function secondNotification() {
        secondNotificationCount++;
      }

      // The listener should only be added once.
      this.realm.addListener("change", secondNotification);
      this.realm.addListener("change", secondNotification);

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.realm.write(() => {});
      expect(notificationCount).equals(2);
      expect(secondNotificationCount).equals(1);

      // secondNotifiationCount should not increment since the corresponding listener is removed.
      this.realm.removeListener("change", secondNotification);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.realm.write(() => {});
      expect(notificationCount).equals(3);
      expect(secondNotificationCount).equals(1);

      // should fire no notifications after this
      this.realm.removeAllListeners();
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.realm.write(() => {});
      expect(notificationCount).equals(3);
      expect(secondNotificationCount).equals(1);

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(() => this.realm.addListener("invalid", () => {})).throws(
        "Unknown event name 'invalid': only 'change', 'schema' and 'beforenotify' are supported.",
      );

      this.realm.addListener("change", () => {
        throw new Error("expected error message");
      });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(() => this.realm.write(() => {})).throws("expected error message");
    });
  });

  describe("schema", () => {
    openRealmBeforeEach({ schema: originalSchema });

    it("is properly initialized on new realm", function (this: RealmContext) {
      const schemaMap: Record<string, Realm.ObjectSchema | PersonObject> = {};
      originalSchema.forEach((objectSchema: Realm.ObjectSchema) => {
        if (objectSchema instanceof PersonObject) {
          // for PersonObject
          schemaMap[PersonObject.schema.name] = objectSchema;
        } else {
          schemaMap[objectSchema.name] = objectSchema;
        }
      });

      const realm = new Realm({ schema: originalSchema });

      const schema = realm.schema;
      expect(schema.length).equals(originalSchema.length);

      const normalizeProperty = (val: Realm.ObjectSchemaProperty | string) => {
        let prop: Realm.ObjectSchemaProperty | string;
        if (typeof val !== "string" && !(val instanceof String)) {
          prop = val;
          prop.optional = val.optional || false;
          prop.indexed = val.indexed || false;
        } else {
          prop = { type: (val as unknown) as string, indexed: false, optional: false };
        }
        if (prop.type.includes("?")) {
          prop.optional = true;
          prop.type = prop.type.replace("?", "");
        }
        if (prop.type.includes("[]")) {
          prop.objectType = prop.type.replace("[]", "");
          prop.type = "list";
        }
        return prop;
      };

      for (const objectSchema of schema) {
        const original: Realm.ObjectSchema =
          typeof schemaMap[objectSchema.name] === "function"
            ? PersonObject.schema
            : (schemaMap[objectSchema.name] as Realm.ObjectSchema);

        expect(objectSchema.primaryKey).equals(original.primaryKey);
        for (const propName in objectSchema.properties) {
          expect(original.properties[propName], `schema has unexpected property ${propName}`).to.not.be.undefined;
          expect(original.properties[propName], `schema has unexpected property ${propName}`).to.not.be.null;

          const actual = objectSchema.properties[propName];
          const expected = normalizeProperty(original.properties[propName]);
          expect(actual.name).equals(propName);

          // The schema primary key is automatically indexed
          const isPrimaryKey = original.primaryKey === propName;
          expect(actual.indexed).equals(expected.indexed || isPrimaryKey);

          if (actual.type == "object") {
            expect(actual.objectType).equals(expected.type === "object" ? expected.objectType : expected.type);
            expect(actual.optional).equals(true);
            expect(actual.property).to.be.undefined;
          } else if (actual.type == "list") {
            expect(actual.type).equals(expected.type);
            expect(actual.objectType).equals(expected.objectType);
            expect(actual.optional).equals(expected.optional);
            expect(actual.property).to.be.undefined;
          } else if (actual.type == "linkingObjects") {
            expect(actual.type).equals(expected.type);
            expect(actual.objectType).equals(expected.objectType);
            expect(actual.property).equals(expected.property);
            expect(actual.optional).equals(false);
          } else {
            expect(actual.type).equals(expected.type);
            expect(actual.optional).equals(expected.optional);
            expect(actual.property).to.be.undefined;
            expect(actual.objectType).to.be.undefined;
          }
        }
      }
    });

    it("adding schema updates realm", async () => {
      const realm1 = new Realm();
      expect(realm1.isEmpty).to.be.true;
      expect(realm1.schema.length).equals(0); // empty schema

      const schema = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
          },
        },
      ];

      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async (resolve, reject) => {
        realm1.addListener("schema", (realm: Realm, event: string, schema: Realm.ObjectSchema[]) => {
          try {
            expect(event).equals("schema");
            expect(schema.length).equals(1);
            expect(realm.schema.length).equals(1);
            expect(schema[0].name).equals("TestObject");
            expect(realm1.schema.length).equals(1);
            expect(realm.schema[0].name).equals("TestObject");
            resolve();
          } catch (e) {
            reject();
          }
        });

        const realm2 = new Realm({ schema: schema });
        // Not updated until we return to the event loop and the autorefresh can happen
        expect(realm1.schema.length).equals(0);
        expect(realm2.schema.length).equals(1);

        // give some time to let advance_read to complete
        // in real world, a Realm will not be closed just after its
        // schema has been updated
        await sleep(15000);
        expect(true).to.be.false;
      });
    });

    it("embedded objectschemas return correct types", () => {
      const realm = new Realm({ schema: EmbeddedObjectSchemas });

      const schema = realm.schema;
      expect(Array.isArray(schema)).to.be.true;
      expect(schema.length).equals(4);

      const tableNames: string[] = [];
      schema.forEach((os) => tableNames.push(os.name));
      tableNames.sort();
      expectArraysEqual(tableNames, ["Car", "Cat", "Dog", "Person"]);

      schema.forEach((os) => {
        switch (os.name) {
          case "Car":
            expect(os.embedded).to.be.false;
            expect(os.primaryKey).equals("id");
            break;
          case "Cat":
          case "Dog":
            expect(os.embedded).to.be.true;
            expect(os.primaryKey).to.be.undefined;
            break;
          case "Person":
            expect(os.embedded).to.be.false;
            expect(os.primaryKey).to.be.undefined;
            break;
        }
      });

      realm.close();
    });
  });

  describe.skipIf(environment.node, "copyBundledRealmFiles", () => {
    it("copies realm files", () => {
      const config = { path: "realm-bundle.realm", schema: [DateObjectSchema] };
      if (Realm.exists(config)) {
        Realm.deleteFile(config);
      }
      Realm.copyBundledRealmFiles();
      expect(Realm.exists(config)).to.be.true;

      let realm = new Realm(config);
      expect(realm.objects(DateObjectSchema.name).length).equals(2);
      expect(realm.objects<IDateObject>(DateObjectSchema.name)[0].currentDate.getTime()).equals(1462500087955);

      const newDate = new Date(1);
      realm.write(() => {
        realm.objects<IDateObject>(DateObjectSchema.name)[0].currentDate = newDate;
      });
      realm.close();

      // copy should not overwrite existing files
      Realm.copyBundledRealmFiles();
      realm = new Realm(config);
      expect(realm.objects<IDateObject>(DateObjectSchema.name)[0].currentDate.getTime()).equals(1);
      realm.close();
    });

    it("opening new bundled realm with dsiableFormatUpgrade throws", () => {
      const config = { path: "realm-bundle.realm" };
      if (Realm.exists(config)) {
        Realm.deleteFile(config);
      }
      Realm.copyBundledRealmFiles();
      expect(Realm.exists(config)).to.be.true;

      expect(() => {
        new Realm({ path: "realm-bundle.realm", disableFormatUpgrade: true });
      }).throws("The Realm file format must be allowed to be upgraded in order to proceed.");
    });
  });

  describe("isEmpty property", () => {
    openRealmBeforeEach({ schema: [PersonObject] });

    it("reflects state of realm", function (this: RealmContext) {
      expect(this.realm.isEmpty).to.be.true;

      this.realm.write(() => this.realm.create("PersonObject", { name: "Ari", age: 10 }));
      expect(!this.realm.isEmpty).to.be.true;

      this.realm.write(() => this.realm.delete(this.realm.objects("PersonObject")));
      expect(this.realm.isEmpty).to.be.true;
    });
  });

  describe("compaction", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("shouldCompact is called when creating a new realm", function (this: RealmContext) {
      let wasCalled = false;
      const count = 1000;
      // create compactable Realm
      const realm1 = new Realm({ schema: [StringOnlySchema] });
      realm1.write(() => {
        realm1.create("StringOnlyObject", { stringCol: "A" });
        for (let i = 0; i < count; i++) {
          realm1.create("StringOnlyObject", { stringCol: "ABCDEFG" });
        }
        realm1.create("StringOnlyObject", { stringCol: "B" });
      });
      realm1.close();

      // open Realm and see if it is compacted
      const shouldCompact = (totalBytes: number, usedBytes: number) => {
        wasCalled = true;
        const fiveHundredKB = 500 * 1024;
        return totalBytes > fiveHundredKB && usedBytes / totalBytes < 0.2;
      };
      const realm2 = new Realm({ schema: [StringOnlySchema], shouldCompact });
      expect(wasCalled).to.be.true;
      expect(realm2.objects("StringOnlyObject").length).equals(count + 2);
      // we don't check if the file is smaller as we assume that Object Store does it
      realm2.close();
    });

    it("manual compact works", function (this: RealmContext) {
      const realm1 = new Realm({ schema: [StringOnlySchema] });
      realm1.write(() => {
        realm1.create("StringOnlyObject", { stringCol: "A" });
      });
      expect(realm1.compact()).to.be.true;
      realm1.close();

      const realm2 = new Realm({ schema: [StringOnlySchema] });
      expect(realm2.objects("StringOnlyObject").length).equals(1);
      realm2.close();
    });

    it("manual compact within write transaction throws", function (this: RealmContext) {
      const realm = new Realm({ schema: [StringOnlySchema] });
      realm.write(() => {
        expect(() => {
          realm.compact();
        }).throws("Cannot compact a Realm within a transaction.");
      });
      expect(realm.isEmpty).to.be.true;
      realm.close();
    });

    it("manual compact with multiple instances of same realm exist", function (this: RealmContext) {
      const realm1 = new Realm({ schema: [StringOnlySchema] });
      const realm2 = new Realm({ schema: [StringOnlySchema] });
      // realm1 and realm2 are wrapping the same Realm instance
      expect(realm1.compact()).to.be.true;
    });
  });

  describe("deletefile", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("data is deleted on realm with defaultpath", function (this: RealmContext) {
      const config = { schema: [TestObjectSchema] };
      const realm = new Realm(config);

      realm.write(() => {
        realm.create("TestObject", { doubleCol: 1 });
      });

      expect(realm.objects("TestObject").length).equals(1);
      realm.close();

      Realm.deleteFile(config);

      const realm2 = new Realm(config);
      expect(realm2.objects("TestObject").length).equals(0);
      realm2.close();
    });

    it("data is deleted on realm with custom path", function (this: RealmContext) {
      const config = { schema: [TestObjectSchema], path: "test-realm-delete-file.realm" };
      const realm = new Realm(config);

      realm.write(() => {
        realm.create("TestObject", { doubleCol: 1 });
      });

      expect(realm.objects("TestObject").length).equals(1);
      realm.close();

      Realm.deleteFile(config);

      const realm2 = new Realm(config);
      expect(realm2.objects("TestObject").length).equals(0);
      realm2.close();
    });
  });

  describe("with sync", () => {
    importAppBefore("simple");

    it.skipIf(
      environment.missingServer,
      "data is deleted on realm with custom path",
      function (this: RealmContext & AppContext) {
        return this.app.logIn(Realm.Credentials.anonymous()).then(async (user) => {
          const config = {
            schema: [TestObjectWithPkSchema],
            sync: { user, partitionValue: '"Lolo"' },
          };
          const realm = new Realm(config);
          const path = realm.path;
          realm.close();
          const pathExistBeforeDelete = await fs.exists(path);
          expect(pathExistBeforeDelete).to.be.true;
          Realm.deleteFile(config);
          const pathExistAfterDelete = await fs.exists(path);
          expect(pathExistAfterDelete).to.be.false;
        });
      },
    );
  });

  describe("deleteRealmIfMigrationNeeded", () => {
    afterEach(() => {
      Realm.clearTestState();
    });

    it("deletes file on version change", () => {
      const schema = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
            prop1: "int",
          },
        },
      ];
      let realm = new Realm({ schema: schema });
      realm.write(function () {
        realm.create("TestObject", ["stringValue", 1]);
      });
      realm.close();
      realm = new Realm({
        schema: schema,
        deleteRealmIfMigrationNeeded: true,
        schemaVersion: 1,
        onMigration: undefined,
      });
      // object should be gone as Realm should get deleted
      expect(realm.objects("TestObject").length).equals(0);
      // create a new object
      realm.write(function () {
        realm.create("TestObject", ["stringValue", 1]);
      });
      realm.close();
      let migrationWasCalled = false;
      realm = new Realm({
        schema: schema,
        deleteRealmIfMigrationNeeded: false,
        schemaVersion: 2,
        onMigration: function (oldRealm, newRealm) {
          migrationWasCalled = true;
        },
      });
      // migration function should get called as deleteRealmIfMigrationNeeded is false
      expect(migrationWasCalled).equals(true);
      // object should be there because Realm shouldn't get deleted
      expect(realm.objects("TestObject").length).equals(1);
      realm.close();
    });

    it("deletes file on schema change", () => {
      const schema = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
            prop1: "int",
          },
        },
      ];
      const schema1 = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
            prop1: "int",
            prop2: "float",
          },
        },
      ];
      const schema2 = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
            prop1: "int",
            prop2: "float",
            prop3: "double",
          },
        },
      ];
      let realm = new Realm({ schema: schema });
      realm.write(function () {
        realm.create("TestObject", { prop0: "stringValue", prop1: 1 });
      });
      realm.close();
      // change schema
      realm = new Realm({ schema: schema1, deleteRealmIfMigrationNeeded: true, onMigration: undefined });
      // object should be gone as Realm should get deleted
      expect(realm.objects("TestObject").length).equals(0);
      // create a new object
      realm.write(function () {
        realm.create("TestObject", { prop0: "stringValue", prop1: 1, prop2: 1.0 });
      });
      realm.close();
      expect(function () {
        // updating schema without changing schemaVersion OR setting deleteRealmIfMigrationNeeded = true should raise an error
        new Realm({
          schema: schema2,
          deleteRealmIfMigrationNeeded: false,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onMigration: function () {},
        });
      }).to.throw;
      let migrationWasCalled = false;
      // change schema again, but increment schemaVersion
      realm = new Realm({
        schema: schema2,
        deleteRealmIfMigrationNeeded: false,
        schemaVersion: 1,
        onMigration: function () {
          migrationWasCalled = true;
        },
      });
      // migration function should get called as deleteRealmIfMigrationNeeded is false
      expect(migrationWasCalled).equals(true);
      // object should be there because Realm shouldn't get deleted
      expect(realm.objects("TestObject").length).equals(1);
      realm.close();
    });

    it("throws on incompatible config", () => {
      const schema = [
        {
          name: "TestObject",
          properties: {
            prop0: "string",
            prop1: "int",
          },
        },
      ];

      expect(function () {
        new Realm({ schema: schema, deleteRealmIfMigrationNeeded: true, readOnly: true });
      }).throws("Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.");

      expect(function () {
        new Realm({
          schema: schema,
          deleteRealmIfMigrationNeeded: true,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onMigration: function () {},
        });
      }).throws("Cannot include 'onMigration' when 'deleteRealmIfMigrationNeeded' is set.");
    });
  });
});
