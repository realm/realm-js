////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

// Prevent React Native packager from seeing modules required with this
const require_method = require;
function nodeRequire(module) {
  return require_method(module);
}

function closeAfterUpload(realm) {
  return realm.syncSession.uploadAllLocalChanges().then(() => realm.close());
}

const { Realm } = require("realm");
const TestCase = require("./asserts");
const schemas = require("./schemas");
const Utils = require("./test-utils");
const { Decimal128, ObjectId, UUID } = Realm.BSON;

let pathSeparator = "/";
const isNodeProcess = typeof process === "object" && process + "" === "[object process]";
const isElectronProcess = typeof process === "object" && process.versions && process.versions.electron;

if (isNodeProcess && process.platform === "win32") {
  pathSeparator = "\\";
}

const fs = isNodeProcess ? nodeRequire("fs-extra") : require("react-native-fs");

module.exports = {
  testRealmConstructorTest: function () {
    const realm = new Realm({ schema: [] });
    TestCase.assertTrue(realm instanceof Realm);

    TestCase.assertEqual(typeof Realm, "function");
    TestCase.assertTrue(Realm instanceof Function);
  },

  testRealmObjectCreationByObject: function () {
    const CarSchema = {
      name: "Car",
      properties: {
        make: "string",
        model: "string",
        kilometers: { type: "int", default: 0 },
      },
    };

    let realm = new Realm({ schema: [CarSchema] });
    realm.write(() => {
      let car = realm.create("Car", { make: "Audi", model: "A4", kilometers: 24 });
      TestCase.assertEqual(car.make, "Audi");
      TestCase.assertEqual(car.model, "A4");
      TestCase.assertEqual(car.kilometers, 24);
      TestCase.assertTrue(car instanceof Realm.Object);

      let cars = realm.objects("Car");
      TestCase.assertUndefined(cars[""]);
      let carZero = cars[0];
      TestCase.assertEqual(carZero.make, "Audi");
      TestCase.assertEqual(carZero.model, "A4");
      TestCase.assertEqual(carZero.kilometers, 24);

      let car2 = realm.create("Car", { make: "VW", model: "Touareg", kilometers: 13 });
      TestCase.assertEqual(car2.make, "VW");
      TestCase.assertEqual(car2.model, "Touareg");
      TestCase.assertEqual(car2.kilometers, 13);
      TestCase.assertTrue(car2 instanceof Realm.Object);
    });
  },

  testRealmObjectCreationByConstructor: function () {
    let constructorCalled = false;
    //test class syntax support
    class Car extends Realm.Object {
      constructor(realm) {
        super(realm);
        constructorCalled = true;
      }
    }

    Car.schema = {
      name: "Car",
      properties: {
        make: "string",
        model: "string",
        otherType: { type: "string", mapTo: "type", optional: true },
        kilometers: { type: "int", default: 0 },
      },
    };

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

    Object.setPrototypeOf(Car2.prototype, Realm.Object.prototype);
    Object.setPrototypeOf(Car2, Realm.Object);

    let realm = new Realm({ schema: [Car, Car2] });
    realm.write(() => {
      let car = realm.create("Car", { make: "Audi", model: "A4", kilometers: 24 });
      TestCase.assertFalse(constructorCalled);
      TestCase.assertEqual(car.make, "Audi");
      TestCase.assertEqual(car.model, "A4");
      TestCase.assertEqual(car.kilometers, 24);
      TestCase.assertInstanceOf(car, Realm.Object, "car not an instance of Realm.Object");

      let cars = realm.objects("Car");
      TestCase.assertUndefined(cars[""]);
      let carZero = cars[0];
      TestCase.assertEqual(carZero.make, "Audi");
      TestCase.assertEqual(carZero.model, "A4");
      TestCase.assertEqual(carZero.kilometers, 24);
      TestCase.assertInstanceOf(carZero, Realm.Object, "carZero not an instance of Realm.Object");

      constructorCalled = false;
      let car1 = realm.create("Car", { make: "VW", model: "Touareg", kilometers: 13 });
      TestCase.assertFalse(constructorCalled);
      TestCase.assertEqual(car1.make, "VW");
      TestCase.assertEqual(car1.model, "Touareg");
      TestCase.assertEqual(car1.kilometers, 13);
      TestCase.assertInstanceOf(car1, Realm.Object, "car1 not an instance of Realm.Object");

      let car2 = realm.create("Car2", { make: "Audi", model: "A4", kilometers: 24 });
      TestCase.assertFalse(calledAsConstructor);
      TestCase.assertEqual(car2.make, "Audi");
      TestCase.assertEqual(car2.model, "A4");
      TestCase.assertEqual(car2.kilometers, 24);
      TestCase.assertInstanceOf(car2, Realm.Object, "car2 not an instance of Realm.Object");

      let car2_1 = realm.create("Car2", { make: "VW", model: "Touareg", kilometers: 13 });
      TestCase.assertFalse(calledAsConstructor);
      TestCase.assertEqual(car2_1.make, "VW");
      TestCase.assertEqual(car2_1.model, "Touareg");
      TestCase.assertEqual(car2_1.kilometers, 13);
      TestCase.assertInstanceOf(car2_1, Realm.Object, "car2_1 not an instance of Realm.Object");
    });
    realm.close();
  },

  testRealmObjectCreationByPrimitiveArray: function () {
    const Primitive = {
      name: "Primitive",
      properties: {
        intArray: "int[]",
      },
    };

    var realm = new Realm({ schema: [Primitive] });
    realm.write(() => {
      var primitive = realm.create(Primitive.name, { intArray: [1, 2, 3] });
      TestCase.assertEqual(primitive.intArray[0], 1);
      primitive.intArray[0] = 5;
      TestCase.assertEqual(primitive.intArray[0], 5);
    });
  },

  testNativeFunctionOverwrite: function () {
    if (!isNodeProcess && !isElectronProcess) {
      return;
    }

    const realm = new Realm({ schema: [] });
    var oldClose = realm.close.bind(realm);
    var newCloseCalled = false;
    realm.close = () => {
      newCloseCalled = true;
    };
    realm.close();
    TestCase.assertTrue(newCloseCalled, "The new function should be called");

    TestCase.assertFalse(realm.isClosed, "The realm should not be closed");

    oldClose();

    TestCase.assertTrue(realm.isClosed, "The realm should be closed");
  },

  testRealmConstructorPath: function () {
    TestCase.assertThrows(() => new Realm("")); // the message for this error is platform-specific
    // Skipping this test as we're not validating extra arguments anymore
    /*
    TestCase.assertThrowsContaining(
      () => new Realm("test1.realm", "invalidArgument"),
      "Invalid arguments when constructing 'Realm'",
    );
    */

    const defaultRealm = new Realm({ schema: [] });
    TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

    const defaultRealm2 = new Realm();
    TestCase.assertEqual(defaultRealm2.path, Realm.defaultPath);

    const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
    const testPath = "test1.realm";
    const realm = new Realm({ schema: [], path: testPath });
    TestCase.assertEqual(realm.path, defaultDir + testPath);

    const testPath2 = "test2.realm";
    const realm2 = new Realm({ schema: [], path: testPath2 });
    TestCase.assertEqual(realm2.path, defaultDir + testPath2);
  },

  testRealmFifoFallbackPath: function () {
    // Object Store already tests the fallback logic
    // So this is just a smoke test to ensure that setting the property from JS doesn't actually crash anything.
    const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
    const realm = new Realm({ fifoFilesFallbackPath: defaultDir });
  },

  testRealmIsClosed: function () {
    const realm = new Realm({ schema: [] });
    TestCase.assertFalse(realm.isClosed);
    realm.close();
    TestCase.assertTrue(realm.isClosed);
  },

  testRealmCallCloseTwice: function () {
    const realm = new Realm({ schema: [] });
    realm.close();
    TestCase.assertTrue(realm.isClosed);
    realm.close();
    TestCase.assertTrue(realm.isClosed);
  },

  testRealmConstructorSchemaVersion: function () {
    const defaultRealm = new Realm({ schema: [] });
    TestCase.assertEqual(defaultRealm.schemaVersion, 0);

    TestCase.assertThrowsContaining(
      () => new Realm({ schemaVersion: 1, schema: [] }),
      "already opened with different schema version.",
    );

    TestCase.assertEqual(new Realm().schemaVersion, 0);
    TestCase.assertEqual(new Realm({ schemaVersion: 0 }).schemaVersion, 0);

    let realm = new Realm({ path: "test1.realm", schema: [], schemaVersion: 1 });
    TestCase.assertEqual(realm.schemaVersion, 1);
    TestCase.assertEqual(realm.schema.length, 0);
    realm.close();

    realm = new Realm({ path: "test1.realm", schema: [schemas.TestObject], schemaVersion: 2 });
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    TestCase.assertEqual(realm.objects("TestObject")[0].doubleCol, 1);
    TestCase.assertEqual(realm.schemaVersion, 2);
    TestCase.assertEqual(realm.schema.length, 1);
  },

  testStackTrace: function () {
    if (!isNodeProcess && !isElectronProcess) {
      return;
    }

    let realm = new Realm({ schema: [] });
    function failingFunction() {
      throw new Error("not implemented");
    }

    try {
      realm.write(() => {
        failingFunction();
      });
    } catch (e) {
      TestCase.assertNotEqual(e.stack, undefined, "e.stack should not be undefined");
      TestCase.assertNotEqual(e.stack, null, "e.stack should not be null");
      TestCase.assertTrue(e.stack.indexOf("at failingFunction (") !== -1, "failingfunction should be on the stack");
      TestCase.assertTrue(e.stack.indexOf("not implemented") !== -1, "the error message should be present");
    }

    realm.close();
  },

  testRealmConstructorDynamicSchema: function () {
    let realm = new Realm({ schema: [schemas.TestObject] });
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    realm.close();

    realm = new Realm();
    const objects = realm.objects("TestObject");
    TestCase.assertEqual(objects.length, 1);
    TestCase.assertEqual(objects[0].doubleCol, 1.0);
  },

  testRealmConstructorSchemaValidation: function () {
    TestCase.assertThrowsContaining(
      () => new Realm({ schema: schemas.AllTypes }),
      "Expected 'schema' to be an array, got an object",
    );
    TestCase.assertThrowsContaining(
      () => new Realm({ schema: ["SomeType"] }),
      "Expected 'object schema' to be an object, got a string",
    );
    TestCase.assertThrowsContaining(() => new Realm({ schema: [{}] }), "Expected 'name' to be a string, got undefined");
    TestCase.assertThrowsContaining(
      () => new Realm({ schema: [{ name: "SomeObject" }] }),
      "Expected 'properties' to be an object, got undefined",
    );
    TestCase.assertThrowsContaining(
      () => new Realm({ schema: [{ properties: { intCol: "int" } }] }),
      "Expected 'name' to be a string, got undefined",
    );

    function assertPropertyInvalid(prop, message) {
      TestCase.assertThrowsContaining(
        () => {
          new Realm({ schema: [{ name: "InvalidObject", properties: { int: "int", bad: prop } }] });
        },
        message,
        1,
      );
    }

    assertPropertyInvalid(
      { type: "list[]", objectType: "InvalidObject" },
      "Expected no 'objectType' in property schema, when using '[]' shorthand",
    );
    assertPropertyInvalid(
      { type: "list?", objectType: "InvalidObject" },
      "List property 'InvalidObject#bad' of 'InvalidObject' elements, cannot be optional",
    );
    assertPropertyInvalid("", "Property 'InvalidObject#bad' cannot have an empty object type");
    assertPropertyInvalid(
      { type: "linkingObjects", objectType: "InvalidObject", property: "nosuchproperty" },
      "Property 'InvalidObject.nosuchproperty' declared as origin of linking objects property 'InvalidObject.bad' does not exist",
    );
    assertPropertyInvalid(
      { type: "linkingObjects", objectType: "InvalidObject", property: "int" },
      "Property 'InvalidObject.int' declared as origin of linking objects property 'InvalidObject.bad' is not a link",
    );

    // linkingObjects property where the source property links elsewhere
    TestCase.assertThrowsContaining(() => {
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
    }, "Property 'InvalidObject.link' declared as origin of linking objects property 'InvalidObject.linkingObjects' links to type 'IntObject'");

    TestCase.assertThrowsContaining(() => {
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
    }, "Expected no 'objectType' in property schema, when using '[]' shorthand");
  },

  testRealmConstructorInMemory: function () {
    // open in-memory realm instance
    const realm1 = new Realm({ inMemory: true, schema: [schemas.TestObject] });
    realm1.write(() => {
      realm1.create("TestObject", { doubleCol: 1 });
    });
    TestCase.assertEqual(realm1.isInMemory, true);

    // open a second instance of the same realm and check that they share data
    const realm2 = new Realm({ inMemory: true });
    const objects = realm2.objects("TestObject");
    TestCase.assertEqual(objects.length, 1);
    TestCase.assertEqual(objects[0].doubleCol, 1.0);
    TestCase.assertEqual(realm2.isInMemory, true);

    // Close both realms (this should delete the realm since there are no more
    // references to it.
    realm1.close();
    realm2.close();

    // Open the same in-memory realm again and verify that it is now empty
    const realm3 = new Realm({ inMemory: true });
    TestCase.assertEqual(realm3.schema.length, 0);

    // try to open the same realm in persistent mode (should fail as you cannot mix modes)
    TestCase.assertThrowsContaining(() => new Realm({}), "already opened with different inMemory settings.");
    realm3.close();
  },

  testRealmConstructorReadOnly: function () {
    let realm = new Realm({ schema: [schemas.TestObject] });
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    TestCase.assertEqual(realm.isReadOnly, false);
    realm.close();

    realm = new Realm({ readOnly: true, schema: [schemas.TestObject] });
    const objects = realm.objects("TestObject");
    TestCase.assertEqual(objects.length, 1);
    TestCase.assertEqual(objects[0].doubleCol, 1.0);
    TestCase.assertEqual(realm.isReadOnly, true);

    TestCase.assertThrowsContaining(() => realm.write(() => {}), "Can't perform transactions on read-only Realms.");
    realm.close();

    realm = new Realm({ readOnly: true });
    TestCase.assertEqual(realm.schema.length, 1);
    TestCase.assertEqual(realm.isReadOnly, true);
    realm.close();
  },

  testRealmExists: function () {
    //TODO: remove when Atlas App Services test server can be hosted on Mac or other options exists
    if (!isNodeProcess) {
      return Promise.resolve();
    }

    // Local Realms
    let config = { schema: [schemas.TestObject] };

    TestCase.assertFalse(Realm.exists(config));
    new Realm(config).close();
    TestCase.assertTrue(Realm.exists(config));

    // Sync Realms
    if (!global.enableSyncTests) {
      return Promise.resolve();
    }

    const appConfig = nodeRequire("./support/testConfig").integrationAppConfig;

    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();

    return app.logIn(credentials).then((user) => {
      const config = {
        schema: [schemas.TestObjectWithPk],
        sync: {
          user,
          partitionValue: "LoLo",
        },
      };
      TestCase.assertFalse(Realm.exists(config));
      new Realm(config).close();
      TestCase.assertTrue(Realm.exists(config));
    });
  },

  testRealmOpen: function () {
    let realm = new Realm({ schema: [schemas.TestObject], schemaVersion: 1 });
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    realm.close();

    return Realm.open({ schema: [schemas.TestObject], schemaVersion: 2 }).then((realm) => {
      const objects = realm.objects("TestObject");
      TestCase.assertEqual(objects.length, 1);
      TestCase.assertEqual(objects[0].doubleCol, 1.0);
      realm.close();
    });
  },

  testRealmOpenShouldCompactOnLaunch: function () {
    let called = false;
    const shouldCompact = (total, used) => {
      called = true;
      return true;
    };

    return Realm.open({ schema: [schemas.TestObject], shouldCompact }).then((realm) => {
      TestCase.assertTrue(called);
      realm.close();
    });
  },

  testRealmOpenNoConfig: function () {
    let realm = new Realm({ schema: [schemas.TestObject], schemaVersion: 1 });
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    realm.close();

    return Realm.open().then((realm) => {
      const objects = realm.objects("TestObject");
      TestCase.assertEqual(objects.length, 1);
      TestCase.assertEqual(objects[0].doubleCol, 1.0);
      realm.close();
    });
  },

  testDefaultPath: function () {
    const defaultPath = Realm.defaultPath;
    let defaultRealm = new Realm({ schema: [] });
    TestCase.assertEqual(defaultRealm.path, Realm.defaultPath);

    try {
      const newPath = `${Realm.defaultPath.substring(0, defaultPath.lastIndexOf(pathSeparator) + 1)}default2.realm`;
      Realm.defaultPath = newPath;
      defaultRealm = new Realm({ schema: [] });
      TestCase.assertEqual(defaultRealm.path, newPath, "should use updated default realm path");
      TestCase.assertEqual(Realm.defaultPath, newPath, "defaultPath should have been updated");
    } finally {
      Realm.defaultPath = defaultPath;
    }
  },

  testRealmSchemaVersion: function () {
    TestCase.assertEqual(Realm.schemaVersion(Realm.defaultPath), -1);

    let realm = new Realm({ schema: [] });
    TestCase.assertEqual(realm.schemaVersion, 0);
    TestCase.assertEqual(Realm.schemaVersion(Realm.defaultPath), 0);

    realm = new Realm({ schema: [], schemaVersion: 2, path: "another.realm" });
    TestCase.assertEqual(realm.schemaVersion, 2);
    TestCase.assertEqual(Realm.schemaVersion("another.realm"), 2);
  },

  testRealmDataInitialization: function () {
    const data = [1, 2, 3];
    const initializer = (r) => {
      data.forEach((n) => r.create(schemas.IntOnly.name, { intCol: n }));
    };

    const config = {
      schema: [schemas.IntOnly],
      onFirstOpen: initializer,
    };
    Realm.deleteFile(config);

    const validateRealm = (realm) => {
      let pass = 1;
      return function () {
        pass++;
        let ints = realm.objects(schemas.IntOnly.name);
        TestCase.assertEqual(ints.length, data.length, `Length (pass: ${pass})`);
        for (let i = 0; i < data.length; i++) {
          TestCase.assertEqual(data[i], ints[i].intCol, `data[${i}] (pass: ${pass})`);
        }
      };
    };

    let realm1 = new Realm(config);
    validateRealm(realm1);
    realm1.close();

    // Open a second time and no new data is written
    let realm2 = new Realm(config);
    validateRealm(realm2);
    realm2.close();
  },

  testRealmWrite: function () {
    const realm = new Realm({
      schema: [schemas.IntPrimary, schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes],
    });

    // exceptions should be propagated
    TestCase.assertThrowsContaining(
      () =>
        realm.write(() => {
          throw new Error("Inner exception message");
        }),
      "Inner exception message",
    );

    // writes should be possible after caught exception
    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    TestCase.assertEqual(1, realm.objects("TestObject").length);

    realm.write(() => {
      // nested transactions not supported
      TestCase.assertThrowsContaining(() => realm.write(() => {}), "The Realm is already in a write transaction");
    });
  },

  testRealmWriteReturn: function () {
    const realm = new Realm({
      schema: [schemas.TestObject],
    });

    // able to return value from realm.write callback
    const foobar = realm.write(() => {
      return { foo: "bar" };
    });
    TestCase.assertEqual(foobar.foo, "bar", "wrong foobar object property value");

    const testObject = realm.write(() => {
      return realm.create("TestObject", { doubleCol: 1 });
    });
    // object was created
    TestCase.assertEqual(1, realm.objects("TestObject").length);
    // object was returned
    const objects = realm.objects("TestObject");
    TestCase.assertEqual(objects[0].doubleCol, testObject.doubleCol, "wrong test object property value");
  },

  testRealmCreate: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });

    TestCase.assertThrowsContaining(
      () => realm.create("TestObject", { doubleCol: 1 }),
      "Cannot modify managed objects outside of a write transaction.",
    );

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
      realm.create("TestObject", { doubleCol: 2 });
    });

    const objects = realm.objects("TestObject");
    TestCase.assertEqual(objects.length, 2, "wrong object count");
    TestCase.assertEqual(objects[0].doubleCol, 1, "wrong object property value");
    TestCase.assertEqual(objects[1].doubleCol, 2, "wrong object property value");
  },

  testRealmCreateOrUpdate_InvalidArguments: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    realm.write(function () {
      TestCase.assertThrowsContaining(
        () => realm.create("TestObject", { doubleCol: 1 }, "foo"),
        "Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.",
      );
    });
  },

  testRealmCreateOrUpdate: function () {
    const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject, schemas.StringPrimary] });
    realm.write(function () {
      const objects = realm.objects("AllPrimaryTypesObject");

      // Create Initial object
      const obj1 = realm.create("AllPrimaryTypesObject", {
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
      const obj2 = realm.create(
        "AllPrimaryTypesObject",
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
        "all",
      );

      TestCase.assertEqual(obj2.stringCol, "2");
      TestCase.assertEqual(obj2.boolCol, true);
      TestCase.assertEqual(obj2.intCol, 2);
      TestCase.assertEqualWithTolerance(obj2.floatCol, 2.2, 0.000001);
      TestCase.assertEqualWithTolerance(obj2.doubleCol, 2.22, 0.000001);
      TestCase.assertEqual(obj2.dateCol.getTime(), 2);
      TestCase.assertEqual(obj2.dataCol.byteLength, 2);
      TestCase.assertEqual(obj2.objectCol.doubleCol, 2);
      TestCase.assertEqual(obj2.arrayCol.length, 1);
      TestCase.assertEqual(obj2.arrayCol[0].doubleCol, 2);
    });
  },

  testRealmCreateOrUpdate_diffedUpdate: function () {
    const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject] });
    realm.write(function () {
      const objects = realm.objects("AllPrimaryTypesObject");
      TestCase.assertEqual(objects.length, 0);

      // Create Initial object
      const obj1 = realm.create("AllPrimaryTypesObject", {
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
      const obj2 = realm.create(
        "AllPrimaryTypesObject",
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
        "modified",
      );

      TestCase.assertEqual(objects.length, 1);
      TestCase.assertEqual(obj2.stringCol, "1");
      TestCase.assertEqual(obj2.boolCol, false);
      TestCase.assertEqual(obj2.intCol, 1);
      TestCase.assertEqualWithTolerance(obj2.floatCol, 1.1, 0.000001);
      TestCase.assertEqualWithTolerance(obj2.doubleCol, 1.11, 0.000001);
      TestCase.assertEqual(obj2.dateCol.getTime(), 1);
      TestCase.assertEqual(obj2.dataCol.byteLength, 1);
      TestCase.assertEqual(obj2.objectCol.doubleCol, 1);
      TestCase.assertEqual(obj2.arrayCol.length, 1);
      TestCase.assertEqual(obj2.arrayCol[0].doubleCol, 1);
    });
  },

  async testRealmCreateOrUpdate_diffedUpdatesOnlyTriggerNotificationsForChangedValues() {
    const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject] });

    let resolve;
    realm.objects("AllPrimaryTypesObject").addListener((objects, changes) => {
      resolve([objects, changes]);
      resolve = undefined;
    });

    let [objects, changes] = await new Promise((r) => (resolve = r));
    TestCase.assertEqual(changes.insertions.length, 0);
    TestCase.assertEqual(objects.length, 0);

    let template = Realm.createTemplateObject(schemas.AllPrimaryTypes);

    // First notification -> Object created
    realm.write(() => {
      // Create Initial object
      realm.create(
        "AllPrimaryTypesObject",
        Object.assign(template, {
          primaryCol: "35",
          dataCol: new ArrayBuffer(1),
          boolCol: false,
        }),
      );
      realm.create(
        "AllPrimaryTypesObject",
        Object.assign(template, {
          primaryCol: "36",
          boolCol: false,
        }),
      );
    });
    [objects, changes] = await new Promise((r) => (resolve = r));
    TestCase.assertEqual(changes.insertions.length, 2);
    TestCase.assertEqual(objects[0].boolCol, false);

    realm.write(() => {
      // Update object with a change in value.
      realm.create(
        "AllPrimaryTypesObject",
        {
          primaryCol: "35",
          boolCol: true,
        },
        "modified",
      );
    });
    [objects, changes] = await new Promise((r) => (resolve = r));
    TestCase.assertEqual(changes.oldModifications.length, 1);
    TestCase.assertEqual(objects[0].boolCol, true);

    realm.write(() => {
      // Update object with no change in value
      realm.create(
        "AllPrimaryTypesObject",
        {
          primaryCol: "35",
          boolCol: true,
        },
        "modified",
      );

      // Update other object to ensure that notifications are triggered
      realm.create(
        "AllPrimaryTypesObject",
        {
          primaryCol: "36",
          boolCol: true,
        },
        "all",
      );
    });
    [objects, changes] = await new Promise((r) => (resolve = r));
    TestCase.assertEqual(changes.oldModifications.length, 1);
    TestCase.assertEqual(changes.oldModifications[0], 1);

    realm.write(() => {
      // Update object with no change in value and no diffed update.
      // This should still trigger a notification
      realm.create(
        "AllPrimaryTypesObject",
        {
          primaryCol: "35",
          boolCol: true,
        },
        "all",
      );
    });
    [objects, changes] = await new Promise((r) => (resolve = r));
    TestCase.assertEqual(changes.oldModifications.length, 1);
    TestCase.assertEqual(changes.oldModifications[0], 0);
    TestCase.assertEqual(objects[0].boolCol, true);
  },

  testRealmCreateOrUpdate_DefaultValue: function () {
    const realm = new Realm({ schema: [schemas.OptionalString] });

    realm.write(() => {
      realm.create(schemas.OptionalString.name, { name: "Alex" });
      realm.create(schemas.OptionalString.name, { name: "Birger" }, "modified");
    });

    let objs = realm.objects(schemas.OptionalString.name);

    TestCase.assertEqual(objs[0]["name"], "Alex");
    TestCase.assertEqual(objs[0]["age"], 0);

    TestCase.assertEqual(objs[1]["name"], "Birger");
    TestCase.assertEqual(objs[1]["age"], 0);

    realm.close();
  },

  testRealmCreatePrimaryKey: function () {
    const realm = new Realm({ schema: [schemas.IntPrimary] });

    realm.write(() => {
      const obj0 = realm.create("IntPrimaryObject", {
        primaryCol: 0,
        valueCol: "val0",
      });

      TestCase.assertThrowsContaining(() => {
        realm.create("IntPrimaryObject", {
          primaryCol: 0,
          valueCol: "val0",
        });
      }, "Attempting to create an object of type 'IntPrimaryObject' with an existing primary key value '0'.");

      realm.create(
        "IntPrimaryObject",
        {
          primaryCol: 1,
          valueCol: "val1",
        },
        "all",
      );

      const objects = realm.objects("IntPrimaryObject");
      TestCase.assertEqual(objects.length, 2);

      realm.create(
        "IntPrimaryObject",
        {
          primaryCol: 0,
          valueCol: "newVal0",
        },
        "all",
      );

      TestCase.assertEqual(obj0.valueCol, "newVal0");
      TestCase.assertEqual(objects.length, 2);

      realm.create("IntPrimaryObject", { primaryCol: 0 }, "all");
      TestCase.assertEqual(obj0.valueCol, "newVal0");
    });
  },

  testRealmCreateUpsert: function () {
    const realm = new Realm({ schema: [schemas.AllPrimaryTypes, schemas.TestObject, schemas.StringPrimary] });
    realm.write(function () {
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

      const obj0 = realm.create("AllPrimaryTypesObject", values);

      TestCase.assertThrowsContaining(
        () => realm.create("AllPrimaryTypesObject", values),
        "Attempting to create an object of type 'AllPrimaryTypesObject' with an existing primary key value '0'.",
      );

      const obj1 = realm.create(
        "AllPrimaryTypesObject",
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
        true,
      );

      const objects = realm.objects("AllPrimaryTypesObject");
      TestCase.assertEqual(objects.length, 2);

      realm.create(
        "AllPrimaryTypesObject",
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

      TestCase.assertEqual(objects.length, 2);
      TestCase.assertEqual(obj0.stringCol, "2");
      TestCase.assertEqual(obj0.boolCol, false);
      TestCase.assertEqual(obj0.intCol, 2);
      TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
      TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
      TestCase.assertEqual(obj0.dateCol.getTime(), 2);
      TestCase.assertEqual(obj0.dataCol.byteLength, 2);
      TestCase.assertEqual(obj0.objectCol, null);
      TestCase.assertEqual(obj0.arrayCol.length, 1);

      realm.create("AllPrimaryTypesObject", { primaryCol: "0" }, true);
      realm.create("AllPrimaryTypesObject", { primaryCol: "1" }, true);
      TestCase.assertEqual(obj0.stringCol, "2");
      TestCase.assertEqual(obj0.objectCol, null);
      TestCase.assertEqual(obj1.objectCol.doubleCol, 0);

      realm.create(
        "AllPrimaryTypesObject",
        {
          primaryCol: "0",
          stringCol: "3",
          objectCol: { doubleCol: 0 },
        },
        true,
      );

      TestCase.assertEqual(obj0.stringCol, "3");
      TestCase.assertEqual(obj0.boolCol, false);
      TestCase.assertEqual(obj0.intCol, 2);
      TestCase.assertEqualWithTolerance(obj0.floatCol, 2.2, 0.000001);
      TestCase.assertEqualWithTolerance(obj0.doubleCol, 2.22, 0.000001);
      TestCase.assertEqual(obj0.dateCol.getTime(), 2);
      TestCase.assertEqual(obj0.dataCol.byteLength, 2);
      TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
      TestCase.assertEqual(obj0.arrayCol.length, 1);

      realm.create("AllPrimaryTypesObject", { primaryCol: "0", objectCol: undefined }, true);
      realm.create("AllPrimaryTypesObject", { primaryCol: "1", objectCol: null }, true);
      TestCase.assertEqual(obj0.objectCol.doubleCol, 0);
      TestCase.assertEqual(obj1.objectCol, null);

      // test with string primaries
      const obj = realm.create("StringPrimaryObject", {
        primaryCol: "0",
        valueCol: 0,
      });
      TestCase.assertEqual(obj.valueCol, 0);

      realm.create(
        "StringPrimaryObject",
        {
          primaryCol: "0",
          valueCol: 1,
        },
        true,
      );
      TestCase.assertEqual(obj.valueCol, 1);
    });
  },

  testRealmWithIndexedProperties: function () {
    const realm = new Realm({ schema: [schemas.IndexedTypes] });
    realm.write(() => {
      realm.create("IndexedTypesObject", { boolCol: true, intCol: 1, stringCol: "1", dateCol: new Date(1) });
    });

    const NotIndexed = {
      name: "NotIndexedObject",
      properties: {
        floatCol: { type: "float", indexed: false },
      },
    };

    new Realm({ schema: [NotIndexed], path: "1.realm" });

    const IndexedSchema = {
      name: "IndexedSchema",
    };
    TestCase.assertThrowsContaining(() => {
      IndexedSchema.properties = { floatCol: { type: "float", indexed: true } };
      new Realm({ schema: [IndexedSchema], path: "2.realm" });
    }, "Property 'IndexedSchema.floatCol' of type 'float' cannot be indexed.");

    TestCase.assertThrowsContaining(() => {
      IndexedSchema.properties = { doubleCol: { type: "double", indexed: true } };
      new Realm({ schema: [IndexedSchema], path: "3.realm" });
    }, "Property 'IndexedSchema.doubleCol' of type 'double' cannot be indexed.");

    TestCase.assertThrowsContaining(() => {
      IndexedSchema.properties = { dataCol: { type: "data", indexed: true } };
      new Realm({ schema: [IndexedSchema], path: "4.realm" });
    }, "Property 'IndexedSchema.dataCol' of type 'data' cannot be indexed.");

    // primary key
    IndexedSchema.properties = { intCol: { type: "int", indexed: true } };
    IndexedSchema.primaryKey = "intCol";

    // Test this doesn't throw
    new Realm({ schema: [IndexedSchema], path: "5.realm" });
  },

  testRealmCreateWithDefaults: function () {
    let realm = new Realm({ schema: [schemas.DefaultValues, schemas.TestObject] });

    const createAndTestObject = () => {
      const obj = realm.create("DefaultValuesObject", {});
      const properties = schemas.DefaultValues.properties;

      TestCase.assertEqual(obj.boolCol, properties.boolCol.default);
      TestCase.assertEqual(obj.intCol, properties.intCol.default);
      TestCase.assertEqualWithTolerance(obj.floatCol, properties.floatCol.default, 0.000001);
      TestCase.assertEqualWithTolerance(obj.doubleCol, properties.doubleCol.default, 0.000001);
      TestCase.assertEqual(obj.stringCol, properties.stringCol.default);
      TestCase.assertEqual(obj.dateCol.getTime(), properties.dateCol.default.getTime());
      TestCase.assertEqual(obj.dataCol.byteLength, properties.dataCol.default.byteLength);
      TestCase.assertEqual(obj.objectCol.doubleCol, properties.objectCol.default.doubleCol);
      TestCase.assertEqual(obj.nullObjectCol, null);
      TestCase.assertEqual(obj.arrayCol.length, properties.arrayCol.default.length);
      TestCase.assertEqual(obj.arrayCol[0].doubleCol, properties.arrayCol.default[0].doubleCol);
    };

    realm.write(createAndTestObject);
    realm.close();
  },

  testRealmCreateWithChangingDefaults: function () {
    const objectSchema = {
      name: "IntObject",
      properties: {
        intCol: { type: "int", default: 1 },
      },
    };

    let realm = new Realm({ schema: [objectSchema] });

    const createAndTestObject = () => {
      const object = realm.create("IntObject", {});
      TestCase.assertEqual(object.intCol, objectSchema.properties.intCol.default);
    };

    realm.write(createAndTestObject);

    objectSchema.properties.intCol.default++;

    realm = new Realm({ schema: [objectSchema] });
    realm.write(createAndTestObject);
  },

  testRealmCreateWithConstructor: function () {
    let customCreated = 0;

    function CustomObject() {
      customCreated++;
    }
    CustomObject.schema = {
      name: "CustomObject",
      properties: {
        intCol: "int",
      },
    };
    Object.setPrototypeOf(CustomObject, Realm.Object);
    Object.setPrototypeOf(CustomObject.prototype, Realm.Object.prototype);

    function InvalidObject() {
      return {};
    }

    TestCase.assertThrowsContaining(
      () => new Realm({ schema: [InvalidObject] }),
      "Class 'InvalidObject' must extend Realm.Object",
    );

    Object.setPrototypeOf(InvalidObject, Realm.Object);
    Object.setPrototypeOf(InvalidObject.prototype, Realm.Object.prototype);
    TestCase.assertThrowsContaining(
      () => new Realm({ schema: [InvalidObject] }),
      "Expected 'schema static' to be an object, got undefined",
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
      TestCase.assertTrue(object instanceof CustomObject);
      // We're now injecting a class
      // TestCase.assertTrue(Object.getPrototypeOf(object) == CustomObject.prototype);
      TestCase.assertEqual(customCreated, 0);

      // Should be able to create object by passing in constructor.
      object = realm.create(CustomObject, { intCol: 2 });
      TestCase.assertTrue(object instanceof CustomObject);
      // TestCase.assertTrue(Object.getPrototypeOf(object) == CustomObject.prototype);
      TestCase.assertEqual(customCreated, 0);
    });

    realm.write(() => {
      realm.create("InvalidObject", { intCol: 1 });
    });

    // Only the original constructor should be valid.
    function InvalidCustomObject() {}
    Object.setPrototypeOf(InvalidCustomObject, Realm.Object);
    Object.setPrototypeOf(InvalidCustomObject.prototype, Realm.Object.prototype);
    InvalidCustomObject.schema = CustomObject.schema;

    TestCase.assertThrowsContaining(() => {
      realm.write(() => {
        realm.create(InvalidCustomObject, { intCol: 1 });
      });
    }, "Constructor was not registered in the schema for this Realm");
    realm.close();

    realm = new Realm({ schema: [CustomObject, InvalidObject] });
    let obj = realm.objects("CustomObject")[0];
    TestCase.assertTrue(realm.objects("CustomObject")[0] instanceof CustomObject);
    TestCase.assertTrue(realm.objects(CustomObject).length > 0);
    realm.close();
  },

  testRealmCreateWithChangingConstructor: function () {
    function CustomObject() {}
    CustomObject.schema = {
      name: "CustomObject",
      properties: {
        intCol: "int",
      },
    };
    Object.setPrototypeOf(CustomObject, Realm.Object);
    Object.setPrototypeOf(CustomObject.prototype, Realm.Object.prototype);

    let realm = new Realm({ schema: [CustomObject] });
    realm.write(() => {
      const object = realm.create("CustomObject", { intCol: 1 });
      TestCase.assertTrue(object instanceof CustomObject);
    });

    function NewCustomObject() {}
    NewCustomObject.schema = CustomObject.schema;
    Object.setPrototypeOf(NewCustomObject, Realm.Object);
    Object.setPrototypeOf(NewCustomObject.prototype, Realm.Object.prototype);

    realm = new Realm({ schema: [NewCustomObject] });
    realm.write(() => {
      const object = realm.create("CustomObject", { intCol: 1 });
      TestCase.assertTrue(object instanceof NewCustomObject);
    });
  },

  testRealmDelete: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });

    realm.write(() => {
      for (let i = 0; i < 10; i++) {
        realm.create("TestObject", { doubleCol: i });
      }
    });

    const objects = realm.objects("TestObject");
    TestCase.assertThrowsContaining(() => realm.delete(objects[0]), "Can only delete objects within a transaction.");

    realm.write(() => {
      TestCase.assertThrowsContaining(() => realm.delete(), "Expected 'subject' to be an object, got undefined");

      realm.delete(objects[0]);
      TestCase.assertEqual(objects.length, 9, "wrong object count");
      TestCase.assertEqual(objects[0].doubleCol, 1, "wrong property value");
      TestCase.assertEqual(objects[1].doubleCol, 2, "wrong property value");

      realm.delete([objects[0], objects[1]]);
      TestCase.assertEqual(objects.length, 7, "wrong object count");
      TestCase.assertEqual(objects[0].doubleCol, 3, "wrong property value");
      TestCase.assertEqual(objects[1].doubleCol, 4, "wrong property value");

      const twoObjects = realm.objects("TestObject").filtered("doubleCol < 5");
      TestCase.assertEqual(twoObjects.length, 2, "wrong results count");
      realm.delete(twoObjects);
      TestCase.assertEqual(objects.length, 5, "wrong object count");
      TestCase.assertEqual(twoObjects.length, 0, "threeObject should have been deleted");

      const o = objects[0];
      realm.delete(o);
      TestCase.assertThrowsContaining(
        () => realm.delete(o),
        "Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.",
      );
    });
  },

  testDeleteAll: function () {
    const realm = new Realm({ schema: [schemas.TestObject, schemas.IntPrimary] });

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
      realm.create("TestObject", { doubleCol: 2 });
      realm.create("IntPrimaryObject", { primaryCol: 2, valueCol: "value" });
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 2);
    TestCase.assertEqual(realm.objects("IntPrimaryObject").length, 1);

    TestCase.assertThrowsContaining(() => realm.deleteAll(), "Can only delete objects within a transaction.");

    realm.write(() => {
      realm.deleteAll();
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 0);
    TestCase.assertEqual(realm.objects("IntPrimaryObject").length, 0);
  },

  testDeleteAllAfterDeleteModel: function () {
    const realm = new Realm({ schema: [schemas.TestObject, schemas.IntPrimary] });

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
      realm.create("TestObject", { doubleCol: 2 });
      realm.create("IntPrimaryObject", { primaryCol: 2, valueCol: "value" });
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 2);
    TestCase.assertEqual(realm.objects("IntPrimaryObject").length, 1);

    realm.write(() => {
      realm.deleteModel("IntPrimaryObject");
    });
    realm.write(() => {
      realm.deleteAll();
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 0);
    TestCase.assertThrows(() => realm.objects("IntPrimaryObject"));
  },

  testRealmObjects: function () {
    const realm = new Realm({ schema: [schemas.PersonObject, schemas.DefaultValues, schemas.TestObject] });

    realm.write(() => {
      realm.create("PersonObject", { name: "Ari", age: 10 });
      realm.create("PersonObject", { name: "Tim", age: 11 });
      realm.create("PersonObject", { name: "Bjarne", age: 12 });
      realm.create("PersonObject", { name: "Alex", age: 12, married: true });
    });

    // Should be able to pass constructor for getting objects.
    const objects = realm.objects(schemas.PersonObject);
    TestCase.assertTrue(objects[0] instanceof schemas.PersonObject);

    function InvalidPerson() {}
    InvalidPerson.schema = schemas.PersonObject.schema;

    TestCase.assertThrowsContaining(() => realm.objects(), "Expected an object schema name, object instance or class");
    TestCase.assertThrowsContaining(
      () => realm.objects([]),
      "Expected an object schema name, object instance or class",
    );
    TestCase.assertThrowsContaining(
      () => realm.objects("InvalidClass"),
      "Object type 'InvalidClass' not found in schema.",
    );

    // The new SDK doesn't throw when methods are called with more arguments than expected
    /*
    TestCase.assertThrowsContaining(
      () => realm.objects("PersonObject", "truepredicate"),
      "Invalid arguments: at most 1 expected, but 2 supplied.",
    );
    */

    TestCase.assertThrowsContaining(
      () => realm.objects(InvalidPerson),
      "Expected value to be a class extending Realm.Object, got a function or class named InvalidPerson",
    );

    Object.setPrototypeOf(InvalidPerson, Realm.Object);
    Object.setPrototypeOf(InvalidPerson.prototype, Realm.Object.prototype);

    TestCase.assertThrowsContaining(
      () => realm.objects(InvalidPerson),
      "Constructor was not registered in the schema for this Realm",
    );

    const person = realm.objects("PersonObject")[0];
    const listenerCallback = () => {};
    realm.addListener("change", listenerCallback);

    // The tests below assert that everthing throws when
    // operating on a closed realm
    realm.close();

    TestCase.assertThrowsContaining(
      () => console.log("Name: ", person.name),
      "Accessing object which has been invalidated or deleted",
    );

    TestCase.assertThrowsContaining(() => realm.objects("PersonObject"), "Cannot access realm that has been closed");
    TestCase.assertThrowsContaining(
      () => realm.addListener("change", () => {}),
      "Cannot access realm that has been closed",
    );
    TestCase.assertThrowsContaining(
      () => realm.create("PersonObject", { name: "Ari", age: 10 }),
      "Cannot access realm that has been closed",
    );
    TestCase.assertThrowsContaining(() => realm.delete(person), "Cannot access realm that has been closed");
    TestCase.assertThrowsContaining(() => realm.deleteAll(), "Cannot access realm that has been closed");
    TestCase.assertThrowsContaining(() => realm.write(() => {}), "Cannot access realm that has been closed");
    TestCase.assertThrowsContaining(
      () => realm.removeListener("change", listenerCallback),
      "Cannot access realm that has been closed",
    );
    TestCase.assertThrowsContaining(() => realm.removeAllListeners(), "Cannot access realm that has been closed");
  },

  testRealmObjectForPrimaryKey: function () {
    const realm = new Realm({ schema: [schemas.IntPrimary, schemas.StringPrimary, schemas.TestObject] });

    realm.write(() => {
      realm.create("IntPrimaryObject", { primaryCol: 0, valueCol: "val0" });
      realm.create("IntPrimaryObject", { primaryCol: 1, valueCol: "val1" });

      realm.create("StringPrimaryObject", { primaryCol: "", valueCol: -1 });
      realm.create("StringPrimaryObject", { primaryCol: "val0", valueCol: 0 });
      realm.create("StringPrimaryObject", { primaryCol: "val1", valueCol: 1 });

      realm.create("TestObject", { doubleCol: 0 });
    });

    TestCase.assertEqual(realm.objectForPrimaryKey("IntPrimaryObject", -1), null);
    TestCase.assertEqual(realm.objectForPrimaryKey("IntPrimaryObject", 0).valueCol, "val0");
    TestCase.assertEqual(realm.objectForPrimaryKey("IntPrimaryObject", 1).valueCol, "val1");

    TestCase.assertEqual(realm.objectForPrimaryKey("StringPrimaryObject", "invalid"), null);
    TestCase.assertEqual(realm.objectForPrimaryKey("StringPrimaryObject", "").valueCol, -1);
    TestCase.assertEqual(realm.objectForPrimaryKey("StringPrimaryObject", "val0").valueCol, 0);
    TestCase.assertEqual(realm.objectForPrimaryKey("StringPrimaryObject", "val1").valueCol, 1);

    TestCase.assertThrowsContaining(
      () => realm.objectForPrimaryKey("TestObject", 0),
      "Expected a primary key on 'TestObject'",
    );
    TestCase.assertThrowsContaining(
      () => realm.objectForPrimaryKey(),
      "Expected an object schema name, object instance or class",
    );
    TestCase.assertThrowsContaining(
      () => realm.objectForPrimaryKey("IntPrimaryObject"),
      "Expected value to be a number or bigint, got undefined",
    );
    TestCase.assertThrowsContaining(
      () => realm.objectForPrimaryKey("InvalidClass", 0),
      "Object type 'InvalidClass' not found in schema.",
    );

    TestCase.assertThrowsContaining(
      () => realm.objectForPrimaryKey("IntPrimaryObject", { foo: "bar" }),
      "Expected value to be a number or bigint, got an object",
    );
  },

  testNotifications: function () {
    const realm = new Realm({ schema: [] });
    let notificationCount = 0;
    let notificationName;

    realm.addListener("change", (realm, name) => {
      notificationCount++;
      notificationName = name;
    });

    TestCase.assertEqual(notificationCount, 0);
    realm.write(() => {});
    TestCase.assertEqual(notificationCount, 1);
    TestCase.assertEqual(notificationName, "change");

    let secondNotificationCount = 0;
    function secondNotification() {
      secondNotificationCount++;
    }

    // The listener should only be added once.
    realm.addListener("change", secondNotification);
    realm.addListener("change", secondNotification);

    realm.write(() => {});
    TestCase.assertEqual(notificationCount, 2);
    TestCase.assertEqual(secondNotificationCount, 1);

    realm.removeListener("change", secondNotification);
    realm.write(() => {});
    TestCase.assertEqual(notificationCount, 3);
    TestCase.assertEqual(secondNotificationCount, 1);

    realm.removeAllListeners();
    realm.write(() => {});
    TestCase.assertEqual(notificationCount, 3);
    TestCase.assertEqual(secondNotificationCount, 1);

    TestCase.assertThrowsContaining(
      () => realm.addListener("invalid", () => {}),
      "Unknown event name 'invalid': only 'change', 'schema' and 'beforenotify' are supported.",
    );

    realm.addListener("change", () => {
      throw new Error("expected error message");
    });

    TestCase.assertThrowsContaining(() => realm.write(() => {}), "expected error message");
  },

  testSchema: function () {
    const originalSchema = [
      schemas.TestObject,
      schemas.AllTypes,
      schemas.LinkToAllTypes,
      schemas.IndexedTypes,
      schemas.IntPrimary,
      schemas.PersonObject,
      schemas.LinkTypes,
      schemas.LinkingObjectsObject,
    ];

    const schemaMap = {};
    originalSchema.forEach((objectSchema) => {
      if (objectSchema.schema) {
        // for PersonObject
        schemaMap[objectSchema.schema.name] = objectSchema;
      } else {
        schemaMap[objectSchema.name] = objectSchema;
      }
    });

    const realm = new Realm({ schema: originalSchema });

    const schema = realm.schema;
    TestCase.assertEqual(schema.length, originalSchema.length);

    const normalizeProperty = (val) => {
      let prop;
      if (typeof val !== "string" && !(val instanceof String)) {
        prop = val;
        prop.optional = val.optional || false;
        prop.indexed = val.indexed || false;
      } else {
        prop = { type: val, indexed: false, optional: false };
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
      let original = schemaMap[objectSchema.name];
      if (original.schema) {
        original = original.schema;
      }

      TestCase.assertEqual(objectSchema.primaryKey, original.primaryKey);
      for (const propName in objectSchema.properties) {
        TestCase.assertDefined(original.properties[propName], `schema has unexpected property ${propName}`);

        const actual = objectSchema.properties[propName];
        const expected = normalizeProperty(original.properties[propName]);
        TestCase.assertEqual(actual.name, propName);

        // The schema primary key is automatically indexed
        const isPrimaryKey = original.primaryKey === propName;
        TestCase.assertEqual(actual.indexed, expected.indexed || isPrimaryKey);

        if (actual.type == "object") {
          TestCase.assertEqual(actual.objectType, expected.type === "object" ? expected.objectType : expected.type);
          TestCase.assertEqual(actual.optional, true);
          TestCase.assertUndefined(actual.property);
        } else if (actual.type == "list") {
          TestCase.assertEqual(actual.type, expected.type);
          TestCase.assertEqual(actual.objectType, expected.objectType);
          TestCase.assertEqual(actual.optional, expected.optional);
          TestCase.assertUndefined(actual.property);
        } else if (actual.type == "linkingObjects") {
          TestCase.assertEqual(actual.type, expected.type);
          TestCase.assertEqual(actual.objectType, expected.objectType);
          TestCase.assertEqual(actual.property, expected.property);
          TestCase.assertEqual(actual.optional, false);
        } else {
          TestCase.assertEqual(actual.type, expected.type);
          TestCase.assertEqual(actual.optional, expected.optional);
          TestCase.assertUndefined(actual.property);
          TestCase.assertUndefined(actual.objectType);
        }
      }
    }
  },

  // FIXME: reenable this test!
  /*    testCopyBundledRealmFiles: function() {
        let config = {path: 'realm-bundle.realm', schema: [schemas.DateObject]};
        if (Realm.exists(config)) {
            Realm.deleteFile(config);
        }
        Realm.copyBundledRealmFiles();
        TestCase.assertTrue(Realm.exists(config));

        let realm = new Realm(config);
        TestCase.assertEqual(realm.objects('Date').length, 2);
        TestCase.assertEqual(realm.objects('Date')[0].currentDate.getTime(), 1462500087955);

        const newDate = new Date(1);
        realm.write(() => {
            realm.objects('Date')[0].currentDate = newDate;
        });
        realm.close();

        // copy should not overwrite existing files
        Realm.copyBundledRealmFiles();
        realm = new Realm(config);
        TestCase.assertEqual(realm.objects('Date')[0].currentDate.getTime(), 1);
    },*/

  testErrorMessageFromInvalidWrite: function () {
    const realm = new Realm({ schema: [schemas.PersonObject] });

    TestCase.assertThrowsContaining(() => {
      realm.write(() => {
        const p1 = realm.create("PersonObject", { name: "Ari", age: 10 });
        p1.age = "Ten";
      });
    }, "PersonObject.age must be of type 'number', got 'string' ('Ten')");
  },

  testErrorMessageFromInvalidCreate: function () {
    const realm = new Realm({ schema: [schemas.PersonObject] });

    TestCase.assertThrowsContaining(() => {
      realm.write(() => {
        realm.create("PersonObject", { name: "Ari", age: "Ten" });
      });
    }, "PersonObject.age must be of type 'number', got 'string' ('Ten')");
  },

  testValidTypesForListProperties: function () {
    const realm = new Realm({ schema: [schemas.PersonObject] });
    realm.write(() => {
      const p1 = realm.create("PersonObject", { name: "Ari", age: 10 });
      const p2 = realm.create("PersonObject", {
        name: "Harold",
        age: 55,
        children: realm.objects("PersonObject").filtered("age < 15"),
      });
      TestCase.assertEqual(p2.children.length, 1);
      const p3 = realm.create("PersonObject", { name: "Wendy", age: 52, children: p2.children });
      TestCase.assertEqual(p3.children.length, 1);
    });
  },

  testEmpty: function () {
    const realm = new Realm({ schema: [schemas.PersonObject] });
    TestCase.assertTrue(realm.isEmpty);

    realm.write(() => realm.create("PersonObject", { name: "Ari", age: 10 }));
    TestCase.assertTrue(!realm.isEmpty);

    realm.write(() => realm.delete(realm.objects("PersonObject")));
    TestCase.assertTrue(realm.isEmpty);
  },

  testManualTransaction: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    TestCase.assertTrue(realm.isEmpty);

    realm.beginTransaction();
    realm.create("TestObject", { doubleCol: 3.1415 });
    realm.commitTransaction();

    TestCase.assertEqual(realm.objects("TestObject").length, 1);
  },

  testCancelTransaction: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    TestCase.assertTrue(realm.isEmpty);

    realm.beginTransaction();
    realm.create("TestObject", { doubleCol: 3.1415 });
    realm.cancelTransaction();

    TestCase.assertTrue(realm.isEmpty);
  },

  testIsInTransaction: function () {
    const realm = new Realm({ schema: [schemas.TestObject] });
    TestCase.assertTrue(!realm.isInTransaction);
    realm.beginTransaction();
    TestCase.assertTrue(realm.isInTransaction);
    realm.cancelTransaction();
    TestCase.assertTrue(!realm.isInTransaction);
  },

  testCompact: function () {
    let wasCalled = false;
    const count = 1000;
    // create compactable Realm
    const realm1 = new Realm({ schema: [schemas.StringOnly] });
    realm1.write(() => {
      realm1.create("StringOnlyObject", { stringCol: "A" });
      for (let i = 0; i < count; i++) {
        realm1.create("StringOnlyObject", { stringCol: "ABCDEFG" });
      }
      realm1.create("StringOnlyObject", { stringCol: "B" });
    });
    realm1.close();

    // open Realm and see if it is compacted
    const shouldCompact = (totalBytes, usedBytes) => {
      wasCalled = true;
      const fiveHundredKB = 500 * 1024;
      return totalBytes > fiveHundredKB && usedBytes / totalBytes < 0.2;
    };
    const realm2 = new Realm({ schema: [schemas.StringOnly], shouldCompact });
    TestCase.assertTrue(wasCalled);
    TestCase.assertEqual(realm2.objects("StringOnlyObject").length, count + 2);
    // we don't check if the file is smaller as we assume that Object Store does it
    realm2.close();
  },

  testManualCompact: function () {
    const realm1 = new Realm({ schema: [schemas.StringOnly] });
    realm1.write(() => {
      realm1.create("StringOnlyObject", { stringCol: "A" });
    });
    TestCase.assertTrue(realm1.compact());
    realm1.close();

    const realm2 = new Realm({ schema: [schemas.StringOnly] });
    TestCase.assertEqual(realm2.objects("StringOnlyObject").length, 1);
    realm2.close();
  },

  testManualCompactInWrite: function () {
    const realm = new Realm({ schema: [schemas.StringOnly] });
    realm.write(() => {
      TestCase.assertThrowsContaining(() => {
        realm.compact();
      }, "Cannot compact a Realm within a transaction.");
    });
    TestCase.assertTrue(realm.isEmpty);
  },

  testManualCompactMultipleInstances: function () {
    const realm1 = new Realm({ schema: [schemas.StringOnly] });
    const realm2 = new Realm({ schema: [schemas.StringOnly] });
    // realm1 and realm2 are wrapping the same Realm instance
    realm2.objects("StringOnlyObject");
    TestCase.assertTrue(realm1.compact());
  },

  testRealmDeleteFileDefaultConfigPath: function () {
    const config = { schema: [schemas.TestObject] };
    const realm = new Realm(config);

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 1);
    realm.close();

    Realm.deleteFile(config);

    const realm2 = new Realm(config);
    TestCase.assertEqual(realm2.objects("TestObject").length, 0);
    realm2.close();
  },

  testRealmDeleteFileCustomConfigPath: function () {
    const config = { schema: [schemas.TestObject], path: "test-realm-delete-file.realm" };
    const realm = new Realm(config);

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });

    TestCase.assertEqual(realm.objects("TestObject").length, 1);
    realm.close();

    Realm.deleteFile(config);

    const realm2 = new Realm(config);
    TestCase.assertEqual(realm2.objects("TestObject").length, 0);
    realm2.close();
  },

  testRealmDeleteFileSyncConfig: function () {
    if (!global.enableSyncTests) {
      return Promise.resolve();
    }

    //TODO: remove when Atlas App Services test server can be hosted on Mac or other options exists
    if (!isNodeProcess) {
      return Promise.resolve();
    }

    const appConfig = nodeRequire("./support/testConfig").integrationAppConfig;

    let app = new Realm.App(appConfig);
    return app.logIn(Realm.Credentials.anonymous()).then((user) => {
      const config = {
        schema: [schemas.TestObjectWithPk],
        sync: { user, partitionValue: '"Lolo"' },
      };

      const realm = new Realm(config);
      const path = realm.path;
      realm.close();

      return fs
        .exists(path)
        .then((pathExistBeforeDelete) => {
          TestCase.assertTrue(pathExistBeforeDelete);
          Realm.deleteFile(config);

          return fs.exists(path);
        })
        .then((pathExistAfterDelete) => {
          TestCase.assertFalse(pathExistAfterDelete);
        });
    });
  },

  testRealmDeleteRealmIfMigrationNeededVersionChanged: function () {
    const schema = [
      {
        name: "TestObject",
        properties: {
          prop0: "string",
          prop1: "int",
        },
      },
    ];

    var realm = new Realm({ schema: schema });

    realm.write(function () {
      realm.create("TestObject", ["stringValue", 1]);
    });

    realm.close();

    realm = new Realm({ schema: schema, deleteRealmIfMigrationNeeded: true, schemaVersion: 1, onMigration: undefined });

    // object should be gone as Realm should get deleted
    TestCase.assertEqual(realm.objects("TestObject").length, 0);

    // create a new object
    realm.write(function () {
      realm.create("TestObject", ["stringValue", 1]);
    });

    realm.close();

    var migrationWasCalled = false;
    realm = new Realm({
      schema: schema,
      deleteRealmIfMigrationNeeded: false,
      schemaVersion: 2,
      onMigration: function (oldRealm, newRealm) {
        migrationWasCalled = true;
      },
    });

    // migration function should get called as deleteRealmIfMigrationNeeded is false
    TestCase.assertEqual(migrationWasCalled, true);

    // object should be there because Realm shouldn't get deleted
    TestCase.assertEqual(realm.objects("TestObject").length, 1);
    realm.close();
  },

  testRealmDeleteRealmIfMigrationNeededSchemaChanged: function () {
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

    var realm = new Realm({ schema: schema });

    realm.write(function () {
      realm.create("TestObject", { prop0: "stringValue", prop1: 1 });
    });

    realm.close();

    // change schema
    realm = new Realm({ schema: schema1, deleteRealmIfMigrationNeeded: true, migration: undefined });

    // object should be gone as Realm should get deleted
    TestCase.assertEqual(realm.objects("TestObject").length, 0);

    // create a new object
    realm.write(function () {
      realm.create("TestObject", { prop0: "stringValue", prop1: 1, prop2: 1.0 });
    });

    realm.close();

    TestCase.assertThrows(function (e) {
      // updating schema without changing schemaVersion OR setting deleteRealmIfMigrationNeeded = true should raise an error
      new Realm({
        schema: schema2,
        deleteRealmIfMigrationNeeded: false,
        onMigration: function (oldRealm, newRealm) {},
      });
    });

    var migrationWasCalled = false;

    // change schema again, but increment schemaVersion
    realm = new Realm({
      schema: schema2,
      deleteRealmIfMigrationNeeded: false,
      schemaVersion: 1,
      onMigration: function (oldRealm, newRealm) {
        migrationWasCalled = true;
      },
    });

    // migration function should get called as deleteRealmIfMigrationNeeded is false
    TestCase.assertEqual(migrationWasCalled, true);

    // object should be there because Realm shouldn't get deleted
    TestCase.assertEqual(realm.objects("TestObject").length, 1);
    realm.close();
  },

  testRealmDeleteRealmIfMigrationNeededIncompatibleConfig: function () {
    const schema = [
      {
        name: "TestObject",
        properties: {
          prop0: "string",
          prop1: "int",
        },
      },
    ];

    TestCase.assertThrows(function () {
      new Realm({ schema: schema, deleteRealmIfMigrationNeeded: true, readOnly: true });
    }, "Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.");

    TestCase.assertThrows(function () {
      new Realm({ schema: schema, deleteRealmIfMigrationNeeded: true, onMigration: function (oldRealm, newRealm) {} });
    }, "Cannot include 'onMigration' when 'deleteRealmIfMigrationNeeded' is set.");
  },

  testDisableFileFormatUpgrade: function () {
    let config = { path: "realm-bundle.realm" };
    if (Realm.exists(config)) {
      Realm.deleteFile(config);
    }
    Realm.copyBundledRealmFiles();
    TestCase.assertTrue(Realm.exists(config));

    TestCase.assertThrowsContaining(() => {
      new Realm({ path: "realm-bundle.realm", disableFormatUpgrade: true });
    }, "The Realm file format must be allowed to be upgraded in order to proceed.");
  },

  // FIXME: We need to test adding a property also calls the listener
  testSchemaUpdatesNewClass: function () {
    let realm1 = new Realm();
    TestCase.assertTrue(realm1.isEmpty);
    TestCase.assertEqual(realm1.schema.length, 0); // empty schema

    const schema = [
      {
        name: "TestObject",
        properties: {
          prop0: "string",
        },
      },
    ];

    return new Promise((resolve, reject) => {
      realm1.addListener("schema", (realm, event, schema) => {
        try {
          TestCase.assertEqual(event, "schema");
          TestCase.assertEqual(schema.length, 1);
          TestCase.assertEqual(realm.schema.length, 1);
          TestCase.assertEqual(schema[0].name, "TestObject");
          TestCase.assertEqual(realm1.schema.length, 1);
          TestCase.assertEqual(realm.schema[0].name, "TestObject");
          setTimeout(resolve, 1);
        } catch (e) {
          setTimeout(() => reject(e), 1);
        }
      });

      let realm2 = new Realm({ schema: schema });
      // Not updated until we return to the event loop and the autorefresh can happen
      TestCase.assertEqual(realm1.schema.length, 0);
      TestCase.assertEqual(realm2.schema.length, 1);

      // give some time to let advance_read to complete
      // in real world, a Realm will not be closed just after its
      // schema has been updated
      setTimeout(() => reject(new Error("Schema change listener was not called")), 15000);
    });
  },

  testCreateTemplateObject: function () {
    var realm = new Realm({
      schema: [schemas.AllTypes, schemas.DefaultValues, schemas.TestObject, schemas.LinkToAllTypes],
    });
    realm.beginTransaction();

    // Test all simple data types
    let template = Realm.createTemplateObject(schemas.AllTypes);
    TestCase.assertEqual(Object.keys(template).length, 7);
    let unmanagedObj = Object.assign(template, { boolCol: true, dataCol: new ArrayBuffer(1) });
    let managedObj = realm.create(schemas.AllTypes.name, unmanagedObj);
    TestCase.assertEqual(managedObj.boolCol, true);

    // Default values
    unmanagedObj = Realm.createTemplateObject(schemas.DefaultValues);
    TestCase.assertEqual(Object.keys(unmanagedObj).length, 10);
    managedObj = realm.create(schemas.DefaultValues.name, unmanagedObj);
    TestCase.assertEqual(managedObj.boolCol, true);
    TestCase.assertEqual(managedObj.intCol, -1);
    TestCase.assertEqualWithTolerance(managedObj.floatCol, -1.1, 0.000001);
    TestCase.assertEqualWithTolerance(managedObj.doubleCol, -1.11, 0.000001);
    TestCase.assertEqual(managedObj.stringCol, "defaultString");
    TestCase.assertEqual(managedObj.dateCol.getTime(), 1);
    TestCase.assertEqual(managedObj.dataCol.byteLength, 1);
    TestCase.assertEqual(managedObj.objectCol.doubleCol, 1);
    TestCase.assertEqual(managedObj.nullObjectCol, null);
    TestCase.assertEqual(managedObj.arrayCol[0].doubleCol, 2);

    realm.close();
  },

  testWriteCopyTo: function () {
    const realm = new Realm({
      schema: [schemas.IntPrimary, schemas.AllTypes, schemas.TestObject, schemas.LinkToAllTypes],
    });

    realm.write(() => {
      realm.create("TestObject", { doubleCol: 1 });
    });
    TestCase.assertEqual(1, realm.objects("TestObject").length);

    TestCase.assertThrowsContaining(() => {
      realm.writeCopyTo();
    }, "Expected value to be an object, got undefined");

    TestCase.assertThrowsContaining(() => {
      realm.writeCopyTo(34);
    }, "Expected value to be an object, got a number");

    // make sure that copies are in the same directory as the original file
    // that is important for running tests on mobile devices,
    // so we don't have issues with permissisons
    const copyName = realm.path + ".copy.realm";

    const copyConfig = { path: copyName };
    realm.writeCopyTo(copyConfig);

    const realmCopy = new Realm(copyConfig);
    TestCase.assertEqual(1, realmCopy.objects("TestObject").length);
    realmCopy.close();

    const encryptedCopyName = realm.path + ".copy-encrypted.realm";

    var encryptionKey = new Int8Array(64);
    for (let i = 0; i < 64; i++) {
      encryptionKey[i] = 1;
    }
    realm.writeCopyTo({ path: encryptedCopyName, encryptionKey });

    const encryptedCopyConfig = { path: encryptedCopyName, encryptionKey: encryptionKey };
    const encryptedRealmCopy = new Realm(encryptedCopyConfig);
    TestCase.assertEqual(1, encryptedRealmCopy.objects("TestObject").length);
    encryptedRealmCopy.close();

    realm.close();
  },

  testObjectWithoutProperties: function () {
    const realm = new Realm({ schema: [schemas.ObjectWithoutProperties] });
    realm.write(() => {
      realm.create(schemas.ObjectWithoutProperties.name, {});
    });
    realm.objects(schemas.ObjectWithoutProperties.name);
    realm.close();
  },

  testDecimal128: function () {
    const realm = new Realm({ schema: [schemas.Decimal128Object] });

    let numbers = [42, 3.1415, 6.022e23, -7, -100.2, 1.02e9];

    numbers.forEach((number) => {
      let d = Decimal128.fromString(number.toString());
      realm.write(() => {
        realm.create(schemas.Decimal128Object.name, { decimal128Col: d });
      });
    });

    let objects = realm.objects(schemas.Decimal128Object.name);
    TestCase.assertEqual(objects.length, numbers.length);

    var d128Col = objects[0].objectSchema().properties.decimal128Col;
    TestCase.assertEqual(d128Col.type, "decimal128");

    for (let i = 0; i < numbers.length; i++) {
      let d128 = objects[i]["decimal128Col"];
      TestCase.assertTrue(d128 instanceof Decimal128);
      TestCase.assertEqual(d128.toString(), numbers[i].toString().toUpperCase());
    }

    realm.close();
  },

  testDecimal128_LargeNumbers: function () {
    const realm = new Realm({ schema: [schemas.Decimal128Object] });
    // Core doesn't support numbers like 9.99e+6143 yet.
    let numbers = ["1.02e+6102", "-1.02e+6102", "1.02e-6102", /*"9.99e+6143",*/ "1e-6142"];

    numbers.forEach((number) => {
      let d = Decimal128.fromString(number);
      realm.write(() => {
        realm.create(schemas.Decimal128Object.name, { decimal128Col: d });
      });
    });

    let objects = realm.objects(schemas.Decimal128Object.name);
    TestCase.assertEqual(objects.length, numbers.length);

    for (let i = 0; i < numbers.length; i++) {
      let d128 = objects[i]["decimal128Col"];
      TestCase.assertTrue(d128 instanceof Decimal128);
      TestCase.assertEqual(d128.toString(), numbers[i].toUpperCase());
    }

    realm.close();
  },

  testObjectId: function () {
    const realm = new Realm({ schema: [schemas.ObjectIdObject] });
    let values = ["0000002a9a7969d24bea4cf2", "0000002a9a7969d24bea4cf3"];
    let oids = [];

    values.forEach((v) => {
      let oid = new ObjectId(v);
      realm.write(() => {
        realm.create(schemas.ObjectIdObject.name, { id: oid });
      });
      oids.push(oid);
    });

    let objects = realm.objects(schemas.ObjectIdObject.name);
    TestCase.assertEqual(objects.length, values.length);

    var idCol = objects[0].objectSchema().properties.id;
    TestCase.assertEqual(idCol.type, "objectId");

    for (let i = 0; i < values.length; i++) {
      let oid2 = objects[i]["id"];
      TestCase.assertTrue(oid2 instanceof ObjectId, "instanceof");
      TestCase.assertTrue(oids[i].equals(oid2), "equal");
      TestCase.assertEqual(oid2.toHexString(), oids[i].toHexString());
    }

    realm.close();
  },

  testObjectIdFromTimestamp: function () {
    const realm = new Realm({ schema: [schemas.ObjectIdObject] });
    let values = [1, 1000000000, 2000000000];
    let oids = [];

    values.forEach((v) => {
      let oid = ObjectId.createFromTime(v);
      realm.write(() => {
        realm.create(schemas.ObjectIdObject.name, { id: oid });
      });
      oids.push(oid);
    });

    let objects = realm.objects(schemas.ObjectIdObject.name);
    TestCase.assertEqual(objects.length, values.length);

    for (let i = 0; i < values.length; i++) {
      let oid2 = objects[i]["id"];
      TestCase.assertTrue(oid2 instanceof ObjectId, "instaceof");
      TestCase.assertTrue(oids[i].equals(oid2), "equal");
      TestCase.assertEqual(oid2.toHexString(), oids[i].toHexString());
      TestCase.assertEqual(oid2.getTimestamp().toISOString(), oids[i].getTimestamp().toISOString());
    }

    realm.close();
  },

  // TODO: Cleanup debugging logs.
  testUUIDAutogenerated: function () {
    const realm = new Realm({ schema: [schemas.UUIDObject] });
    // Check schema
    TestCase.assertEqual(realm.schema.length, 1);
    TestCase.assertEqual(realm.schema[0].properties["id"].type, "uuid");

    // Auto-generate checks
    const uuid = new UUID();
    realm.write(() => {
      realm.create(schemas.UUIDObject.name, { id: uuid });
    });

    TestCase.assertEqual(realm.objects(schemas.UUIDObject.name).length, 1);
    const obj = realm.objects(schemas.UUIDObject.name)[0];

    TestCase.assertTrue(obj.id instanceof UUID, "Roundtrip data is instance of UUID.");
    TestCase.assertTrue(obj.id.equals(uuid), "Roundtrip data UUID instance 'equal' compare.");
    TestCase.assertTrue(UUID.isValid(obj.id.toString()), "Stringified format conforms to required format.");

    // "cleanup"
    realm.close();
  },

  testUUIDPredefined: function () {
    const realm = new Realm({ schema: [schemas.UUIDObject] });
    // Check schema
    TestCase.assertEqual(realm.schema.length, 1);
    TestCase.assertEqual(realm.schema[0].properties["id"].type, "uuid");

    // Predefined uuid checks
    const uuidStr = "af4f40c0-e833-4ab1-b026-484cdeadd782";
    const uuid = new UUID(uuidStr);
    realm.write(() => {
      realm.create(schemas.UUIDObject.name, { id: uuid });
    });

    TestCase.assertEqual(realm.objects(schemas.UUIDObject.name).length, 1);
    const obj = realm.objects(schemas.UUIDObject.name)[0];

    TestCase.assertTrue(obj.id instanceof UUID, "Roundtrip data is instance of UUID.");
    TestCase.assertTrue(obj.id.equals(uuid), "Roundtrip data UUID instance 'equal' compare.");
    TestCase.assertEqual(obj.id.toString(), uuidStr, "Roundtrip string representation equals predefined input string.");

    // "cleanup"
    realm.close();
  },

  testUUIDPkSingleQuery: function () {
    const realm = new Realm({ schema: [schemas.UUIDPkObject] });

    const uuidStr = "188a7e3b-26d4-44ba-91e2-844c1c73a963";
    const uuid = new UUID(uuidStr);
    realm.write(() => {
      realm.create(schemas.UUIDObject.name, { _id: uuid });
    });
    const obj = realm.objectForPrimaryKey(schemas.UUIDPkObject.name, uuid);
    TestCase.assertDefined(obj, `Object not found for PK "${uuidStr}".`);
    TestCase.assertTrue(obj._id instanceof UUID, "Objects PK is instance of UUID.");
    TestCase.assertEqual(
      obj._id.toString(),
      uuidStr,
      "Roundtrip string representation equals predefined input string.",
    );

    // "cleanup"
    realm.close();
  },

  testExpandEmbeddedObjectSchemas: function () {
    const realm = new Realm({ schema: schemas.EmbeddedObjectSchemas });

    const schema = realm.schema;

    TestCase.assertArrayLength(schema, 4);

    let tableNames = [];
    schema.forEach((os) => tableNames.push(os.name));
    tableNames.sort();
    TestCase.assertArraysEqual(tableNames, ["Car", "Cat", "Dog", "Person"]);

    schema.forEach((os) => {
      switch (os.name) {
        case "Car":
          TestCase.assertFalse(os.embedded);
          TestCase.assertEqual(os.primaryKey, "id");
          break;
        case "Cat":
          TestCase.assertTrue(os.embedded);
          TestCase.assertUndefined(os.primaryKey);
          break;
        case "Dog":
          TestCase.assertTrue(os.embedded);
          TestCase.assertUndefined(os.primaryKey);
          break;
        case "Person":
          TestCase.assertFalse(os.embedded);
          TestCase.assertUndefined(os.primaryKey);
          break;
      }
    });

    realm.close();
  },
};
