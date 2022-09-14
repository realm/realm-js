"use strict";
////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
Object.defineProperty(exports, "__esModule", { value: true });
const generator_1 = require("./tests/generator");
const transform_1 = require("./tests/generator/transform");
const transform_2 = require("./tests/transform");
function itTransforms({ name, test, ...options }) {
    it(name, () => {
        const result = (0, transform_2.transform)(options);
        test(result);
    });
}
function itTransformsSchema(name, source, test) {
    itTransforms({
        name,
        source,
        test(result) {
            const schema = (0, generator_1.extractSchema)(result);
            test(schema);
        },
    });
}
describe("Babel plugin", () => {
    describe("class transformation", () => {
        itTransformsSchema("doesn't transform when Realm.Object is unresolved", "class Person extends Realm.Object {}", (schema) => {
            expect(schema).toBe(undefined);
        });
        itTransformsSchema("transform class using via `import * as Realm from 'realm'`", "import * as Realm from 'realm'; class Person extends Realm.Object {}", (schema) => {
            expect(schema && schema.name).toBe("Person");
        });
        itTransformsSchema("transform class using via `import Realm from 'realm'`", "import Realm from 'realm'; class Person extends Realm.Object {}", (schema) => {
            expect(schema && schema.name).toBe("Person");
        });
        itTransformsSchema("transform class using via `import { Object } from 'realm'`", "import { Object } from 'realm'; class Person extends Object {}", (schema) => {
            expect(schema && schema.name).toBe("Person");
        });
        itTransformsSchema("transform class using `import Realm, { Object } from 'realm'`", "import Realm, { Object } from 'realm'; class Person extends Object {}", (schema) => {
            expect(schema && schema.name).toBe("Person");
        });
        itTransformsSchema("transform class using via `import { Object } from 'realm'` and providing type argument", "import { Object } from 'realm'; class Person extends Object<Person> {}", (schema) => {
            expect(schema && schema.name).toBe("Person");
        });
    });
    /*
    itTransforms({
      name: "handles property decorators",
      source: "class Person extends Realm.Object { @test() testing: boolean = 0 }",
      extraPlugins: [["@babel/plugin-proposal-decorators", { version: "2021-12" }]],
      test() {
        //
      },
    });
    */
    describe("type transformations", () => {
        (0, generator_1.describeProperty)("boolean", {
            type: "bool",
            defaults: [undefined, true, false],
        });
        (0, generator_1.describeProperty)("int", {
            type: "int",
            defaults: [undefined, 123],
        });
        (0, generator_1.describeProperty)("float", {
            type: "float",
            defaults: [undefined, 123],
        });
        (0, generator_1.describeProperty)("double", {
            type: "double",
            defaults: [undefined, 123],
        });
        (0, generator_1.describeProperty)("string", {
            type: "string",
            defaults: [undefined, "foo"],
        });
        (0, generator_1.describeProperty)("decimal128", {
            type: "decimal128",
            defaults: [
                undefined,
                { source: "new Realm.Types.Decimal128()" },
                { source: "new Types.Decimal128()" },
                { source: "new Realm.BSON.Decimal128()" },
                { source: "new BSON.Decimal128()" },
            ],
        });
        (0, generator_1.describeProperty)("objectId", {
            type: "objectId",
            defaults: [
                undefined,
                { source: "new Realm.Types.ObjectId()" },
                { source: "new Types.ObjectId()" },
                { source: "new Realm.BSON.ObjectId()" },
                { source: "new BSON.ObjectId()" },
            ],
        });
        (0, generator_1.describeProperty)("uuid", {
            type: "uuid",
            defaults: [
                undefined,
                { source: "new Realm.Types.UUID()" },
                { source: "new Types.UUID()" },
                { source: "new Realm.BSON.UUID()" },
                { source: "new BSON.UUID()" },
            ],
        });
        (0, generator_1.describeProperty)("date", {
            type: "date",
            defaults: [
                undefined,
                { source: "new Date()" },
                { source: "new Types.Date()" },
                { source: "new Realm.Types.Date()" },
            ],
        });
        (0, generator_1.describeProperty)("data", {
            type: "data",
            defaults: [
                undefined,
                { source: "new ArrayBuffer()" },
                { source: "new Types.Data()" },
                { source: "new Realm.Types.Data()" },
            ],
        });
        (0, generator_1.describeProperty)("list", {
            type: "list",
            // TODO: Extend the `objectType` being tested
            objectTypes: ["Person", "int"],
            defaults: [undefined, { source: "[]" }],
        });
        (0, generator_1.describeProperty)("set", {
            type: "set",
            // TODO: Extend the `objectType` being tested
            objectTypes: ["Person"],
        });
        (0, generator_1.describeProperty)("dictionary", {
            type: "dictionary",
            // TODO: Extend the `objectType` being tested
            objectTypes: [undefined, "mixed"],
        });
        (0, generator_1.describeProperty)("mixed", {
            type: "mixed",
            defaults: [undefined, "foo", 123],
        });
        (0, generator_1.describeProperty)("link", {
            type: "Person",
        });
        // LinkingObjects has sufficiently unique syntax that we test it manually
        // rather than with the test generator
        describe("linkingObjects", () => {
            [
                'prop: Realm.Types.LinkingObjects<Person, "friends">;',
                'prop: Types.LinkingObjects<Person, "friends">;',
            ].forEach((code) => {
                it(`transforms: \`${code}\``, () => {
                    const transformCode = (0, transform_1.transformProperty)(code);
                    const parsedSchema = (0, generator_1.extractSchema)(transformCode);
                    const expectedSchema = {
                        prop: {
                            type: "linkingObjects",
                            objectType: "Person",
                            property: "friends",
                        },
                    };
                    expect(parsedSchema?.properties).toStrictEqual(expectedSchema);
                });
            });
            describe("error handling", () => {
                it("does not allow the property to be optional", () => {
                    expect(() => (0, transform_1.transformProperty)('prop?: Realm.Types.LinkingObjects<Person, "friends">;')).toThrow("Properties of type LinkingObjects cannot be optional");
                });
                it("does not allow the property to be undefined", () => {
                    expect(() => (0, transform_1.transformProperty)('prop: Realm.Types.LinkingObjects<Person, "friends"> | undefined;')).toThrow("Properties of type LinkingObjects cannot be optional");
                });
                it("throws if no type parameters are provided", () => {
                    expect(() => (0, transform_1.transformProperty)("prop: Realm.Types.LinkingObjects;")).toThrow("Missing type arguments for LinkingObjects");
                });
                it("throws if the incorrect number of type parameters are provided", () => {
                    expect(() => (0, transform_1.transformProperty)("prop: Realm.Types.LinkingObjects<Person>;")).toThrow("Incorrect number of type arguments for LinkingObjects");
                });
                it("throws if the first type parameter's type is incorrect", () => {
                    expect(() => (0, transform_1.transformProperty)('prop: Realm.Types.LinkingObjects<"Person", "friends">;')).toThrow("First type argument for LinkingObjects should be a reference to the linked object's object type");
                });
                it("throws if the second type parameter's type is incorrect", () => {
                    expect(() => (0, transform_1.transformProperty)("prop: Realm.Types.LinkingObjects<Person, friends>;")).toThrow("Second type argument for LinkingObjects should be the property name of the relationship it inverts");
                });
            });
        });
    });
    describe("static properties", () => {
        it("reads a static property for `name`", () => {
            const transformCode = (0, transform_1.transformProperty)(`static name = 'test';`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.name).toEqual("test");
        });
        it("reads a static property for `primaryKey`", () => {
            const transformCode = (0, transform_1.transformProperty)(`static primaryKey = 'test';`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.primaryKey).toEqual("test");
        });
        it("reads a static property for `embedded`", () => {
            const transformCode = (0, transform_1.transformProperty)(`static embedded = true;`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.embedded).toEqual(true);
        });
        it("reads a static property for `asymmetric`", () => {
            const transformCode = (0, transform_1.transformProperty)(`static asymmetric = true;`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.asymmetric).toEqual(true);
        });
        it("reads multiple static properties", () => {
            const code = `static name = 'test';
      static primaryKey = 'test';
      static embedded = true;
      static asymmetric = true;`;
            const transformCode = (0, transform_1.transformProperty)(code);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.name).toEqual("test");
            expect(parsedSchema?.primaryKey).toEqual("test");
            expect(parsedSchema?.embedded).toEqual(true);
            expect(parsedSchema?.asymmetric).toEqual(true);
        });
    });
    describe("decorators", () => {
        it("handles `@index` decorators", () => {
            const transformCode = (0, transform_1.transformProperty)(`@index name: Realm.Types.String;`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.properties.name.indexed).toEqual(true);
        });
        it("handles `@mapTo` decorators", () => {
            const transformCode = (0, transform_1.transformProperty)(`@mapTo("rename") name: Realm.Types.String;`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.properties.name.mapTo).toEqual("rename");
        });
        it("handles multiple decorators on a property", () => {
            const transformCode = (0, transform_1.transformProperty)(`@index @mapTo("rename") name: Realm.Types.String;`);
            const parsedSchema = (0, generator_1.extractSchema)(transformCode);
            expect(parsedSchema?.properties.name.indexed).toEqual(true);
            expect(parsedSchema?.properties.name.mapTo).toEqual("rename");
        });
    });
    it("handles a full scheme", () => {
        const transformCode = (0, transform_1.transformProperty)(`
      _id!: Realm.BSON.ObjectId;
      description!: string;
      isComplete!: boolean;
      createdAt!: Date;
      userId!: string;`);
        console.log(transformCode);
    });
});
