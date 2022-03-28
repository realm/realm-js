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

import * as babel from "@babel/core";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

import plugin from "./index";
import { ObjectSchema } from "realm";

function evaluateObjectExpression(node: babel.types.ObjectExpression) {
  const result = generate(node);
  if (result.code) {
    const fn = new Function("return " + result.code);
    return fn() as Realm.ObjectSchema;
  } else {
    throw new Error("Unable to generate code from schema AST");
  }
}

function extractSchemaFromAst(ast: babel.types.File): Realm.ObjectSchema {
  let schemaNode: babel.types.ObjectExpression | null = null;
  traverse(ast, {
    ClassProperty(path) {
      if (path.get("key").isIdentifier({ name: "schema" })) {
        const value = path.get("value");
        if (value.isObjectExpression()) {
          schemaNode = value.node;
        }
      }
    },
  });
  if (schemaNode) {
    return evaluateObjectExpression(schemaNode);
  } else {
    throw new Error("Unable to find schema node");
  }
}

function itTransformsSchema(name: string, source: string, test: (schema: ObjectSchema) => void) {
  it(name, () => {
    const result = babel.transform(source, {
      filename: "test.ts",
      presets: ["@babel/preset-typescript"],
      plugins: [plugin],
      ast: true,
    });
    // Assert something about the schema
    if (result?.ast) {
      const schema = extractSchemaFromAst(result?.ast);
      test(schema);
    } else {
      throw new Error("Failed to transform AST");
    }
  });
}

describe("Babel plugin", () => {
  itTransformsSchema("handles class name", "class Person extends Realm.Object {}", (schema) => {
    expect(schema.name).toBe("Person");
  });

  describe("property types", () => {
    type PropertyTest = [string, string, Realm.PropertiesTypes];
    const tests: PropertyTest[] = [
      [
        "string",
        "name: string;",
        {
          name: {
            type: "string",
          },
        },
      ],
      [
        "string from initializer",
        "name = 'Alice'",
        {
          name: {
            type: "string",
            default: "Alice",
          },
        },
      ],
      [
        "number",
        "age: number;",
        {
          age: {
            type: "float",
          },
        },
      ],
      [
        "optional string",
        "name?: string;",
        {
          name: {
            type: "string",
            optional: true,
          },
        },
      ],
      [
        "link",
        "friend: Person;",
        {
          friend: {
            type: "Person",
          },
        },
      ],
      [
        "list",
        "friends: Realm.List<Person>;",
        {
          friends: {
            type: "list",
            objectType: "Person",
          },
        },
      ],
    ];
    // Iterate all the tests
    for (const [title, classBody, expectedPropertiesSchema] of tests) {
      const source = `class Person extends Realm.Object { ${classBody} }`;
      itTransformsSchema(`handles '${title}'`, source, (schema) => {
        expect(schema.properties).toStrictEqual(expectedPropertiesSchema);
      });
    }
  });
});
