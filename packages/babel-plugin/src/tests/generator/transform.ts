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

import { types } from "@babel/core";
import generate from "@babel/generator";
import traverse from "@babel/traverse";

import type { ObjectSchema } from "realm";

import { transform } from "../transform";

export function transformProperty(propertyCode: string): babel.BabelFileResult {
  const source = `
    import Realm, { Types, BSON, List, Set, Dictionary, Mixed, index, mapTo } from "realm";

    export class Person extends Realm.Object { ${propertyCode} }
  `;
  return transform({ source });
}

function evaluateObjectExpression(node: babel.types.ObjectExpression) {
  const result = generate(node);
  if (result.code) {
    const fn = new Function("return " + result.code);
    return fn();
  } else {
    throw new Error("Unable to generate code from schema AST");
  }
}

// TODO: Parse a "properties" schema instead
export function extractSchema(result: babel.BabelFileResult): ObjectSchema | undefined {
  if (!result.ast) {
    throw new Error("Expected a result with an AST");
  }
  let schemaNode: babel.types.ObjectExpression | null = null;
  traverse(result.ast, {
    ClassProperty(path) {
      if (path.get("key").isIdentifier({ name: "schema" })) {
        const valuePath = path.get("value");
        if (valuePath.isObjectExpression()) {
          // Transform default arrow functions into `{ source: string }`
          valuePath.traverse({
            ObjectProperty(prop) {
              const propertyKeyPath = prop.get("key");
              const propertyValuePath = prop.get("value");
              if (propertyKeyPath.isIdentifier({ name: "default" }) && propertyValuePath.isArrowFunctionExpression()) {
                const body = propertyValuePath.get("body");
                if (body.isExpression()) {
                  const bodySource = generate(body.node);
                  propertyValuePath.replaceWith(
                    types.objectExpression([
                      types.objectProperty(types.stringLiteral("source"), types.stringLiteral(bodySource.code)),
                    ]),
                  );
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
    return evaluateObjectExpression(schemaNode) as ObjectSchema;
  } else {
    return undefined;
  }
}
