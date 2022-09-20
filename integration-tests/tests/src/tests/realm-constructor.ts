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

import { IPerson, PersonSchema, DogSchema } from "../schemas/person-and-dogs";

class TestObject extends Realm.Object {
  doubleCol!: number;
  static schema: Realm.ObjectSchema = {
    name: "TestObject",
    properties: {
      doubleCol: "double",
    },
  };
}

const pathSeparator = "/";

describe("Realm#constructor", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  it("is a function", () => {
    expect(Realm).to.be.a("function");
    expect(Realm instanceof Function).to.equal(true);
  });

  it("creates a Realm instance with default path", () => {
    const realm = new Realm();
    expect(realm instanceof Realm).to.equal(true);
    expect(realm.path).to.equal(Realm.defaultPath);
  });

  it("creates a Realm instance with custom path", () => {
    const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
    const testPath = "test1.realm";
    const realm = new Realm({ schema: [], path: testPath });
    expect(realm.path).equals(defaultDir + testPath);

    const testPath2 = "test2.realm";
    const realm2 = new Realm({ schema: [], path: testPath2 });
    expect(realm2.path).equals(defaultDir + testPath2);
  });

  it("creates a Realm instance with an empty schema", () => {
    const realm = new Realm({ schema: [] });
    expect(realm instanceof Realm).to.equal(true);
    expect(realm.schema).deep.equals([]);
  });

  it("creates multiple Realm files when called with a non-empty string", async () => {
    // Opening a file at at relative path
    const realm1 = new Realm("temporary-1.realm");
    // Expect an instance of Realm
    expect(realm1 instanceof Realm).to.equal(true);
    // Expect the file to be created
    const fileExists = await fs.exists(realm1.path);
    expect(fileExists).to.equal(true);
    // Expect that the path is in the default path
    const defaultPathDir = path.dirname(Realm.defaultPath);
    expect(realm1.path).to.equal(path.resolve(defaultPathDir, "temporary-1.realm"));
    // Open another Realm as well
    const realm2 = new Realm("temporary-2.realm");
    expect(realm2.path).to.equal(path.resolve(defaultPathDir, "temporary-2.realm"));
  });

  it("picks up overriden default path", () => {
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

  it("can set fifoFallbackPath property", () => {
    // Object Store already tests the fallback logic
    // So this is just a smoke test to ensure that setting the property from JS doesn't actually crash anything.
    const defaultDir = Realm.defaultPath.substring(0, Realm.defaultPath.lastIndexOf(pathSeparator) + 1);
    const realm = new Realm({ fifoFilesFallbackPath: defaultDir });
  });

  describe("called with invalid arguments", () => {
    it("throws when called with an empty string", () => {
      expect(() => {
        new Realm("");
      }).to.throw(); // The actual message varies across environments
    });
  });

  describe("opening, closing and re-opening", () => {
    it("changes the isClosed boolean", () => {
      // Open the Realm
      const realm = new Realm({ schema: [] });
      expect(realm.isClosed).to.equal(false);
      // Close it
      realm.close();
      expect(realm.isClosed).to.equal(true);
      // Re-open it
      const reopenedRealm = new Realm({ schema: [] });
      expect(reopenedRealm.isClosed).to.equal(false);
      // The first Realm instance is still considered closed
      expect(realm.isClosed).to.equal(true);
    });

    it("data is preserved when reopening realm instance", () => {
      // constructing realm with same path returns the same instance
      let realm = new Realm({ schema: [TestObject] });
      realm.write(() => {
        realm.create(TestObject.schema.name, [1]);
      });
      realm.close();

      realm = new Realm();
      const objects = realm.objects<TestObject>(TestObject.schema.name);
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
    });
  });

  describe("schema version", () => {
    it("initiates with schema version 0", () => {
      const realm = new Realm({ schema: [] });
      expect(realm.schemaVersion).to.equal(0);
      expect(new Realm().schemaVersion).equals(0);
      expect(new Realm({ schemaVersion: 0 }).schemaVersion).equals(0);
    });

    it("can reopen with the same version", () => {
      // Open it ...
      const realm = new Realm({ schema: [], schemaVersion: 0 });
      expect(realm.schemaVersion).to.equal(0);
      // Re-open with same version
      const reopenedRealm = new Realm({ schema: [], schemaVersion: 0 });
      expect(reopenedRealm.schemaVersion).to.equal(0);
    });

    it("can close and reopen with different versions", () => {
      // Open it ...
      const realm0 = new Realm({ schema: [], schemaVersion: 0 });
      expect(realm0.schemaVersion).to.equal(0);
      expect(realm0.schema).deep.equals([]);
      realm0.close();
      // Re-open with a different version
      const realm1 = new Realm({ schema: [], schemaVersion: 1 });
      expect(realm1.schemaVersion).to.equal(1);
      expect(realm1.schema.length).to.equal(0);
      realm1.close();
      // Re-open with a different version
      const realm2 = new Realm({
        schema: [PersonSchema, DogSchema],
        schemaVersion: 2,
      });
      expect(realm2.schemaVersion).to.equal(2);
      expect(realm2.schema.length).to.equal(2);
      // Add an object, using the schema
      realm2.write(() => {
        realm2.create<IPerson>("Person", { name: "John Doe", age: 42 });
      });
      // Expect an object
      const persons = realm2.objects<IPerson>("Person");
      expect(persons.length).to.equal(1);
      expect(persons[0].name).to.equal("John Doe");
      expect(persons[0].age).to.equal(42);
    });

    it("throws if version is bumped while open", () => {
      // Open it ...
      const realm = new Realm({ schema: [] });
      expect(realm.schemaVersion).to.equal(0);
      expect(() => {
        // Re-open with a different version
        new Realm({ schema: [], schemaVersion: 1 });
      }).to.throw("already opened with different schema version");
    });
  });

  describe("re-opening without a schema", () => {
    it("has the same schema as before", () => {
      // Open the Realm with a schema
      const realm = new Realm({ schema: [PersonSchema, DogSchema] });
      realm.close();
      // Re-open it without a schema
      const reopenedRealm = new Realm();
      // Expect the schemas to match
      expect(reopenedRealm.schema.length).to.equal(2);
      expect(reopenedRealm.schema).deep.equals(realm.schema);
    });
  });

  describe("schema validation", () => {
    it("fails when passed an object", () => {
      expect(() => {
        //@ts-expect-error passing plain empty object to schema
        new Realm({ schema: {} });
      }).throws("schema must be of type 'array', got");
    });

    it("fails when passed an array with non-objects", () => {
      expect(() => {
        //@ts-expect-error can not pass plain string as schema
        new Realm({ schema: [""] });
      }).throws("Failed to read ObjectSchema: JS value must be of type 'object', got");
    });

    it("fails when passed an array with empty object", () => {
      expect(() => {
        //@ts-expect-error passing array of empty object
        new Realm({ schema: [{}] });
      }).throws("Failed to read ObjectSchema: name must be of type 'string', got ");
    });

    it("fails when passed an array with an object without 'properties'", () => {
      expect(() => {
        //@ts-expect-error object without properties
        new Realm({ schema: [{ name: "SomeObject" }] });
      }).throws("Failed to read ObjectSchema: properties must be of type 'object', got ");
    });

    it("fails when passed an array with an object without 'name'", () => {
      expect(() => {
        //@ts-expect-error object without name
        new Realm({ schema: [{ properties: {} }] });
      }).throws("Failed to read ObjectSchema: name must be of type 'string', got ");
    });

    function expectInvalidProperty(badProperty: Realm.PropertyType | Realm.ObjectSchemaProperty, message: string) {
      expect(() => {
        new Realm({
          schema: [
            {
              name: "InvalidObject",
              properties: {
                another: "AnotherObject",
                bad: badProperty,
                nummeric: "int",
              },
            },
            { name: "AnotherObject", properties: {} },
          ],
        });
      }).throws(message);
    }

    it("fails when asking for a list of lists", () => {
      expectInvalidProperty(
        { type: "list[]", objectType: "InvalidObject" },
        "List property 'InvalidObject.bad' must have a non-list value type",
      );
    });

    it("fails when asking for an optional list", () => {
      expectInvalidProperty(
        { type: "list?", objectType: "InvalidObject" },
        "List property 'InvalidObject.bad' cannot be optional",
      );
    });

    it("fails when asking for an empty type string", () => {
      expectInvalidProperty("", "Property 'InvalidObject.bad' must have a non-empty type");
    });

    it("fails when asking for linkingObjects to a non-existing property", () => {
      expectInvalidProperty(
        {
          objectType: "InvalidObject",
          property: "nosuchproperty",
          type: "linkingObjects",
        },
        "Property 'InvalidObject.nosuchproperty' declared as origin of linking objects property 'InvalidObject.bad' does not exist",
      );
    });

    it("fails when asking for linkingObjects to a non-link property", () => {
      expectInvalidProperty(
        {
          objectType: "InvalidObject",
          property: "nummeric",
          type: "linkingObjects",
        },
        "Property 'InvalidObject.nummeric' declared as origin of linking objects property 'InvalidObject.bad' is not a link",
      );
    });

    it("fails when asking for linkingObjects to a property linking elsewhere", () => {
      expectInvalidProperty(
        {
          objectType: "InvalidObject",
          property: "another",
          type: "linkingObjects",
        },
        "Property 'InvalidObject.another' declared as origin of linking objects property 'InvalidObject.bad' links to type 'AnotherObject'",
      );
    });

    it("allows list of objects with objectType defined", () => {
      new Realm({
        schema: [
          {
            name: "SomeObject",
            properties: {
              myObjects: {
                objectType: "SomeObject",
                type: "object[]",
              },
            },
          },
        ],
      });
    });
  });

  describe("in memory construction", () => {
    it("data is shared among instances", () => {
      // open in-memory realm instance
      const realm1 = new Realm({ inMemory: true, schema: [TestObject] });
      realm1.write(() => {
        realm1.create("TestObject", [1]);
      });
      //@ts-expect-error TYPEBUG: isInMemory property does not exist
      expect(realm1.isInMemory).to.be.true;

      // open a second instance of the same realm and check that they share data
      const realm2 = new Realm({ inMemory: true });
      const objects = realm2.objects<TestObject>(TestObject.schema.name);
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
      //@ts-expect-error TYPEBUG: isInMemory property does not exist
      expect(realm2.isInMemory).equals(true);

      realm1.close();
      realm2.close();
    });

    it("closing instance deletes data", () => {
      // open in-memory realm instance
      const realm1 = new Realm({ inMemory: true, schema: [TestObject] });
      realm1.write(() => {
        realm1.create("TestObject", [1]);
      });
      //@ts-expect-error TYPEBUG: isInMemory property does not exist
      expect(realm1.isInMemory).to.be.true;
      // Close realm (this should delete the realm since there are no more
      // references to it).
      realm1.close();
      // Open the same in-memory realm again and verify that it is now empty
      const realm2 = new Realm({ inMemory: true });
      expect(realm2.schema.length).equals(0);

      realm2.close();
    });

    it("throws when opening in-memory realm in persistent mode", () => {
      const realm = new Realm({ inMemory: true, schema: [TestObject] });
      // try to open the same realm in persistent mode (should fail as you cannot mix modes)
      expect(() => new Realm({})).throws("already opened with different inMemory settings.");
    });
  });

  describe("constructing with readonly property set", () => {
    it("throws when write transaction is started", () => {
      //seed data
      let realm = new Realm({ schema: [TestObject] });
      realm.write(() => {
        realm.create(TestObject.schema.name, [1]);
      });
      expect(realm.isReadOnly).to.be.false;
      realm.close();

      // open same realm instance with readOnly mode
      realm = new Realm({ readOnly: true });
      expect(realm.schema.length).equals(1);
      const objects = realm.objects<TestObject>(TestObject.schema.name);
      expect(objects.length).equals(1);
      expect(objects[0].doubleCol).equals(1.0);
      expect(realm.isReadOnly).equals(true);

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(() => realm.write(() => {})).throws("Can't perform transactions on read-only Realms.");
      realm.close();
    });
  });
});
