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

import { PersonSchema, DogSchema } from "../schemas/person-and-dogs";

describe("realm._updateSchema", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  it("is a function", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    expect(realm.schema).to.be.an("array");
    // There is a function defined on the Realm
    expect(realm._updateSchema).to.be.a("function");
    // Expect no enumerable field on the schema property
    expect(Object.keys(realm.schema)).to.not.contain("update");
    // TODO: This function gets put on the schema to
    // expect(realm.schema.update).to.be.a("function");
  });

  it("creates a class schema from a name", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    realm.write(() => {
      realm._updateSchema([...realm.schema, { name: "MyClass", properties: {} }]);
    });
    const classNames = realm.schema.map((s) => s.name);
    expect(classNames).to.contain("MyClass");
  });

  it("creates a class schema from a name and properties", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    realm.write(() => {
      realm._updateSchema([...realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
    });
    const MyClassSchema = realm.schema.find((s) => s.name === "MyClass");
    expect(MyClassSchema).deep.equals({
      name: "MyClass",
      constructor: undefined,
      asymmetric: false,
      embedded: false,
      properties: {
        myField: {
          indexed: false,
          mapTo: "myField",
          name: "myField",
          optional: false,
          type: "string",
        },
      },
    });
  });

  it("creates a property on an existing class", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    // Copy the schema
    const updatedSchema: Realm.ObjectSchema[] = [...realm.schema];
    // Locate the Dog schema
    const dogSchema = updatedSchema.find((s) => s.name === "Dog");
    if (!dogSchema) throw new Error("Schema not found");

    // Add a fields property
    dogSchema.properties.friends = "Dog[]";
    // Update the schema
    realm.write(() => {
      realm._updateSchema(updatedSchema);
    });

    const ModifiedDogSchema = realm.schema.find((s) => s.name === "Dog");
    expect(ModifiedDogSchema).deep.equals({
      name: "Dog",
      constructor: undefined,
      asymmetric: false,
      embedded: false,
      properties: {
        age: {
          indexed: false,
          mapTo: "age",
          name: "age",
          optional: false,
          type: "int",
        },
        friends: {
          indexed: false,
          mapTo: "friends",
          name: "friends",
          objectType: "Dog",
          optional: false,
          type: "list",
        },
        name: {
          indexed: false,
          mapTo: "name",
          name: "name",
          optional: false,
          type: "string",
        },
        owner: {
          indexed: false,
          mapTo: "owner",
          name: "owner",
          objectType: "Person",
          optional: true,
          type: "object",
        },
      },
    });
  });

  it("can use a newly added class", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    realm.write(() => {
      realm._updateSchema([...realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
      type MyClass = { myField: string };
      realm.create("MyClass", { myField: "some string" });
      const myClassObjects = realm.objects<MyClass>("MyClass");
      expect(myClassObjects).to.be.of.length(1);
      expect(myClassObjects[0].myField).to.equal("some string");
    });
  });

  it("fires the schema change event", (done) => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    realm.addListener("schema", () => {
      expect(realm.schema).to.have.length(3);
      const objectSchemaNames = realm.schema.map((s) => s.name);
      expect(objectSchemaNames).to.contain("MyClass");
      done();
    });

    realm.write(() => {
      realm._updateSchema([...realm.schema, { name: "MyClass", properties: { myField: "string" } }]);
    });
  });

  it("throws if creating a class schema outside of a transaction", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    expect(() => {
      realm._updateSchema([...realm.schema, { name: "MyClass", properties: {} }]);
    }).to.throw("Can only create object schema within a transaction.");
  });

  it("throws if asked to create a class that already exists", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    expect(() => {
      realm.write(() => {
        realm._updateSchema([...realm.schema, { name: "Person", properties: {} }]);
      });
    }).to.throw("Type 'Person' appears more than once in the schema.");
  });

  it("throws if called without a schema object", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    expect(() => {
      realm.write(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (realm as any)._updateSchema();
      });
    }).to.throw("Expected 'schema' to be an array, got undefined");
  });

  it("throws if called with an unexpected type", () => {
    const realm = new Realm({ schema: [PersonSchema, DogSchema] });
    expect(() => {
      realm.write(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (realm as any)._updateSchema("w00t");
      });
    }).to.throw("Expected 'schema' to be an array, got a string");
  });
});
