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

import { sanitizeObjectSchema, sanitizePropertySchemaObject } from "../schema/normalize";

const NAME = { objectName: "MyObject", propertyName: "prop" };
const NOT_A_STRING = 0;
const NOT_A_BOOLEAN = 0;
const NOT_AN_OBJECT = 0;

describe("sanitizeObjectSchema", () => {
  // ------------------------------------------------------------------------
  // Valid shape of input
  // ------------------------------------------------------------------------

  describe("using valid shape of input", () => {
    itSanitizes("an object with all top-level fields defined", {
      name: "",
      primaryKey: "",
      embedded: false,
      asymmetric: false,
      properties: {},
    });

    itSanitizes("an object with required top-level fields defined and optional fields set to 'undefined'", {
      name: "",
      primaryKey: undefined,
      embedded: undefined,
      asymmetric: undefined,
      properties: {},
    });

    itSanitizes("an object with only required top-level fields defined", {
      name: "",
      properties: {},
    });
  });

  // ------------------------------------------------------------------------
  // Invalid shape of input
  // ------------------------------------------------------------------------

  describe("using invalid shape of input", () => {
    itThrowsWhenSanitizing("an array", [], `Expected 'the object schema' to be an object, got an array`);

    itThrowsWhenSanitizing("'null'", null, `Expected 'the object schema' to be an object, got null`);

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'name'",
      {
        name: NOT_A_STRING,
      },
      `Expected 'the object schema name' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'properties'",
      {
        name: NAME.objectName,
        properties: NOT_AN_OBJECT,
      },
      `Expected '${NAME.objectName}.properties' to be an object, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'primaryKey'",
      {
        name: NAME.objectName,
        properties: {},
        primaryKey: NOT_A_STRING,
      },
      `Expected '${NAME.objectName}.primaryKey' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'embedded'",
      {
        name: NAME.objectName,
        properties: {},
        embedded: NOT_A_BOOLEAN,
      },
      `Expected '${NAME.objectName}.embedded' to be a boolean, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'asymmetric'",
      {
        name: NAME.objectName,
        properties: {},
        asymmetric: NOT_A_BOOLEAN,
      },
      `Expected '${NAME.objectName}.asymmetric' to be a boolean, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid property names",
      {
        name: NAME.objectName,
        properties: {},
        invalidName1: "",
        invalidName2: "",
        invalidName3: "",
      },
      `Unexpected field(s) found on the schema for object '${NAME.objectName}': 'invalidName1', 'invalidName2', 'invalidName3'`,
    );
  });

  function itSanitizes(description: string, input: unknown): void {
    it(`sanitizes ${description}.`, () => {
      const sanitizeFn = () => sanitizeObjectSchema(input);
      expect(sanitizeFn).to.not.throw();
    });
  }

  function itThrowsWhenSanitizing(description: string, input: unknown, errMessage: string): void {
    it(`throws when sanitizing ${description}.`, () => {
      const sanitizeFn = () => sanitizeObjectSchema(input);
      expect(sanitizeFn).to.throw(errMessage);
    });
  }
});

describe("sanitizePropertySchemaObject", () => {
  // ------------------------------------------------------------------------
  // Valid shape of input
  // ------------------------------------------------------------------------

  describe("using valid shape of input", () => {
    itSanitizes("an object with all fields defined", {
      type: "",
      objectType: "",
      optional: true,
      property: "",
      indexed: true,
      mapTo: "",
      default: "",
    });

    itSanitizes("an object with required fields defined and optional fields set to 'undefined'", {
      type: "",
      objectType: undefined,
      optional: undefined,
      property: undefined,
      indexed: undefined,
      mapTo: undefined,
      default: undefined,
    });

    itSanitizes("an object with only required fields defined", {
      type: "",
    });
  });

  // ------------------------------------------------------------------------
  // Invalid shape of input
  // ------------------------------------------------------------------------

  describe("using invalid shape of input", () => {
    const DISPLAYED_NAME = `${NAME.objectName}.${NAME.propertyName}`;

    itThrowsWhenSanitizing("an array", [], `Expected '${DISPLAYED_NAME}' to be an object, got an array`);

    itThrowsWhenSanitizing("'null'", null, `Expected '${DISPLAYED_NAME}' to be an object, got null`);

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'type'",
      {
        type: NOT_A_STRING,
      },
      `Expected '${DISPLAYED_NAME}.type' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'objectType'",
      {
        type: "",
        objectType: NOT_A_STRING,
      },
      `Expected '${DISPLAYED_NAME}.objectType' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'optional'",
      {
        type: "",
        optional: NOT_A_BOOLEAN,
      },
      `Expected '${DISPLAYED_NAME}.optional' to be a boolean, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'property'",
      {
        type: "",
        property: NOT_A_STRING,
      },
      `Expected '${DISPLAYED_NAME}.property' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'indexed'",
      {
        type: "",
        indexed: NOT_A_BOOLEAN,
      },
      `Expected '${DISPLAYED_NAME}.indexed' to be a boolean, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid type for property 'mapTo'",
      {
        type: "",
        mapTo: NOT_A_STRING,
      },
      `Expected '${DISPLAYED_NAME}.mapTo' to be a string, got a number`,
    );

    itThrowsWhenSanitizing(
      "an object with invalid property names",
      {
        type: "",
        invalidName1: "",
        invalidName2: "",
        invalidName3: "",
      },
      `Unexpected field(s) found on the schema for property '${DISPLAYED_NAME}': 'invalidName1', 'invalidName2', 'invalidName3'`,
    );
  });

  function itSanitizes(description: string, input: unknown): void {
    it(`sanitizes ${description}.`, () => {
      const sanitizeFn = () => sanitizePropertySchemaObject(NAME, input);
      expect(sanitizeFn).to.not.throw();
    });
  }

  function itThrowsWhenSanitizing(description: string, input: unknown, errMessage: string): void {
    it(`throws when sanitizing ${description}.`, () => {
      const sanitizeFn = () => sanitizePropertySchemaObject(NAME, input);
      expect(sanitizeFn).to.throw(errMessage);
    });
  }
});
