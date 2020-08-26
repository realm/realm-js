////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

import { DogSchema, IPerson, PersonSchema } from "./schemas/person-and-dogs";

const RealmAsAny = Realm as any;

describe("Realm#constructor", () => {
    it("is a function", () => {
        expect(Realm).to.be.a("function");
        expect(Realm instanceof Function).to.equal(true);
    });

    it("creates a Realm instance", () => {
        const realm = new Realm();
        expect(realm instanceof Realm).to.equal(true);
        expect(realm.path).to.equal(Realm.defaultPath);
    });

    it("creates a Realm instance with an empty schema", () => {
        const realm = new Realm({ schema: [] });
        expect(realm instanceof Realm).to.equal(true);
        expect(realm.schema).to.deep.equal([]);
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
        expect(realm1.path).to.equal(
            path.resolve(defaultPathDir, "temporary-1.realm")
        );
        // Open another Realm as well
        const realm2 = new Realm("temporary-2.realm");
        expect(realm2.path).to.equal(
            path.resolve(defaultPathDir, "temporary-2.realm")
        );
    });

    describe("called with invalid arguments", () => {
        it("throws when called with an empty string", () => {
            expect(() => {
                const r = new Realm("");
            }).to.throw(); // The actual message varies across environments
        });

        it("throws when called with two strings", () => {
            expect(() => {
                const r = new RealmAsAny("", "");
            }).to.throw("Invalid arguments when constructing 'Realm'");
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
    });

    describe("schema version", () => {
        it("initiates with schema version 0", () => {
            const realm = new Realm({ schema: [] });
            expect(realm.schemaVersion).to.equal(0);
        });

        it("can reopen with the same version", () => {
            // Open it ...
            const realm = new Realm({ schema: [], schemaVersion: 0 });
            expect(realm.schemaVersion).to.equal(0);
            // Re-open with a different version
            const reopenedRealm = new Realm({ schema: [], schemaVersion: 0 });
            expect(reopenedRealm.schemaVersion).to.equal(0);
        });

        it("can close and reopen with different versions", () => {
            // Open it ...
            const realm0 = new Realm({ schema: [], schemaVersion: 0 });
            expect(realm0.schemaVersion).to.equal(0);
            expect(realm0.schema).to.deep.equal([]);
            realm0.close();
            // Re-open with a different version
            const realm1 = new Realm({ schema: [], schemaVersion: 1 });
            expect(realm1.schemaVersion).to.equal(1);
            expect(realm1.schema.length).to.equal(0);
            realm1.close();
            // Re-open with a different version
            const realm2 = new Realm({
                schema: [PersonSchema, DogSchema],
                schemaVersion: 2
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
                const r = new Realm({ schema: [], schemaVersion: 1 });
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
            expect(reopenedRealm.schema).to.deep.equal(realm.schema);
        });
    });

    describe("schema validation", () => {
        it("fails when passed an object", () => {
            expect(() => {
                const r = new RealmAsAny({ schema: {} });
            }).throws("schema must be of type 'array', got");
        });

        it("fails when passed an array with non-objects", () => {
            expect(() => {
                const r = new RealmAsAny({ schema: [""] });
            }).throws(
                "Failed to read ObjectSchema: JS value must be of type 'object', got"
            );
        });

        it("fails when passed an array with empty object", () => {
            expect(() => {
                const r = new RealmAsAny({ schema: [{}] });
            }).throws(
                "Failed to read ObjectSchema: name must be of type 'string', got "
            );
        });

        it("fails when passed an array with an object without 'properties'", () => {
            expect(() => {
                const r = new RealmAsAny({ schema: [{ name: "SomeObject" }] });
            }).throws(
                "Failed to read ObjectSchema: properties must be of type 'object', got "
            );
        });

        it("fails when passed an array with an object without 'name'", () => {
            expect(() => {
                const r = new RealmAsAny({ schema: [{ properties: {} }] });
            }).throws(
                "Failed to read ObjectSchema: name must be of type 'string', got "
            );
        });

        function expectInvalidProperty(
            badProperty: Realm.PropertyType | Realm.ObjectSchemaProperty,
            message: string
        ) {
            expect(() => {
                const r = new Realm({
                    schema: [
                        {
                            name: "InvalidObject",
                            properties: {
                                another: "AnotherObject",
                                bad: badProperty,
                                nummeric: "int"
                            }
                        },
                        { name: "AnotherObject", properties: {} }
                    ]
                });
            }).throws(message);
        }

        it("fails when asking for a list of lists", () => {
            expectInvalidProperty(
                { type: "list[]", objectType: "InvalidObject" },
                "List property 'InvalidObject.bad' must have a non-list value type"
            );
        });

        it("fails when asking for an optional list", () => {
            expectInvalidProperty(
                { type: "list?", objectType: "InvalidObject" },
                "List property 'InvalidObject.bad' cannot be optional"
            );
        });

        it("fails when asking for an empty type string", () => {
            expectInvalidProperty(
                "",
                "Property 'InvalidObject.bad' must have a non-empty type"
            );
        });

        it("fails when asking for linkingObjects to a non-existing property", () => {
            expectInvalidProperty(
                {
                    objectType: "InvalidObject",
                    property: "nosuchproperty",
                    type: "linkingObjects"
                },
                "Property 'InvalidObject.nosuchproperty' declared as origin of linking objects property 'InvalidObject.bad' does not exist"
            );
        });

        it("fails when asking for linkingObjects to a non-link property", () => {
            expectInvalidProperty(
                {
                    objectType: "InvalidObject",
                    property: "nummeric",
                    type: "linkingObjects"
                },
                "Property 'InvalidObject.nummeric' declared as origin of linking objects property 'InvalidObject.bad' is not a link"
            );
        });

        it("fails when asking for linkingObjects to a property linking elsewhere", () => {
            expectInvalidProperty(
                {
                    objectType: "InvalidObject",
                    property: "another",
                    type: "linkingObjects"
                },
                "Property 'InvalidObject.another' declared as origin of linking objects property 'InvalidObject.bad' links to type 'AnotherObject'"
            );
        });

        it("allows list of objects with objectType defined", () => {
            const r = new Realm({
                schema: [
                    {
                        name: "SomeObject",
                        properties: {
                            myObjects: {
                                objectType: "SomeObject",
                                type: "object[]"
                            }
                        }
                    }
                ]
            });
        });
    });

    // TODO: Next up is testRealmConstructorInMemory from realm-tests.js
});

// Testing static methods

describe("#deleteFile", () => {
    function expectDeletion(path?: string) {
        // Create the Realm with a schema
        const realm = new Realm({ path, schema: [PersonSchema, DogSchema] });
        realm.close();
        // Delete the Realm
        Realm.deleteFile({ path });
        // Re-open the Realm without a schema and expect it to be empty
        const reopenedRealm = new Realm({ path });
        expect(reopenedRealm.schema).to.deep.equal([]);
    }

    it("deletes the default Realm", () => {
        expectDeletion();
    });

    // TODO: Fix the issue on Android that prevents this from passing
    // @see https://github.com/realm/realm-js-private/issues/507

    it.skipIf("android", "deletes a Realm with a space in its path", () => {
        expectDeletion("my realm.realm");
    });
});
