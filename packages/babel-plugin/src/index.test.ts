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

function extractSchemaFromAst(ast: babel.types.File): Realm.ObjectSchema | undefined {
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
    return undefined;
  }
}

type TransformOptions = {
  source: string;
  extraPresets?: babel.PluginItem[];
  extraPlugins?: babel.PluginItem[];
};

function transform({ source, extraPresets = [], extraPlugins = [] }: TransformOptions) {
  const result = babel.transform(source, {
    filename: "test.ts",
    presets: ["@babel/preset-typescript", ...extraPresets],
    plugins: [plugin, ...extraPlugins],
    ast: true,
  });
  if (!result) {
    throw new Error("Failed to transform!");
  }
  return result;
}

type TransformTestOptions = { name: string; test: (ast: babel.types.File) => void } & TransformOptions;

function itTransforms({ name, test, ...options }: TransformTestOptions) {
  it(name, () => {
    const result = transform(options);
    // Assert something about the schema
    if (result.ast) {
      test(result.ast);
    } else {
      throw new Error("Failed to transform AST");
    }
  });
}

function itTransformsSchema(name: string, source: string, test: (schema: ObjectSchema | undefined) => void) {
  itTransforms({
    name,
    source,
    test(ast) {
      const schema = extractSchemaFromAst(ast);
      test(schema);
    },
  });
}

describe("Babel plugin", () => {
  describe("class transformation", () => {
    itTransformsSchema(
      "doesn't transform when Realm.Object is unresolved",
      "class Person extends Realm.Object {}",
      (schema) => {
        expect(schema).toBe(undefined);
      },
    );

    itTransformsSchema(
      "transform class name when Realm is 'namespace imported'",
      "import * as Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class name when Realm is 'default imported'",
      "import Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class name when Object is 'name imported'",
      "import { Object } from 'realm'; class Person extends Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );
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

  type PropertyTest = [string, string, Realm.PropertiesTypes];
  function describeProperty(title: string, tests: PropertyTest[]) {
    describe(title, () => {
      for (const [title, classBody, expectedPropertiesSchema] of tests) {
        const source = `
          import Realm from "realm";
          class Person extends Realm.Object { ${classBody} }
        `;
        itTransformsSchema(`handles '${title}'`, source, (schema) => {
          if (schema) {
            expect(schema.properties).toStrictEqual(expectedPropertiesSchema);
          } else {
            throw new Error("Failed to extract schema static from class");
          }
        });
      }
    });
  }

  describe("property types", () => {
    describeProperty("boolean", [
      [
        "explicit",
        "prop: boolean;",
        {
          prop: {
            type: "bool",
          },
        },
      ],
    ]);

    describeProperty("string", [
      [
        "explicit",
        "prop: string;",
        {
          prop: {
            type: "string",
          },
        },
      ],
      [
        "initializer",
        "prop = 'Alice'",
        {
          prop: {
            type: "string",
            default: "Alice",
          },
        },
      ],
    ]);

    describeProperty("number", [
      [
        "explicit",
        "prop: number;",
        {
          prop: {
            type: "double",
          },
        },
      ],
      [
        "initializer",
        "prop = 0",
        {
          prop: {
            type: "double",
            default: 0,
          },
        },
      ],
    ]);

    describeProperty("link", [
      [
        "explicit",
        "prop: Person;",
        {
          prop: {
            type: "Person",
          },
        },
      ],
    ]);

    describeProperty("list", [
      [
        "explicit",
        "prop: Realm.List<Person>;",
        {
          prop: {
            type: "list",
            objectType: "Person",
          },
        },
      ],
    ]);
  });
});
