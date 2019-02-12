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

const { expect } = require("chai");

const PersonAndDogsSchema = require("./schemas/person-and-dogs");

describe("Realm._createObjectSchema", () => {
    it("is a function", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(realm.schema).to.be.an("array");
        // Expect a non-enumerable field
        expect(Object.keys(realm.schema)).to.not.contain("createClass");
        // There is a function defined on the Realm
        expect(realm._createObjectSchema).to.be.a("function");
        // TODO: This function gets put on the schema to
        // expect(realm.schema.createObjectSchema).to.be.a("function");
    });

    it("creates a class schema from a name", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        realm.write(() => {
            realm._createObjectSchema("MyClass");
        });
        const classNames = realm.schema.map(s => s.name);
        expect(classNames).to.contain("MyClass");
    });

    it("creates a class schema from a name and properties", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        realm.write(() => {
            realm._createObjectSchema("MyClass", { myField: "string" });
        });
        const MyClassSchema = realm.schema.find(s => s.name === "MyClass");
        expect(MyClassSchema).to.deep.equal({
            name: "MyClass",
            properties: {
                myField: {
                    type: "string",
                    indexed: false,
                    name: "myField",
                    optional: false,
                },
            },
        });
    });

    it("throws if creating a class schema outside of a transaction", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm._createObjectSchema("MyClass");
        }).to.throw("Can only create object schema within a transaction.");
    });

    it("throws if asked to create a class that already exists", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm.write(() => {
                realm._createObjectSchema("Person");
            });
        }).to.throw("Another object schema named 'Person' already exists");
    });
});

describe("Realm._createObjectSchemaProperty", () => {
    it("is a function", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        // There is a function defined on the Realm
        expect(realm._createObjectSchemaProperty).to.be.a("function");
    });

    it("creates a property from a name and string type", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        realm.write(() => {
            realm._createObjectSchemaProperty("Person", "nickname", "string?");
        });
        const personClass = realm.schema.find(s => s.name === "Person");
        expect(personClass.properties.nickname).to.deep.equal({
            indexed: false,
            name: "nickname",
            optional: true,
            type: "string",
        });
    });

    it("creates a property from a name and an object type", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        realm.write(() => {
            realm._createObjectSchemaProperty("Person", "alterEgo", "Person");
        });
        const personClass = realm.schema.find(s => s.name === "Person");
        expect(personClass.properties.alterEgo).to.deep.equal({
            indexed: false,
            name: "alterEgo",
            optional: true,
            type: "object",
            objectType: "Person",
        });
    });

    it("creates a property from a name and an object", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        realm.write(() => {
            realm._createObjectSchemaProperty("Person", "ages", {
                type: "int[]",
                optional: false,
            });
        });
        const personClass = realm.schema.find(s => s.name === "Person");
        expect(personClass.properties.ages).to.deep.equal({
            indexed: false,
            name: "ages",
            optional: false,
            type: "list",
            objectType: "int",
        });
    });

    it("throws if called outside a write transaction", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm._createObjectSchemaProperty("Person", "nickname", "string?");
        }).to.throw("Can only create object schema property within a transaction");
    });

    it("throws if asked to create property on a missing class", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm.write(() => {
                realm._createObjectSchemaProperty("Whatever", "nickname", "string?");
            });
        }).to.throw("Missing object schema named 'Whatever'");
    });

    it("throws if asked to create an existing property", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm.write(() => {
                realm._createObjectSchemaProperty("Person", "name", "int");
            });
        }).to.throw("Another property named 'name' already exists on object schema named 'Person'");
    });

    it("throws if asked to create a property without a type", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm.write(() => {
                realm._createObjectSchemaProperty("Person", "nickname");
            });
        }).to.throw("Invalid arguments: 3 expected, but 2 supplied.");
    });

    it("throws if asked to create a property with an invalid type", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema });
        expect(() => {
            realm.write(() => {
                realm._createObjectSchemaProperty("Person", "nickname", "w00t");
            });
        }).to.throw("Property 'Person.nickname' of type 'object' has unknown object type 'w00t'");
    });
});
