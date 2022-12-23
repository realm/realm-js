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
import { createPropertyHelpers } from "./internal";
class UninitializedPropertyMapError extends Error {
    constructor() {
        super("Property Map was accessed before it got initialized");
    }
}
/** @internal */
export class PropertyMap {
    objectSchemaName = null;
    initialized = false;
    mapping = {};
    nameByColumnKey = new Map();
    _names = [];
    initialize(objectSchema, defaults, options) {
        const { name: objectSchemaName, persistedProperties, computedProperties } = objectSchema;
        this.objectSchemaName = objectSchemaName;
        const properties = [...persistedProperties, ...computedProperties];
        this.mapping = Object.fromEntries(properties.map((property) => {
            const propertyName = property.publicName || property.name;
            const embedded = property.objectType
                ? options.getClassHelpers(property.objectType).objectSchema.tableType === 1 /* binding.TableType.Embedded */
                : false;
            const helpers = createPropertyHelpers({ ...property, embedded, objectSchemaName }, options);
            // Allow users to override the default value of properties
            const defaultValue = defaults[propertyName];
            helpers.default = typeof defaultValue !== "undefined" ? defaultValue : helpers.default;
            return [propertyName, helpers];
        }));
        this.nameByColumnKey = new Map(properties.map((p) => [p.columnKey, p.publicName || p.name]));
        this._names = properties.map((p) => p.publicName || p.name);
        this.initialized = true;
    }
    get = (property) => {
        if (this.initialized) {
            const helpers = this.mapping[property];
            if (!helpers) {
                throw new Error(`Property '${property}' does not exist on '${this.objectSchemaName}' objects`);
            }
            return helpers;
        }
        else {
            throw new UninitializedPropertyMapError();
        }
    };
    getName = (columnKey) => {
        if (this.initialized) {
            return this.nameByColumnKey.get(columnKey);
        }
        else {
            throw new UninitializedPropertyMapError();
        }
    };
    get names() {
        if (this.initialized) {
            return this._names;
        }
        else {
            throw new UninitializedPropertyMapError();
        }
    }
}
//# sourceMappingURL=PropertyMap.js.map