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

import type { ObjectSchema, ObjectSchemaProperty, PropertyType } from "realm";

import plugin from "./index";

import { generateTypeString, generateTypeVariants, OptionalVariant, TypeVariant } from "./type-variation";

function evaluateObjectExpression(node: babel.types.ObjectExpression) {
  const result = generate(node);
  if (result.code) {
    const fn = new Function("return " + result.code);
    return fn();
  } else {
    throw new Error("Unable to generate code from schema AST");
  }
}

type TestableObjectSchemaProperty = Omit<ObjectSchemaProperty, "default"> &
  (
    | {
        default?: any;
        defaultSource?: never;
      }
    | {
        default?: never;
        defaultSource?: string;
      }
  );

type TestableObjectSchema = Omit<Realm.ObjectSchema, "properties"> & {
  properties: Record<string, TestableObjectSchemaProperty>;
};

// TODO: Parse a "properties" schema instead
function extractSchemaFromAst(ast: babel.types.File): TestableObjectSchema | undefined {
  let schemaNode: babel.types.ObjectExpression | null = null;
  traverse(ast, {
    ClassProperty(path) {
      if (path.get("key").isIdentifier({ name: "schema" })) {
        const valuePath = path.get("value");
        if (valuePath.isObjectExpression()) {
          // Transform default arrow functions into "defaultSource"
          valuePath.traverse({
            ObjectProperty(prop) {
              const propertyKeyPath = prop.get("key");
              const propertyValuePath = prop.get("value");
              if (propertyKeyPath.isIdentifier({ name: "default" }) && propertyValuePath.isArrowFunctionExpression()) {
                const body = propertyValuePath.get("body");
                if (body.isExpression()) {
                  const bodySource = generate(body.node);
                  propertyValuePath.replaceWith(babel.types.stringLiteral(bodySource.code));
                  // Rename the property to signal the difference
                  propertyKeyPath.node.name = "defaultSource";
                }
              }
            },
          });
          schemaNode = valuePath.node;
        }
      }
    },
  });
  if (schemaNode) {
    return evaluateObjectExpression(schemaNode) as TestableObjectSchema;
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
    presets: [
      [
        "@babel/preset-typescript",
        {
          // TODO: Document that this requires TypeScript >= 3.8 (see https://babeljs.io/docs/en/babel-preset-typescript#onlyremovetypeimports)
          onlyRemoveTypeImports: true,
        },
      ],
      ...extraPresets,
    ],
    plugins: [plugin, ...extraPlugins],
    ast: true,
  });
  if (!result) {
    throw new Error("Failed to transform!");
  }
  // console.log(result.code);
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
      "transform class using via `import * as Realm from 'realm'`",
      "import * as Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using via `import Realm from 'realm'`",
      "import Realm from 'realm'; class Person extends Realm.Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using via `import { Object } from 'realm'`",
      "import { Object } from 'realm'; class Person extends Object {}",
      (schema) => {
        expect(schema && schema.name).toBe("Person");
      },
    );

    itTransformsSchema(
      "transform class using `import Realm, { Object } from 'realm'`",
      "import Realm, { Object } from 'realm'; class Person extends Object {}",
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

  const TYPE_NAME_VARIANTS: Record<PropertyType, string[]> = {
    bool: ["boolean", "Realm.Types.Bool", "Types.Bool"],
    string: ["string", "Realm.Types.String", "Types.String"],
    int: ["Realm.Types.Int", "Types.Int"],
    float: ["Realm.Types.Float", "Types.Float"],
    double: ["number", "Realm.Types.Double", "Types.Double"],
    decimal128: ["Realm.BSON.Decimal128", "Realm.Types.Decimal128", "BSON.Decimal128", "Types.Decimal128"],
  };

  const DEFAULT_INFERABLE_TYPES = new Set<PropertyType>(["bool", "string", "double", "decimal128"]);

  type PropertyTest = [string, Realm.PropertiesTypes];

  function generateExpectedPropertySchema(property: TestableObjectSchemaProperty, { optional }: TypeVariant) {
    const result: TestableObjectSchemaProperty = { ...property };
    if (optional !== OptionalVariant.Required) {
      result.optional = true;
    }
    return result;
  }

  function getTypeNameVariants({ type, objectType }: TestableObjectSchemaProperty): (string | undefined)[] {
    if (type in TYPE_NAME_VARIANTS) {
      return [...TYPE_NAME_VARIANTS[type]];
    } else if (type === "list") {
      // Most likely an object link
      return [`Realm.List<${objectType}>`, `List<${objectType}>`];
    } else {
      // Most likely an object link
      return [type];
    }
  }

  function generateTestVariants(options: TestableObjectSchemaProperty): PropertyTest[] {
    const types = getTypeNameVariants(options);
    if (DEFAULT_INFERABLE_TYPES.has(options.type)) {
      types.push(undefined);
    }
    return generateTypeVariants({
      name: "prop",
      types,
      initializer: options.defaultSource ? options.defaultSource : JSON.stringify(options.default),
      optionals: [
        OptionalVariant.Required,
        OptionalVariant.QuestionMark,
        OptionalVariant.UndefinedLeft,
        OptionalVariant.UndefinedRight,
      ],
    }).map((variant) => {
      const schema = generateExpectedPropertySchema(options, variant);
      return [generateTypeString(variant), { prop: schema }];
    });
  }

  function describeProperty(title: string, optionsList: Array<TestableObjectSchemaProperty>) {
    describe(title, () => {
      for (const options of optionsList) {
        const tests = generateTestVariants(options);
        for (const [classBody, expectedPropertiesSchema] of tests) {
          const source = `
            import Realm, { List, Types, BSON } from "realm";
            class Person extends Realm.Object { ${classBody} }
          `;
          itTransformsSchema(`transforms \`${classBody}\``, source, (schema) => {
            if (schema) {
              expect(schema.properties).toStrictEqual(expectedPropertiesSchema);
            } else {
              throw new Error("Failed to extract schema static from class");
            }
          });
        }
      }
    });
  }

  describe("property types", () => {
    describeProperty("boolean", [
      {
        type: "bool",
      },
      {
        type: "bool",
        default: true,
      },
      {
        type: "bool",
        default: false,
      },
    ]);

    describeProperty("int", [
      {
        type: "int",
      },
      {
        type: "int",
        default: 123,
      },
    ]);

    describeProperty("float", [
      {
        type: "float",
      },
      {
        type: "float",
        default: 123,
      },
    ]);

    describeProperty("double", [
      {
        type: "double",
      },
      {
        type: "double",
        default: 123,
      },
    ]);

    describeProperty("string", [
      {
        type: "string",
      },
      {
        type: "string",
        default: "foo",
      },
    ]);

    describeProperty("decimal128", [
      {
        type: "decimal128",
      },
      {
        type: "decimal128",
        defaultSource: "new Realm.Types.Decimal128()",
      },
      /*
      {
        type: "decimal128",
        defaultSource: "new Types.Decimal128()",
      },
      {
        type: "decimal128",
        defaultSource: "new Realm.BSON.Decimal128()",
      },
      {
        type: "decimal128",
        defaultSource: "new BSON.Decimal128()",
      },
      */
    ]);

    describeProperty("link", [
      {
        type: "Person",
      },
      // TODO: Consider defaults?
    ]);

    describeProperty("list of links", [
      {
        type: "list",
        objectType: "Person",
      },
      // TODO: Consider defaults?
    ]);
  });
});
