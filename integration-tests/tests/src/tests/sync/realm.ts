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
import { authenticateUserBefore, importAppBefore, openRealmBefore, openRealmBeforeEach } from "../../hooks";
import { PersonSchema } from "../../schemas/person-and-dog-with-object-ids";

const pathSeparator = "/";
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

interface IOptionalString {
  name: string;
  age: number;
}

describe("Realmtest", () => {
  describe("constructor", () => {
    afterEach(() => {
      Realm.clearTestState();
    });
    it("is correct type", () => {
      const realm = new Realm({ schema: [] });
      expect(realm instanceof Realm).to.be.true;

      expect(typeof Realm).equals("function");
      expect(Realm instanceof Function).to.be.true;
      realm.close();
    });
    it("constructor path behaves correctly", () => {
      expect(() => new Realm("")).throws(); // the message for this error is platform-specific
      //@ts-expect-error using realm constructor with too many arguments
      expect(() => new Realm("test1.realm", "invalidArgument")).throws("Invalid arguments when constructing 'Realm'");

      const defaultRealm = new Realm({ schema: [] });
      expect(defaultRealm.path).equals(Realm.defaultPath);

      const defaultRealm2 = new Realm();
      expect(defaultRealm2.path).equals(Realm.defaultPath);

      const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
      const testPath = "test1.realm";
      const realm = new Realm({ schema: [], path: testPath });
      expect(realm.path).equals(defaultDir + testPath);

      const testPath2 = "test2.realm";
      const realm2 = new Realm({ schema: [], path: testPath2 });
      expect(realm2.path).equals(defaultDir + testPath2);
    });
    it("new realms pick up overriden default path", () => {
      const defaultPath = Realm.defaultPath;
      let defaultRealm = new Realm({ schema: [] });
      expect(defaultRealm.path).equals(Realm.defaultPath);

      try {
        const newPath = `${Realm.defaultPath.substring(0, defaultPath.lastIndexOf(pathSeparator) + 1)}default2.realm`;
        Realm.defaultPath = newPath;
        defaultRealm = new Realm({ schema: [] });
        expect(defaultRealm.path).equals(newPath, "should use updated default realm path");
        expect(Realm.defaultPath).equals(newPath, "defaultPath should have been updated");
      } finally {
        Realm.defaultPath = defaultPath;
      }
    });
    it("fifoFilesFallbackPath works", () => {
      // Object Store already tests the fallback logic
      // So this is just a smoke test to ensure that setting the property from JS doesn't actually crash anything.
      const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
      const realm = new Realm({ fifoFilesFallbackPath: defaultDir });
    });
    it("schemaversion behaves correctly", () => {
      const defaultRealm = new Realm({ schema: [] });
      expect(defaultRealm.schemaVersion).equals(0);
      expect(Realm.schemaVersion(Realm.defaultPath)).equals(0);

      expect(() => new Realm({ schemaVersion: 1, schema: [] })).throws("already opened with different schema version.");

      expect(new Realm().schemaVersion).equals(0);
      expect(new Realm({ schemaVersion: 0 }).schemaVersion).equals(0);

      let realm = new Realm({ path: "test1.realm", schema: [], schemaVersion: 1 });
      expect(realm.schemaVersion).equals(1);
      expect(realm.schema.length).equals(0);
      expect(Realm.schemaVersion("test1.realm")).equals(1);
      realm.close();

      realm = new Realm({ path: "test1.realm", schema: [TestObjectSchema], schemaVersion: 2 });
      realm.write(() => {
        realm.create(TestObjectSchema.name, { doubleCol: 1 });
      });
      expect(realm.objects<ITestObject>(TestObjectSchema.name)[0].doubleCol).equals(1);
      expect(realm.schemaVersion).equals(2);
      expect(realm.schema.length).equals(1);
    });
    it("dynamic schema works", () => {
      let realm = new Realm({ schema: [TestObjectSchema] });
      realm.write(() => {
        realm.create(TestObjectSchema.name, [1]);
      });
      realm.close();

      realm = new Realm();
      const objects = realm.objects<ITestObject>(TestObjectSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
    });
    it("schema validation throws correcty", () => {
      //@ts-expect-error invalid schema sent
      expect(() => new Realm({ schema: AllTypesSchema })).throws("must be of type 'array', got");
      //@ts-expect-error can not pass plain string as schema
      expect(() => new Realm({ schema: ["SomeType"] })).throws(
        "Failed to read ObjectSchema: JS value must be of type 'object', got (SomeType)",
      );
      //@ts-expect-error can not pass empty object to schema
      expect(() => new Realm({ schema: [{}] })).throws(
        "Failed to read ObjectSchema: name must be of type 'string', got (undefined)",
      );
      //@ts-expect-error missing properties in schema
      expect(() => new Realm({ schema: [{ name: "SomeObject" }] })).throws(
        "Failed to read ObjectSchema: properties must be of type 'object', got (undefined)",
      );
      //@ts-expect-error missing name property
      expect(() => new Realm({ schema: [{ properties: { intCol: "int" } }] })).throws(
        "Failed to read ObjectSchema: name must be of type 'string', got (undefined)",
      );

      function assertPropertyInvalid(prop: Realm.ObjectSchemaProperty, message: string) {
        expect(() => {
          new Realm({ schema: [{ name: "InvalidObject", properties: { int: "int", bad: prop } }] });
        }).throws(message);
      }

      assertPropertyInvalid(
        { type: "list[]", objectType: "InvalidObject" },
        "List property 'InvalidObject.bad' must have a non-list value type",
      );
      assertPropertyInvalid(
        { type: "list?", objectType: "InvalidObject" },
        "List property 'InvalidObject.bad' cannot be optional",
      );
      //@ts-expect-error passing empty property
      assertPropertyInvalid("", "Property 'InvalidObject.bad' must have a non-empty type");
      assertPropertyInvalid(
        { type: "linkingObjects", objectType: "InvalidObject", property: "nosuchproperty" },
        "Property 'InvalidObject.nosuchproperty' declared as origin of linking objects property 'InvalidObject.bad' does not exist",
      );
      assertPropertyInvalid(
        { type: "linkingObjects", objectType: "InvalidObject", property: "int" },
        "Property 'InvalidObject.int' declared as origin of linking objects property 'InvalidObject.bad' is not a link",
      );

      // linkingObjects property where the source property links elsewhere
      expect(() => {
        new Realm({
          schema: [
            {
              name: "InvalidObject",
              properties: {
                link: "IntObject",
                linkingObjects: { type: "linkingObjects", objectType: "InvalidObject", property: "link" },
              },
            },
            {
              name: "IntObject",
              properties: {
                integer: "int",
              },
            },
          ],
        });
      }).throws(
        "Property 'InvalidObject.link' declared as origin of linking objects property 'InvalidObject.linkingObjects' links to type 'IntObject'",
      );

      {
        new Realm({
          schema: [
            {
              name: "Object",
              properties: {
                // weird but valid
                objectList: { type: "object[]", objectType: "Object" },
              },
            },
          ],
        });
      }
    });
    it("in memory realm constructor works", () => {
      // open in-memory realm instance
      const realm1 = new Realm({ inMemory: true, schema: [TestObjectSchema] });
      realm1.write(() => {
        realm1.create("TestObject", [1]);
      });
      //@ts-expect-error TYPEBUG: isInMemory property does not exist
      expect(realm1.isInMemory).to.be.true;

      // open a second instance of the same realm and check that they share data
      const realm2 = new Realm({ inMemory: true });
      const objects = realm2.objects<ITestObject>("TestObject");
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
      //@ts-expect-error TYPEBUG: isInMemory property does not exist
      expect(realm2.isInMemory).equals(true);

      // Close both realms (this should delete the realm since there are no more
      // references to it.
      realm1.close();
      realm2.close();

      // Open the same in-memory realm again and verify that it is now empty
      const realm3 = new Realm({ inMemory: true });
      expect(realm3.schema.length).equals(0);

      // try to open the same realm in persistent mode (should fail as you cannot mix modes)
      expect(() => new Realm({})).throws("already opened with different inMemory settings.");
      realm3.close();
    });
    it("construct with readonly works", () => {
      let realm = new Realm({ schema: [TestObjectSchema] });
      realm.write(() => {
        realm.create(TestObjectSchema.name, [1]);
      });
      expect(realm.isReadOnly).to.be.false;
      realm.close();

      realm = new Realm({ readOnly: true, schema: [TestObjectSchema] });
      const objects = realm.objects<ITestObject>(TestObjectSchema.name);
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
      expect(realm.isReadOnly).equals(true);

      // for some reasone ts-expect-error can not be used here
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(() => realm.write(() => {})).throws("Can't perform transactions on read-only Realms.");
      realm.close();

      realm = new Realm({ readOnly: true });
      expect(realm.schema.length).equals(1);
      expect(realm.isReadOnly).to.be.true;
      realm.close();
    });
  });
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
      }

      //@ts-expect-error TYPEBUG: schema is not a property on the Realm.Object
      Car.schema = {
        name: "Car",
        properties: {
          make: "string",
          model: "string",
          otherType: { type: "string", mapTo: "type", optional: true },
          kilometers: { type: "int", default: 0 },
        },
      };

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
  describe("close method", () => {
    openRealmBeforeEach({ schema: [] });
    it("isClosed works", function (this: RealmContext) {
      expect(this.realm.isClosed).to.be.false;
      this.realm.close();
      expect(this.realm.isClosed).to.be.true;
    });
    it("isClosed works", function (this: RealmContext) {
      this.realm.close();
      expect(this.realm.isClosed).to.be.true;
      this.realm.close();
      expect(this.realm.isClosed).to.be.true;
    });
  });
  describe("open method", () => {
    afterEach(() => {
      Realm.clearTestState();
    });
    it("works", () => {
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
    it("with shouldCompactOnLaunch works", () => {
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
  // TODO wait for app merges
  // describe.skipIf(environment.missingServer, "with sync", () => {
  //   it("realm exists work", () => {
  //     // Local Realms
  //     const config = { schema: [TestObject] };

  //     expect(Realm.exists(config)).to.be.false;
  //     new Realm(config).close();
  //     expect(Realm.exists(config)).to.be.true;

  //     const appConfig = nodeRequire("./support/testConfig").integrationAppConfig;

  //     const app = new Realm.App(appConfig);
  //     const credentials = Realm.Credentials.anonymous();

  //     return app.logIn(credentials).then((user) => {
  //       const config = {
  //         schema: [schemas.TestObjectWithPk],
  //         sync: {
  //           user,
  //           partitionValue: "LoLo",
  //         },
  //       };
  //       TestCase.assertFalse(Realm.exists(config));
  //       new Realm(config).close();
  //       TestCase.assertTrue(Realm.exists(config));
  //     });
  //   });
  // });
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
  describe("write method", () => {
    openRealmBeforeEach({ schema: [IntPrimarySchema, TestObjectSchema, AllTypesSchema, LinkToAllTypesObjectSchema] });
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
  });
  describe("create and update", () => {
    openRealmBeforeEach({
      schema: [TestObjectSchema, AllPrimaryTypesSchema, StringPrimarySchema, IntPrimarySchema, OptionalStringSchema],
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

    // const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject, schemas.StringPrimary] });
    // realm.write(function () {
    //   const objects = realm.objects("AllPrimaryTypesObject");

    //   // Create Initial object
    //   const obj1 = realm.create("AllPrimaryTypesObject", {
    //     primaryCol: "33",
    //     boolCol: false,
    //     intCol: 1,
    //     floatCol: 1.1,
    //     doubleCol: 1.11,
    //     stringCol: "1",
    //     dateCol: new Date(1),
    //     dataCol: new ArrayBuffer(1),
    //     objectCol: { doubleCol: 1 },
    //     arrayCol: [{ doubleCol: 1 }],
    //   });

    //   // Update object
    //   const obj2 = realm.create(
    //     "AllPrimaryTypesObject",
    //     {
    //       primaryCol: "33",
    //       boolCol: true,
    //       intCol: 2,
    //       floatCol: 2.2,
    //       doubleCol: 2.22,
    //       stringCol: "2",
    //       dateCol: new Date(2),
    //       dataCol: new ArrayBuffer(2),
    //       objectCol: { doubleCol: 2 },
    //       arrayCol: [{ doubleCol: 2 }],
    //     },
    //     "all",
    //   );

    //   TestCase.assertEqual(obj2.stringCol, "2");
    //   TestCase.assertEqual(obj2.boolCol, true);
    //   TestCase.assertEqual(obj2.intCol, 2);
    //   TestCase.assertEqualWithTolerance(obj2.floatCol, 2.2, 0.000001);
    //   TestCase.assertEqualWithTolerance(obj2.doubleCol, 2.22, 0.000001);
    //   TestCase.assertEqual(obj2.dateCol.getTime(), 2);
    //   TestCase.assertEqual(obj2.dataCol.byteLength, 2);
    //   TestCase.assertEqual(obj2.objectCol.doubleCol, 2);
    //   TestCase.assertEqual(obj2.arrayCol.length, 1);
    //   TestCase.assertEqual(obj2.arrayCol[0].doubleCol, 2);
    // });

    // testRealmCreateOrUpdate_diffedUpdate: function () {
    //   const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject] });
    //   realm.write(function () {
    //     const objects = realm.objects("AllPrimaryTypesObject");
    //     TestCase.assertEqual(objects.length, 0);

    //     // Create Initial object
    //     const obj1 = realm.create("AllPrimaryTypesObject", {
    //       primaryCol: "34",
    //       boolCol: false,
    //       intCol: 1,
    //       floatCol: 1.1,
    //       doubleCol: 1.11,
    //       stringCol: "1",
    //       dateCol: new Date(1),
    //       dataCol: new ArrayBuffer(1),
    //       objectCol: { doubleCol: 1 },
    //       arrayCol: [{ doubleCol: 1 }],
    //     });

    //     // Update object
    //     const obj2 = realm.create(
    //       "AllPrimaryTypesObject",
    //       {
    //         primaryCol: "34",
    //         boolCol: false,
    //         intCol: 1,
    //         floatCol: 1.1,
    //         doubleCol: 1.11,
    //         stringCol: "1",
    //         dateCol: new Date(1),
    //         dataCol: new ArrayBuffer(1),
    //         objectCol: { doubleCol: 1 },
    //         arrayCol: [{ doubleCol: 1 }],
    //       },
    //       "modified",
    //     );

    //     TestCase.assertEqual(objects.length, 1);
    //     TestCase.assertEqual(obj2.stringCol, "1");
    //     TestCase.assertEqual(obj2.boolCol, false);
    //     TestCase.assertEqual(obj2.intCol, 1);
    //     TestCase.assertEqualWithTolerance(obj2.floatCol, 1.1, 0.000001);
    //     TestCase.assertEqualWithTolerance(obj2.doubleCol, 1.11, 0.000001);
    //     TestCase.assertEqual(obj2.dateCol.getTime(), 1);
    //     TestCase.assertEqual(obj2.dataCol.byteLength, 1);
    //     TestCase.assertEqual(obj2.objectCol.doubleCol, 1);
    //     TestCase.assertEqual(obj2.arrayCol.length, 1);
    //     TestCase.assertEqual(obj2.arrayCol[0].doubleCol, 1);
    //   });
    // },

    // testRealmCreateOrUpdate_diffedUpdate: function () {
    //   const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject] });
    //   realm.write(function () {
    //     const objects = realm.objects("AllPrimaryTypesObject");
    //     TestCase.assertEqual(objects.length, 0);

    //     // Create Initial object
    //     const obj1 = realm.create("AllPrimaryTypesObject", {
    //       primaryCol: "34",
    //       boolCol: false,
    //       intCol: 1,
    //       floatCol: 1.1,
    //       doubleCol: 1.11,
    //       stringCol: "1",
    //       dateCol: new Date(1),
    //       dataCol: new ArrayBuffer(1),
    //       objectCol: { doubleCol: 1 },
    //       arrayCol: [{ doubleCol: 1 }],
    //     });

    //     // Update object
    //     const obj2 = realm.create(
    //       "AllPrimaryTypesObject",
    //       {
    //         primaryCol: "34",
    //         boolCol: false,
    //         intCol: 1,
    //         floatCol: 1.1,
    //         doubleCol: 1.11,
    //         stringCol: "1",
    //         dateCol: new Date(1),
    //         dataCol: new ArrayBuffer(1),
    //         objectCol: { doubleCol: 1 },
    //         arrayCol: [{ doubleCol: 1 }],
    //       },
    //       "modified",
    //     );

    //     TestCase.assertEqual(objects.length, 1);
    //     TestCase.assertEqual(obj2.stringCol, "1");
    //     TestCase.assertEqual(obj2.boolCol, false);
    //     TestCase.assertEqual(obj2.intCol, 1);
    //     TestCase.assertEqualWithTolerance(obj2.floatCol, 1.1, 0.000001);
    //     TestCase.assertEqualWithTolerance(obj2.doubleCol, 1.11, 0.000001);
    //     TestCase.assertEqual(obj2.dateCol.getTime(), 1);
    //     TestCase.assertEqual(obj2.dataCol.byteLength, 1);
    //     TestCase.assertEqual(obj2.objectCol.doubleCol, 1);
    //     TestCase.assertEqual(obj2.arrayCol.length, 1);
    //     TestCase.assertEqual(obj2.arrayCol[0].doubleCol, 1);
    //   });
    // },

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
    it("default values work", async function (this: RealmContext) {
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
        }).throws("Attempting to create an object of type 'IntPrimaryObject' with an existing primary key value '0'.");

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
      // realm.write(function () {
      //   const values = {
      //     primaryCol: "0",
      //     boolCol: true,
      //     intCol: 1,
      //     floatCol: 1.1,
      //     doubleCol: 1.11,
      //     stringCol: "1",
      //     dateCol: new Date(1),
      //     dataCol: new ArrayBuffer(1),
      //     objectCol: { doubleCol: 1 },
      //     arrayCol: [],
      //   };
      //   const obj0 = realm.create("AllPrimaryTypesObject", values);
      //   TestCase.assertThrowsContaining(
      //     () => realm.create("AllPrimaryTypesObject", values),
      //     "Attempting to create an object of type 'AllPrimaryTypesObject' with an existing primary key value ''0''.",
      //   );
      //   const obj1 = realm.create(
      //     "AllPrimaryTypesObject",
      //     {
      //       primaryCol: "1",
      //       boolCol: false,
      //       intCol: 2,
      //       floatCol: 2.2,
      //       doubleCol: 2.22,
      //       stringCol: "2",
      //       dateCol: new Date(2),
      //       dataCol: new ArrayBuffer(2),
      //       objectCol: { doubleCol: 0 },
      //       arrayCol: [{ doubleCol: 2 }],
      //     },
      //     true,
      //   );
      //   const objects = realm.objects("AllPrimaryTypesObject");
      //   TestCase.assertEqual(objects.length, 2);
      //   realm.create(
      //     "AllPrimaryTypesObject",
      //     {
      //       primaryCol: "0",
      //       boolCol: false,
      //       intCol: 2,
      //       floatCol: 2.2,
      //       doubleCol: 2.22,
      //       stringCol: "2",
      //       dateCol: new Date(2),
      //       dataCol: new ArrayBuffer(2),
      //       objectCol: null,
      //       arrayCol: [{ doubleCol: 2 }],
      //     },
      //     true,
      //   );
      //   TestCase.assertEqual(objects.length, 2);
      //   TestCase.assertEqual(obj0.stringCol, "2");
      //   TestCase.assertEqual(obj0.boolCol, false);
      //   TestCase.assertEqual(obj0.intCol, 2);
      //   TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
      //   TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
      //   TestCase.assertEqual(obj0.dateCol.getTime(), 2);
      //   TestCase.assertEqual(obj0.dataCol.byteLength, 2);
      //   TestCase.assertEqual(obj0.objectCol, null);
      //   TestCase.assertEqual(obj0.arrayCol.length, 1);
      //   realm.create("AllPrimaryTypesObject", { primaryCol: "0" }, true);
      //   realm.create("AllPrimaryTypesObject", { primaryCol: "1" }, true);
      //   TestCase.assertEqual(obj0.stringCol, "2");
      //   TestCase.assertEqual(obj0.objectCol, null);
      //   TestCase.assertEqual(obj1.objectCol.doubleCol, 0);
      //   realm.create(
      //     "AllPrimaryTypesObject",
      //     {
      //       primaryCol: "0",
      //       stringCol: "3",
      //       objectCol: { doubleCol: 0 },
      //     },
      //     true,
      //   );
      //   TestCase.assertEqual(obj0.stringCol, "3");
      //   TestCase.assertEqual(obj0.boolCol, false);
      //   TestCase.assertEqual(obj0.intCol, 2);
      //   TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
      //   TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
      //   TestCase.assertEqual(obj0.dateCol.getTime(), 2);
      //   TestCase.assertEqual(obj0.dataCol.byteLength, 2);
      //   TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
      //   TestCase.assertEqual(obj0.arrayCol.length, 1);
      //   realm.create("AllPrimaryTypesObject", { primaryCol: "0", objectCol: undefined }, true);
      //   realm.create("AllPrimaryTypesObject", { primaryCol: "1", objectCol: null }, true);
      //   TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
      //   TestCase.assertEqual(obj1.objectCol, null);
      //   // test with string primaries
      //   const obj = realm.create("StringPrimaryObject", {
      //     primaryCol: "0",
      //     valueCol: 0,
      //   });
      //   TestCase.assertEqual(obj.valueCol, 0);
      //   realm.create(
      //     "StringPrimaryObject",
      //     {
      //       primaryCol: "0",
      //       valueCol: 1,
      //     },
      //     true,
      //   );
      //   TestCase.assertEqual(obj.valueCol, 1);
      // });
    });
  });
});
