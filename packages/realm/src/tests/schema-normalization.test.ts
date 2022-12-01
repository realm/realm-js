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
import { CanonicalObjectSchemaProperty } from "../schema";

import { extractGeneric, normalizePropertySchema } from "../schema/normalize";

describe("normalizePropertySchema", () => {
  const PROP_NAME = "prop";

  // ------------------------------------------------------------------------
  // Valid string notation
  // ------------------------------------------------------------------------

  describe("using valid string notation", () => {
    // -----------------
    // string
    // -----------------

    it("normalizes 'string'", () => {
      const input = "string";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string?'", () => {
      const input = "string?";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string[]'", () => {
      const input = "string[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string?[]'", () => {
      const input = "string?[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string{}'", () => {
      const input = "string{}";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string?{}'", () => {
      const input = "string?{}";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string<>'", () => {
      const input = "string<>";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'string?<>'", () => {
      const input = "string?<>";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    // -----------------
    // mixed
    // -----------------

    it("normalizes 'mixed'", () => {
      const input = "mixed";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed?'", () => {
      const input = "mixed?";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed[]'", () => {
      const input = "mixed[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed?[]'", () => {
      const input = "mixed?[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed{}'", () => {
      const input = "mixed{}";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed?{}'", () => {
      const input = "mixed?{}";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed<>'", () => {
      const input = "mixed<>";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'mixed?<>'", () => {
      const input = "mixed?<>";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    // -------------------------
    // User-defined type: Person
    // -------------------------

    it("normalizes 'Person'", () => {
      const input = "Person";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "object",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'Person?'", () => {
      const input = "Person?";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "object",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'Person[]'", () => {
      const input = "Person[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it("normalizes 'Person?[]'", () => {
      const input = "Person?[]";
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });
  });

  // ------------------------------------------------------------------------
  // Invalid string notation
  // ------------------------------------------------------------------------

  describe("using invalid string notation", () => {
    it("throws when normalizing ''", () => {
      const input = "";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("You must specify a type");
    });

    it("throws when normalizing '?'", () => {
      const input = "?";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("The type must be specified");
    });

    it("throws when normalizing '?[]'", () => {
      const input = "?[]";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("The type must be specified");
    });

    it("throws when normalizing '[]'", () => {
      const input = "[]";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("The element type must be specified");
    });

    it("throws when normalizing '{}'", () => {
      const input = "{}";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("The element type must be specified");
    });

    it("throws when normalizing '<>'", () => {
      const input = "<>";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("The element type must be specified");
    });

    it("throws when normalizing 'list'", () => {
      const input = "list";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("Cannot use the collection name");
    });

    it("throws when normalizing 'list[]'", () => {
      const input = "list[]";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("Cannot use the collection name");
    });

    it("throws when normalizing 'dictionary'", () => {
      const input = "dictionary";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("Cannot use the collection name");
    });

    it("throws when normalizing 'set'", () => {
      const input = "set";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("Cannot use the collection name");
    });

    it("throws when normalizing 'object'", () => {
      const input = "object";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw(
        "To define a relationship, use either 'ObjectName' or { type: 'object', objectType: 'ObjectName' }",
      );
    });

    it("throws when normalizing 'linkingObjects'", () => {
      const input = "linkingObjects";
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw(
        "To define an inverse relationship, use { type: 'linkingObjects', objectType: 'ObjectName', property: 'ObjectProperty' }",
      );
    });

    it("throws when using optional prop as primary key", () => {
      const input = "string?";
      const isPrimaryKey = true;
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input, isPrimaryKey);

      expect(normalizeFn).to.throw("Optional properties cannot be used as a primary key");
    });
  });

  // ------------------------------------------------------------------------
  // Valid object notation
  // ------------------------------------------------------------------------

  describe("using valid object notation", () => {
    // -----------------
    // string
    // -----------------

    it('normalizes { type: "string" }', () => {
      const input = {
        type: "string",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "string", optional: false }', () => {
      const input = {
        type: "string",
        optional: false,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "string", optional: true }', () => {
      const input = {
        type: "string",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "string" }', () => {
      const input = {
        type: "list",
        objectType: "string",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "string", optional: false }', () => {
      const input = {
        type: "list",
        objectType: "string",
        optional: false,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "string", optional: true }', () => {
      const input = {
        type: "list",
        objectType: "string",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "string" }', () => {
      const input = {
        type: "dictionary",
        objectType: "string",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "string", optional: false }', () => {
      const input = {
        type: "dictionary",
        objectType: "string",
        optional: false,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "string", optional: true }', () => {
      const input = {
        type: "dictionary",
        objectType: "string",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "string" }', () => {
      const input = {
        type: "set",
        objectType: "string",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "string", optional: false }', () => {
      const input = {
        type: "set",
        objectType: "string",
        optional: false,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "string",
        optional: false,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "string", optional: true }', () => {
      const input = {
        type: "set",
        objectType: "string",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "string",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    // -----------------
    // mixed
    // -----------------

    it('normalizes { type: "mixed" }', () => {
      const input = {
        type: "mixed",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "mixed", optional: true }', () => {
      const input = {
        type: "mixed",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "mixed" }', () => {
      const input = {
        type: "list",
        objectType: "mixed",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "mixed", optional: true }', () => {
      const input = {
        type: "list",
        objectType: "mixed",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "mixed" }', () => {
      const input = {
        type: "dictionary",
        objectType: "mixed",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "mixed", optional: true }', () => {
      const input = {
        type: "dictionary",
        objectType: "mixed",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "mixed" }', () => {
      const input = {
        type: "set",
        objectType: "mixed",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "mixed", optional: true }', () => {
      const input = {
        type: "set",
        objectType: "mixed",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "mixed",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    // -------------------------
    // User-defined type: Person
    // -------------------------

    it('normalizes { type: "object", objectType: "Person" }', () => {
      const input = {
        type: "object",
        objectType: "Person",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "object",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "object", objectType: "Person", optional: true }', () => {
      const input = {
        type: "object",
        objectType: "Person",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "object",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "Person" }', () => {
      const input = {
        type: "list",
        objectType: "Person",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "list", objectType: "Person", optional: true }', () => {
      const input = {
        type: "list",
        objectType: "Person",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "list",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "Person" }', () => {
      const input = {
        type: "dictionary",
        objectType: "Person",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "dictionary", objectType: "Person", optional: true }', () => {
      const input = {
        type: "dictionary",
        objectType: "Person",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "dictionary",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "Person" }', () => {
      const input = {
        type: "set",
        objectType: "Person",
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });

    it('normalizes { type: "set", objectType: "Person", optional: true }', () => {
      const input = {
        type: "set",
        objectType: "Person",
        optional: true,
      };
      const expected: CanonicalObjectSchemaProperty = {
        name: PROP_NAME,
        type: "set",
        objectType: "Person",
        optional: true,
        indexed: false,
        mapTo: PROP_NAME,
      };
      const result = normalizePropertySchema(PROP_NAME, input);

      expect(result).to.deep.equal(expected);
    });
  });

  // ------------------------------------------------------------------------
  // Invalid object notation
  // ------------------------------------------------------------------------

  describe("using invalid object notation", () => {
    it('throws when normalizing { type: "" }', () => {
      const input = { type: "" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("'type' must be specified");
    });

    it('throws when normalizing { type: "string", objectType: "string" }', () => {
      const input = { type: "string", objectType: "string" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("'objectType' cannot be defined when 'type' is 'string'");
    });

    it('throws when normalizing { type: "list" }', () => {
      const input = { type: "list" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A valid 'objectType' must be specified");
    });

    it('throws when normalizing { type: "dictionary" }', () => {
      const input = { type: "dictionary" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A valid 'objectType' must be specified");
    });

    it('throws when normalizing { type: "set" }', () => {
      const input = { type: "set" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A valid 'objectType' must be specified");
    });

    it('throws when normalizing { type: "list", objectType: "list" }', () => {
      const input = { type: "list", objectType: "list" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A valid 'objectType' must be specified");
    });

    it('throws when normalizing { type: "object" }', () => {
      const input = { type: "object" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A user-defined type must be specified through 'objectType'");
    });

    it('throws when normalizing { type: "object", objectType: "string" }', () => {
      const input = { type: "object", objectType: "string" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A user-defined type must be specified through 'objectType'");
    });

    it('throws when normalizing { type: "Person" }', () => {
      const input = { type: "Person" };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw(
        "If you meant to define a relationship, use { type: 'object', objectType: 'Person' } or { type: 'linkingObjects', objectType: 'Person', property: 'The Person property' }",
      );
    });

    it('throws when normalizing { type: "mixed", optional: false }', () => {
      const input = { type: "mixed", optional: false };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A 'mixed' type can itself be a null value, so 'optional' cannot be set to 'false'");
    });

    it('throws when normalizing { type: "list", objectType: "mixed", optional: false }', () => {
      const input = { type: "list", objectType: "mixed", optional: false };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A 'mixed' type can itself be a null value, so 'optional' cannot be set to 'false'");
    });

    it('throws when normalizing { type: "list", objectType: "Person", optional: false }', () => {
      const input = { type: "list", objectType: "mixed", optional: false };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw("A 'mixed' type can itself be a null value, so 'optional' cannot be set to 'false'");
    });

    it('throws when normalizing { type: "object", objectType: "Person", optional: false }', () => {
      const input = { type: "object", objectType: "Person", optional: false };
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input);

      expect(normalizeFn).to.throw(
        "A user-defined type can itself be a null value, so 'optional' cannot be set to 'false'",
      );
    });

    it("throws when using optional prop as primary key", () => {
      const input = { type: "string", optional: true };
      const isPrimaryKey = true;
      const normalizeFn = () => normalizePropertySchema(PROP_NAME, input, isPrimaryKey);

      expect(normalizeFn).to.throw("Optional properties cannot be used as a primary key");
    });
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
