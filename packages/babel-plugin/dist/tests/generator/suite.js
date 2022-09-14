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
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeProperty = void 0;
const variants_1 = require("./variants");
const transform_1 = require("./transform");
function inferSchema(options) {
    const property = { type: options.type };
    if (typeof options.default !== "undefined") {
        property.default = options.default;
    }
    if (options.optional) {
        property.optional = true;
    }
    if (options.objectType) {
        property.objectType = options.objectType;
    }
    return { [options.name]: property };
}
function describeProperty(title, { type, objectTypes, defaults = [undefined], optionals = [false, true] }) {
    describe(title, () => {
        for (const d of defaults) {
            for (const optional of optionals) {
                for (const objectType of objectTypes || [undefined]) {
                    const name = "prop";
                    const testOptions = { type, objectType, default: d, name, optional };
                    const variants = (0, variants_1.generatePropertyVariants)(testOptions);
                    for (const variant of variants) {
                        const propertyCode = (0, variants_1.generatePropertyCode)(variant);
                        it(`transforms \`${propertyCode}\``, () => {
                            const transformCode = (0, transform_1.transformProperty)(propertyCode);
                            const parsedSchema = (0, transform_1.extractSchema)(transformCode);
                            const expectedSchema = inferSchema(testOptions);
                            expect(parsedSchema?.properties).toStrictEqual(expectedSchema);
                        });
                    }
                }
            }
        }
    });
}
exports.describeProperty = describeProperty;
