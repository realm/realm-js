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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSchema = exports.transformProperty = void 0;
const core_1 = require("@babel/core");
const generator_1 = __importDefault(require("@babel/generator"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const transform_1 = require("../transform");
function transformProperty(propertyCode) {
    const source = `
    import Realm, { Types, BSON, List, Set, Dictionary, Mixed } from "realm";
    export class Person extends Realm.Object { ${propertyCode} }
  `;
    return (0, transform_1.transform)({ source });
}
exports.transformProperty = transformProperty;
function evaluateObjectExpression(node) {
    const result = (0, generator_1.default)(node);
    if (result.code) {
        const fn = new Function("return " + result.code);
        return fn();
    }
    else {
        throw new Error("Unable to generate code from schema AST");
    }
}
// TODO: Parse a "properties" schema instead
function extractSchema(result) {
    if (!result.ast) {
        throw new Error("Expected a result with an AST");
    }
    let schemaNode = null;
    (0, traverse_1.default)(result.ast, {
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
                                    const bodySource = (0, generator_1.default)(body.node);
                                    propertyValuePath.replaceWith(core_1.types.objectExpression([
                                        core_1.types.objectProperty(core_1.types.stringLiteral("source"), core_1.types.stringLiteral(bodySource.code)),
                                    ]));
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
        return evaluateObjectExpression(schemaNode);
    }
    else {
        return undefined;
    }
}
exports.extractSchema = extractSchema;
