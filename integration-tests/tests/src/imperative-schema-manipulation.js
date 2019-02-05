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

describe("Realm.schema.createClass", () => {
    it("is a function", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema, _cache: false });
        expect(realm.schema).to.be.an("array");
        // Expect a non-enumerable field
        expect(Object.keys(realm.schema)).to.not.contain("createClass");
        // expect(realm.schema.createClass).to.be.a("function");
        expect(realm._createSchemaClass).to.be.a("function");
    });

    it("creates a class schema from just a name", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema, _cache: false });
        realm.write(() => {
            realm._createSchemaClass("MyClass");
        });
        const classNames = realm.schema.map(s => s.name);
        expect(classNames).to.contain("MyClass");
    });

    it("creates a class schema from a name and properties", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema, _cache: false });
        realm.write(() => {
            realm._createSchemaClass("MyClass", { myField: "string" });
        });
        const MyClassSchema = realm.schema.find(s => s.name === "MyClass");
        expect(MyClassSchema).to.deep.equal({
            name: "MyClass",
            properties: {
                myField: {
                    type: "string",
                },
            },
        });
    });
});
