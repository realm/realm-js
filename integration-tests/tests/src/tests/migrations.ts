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
import Realm from "realm";
import { expect } from "chai";
import { DogSchema, IDog, IPerson, PersonSchema } from "../schemas/person-and-dogs";

const TestSchema = {
  name: "Test",
  properties: {
    prop0: "string",
    prop1: "int",
  },
};
interface Test {
  prop0: string;
  prop1: number;
}
interface TestWithNewProperty extends Test {
  prop2: string;
}

describe("Migrations", () => {
  describe("onMigration", () => {
    let count = 0;
    before(Realm.clearTestState);
    beforeEach(() => (count = 0));

    function migrationFunction(oldRealm: Realm, newRealm: Realm) {
      expect(oldRealm.schemaVersion).equals(0);
      expect(newRealm.schemaVersion).equals(1);
      count++;
    }

    it("should not run in the start", () => {
      const realm = new Realm({ schema: [], onMigration: migrationFunction });
      expect(count).equals(0);
      realm.close();
    });

    it("should run with schema changes", () => {
      const realm = new Realm({
        schema: [TestSchema],
        onMigration: migrationFunction,
        schemaVersion: 1,
      });
      expect(count).equals(1);
      realm.close();
    });

    it("should not run without schema changes", () => {
      // migration function shouldn't run if nothing changes
      const realm = new Realm({
        schema: [TestSchema],
        onMigration: migrationFunction,
        schemaVersion: 1,
      });
      expect(count).equals(0);
      realm.close();
    });

    it("should run if only schemaVersion changes", () => {
      const realm = new Realm({
        schema: [TestSchema],
        onMigration: () => {
          count++;
        },
        schemaVersion: 2,
      });
      expect(count).equals(1);
      realm.close();
    });

    it("should throw with invalid migration function", () => {
      expect(function () {
        //@ts-expect-error This is an invalid function.
        new Realm({ schema: [], schemaVersion: 2, onMigration: "invalid", inMemory: true });
      }).throws("onMigration must be of type 'function'");
    });

    it("should propogate exceptions", () => {
      const exception = new Error("expected exception");
      let realm: Realm | undefined = undefined;
      expect(function () {
        realm = new Realm({
          schema: [],
          schemaVersion: 3,
          onMigration: function () {
            throw exception;
          },
        });
      }).throws("expected exception");
      expect(realm).equals(undefined);
      expect(Realm.schemaVersion(Realm.defaultPath)).equals(2);
    });
  });

  describe("Data migration", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });
    it("should work with renamed properties", () => {
      interface TestWithRenamedProperty {
        renamed: string;
        prop1: number;
      }
      const TestWithRenamedPropertySchema = {
        ...TestSchema,
        properties: {
          renamed: TestSchema.properties.prop0,
          prop1: TestSchema.properties.prop1,
        },
      };
      const realm = new Realm({
        schema: [TestSchema],
      });
      realm.write(function () {
        realm.create<Test>("Test", { prop0: "stringValue", prop1: 1 });
      });
      realm.close();

      const migratedRealm = new Realm({
        schema: [TestWithRenamedPropertySchema],
        schemaVersion: 1,
        onMigration: (oldRealm, newRealm) => {
          const oldObjects = oldRealm.objects<Test>("Test");
          const newObjects = newRealm.objects<TestWithRenamedProperty>("Test");
          expect(oldObjects.length).equals(1);
          expect(newObjects.length).equals(1);

          expect(oldObjects[0].prop0).equals("stringValue");
          expect(oldObjects[0].prop1).equals(1);
          //@ts-expect-error Should not have this field.
          expect(oldObjects[0].renamed).equals(undefined);

          //@ts-expect-error Should not have this field.
          expect(newObjects[0].prop0).equals(undefined);
          expect(newObjects[0].renamed).equals("");
          expect(newObjects[0].prop1).equals(1);

          newObjects[0].renamed = oldObjects[0].prop0;

          expect(function () {
            oldRealm.write(() => (oldObjects[0].prop0 = "throws"));
          }).throws("Can't perform transactions on read-only Realms.");
        },
      });

      const objects = migratedRealm.objects<TestWithRenamedProperty>("Test");
      expect(objects.length).equals(1);
      expect(objects[0].renamed).equals("stringValue");
      expect(objects[0].prop1).equals(1);
      //@ts-expect-error Should not have this field.
      expect(objects[0].prop0).equals(undefined);
    });

    it("should be able to create objects with added properties", () => {
      const SecondTestSchema = {
        name: "SecondTest",
        properties: {
          ...TestSchema.properties,
          prop2: "int",
        },
      };

      const realmA = new Realm({ schema: [TestSchema], schemaVersion: 0 });
      realmA.write(function () {
        realmA.create("Test", ["stringValue", 1]);
      });
      realmA.close();

      const realmB = new Realm({
        schema: [TestSchema, SecondTestSchema],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          const oldObjects_1 = oldRealm.objects<Test>("Test");
          const newObjects_1 = newRealm.objects<Test>("Test");
          const newObjects_2 = newRealm.objects<TestWithNewProperty>("SecondTest");

          expect(oldObjects_1.length).equals(1);
          expect(newObjects_1.length).equals(1);
          expect(newObjects_2.length).equals(0);

          newRealm.create("SecondTest", {
            prop0: oldObjects_1[0].prop0,
            prop1: oldObjects_1[0].prop1,
            prop2: 42,
          });
        },
      });
      const objects_1 = realmB.objects<Test>("Test");
      const objects_2 = realmB.objects<TestWithNewProperty>("SecondTest");
      expect(objects_1.length).equals(1);
      expect(objects_1[0].prop1).equals(1);
      expect(objects_2.length).equals(1);
      expect(objects_2[0].prop1).equals(1);
      expect(objects_2[0].prop2).equals(42);
    });
    it("should be able to add optional new properties", () => {
      const TestSchemaWithOptionalNewProperty = {
        ...TestSchema,
        properties: {
          ...TestSchema.properties,
          prop2: { type: "string", optional: true },
        },
      };

      const realm = new Realm({
        schemaVersion: 0,
        schema: [TestSchema],
      });
      realm.write(() => {
        realm.create("Test", { prop0: "Fred Bloggs", prop1: 1 });
      });
      realm.close();

      const migratedRealm = new Realm({
        schemaVersion: 1,
        schema: [TestSchemaWithOptionalNewProperty],
        onMigration: (oldRealm, newRealm) => {
          newRealm.create("Test", { prop0: "Freddy Bloggson", prop1: 1, prop2: "Freddy" });
          newRealm.create("Test", { prop0: "Blogs Fredson", prop1: 2 });
        },
      });

      migratedRealm.write(() => {
        migratedRealm.create("Test", { prop0: "Bloggy Freddy", prop1: 1 });
      });

      const objs = migratedRealm.objects<TestWithNewProperty>("Test");
      expect(objs.length).equals(4);

      expect(objs[0].prop0).equals("Fred Bloggs");
      expect(objs[0].prop1).equals(1);
      expect(objs[0].prop2).equals(null);

      expect(objs[1].prop0).equals("Freddy Bloggson");
      expect(objs[0].prop1).equals(1);
      expect(objs[1].prop2).equals("Freddy");

      migratedRealm.close();
    });
  });
  describe("Schemas", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });
    it("should change during migration", () => {
      const realm = new Realm({
        schema: [
          {
            name: "Test",
            properties: {
              prop0: "string",
              prop1: "int",
            },
          },
        ],
      });
      realm.close();

      const migratedRealm = new Realm({
        schema: [
          {
            name: "Test",
            properties: {
              renamed: "string",
              prop1: "int",
            },
          },
        ],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          const oldSchema = oldRealm.schema;
          const newSchema = newRealm.schema;
          expect(oldSchema.length).equals(1);
          expect(newSchema.length).equals(1);

          expect(oldSchema[0].name).equals("Test");
          expect(newSchema[0].name).equals("Test");

          expect(oldSchema[0].properties.prop0.type).equals("string");
          expect(newSchema[0].properties.prop0).equals(undefined);

          expect(oldSchema[0].properties.prop1.type).equals("int");
          expect(newSchema[0].properties.prop1.type).equals("int");

          expect(oldSchema[0].properties.renamed).equals(undefined);
          expect(newSchema[0].properties.renamed.type).equals("string");
        },
      });
      migratedRealm.close();
    });
  });

  describe("Deleting models", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    let realm: Realm;
    beforeEach(() => {
      realm = new Realm({ schema: [TestSchema] });

      realm.write(function () {
        realm.create("Test", ["stringValue", 1]);
      });

      realm.close();
    });

    it("should removing schemas from configuration correctly", () => {
      realm = new Realm({ schema: [], schemaVersion: 1 });
      expect(realm.schema.length).equals(0); // no models
      realm.close(); // this won't delete the model

      realm = new Realm({ schema: [TestSchema], schemaVersion: 2 });
      expect(realm.objects("Test").length).equals(1); // the model objects are still there
      realm.close();

      // now delete the model explicitly, which should delete the objects too
      realm = new Realm({
        schema: [],
        schemaVersion: 3,
        onMigration: function (oldRealm, newRealm) {
          newRealm.deleteModel("Test");
        },
      });

      expect(realm.schema.length).equals(0); // no models

      realm.close();

      realm = new Realm({ schema: [TestSchema], schemaVersion: 4 });

      expect(realm.objects("Test").length).equals(0);

      realm.close();
    });

    it("should handle deleteModel correctly", () => {
      // now delete the model explicitly, but it should remain as it's still in the schema
      // only the rows should get deleted
      realm = new Realm({
        schema: [TestSchema],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          newRealm.deleteModel("Test");
        },
      });

      expect(realm.schema.length).equals(1); // model should remain
      expect(realm.objects("Test").length).equals(0); // objects should be gone

      realm.close();

      realm = new Realm({ schema: [TestSchema], schemaVersion: 2 });
      expect(realm.objects("Test").length).equals(0);

      realm.close();
    });
    it("should ignore deleteModel with non-existing models", () => {
      realm = new Realm({
        schema: [TestSchema],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          newRealm.deleteModel("NonExistingModel");
        },
      });

      realm.close();

      realm = new Realm({ schema: [TestSchema], schemaVersion: 2 });
      expect(realm.objects("Test").length).equals(1);

      realm.close();
    });
  });

  describe("Delete model with relationships", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    const PersonWithDogsSchema = {
      ...PersonSchema,
      properties: {
        ...PersonSchema.properties,
        dogs: {
          type: "linkingObjects",
          objectType: "Dog",
          property: "owner",
        },
      },
    };

    it("should work correctly", () => {
      let realm = new Realm({ schema: [PersonWithDogsSchema, DogSchema] });

      realm.write(function () {
        const owner = realm.create<IPerson>("Person", { name: "John Doe", age: 10 });
        realm.create<IDog>("Dog", {
          name: "My Dog",
          owner: owner,
          age: 5,
        });
      });

      expect(realm.objects("Person").length).equals(1);
      expect(realm.objects("Dog").length).equals(1);
      expect(realm.objects<IDog>("Dog")[0].owner.name).equals("John Doe");
      expect(realm.objects<IPerson>("Person")[0].dogs[0].name).equals("My Dog");

      realm.close();

      realm = new Realm({
        schema: [DogSchema, PersonSchema],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          expect(() => {
            // Deleting a model which is target of linkingObjects results in an exception
            newRealm.deleteModel("Person");
          }).throws("Table is target of cross-table link columns");
        },
      });

      expect(realm.objects("Person").length).equals(1);
      expect(realm.objects("Dog").length).equals(1);

      realm.close();

      realm = new Realm({
        schema: [DogSchema, PersonSchema],
        schemaVersion: 2,
        onMigration: function (oldRealm, newRealm) {
          // deleting a model which isn't target of linkingObjects works fine
          newRealm.deleteModel("Dog");
        },
      });

      expect(realm.objects("Person").length).equals(1);
      expect(realm.objects("Dog").length).equals(0);
      expect(realm.objects<IPerson>("Person")[0].dogs).equals(undefined);

      realm.close();
    });
  });

  describe("Migrating to list of ints", () => {
    beforeEach(() => {
      Realm.clearTestState();
    });

    interface IntObject {
      value: number;
    }
    interface IntHolder {
      values: IntObject[];
    }
    interface UpdatedIntHolder {
      values: number[];
    }
    it("should work", () => {
      let realm = new Realm({
        schema: [
          { name: "IntHolder", properties: { values: "IntObject[]" } },
          { name: "IntObject", properties: { value: "int" } },
        ],
      });
      realm.write(function () {
        realm.create("IntHolder", { values: [{ value: 1 }, { value: 2 }, { value: 3 }] });
        realm.create("IntHolder", { values: [{ value: 1 }, { value: 4 }, { value: 5 }] });
      });
      realm.close();

      realm = new Realm({
        schema: [{ name: "IntHolder", properties: { values: "int[]" } }],
        schemaVersion: 1,
        onMigration: function (oldRealm, newRealm) {
          const oldObjects = oldRealm.objects<IntHolder>("IntHolder");
          const newObjects = newRealm.objects<UpdatedIntHolder>("IntHolder");
          expect(oldObjects.length).equals(2);
          expect(newObjects.length).equals(2);

          for (let i = 0; i < oldObjects.length; ++i) {
            expect(oldObjects[i].values.length).equals(3);
            expect(newObjects[i].values.length).equals(0);
            newObjects[i].values = oldObjects[i].values.map((o) => o.value);
            expect(newObjects[i].values.length).equals(3);
          }
          newRealm.deleteModel("IntObject");
        },
      });

      const objects = realm.objects<UpdatedIntHolder>("IntHolder");
      expect(objects.length).equals(2);
      expect(objects[0].values.length).equals(3);
      expect(objects[1].values.length).equals(3);
      expect(objects[0].values[0]).equals(1);
      expect(objects[0].values[1]).equals(2);
      expect(objects[0].values[2]).equals(3);
      expect(objects[1].values[0]).equals(1);
      expect(objects[1].values[1]).equals(4);
      expect(objects[1].values[2]).equals(5);
    });
  });
});
