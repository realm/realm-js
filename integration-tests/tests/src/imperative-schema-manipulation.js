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

describe("Realm.creatClass", () => {
    it("is a function", () => {
        const realm = new Realm({ schema: PersonAndDogsSchema, _cache: false });
        expect(realm.schema).to.be.an("array");
        console.log(Object.keys(realm.schema));
        // expect(realm.schema.createClass).to.be.a("function");
        expect(realm._createSchemaClass).to.be.a("function");
        realm.write(() => {
            realm._createSchemaClass("MyClass", {});
        });
        process.nextTick(() => {
            console.log(realm.schema);
        });
    });
});
