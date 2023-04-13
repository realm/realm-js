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

import { SchemaParseError, validateObjectSchema, validatePropertySchema } from "../internal";

const OBJECT_NAME = "MyObject";
const PROPERTY_NAME = "prop";
const NOT_A_STRING = 0;
const NOT_A_BOOLEAN = 0;
const NOT_AN_OBJECT = 0;

describe("validateObjectSchema", () => {
  // ------------------------------------------------------------------------
  // Valid shape of input
  // ------------------------------------------------------------------------

  describe("using valid shape of input", () => {
    itValidates("an object with all top-level fields defined", {
      name: "",
      primaryKey: "",
      embedded: false,
      asymmetric: false,
      properties: {},
    });

    itValidates("an object with required top-level fields defined and optional fields set to 'undefined'", {
      name: "",
      primaryKey: undefined,
      embedded: undefined,
      asymmetric: undefined,
      properties: {},
    });

    itValidates("an object with only required top-level fields defined", {
      name: "",
      properties: {},
    });
  });

  // ------------------------------------------------------------------------
  // Invalid shape of input
  // ------------------------------------------------------------------------

  describe("using invalid shape of input", () => {
    itThrowsWhenValidating("an array", [], "Expected 'object schema' to be an object, got an array");

    itThrowsWhenValidating("'null'", null, "Expected 'object schema' to be an object, got null");

    itThrowsWhenValidating("an empty object", {}, "Expected 'name' on object schema to be a string, got undefined");

    itThrowsWhenValidating(
      "an object with invalid type for property 'name'",
      {
        name: NOT_A_STRING,
      },
      "Expected 'name' on object schema to be a string, got a number",
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'properties'",
      {
        name: OBJECT_NAME,
        properties: NOT_AN_OBJECT,
      },
      `Expected 'properties' on '${OBJECT_NAME}' to be an object, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'primaryKey'",
      {
        name: OBJECT_NAME,
        properties: {},
        primaryKey: NOT_A_STRING,
      },
      `Expected 'primaryKey' on '${OBJECT_NAME}' to be a string, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'embedded'",
      {
        name: OBJECT_NAME,
        properties: {},
        embedded: NOT_A_BOOLEAN,
      },
      `Expected 'embedded' on '${OBJECT_NAME}' to be a boolean, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'asymmetric'",
      {
        name: OBJECT_NAME,
        properties: {},
        asymmetric: NOT_A_BOOLEAN,
      },
      `Expected 'asymmetric' on '${OBJECT_NAME}' to be a boolean, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid property names",
      {
        name: OBJECT_NAME,
        properties: {},
        invalidName1: "",
        invalidName2: "",
        invalidName3: "",
      },
      `Unexpected field(s) found on the schema for object '${OBJECT_NAME}': 'invalidName1', 'invalidName2', 'invalidName3'`,
    );
  });

  function itValidates(description: string, input: unknown): void {
    it(`validates ${description}.`, () => {
      const validateFn = () => validateObjectSchema(input);
      expect(validateFn).to.not.throw();
    });
  }

  function itThrowsWhenValidating(description: string, input: unknown, errMessage: string): void {
    it(`throws when validating ${description}.`, () => {
      const validateFn = () => validateObjectSchema(input);
      expect(validateFn).to.throw(SchemaParseError, errMessage);
    });
  }
});

describe("validatePropertySchema", () => {
  // ------------------------------------------------------------------------
  // Valid shape of input
  // ------------------------------------------------------------------------

  describe("using valid shape of input", () => {
    itValidates("an object with all fields defined", {
      type: "",
      objectType: "",
      optional: true,
      property: "",
      indexed: true,
      mapTo: "",
      default: "",
    });

    itValidates("an object with required fields defined and optional fields set to 'undefined'", {
      type: "",
      objectType: undefined,
      optional: undefined,
      property: undefined,
      indexed: undefined,
      mapTo: undefined,
      default: undefined,
    });

    itValidates("an object with only required fields defined", {
      type: "",
    });
  });

  // ------------------------------------------------------------------------
  // Invalid shape of input
  // ------------------------------------------------------------------------

  describe("using invalid shape of input", () => {
    itThrowsWhenValidating(
      "an array",
      [],
      `Expected '${PROPERTY_NAME}' on '${OBJECT_NAME}' to be an object, got an array`,
    );

    itThrowsWhenValidating("'null'", null, `Expected '${PROPERTY_NAME}' on '${OBJECT_NAME}' to be an object, got null`);

    itThrowsWhenValidating(
      "an empty object",
      {},
      `Expected '${PROPERTY_NAME}.type' on '${OBJECT_NAME}' to be a string, got undefined`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'type'",
      {
        type: NOT_A_STRING,
      },
      `Expected '${PROPERTY_NAME}.type' on '${OBJECT_NAME}' to be a string, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'objectType'",
      {
        type: "",
        objectType: NOT_A_STRING,
      },
      `Expected '${PROPERTY_NAME}.objectType' on '${OBJECT_NAME}' to be a string, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'optional'",
      {
        type: "",
        optional: NOT_A_BOOLEAN,
      },
      `Expected '${PROPERTY_NAME}.optional' on '${OBJECT_NAME}' to be a boolean, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'property'",
      {
        type: "",
        property: NOT_A_STRING,
      },
      `Expected '${PROPERTY_NAME}.property' on '${OBJECT_NAME}' to be a string, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'indexed'",
      {
        type: "",
        indexed: NOT_A_BOOLEAN,
      },
      `Expected '${PROPERTY_NAME}.indexed' on '${OBJECT_NAME}' to be a boolean, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid type for property 'mapTo'",
      {
        type: "",
        mapTo: NOT_A_STRING,
      },
      `Expected '${PROPERTY_NAME}.mapTo' on '${OBJECT_NAME}' to be a string, got a number`,
    );

    itThrowsWhenValidating(
      "an object with invalid property names",
      {
        type: "",
        invalidName1: "",
        invalidName2: "",
        invalidName3: "",
      },
      `Unexpected field(s) found on the schema for property '${PROPERTY_NAME}' on '${OBJECT_NAME}': 'invalidName1', 'invalidName2', 'invalidName3'`,
    );
  });

  function itValidates(description: string, input: unknown): void {
    it(`validates ${description}.`, () => {
      const validateFn = () => validatePropertySchema(OBJECT_NAME, PROPERTY_NAME, input);
      expect(validateFn).to.not.throw();
    });
  }

  function itThrowsWhenValidating(description: string, input: unknown, errMessage: string): void {
    it(`throws when validating ${description}.`, () => {
      const validateFn = () => validatePropertySchema(OBJECT_NAME, PROPERTY_NAME, input);
      expect(validateFn).to.throw(errMessage);
    });
  }
});
