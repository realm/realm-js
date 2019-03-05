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

import { expect } from "chai";

import { PersonAndDogSchema } from "./schemas/person-and-dogs";

describe("realm._updateSchema", () => {
    it("is a function", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        expect(realm.schema).to.be.an("array");
        // There is a function defined on the Realm
        expect(realm._updateSchema).to.be.a("function");
        // Expect no enumerable field on the schema property
        expect(Object.keys(realm.schema)).to.not.contain("update");
        // TODO: This function gets put on the schema to
        // expect(realm.schema.update).to.be.a("function");
    });

    it("creates a class schema from a name", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        realm.write(() => {
            realm._updateSchema([
                ...realm.schema,
                { name: "MyClass", properties: {} },
            ]);
        });
        const classNames = realm.schema.map(s => s.name);
        expect(classNames).to.contain("MyClass");
    });

    it("creates a class schema from a name and properties", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        realm.write(() => {
            realm._updateSchema([
                ...realm.schema,
                { name: "MyClass", properties: { myField: "string" } },
            ]);
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

    it("can use a newly added class", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        realm.write(() => {
            realm._updateSchema([
                ...realm.schema,
                { name: "MyClass", properties: { myField: "string" } },
            ]);
            realm.create("MyClass", { myField: "some string" });
            const myClassObjects = realm.objects<any>("MyClass");
            expect(myClassObjects).to.be.of.length(1);
            expect(myClassObjects[0].myField).to.equal("some string");
        });
    });

    it("fires the schema change event", (done) => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        realm.addListener("schema", () => {
            expect(realm.schema).to.have.length(3);
            const objectSchemaNames = realm.schema.map(s => s.name);
            expect(objectSchemaNames).to.contain("MyClass");
            done();
        });

        realm.write(() => {
            realm._updateSchema([
                ...realm.schema,
                { name: "MyClass", properties: { myField: "string" } },
            ]);
        });
    });

    it("throws if creating a class schema outside of a transaction", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        expect(() => {
            realm._updateSchema([
                ...realm.schema,
                { name: "MyClass", properties: {} },
            ]);
        }).to.throw("Can only create object schema within a transaction.");
    });

    it("throws if asked to create a class that already exists", () => {
        const realm = new UndocumentedRealm({ schema: PersonAndDogSchema });
        expect(() => {
            realm.write(() => {
                realm._updateSchema([
                    ...realm.schema,
                    { name: "Person", properties: {} },
                ]);
            });
        }).to.throw("Type 'Person' appears more than once in the schema.");
    });

    it("throws if called without a schema object", () => {
        const realm = new Realm({ schema: PersonAndDogSchema });
        expect(() => {
            realm.write(() => {
                (realm as any)._updateSchema();
            });
        }).to.throw("Invalid arguments: 1 expected, but 0 supplied.");
    });

    it("throws if called with an unexpected type", () => {
        const realm = new Realm({ schema: PersonAndDogSchema });
        expect(() => {
            realm.write(() => {
                (realm as any)._updateSchema("w00t");
            });
        }).to.throw("schema must be of type 'array', got (w00t)");
    });
});
