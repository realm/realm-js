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

import { expect } from "chai";
import { inspect } from "util";
import { CanonicalObjectSchemaProperty, ObjectSchemaProperty } from "../schema";

import { extractGeneric, normalizePropertySchema } from "../schema/normalize";

const NAME = { objectName: "MyObject", propertyName: "prop" };

describe("normalizePropertySchema", () => {
  // ------------------------------------------------------------------------
  // Valid string notation
  // ------------------------------------------------------------------------

  describe("using valid string notation", () => {
    // -----------------
    // string
    // -----------------

    itNormalizes("string", {
      type: "string",
      optional: false,
    });

    itNormalizes("string?", {
      type: "string",
      optional: true,
    });

    itNormalizes("string[]", {
      type: "list",
      objectType: "string",
      optional: false,
    });

    itNormalizes("string?[]", {
      type: "list",
      objectType: "string",
      optional: true,
    });

    itNormalizes("string{}", {
      type: "dictionary",
      objectType: "string",
      optional: false,
    });

    itNormalizes("string?{}", {
      type: "dictionary",
      objectType: "string",
      optional: true,
    });

    itNormalizes("string<>", {
      type: "set",
      objectType: "string",
      optional: false,
    });

    itNormalizes("string?<>", {
      type: "set",
      objectType: "string",
      optional: true,
    });

    // -----------------
    // mixed
    // -----------------

    itNormalizes("mixed", {
      type: "mixed",
      optional: true,
    });

    itNormalizes("mixed?", {
      type: "mixed",
      optional: true,
    });

    itNormalizes("mixed[]", {
      type: "list",
      objectType: "mixed",
      optional: true,
    });

    itNormalizes("mixed?[]", {
      type: "list",
      objectType: "mixed",
      optional: true,
    });

    itNormalizes("mixed{}", {
      type: "dictionary",
      objectType: "mixed",
      optional: true,
    });

    itNormalizes("mixed?{}", {
      type: "dictionary",
      objectType: "mixed",
      optional: true,
    });

    itNormalizes("mixed<>", {
      type: "set",
      objectType: "mixed",
      optional: true,
    });

    itNormalizes("mixed?<>", {
      type: "set",
      objectType: "mixed",
      optional: true,
    });

    // -------------------------
    // User-defined type: Person
    // -------------------------

    itNormalizes("Person", {
      type: "object",
      objectType: "Person",
      optional: true,
    });

    itNormalizes("Person?", {
      type: "object",
      objectType: "Person",
      optional: true,
    });

    itNormalizes("Person[]", {
      type: "list",
      objectType: "Person",
      optional: false,
    });

    itNormalizes("Person<>", {
      type: "set",
      objectType: "Person",
      optional: false,
    });

    itNormalizes("Person{}", {
      type: "dictionary",
      objectType: "Person",
      optional: true,
    });

    itNormalizes("Person?{}", {
      type: "dictionary",
      objectType: "Person",
      optional: true,
    });
  });

  // ------------------------------------------------------------------------
  // Invalid string notation
  // ------------------------------------------------------------------------

  describe("using invalid string notation", () => {
    itThrowsWhenNormalizing("", "The type must be specified");

    itThrowsWhenNormalizing("?", "The type must be specified");

    itThrowsWhenNormalizing("?[]", "The type must be specified");

    itThrowsWhenNormalizing("[]", "The element type must be specified");

    itThrowsWhenNormalizing("{}", "The element type must be specified");

    itThrowsWhenNormalizing("<>", "The element type must be specified");

    itThrowsWhenNormalizing("[][]", "Nested collections are not supported");

    itThrowsWhenNormalizing("{}[]", "Nested collections are not supported");

    itThrowsWhenNormalizing("[]<>", "Nested collections are not supported");

    itThrowsWhenNormalizing("int[][]", "Nested collections are not supported");

    itThrowsWhenNormalizing(
      "[]?",
      "Collections cannot be optional. To allow elements of the collection to be optional, use '?' after the element type",
    );

    itThrowsWhenNormalizing(
      "int[]?",
      "Collections cannot be optional. To allow elements of the collection to be optional, use '?' after the element type",
    );

    itThrowsWhenNormalizing("list", "Cannot use the collection name");

    itThrowsWhenNormalizing("dictionary", "Cannot use the collection name");

    itThrowsWhenNormalizing("set", "Cannot use the collection name");

    itThrowsWhenNormalizing("list[]", "Cannot use the collection name");

    itThrowsWhenNormalizing(
      "Person?[]",
      "Being optional is always 'false' for user-defined types in lists and sets and cannot be set to 'true'. Remove '?' or change the type.",
    );

    itThrowsWhenNormalizing(
      "Person?<>",
      "Being optional is always 'false' for user-defined types in lists and sets and cannot be set to 'true'. Remove '?' or change the type.",
    );

    itThrowsWhenNormalizing(
      "object",
      "To define a relationship, use either 'ObjectName' or { type: 'object', objectType: 'ObjectName' }",
    );

    itThrowsWhenNormalizing(
      "linkingObjects",
      "To define an inverse relationship, use { type: 'linkingObjects', objectType: 'ObjectName', property: 'ObjectProperty' }",
    );
  });

  // ------------------------------------------------------------------------
  // Valid object notation
  // ------------------------------------------------------------------------

  describe("using valid object notation", () => {
    // -----------------
    // string
    // -----------------

    itNormalizes(
      {
        type: "string",
      },
      {
        type: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "string",
        optional: false,
      },
      {
        type: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "string",
        optional: true,
      },
      {
        type: "string",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "string",
      },
      {
        type: "list",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "string",
        optional: false,
      },
      {
        type: "list",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "string",
        optional: true,
      },
      {
        type: "list",
        objectType: "string",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "string",
      },
      {
        type: "dictionary",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "string",
        optional: false,
      },
      {
        type: "dictionary",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "string",
        optional: true,
      },
      {
        type: "dictionary",
        objectType: "string",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "string",
      },
      {
        type: "set",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "string",
        optional: false,
      },
      {
        type: "set",
        objectType: "string",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "string",
        optional: true,
      },
      {
        type: "set",
        objectType: "string",
        optional: true,
      },
    );

    // -----------------
    // mixed
    // -----------------

    itNormalizes(
      {
        type: "mixed",
      },
      {
        type: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "mixed",
        optional: true,
      },
      {
        type: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "mixed",
      },
      {
        type: "list",
        objectType: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "mixed",
        optional: true,
      },
      {
        type: "list",
        objectType: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "mixed",
      },
      {
        type: "dictionary",
        objectType: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "mixed",
        optional: true,
      },
      {
        type: "dictionary",
        objectType: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "mixed",
      },
      {
        type: "set",
        objectType: "mixed",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "mixed",
        optional: true,
      },
      {
        type: "set",
        objectType: "mixed",
        optional: true,
      },
    );

    // -------------------------
    // User-defined type: Person
    // -------------------------

    itNormalizes(
      {
        type: "object",
        objectType: "Person",
      },
      {
        type: "object",
        objectType: "Person",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "object",
        objectType: "Person",
        optional: true,
      },
      {
        type: "object",
        objectType: "Person",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "Person",
      },
      {
        type: "list",
        objectType: "Person",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "list",
        objectType: "Person",
        optional: false,
      },
      {
        type: "list",
        objectType: "Person",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "Person",
      },
      {
        type: "set",
        objectType: "Person",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "set",
        objectType: "Person",
        optional: false,
      },
      {
        type: "set",
        objectType: "Person",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "Person",
      },
      {
        type: "dictionary",
        objectType: "Person",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "dictionary",
        objectType: "Person",
        optional: true,
      },
      {
        type: "dictionary",
        objectType: "Person",
        optional: true,
      },
    );

    itNormalizes(
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "tasks",
      },
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "tasks",
        optional: false,
      },
    );

    itNormalizes(
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "tasks",
        optional: false,
      },
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "tasks",
        optional: false,
      },
    );
  });

  // ------------------------------------------------------------------------
  // Invalid object notation
  // ------------------------------------------------------------------------

  describe("using invalid object notation", () => {
    itThrowsWhenNormalizing(
      {
        type: "",
      },
      "'type' must be specified",
    );

    itThrowsWhenNormalizing(
      {
        type: "string",
        objectType: "string",
      },
      "'objectType' cannot be defined when 'type' is 'string'",
    );

    itThrowsWhenNormalizing(
      {
        type: "list",
      },
      "A list must contain only primitive or user-defined types specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "dictionary",
      },
      "A dictionary must contain only primitive or user-defined types specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "set",
      },
      "A set must contain only primitive or user-defined types specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "list",
        objectType: "list",
      },
      "A list must contain only primitive or user-defined types specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "Person",
      },
      "If you meant to define a relationship, use { type: 'object', objectType: 'Person' } or { type: 'linkingObjects', objectType: 'Person', property: 'The Person property' }",
    );

    itThrowsWhenNormalizing(
      {
        type: "object",
      },
      "A user-defined type must be specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "object",
        objectType: "string",
      },
      "A user-defined type must be specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "object",
        objectType: "Person",
        optional: false,
      },
      "'optional' is always 'true' for user-defined types as standalone objects and in dictionaries and cannot be set to 'false'",
    );

    itThrowsWhenNormalizing(
      {
        type: "mixed",
        optional: false,
      },
      "'optional' is always 'true' for 'mixed' types and cannot be set to 'false'",
    );

    itThrowsWhenNormalizing(
      {
        type: "list",
        objectType: "mixed",
        optional: false,
      },
      "'optional' is always 'true' for 'mixed' types and cannot be set to 'false'",
    );

    itThrowsWhenNormalizing(
      {
        type: "list",
        objectType: "Person",
        optional: true,
      },
      "'optional' is always 'false' for user-defined types in lists and sets and cannot be set to 'true'",
    );

    itThrowsWhenNormalizing(
      {
        type: "set",
        objectType: "Person",
        optional: true,
      },
      "'optional' is always 'false' for user-defined types in lists and sets and cannot be set to 'true'",
    );

    itThrowsWhenNormalizing(
      {
        type: "dictionary",
        objectType: "Person",
        optional: false,
      },
      "'optional' is always 'true' for user-defined types as standalone objects and in dictionaries and cannot be set to 'false'",
    );

    itThrowsWhenNormalizing(
      {
        type: "linkingObjects",
      },
      "A user-defined type must be specified through 'objectType'",
    );

    itThrowsWhenNormalizing(
      {
        type: "linkingObjects",
        objectType: "Person",
      },
      "The linking object's property name must be specified through 'property'",
    );

    itThrowsWhenNormalizing(
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "",
      },
      "The linking object's property name must be specified through 'property'",
    );

    itThrowsWhenNormalizing(
      {
        type: "linkingObjects",
        objectType: "Person",
        property: "tasks",
        optional: true,
      },
      "'optional' is always 'false' for linking objects and cannot be set to 'true'",
    );

    // -------------------------
    // Combining with shorthand
    // -------------------------

    itThrowsWhenNormalizing(
      {
        type: "int?",
      },
      "Cannot use shorthand '?' in combination with using an object",
    );

    itThrowsWhenNormalizing(
      {
        type: "int?[]",
      },
      "Cannot use shorthand '[]' and '?' in combination with using an object",
    );

    itThrowsWhenNormalizing(
      {
        type: "int",
        objectType: "[]",
      },
      "Cannot use shorthand '[]' in combination with using an object",
    );

    itThrowsWhenNormalizing(
      {
        type: "int",
        objectType: "?[]",
      },
      "Cannot use shorthand '[]' and '?' in combination with using an object",
    );

    itThrowsWhenNormalizing(
      {
        type: "list",
        objectType: "int?",
      },
      "Cannot use shorthand '?' in combination with using an object",
    );
  });
});

describe("extractGeneric", () => {
  it("pass through non-generic types", () => {
    const { typeBase, typeArgument } = extractGeneric("test");
    expect(typeBase).to.equal("test");
    expect(typeArgument).to.be.undefined;
  });

  it("extracts a generic type", () => {
    const { typeBase, typeArgument } = extractGeneric("test<arg>");
    expect(typeBase).to.equal("test");
    expect(typeArgument).to.equal("arg");
  });
});

function itNormalizes(input: string | ObjectSchemaProperty, expected: Partial<CanonicalObjectSchemaProperty>): void {
  it(`normalizes ${inspect(input, { compact: true, breakLength: Number.MAX_SAFE_INTEGER })}`, () => {
    const result = normalizePropertySchema(NAME, input);
    expect(result).to.deep.equal({
      name: NAME.propertyName,
      indexed: false,
      mapTo: NAME.propertyName,
      ...expected,
    });
  });
}

function itThrowsWhenNormalizing(input: string | ObjectSchemaProperty, errMessage: string): void {
  it(`throws when normalizing ${inspect(input, { compact: true, breakLength: Number.MAX_SAFE_INTEGER })}`, () => {
    const normalizeFn = () => normalizePropertySchema(NAME, input);
    expect(normalizeFn).to.throw(
      `Invalid schema for property '${NAME.objectName}.${NAME.propertyName}': ${errMessage}`,
    );
  });
}
