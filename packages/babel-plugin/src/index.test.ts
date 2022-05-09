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
        const value = path.get("value");
        if (value.isObjectExpression()) {
          // Transform default arrow functions into "defaultSource"
          value.traverse({
            ObjectProperty(prop) {
              const keyPath = prop.get("key");
              const valuePath = prop.get("value");
              if (keyPath.isIdentifier({ name: "default" }) && valuePath.isArrowFunctionExpression()) {
                const body = valuePath.get("body");
                if (body.isExpression()) {
                  value.replaceWith(babel.types.stringLiteral(body.getSource()));
                  // Rename the property to signal the difference
                  keyPath.node.name = "defaultSource";
                }
              }
            },
          });
          schemaNode = value.node;
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

  /*

  const DEFAULT_INFERABLE_TYPES: PropertyType[] = ["bool", "string", "double", "decimal128"];

  const DEFAULT_VARIANTS: Record<PropertyType, string[]> = {
    bool: ["true", "false"],
    string: ["'foo'"],
    int: ["123"],
    float: ["123"],
    double: ["123"],
    decimal128: [
      "new Realm.BSON.Decimal128()",
      "new BSON.Decimal128()",
      "new Realm.Types.Decimal128()",
      "new Types.Decimal128()",
    ],
  };
  */

  type PropertyTest = [string, Realm.PropertiesTypes];

  function generateExpectedPropertySchema(property: TestableObjectSchemaProperty, { optional }: TypeVariant) {
    const result: TestableObjectSchemaProperty = { ...property };
    if (optional !== OptionalVariant.Required) {
      result.optional = true;
    }
    if (property.default !== undefined) {
      result.default = property.default;
    }
    if (property.defaultSource !== undefined) {
      result.defaultSource = property.defaultSource;
    }
    return result;
  }

  function generateTestVariations(options: TestableObjectSchemaProperty): PropertyTest[] {
    return generateTypeVariants({
      name: "prop",
      types: TYPE_NAME_VARIANTS[options.type],
      initializer: options.defaultSource ? options.defaultSource : options.default,
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
        const tests = generateTestVariations(options);
        for (const [classBody, expectedPropertiesSchema] of tests) {
          const source = `
            import Realm, { Types, BSON } from "realm";
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

    /*
    describeProperty("int", [
      ...generateTestVariations({ name: "prop", type: "int" }),
      ...generateTestVariations({ name: "prop", type: "int", optional: true }),
      ...generateTestVariations({ name: "prop", type: "int", default: 123 }),
      ...generateTestVariations({ name: "prop", type: "int", optional: true, default: 123 }),
    ]);

    describeProperty("float", [
      ...generateTestVariations({ name: "prop", type: "float" }),
      ...generateTestVariations({ name: "prop", type: "float", optional: true }),
      ...generateTestVariations({ name: "prop", type: "float", default: 123 }),
      ...generateTestVariations({ name: "prop", type: "float", optional: true, default: 123 }),
    ]);

    describeProperty("double", [
      ...generateTestVariations({ name: "prop", type: "double" }),
      ...generateTestVariations({ name: "prop", type: "double", optional: true }),
      ...generateTestVariations({ name: "prop", type: "double", defaultInferable: true, default: 123 }),
      ...generateTestVariations({
        name: "prop",
        type: "double",
        defaultInferable: true,
        optional: true,
        default: 123,
      }),
    ]);

    describeProperty("string", [
      ...generateTestVariations({ name: "prop", type: "string" }),
      ...generateTestVariations({ name: "prop", type: "string", optional: true }),
      ...generateTestVariations({ name: "prop", type: "string", defaultInferable: true, default: "'foo'" }),
      ...generateTestVariations({
        name: "prop",
        type: "string",
        defaultInferable: true,
        optional: true,
        default: "'foo'",
      }),
    ]);

    describeProperty("decimal128", [
      ...generateTestVariations({ name: "prop", type: "decimal128" }),
      ...generateTestVariations({
        name: "prop",
        type: "decimal128",
        optional: true,
        default: ["new Realm.Types.Decimal128()", "new Realm.Types.Decimal128()"],
      }),
    ]);

    /*
    describeProperty("link", [
      [
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
        "prop: Realm.List<Person>;",
        {
          prop: {
            type: "list",
            objectType: "Person",
          },
        },
      ],
    ]);
    */
  });
});
