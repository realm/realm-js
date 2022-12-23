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
import { INTERNAL, KEY_ARRAY, KEY_SET, PropertyMap, REALM, RealmObject, assert, getClassHelpers, setClassHelpers, } from "./internal";
/**
 * @internal
 */
export class ClassMap {
    mapping;
    nameByTableKey;
    static createNamedConstructor(name) {
        const obj = {
            [name]: function () {
                /* no-op */
            },
        };
        return obj[name];
    }
    static createClass(schema, constructor) {
        const result = ClassMap.createNamedConstructor(schema.name);
        // Make the new constructor extend RealmObject
        // TODO: Use the end-users constructor, instead of `RealmObject` if provided
        if (constructor) {
            Object.setPrototypeOf(result, constructor);
            Object.setPrototypeOf(result.prototype, constructor.prototype);
        }
        else {
            Object.setPrototypeOf(result, RealmObject);
            Object.setPrototypeOf(result.prototype, RealmObject.prototype);
        }
        return result;
    }
    static defineProperties(constructor, schema, propertyMap, realm) {
        // Create bound functions for getting and setting properties
        const properties = [...schema.persistedProperties, ...schema.computedProperties];
        const propertyNames = properties.map((p) => p.publicName || p.name);
        // Build a map of property descriptors from the properties declared in the schema
        const descriptors = Object.fromEntries(properties.map((property) => {
            const propertyName = property.publicName || property.name;
            const { get, set } = propertyMap.get(propertyName);
            return [
                propertyName,
                {
                    enumerable: true,
                    get() {
                        return get(this[INTERNAL]);
                    },
                    set(value) {
                        set(this[INTERNAL], value);
                    },
                },
            ];
        }));
        descriptors[REALM] = {
            enumerable: false,
            configurable: false,
            writable: false,
            value: realm,
        };
        descriptors[KEY_ARRAY] = {
            enumerable: false,
            configurable: false,
            writable: false,
            value: propertyNames,
        };
        descriptors[KEY_SET] = {
            enumerable: false,
            configurable: false,
            writable: false,
            value: new Set(propertyNames),
        };
        Object.defineProperties(constructor.prototype, descriptors);
    }
    constructor(realm, realmSchema, canonicalRealmSchema) {
        this.mapping = Object.fromEntries(realmSchema.map((objectSchema, index) => {
            const canonicalObjectSchema = canonicalRealmSchema[index];
            assert.object(canonicalObjectSchema);
            // Create the wrapping class first
            const constructor = ClassMap.createClass(objectSchema, canonicalObjectSchema.constructor);
            // Create property getters and setters
            const properties = new PropertyMap();
            // Setting the helpers on the class
            setClassHelpers(constructor, {
                constructor,
                objectSchema,
                canonicalObjectSchema,
                properties,
                wrapObject(obj) {
                    if (obj.isValid) {
                        return RealmObject.createWrapper(realm, obj, constructor);
                    }
                    else {
                        return null;
                    }
                },
            });
            return [objectSchema.name, constructor];
        }));
        this.nameByTableKey = Object.fromEntries(realmSchema.map(({ name, tableKey }) => [tableKey, name]));
        for (const [index, objectSchema] of realmSchema.entries()) {
            const canonicalObjectSchema = canonicalRealmSchema[index];
            const defaults = Object.fromEntries(Object.entries(canonicalObjectSchema.properties).map(([name, property]) => {
                return [name, property.default];
            }));
            const constructor = this.mapping[objectSchema.name];
            // Get the uninitialized property map
            const { properties } = getClassHelpers(constructor);
            // Initialize the property map, now that all classes have helpers set
            properties.initialize(objectSchema, defaults, {
                realm,
                getClassHelpers: (name) => this.getHelpers(name),
            });
            // Transfer property getters and setters onto the prototype of the class
            ClassMap.defineProperties(constructor, objectSchema, properties, realm);
        }
    }
    get(arg) {
        if (typeof arg === "string") {
            const constructor = this.mapping[arg];
            if (!constructor) {
                throw new Error(`Object type '${arg}' not found in schema.`);
            }
            return constructor;
        }
        else if (arg instanceof RealmObject) {
            const result = this.get(arg.constructor.name);
            assert(result === arg.constructor || Object.getPrototypeOf(result) === arg.constructor, "Constructor was not registered in the schema for this Realm");
            return result;
        }
        else if (typeof arg === "function") {
            assert.extends(arg, RealmObject);
            assert.object(arg.schema, "schema static");
            assert.string(arg.schema.name, "name");
            const result = this.get(arg.schema.name);
            assert(result === arg || Object.getPrototypeOf(result) === arg, "Constructor was not registered in the schema for this Realm");
            return result;
        }
        else if (arg in this.nameByTableKey) {
            const name = this.nameByTableKey[arg];
            return this.get(name);
        }
        else {
            throw new Error("Expected an object schema name, object instance or class");
        }
    }
    getHelpers(arg) {
        const constructor = this.get(arg);
        return getClassHelpers(constructor);
    }
}
//# sourceMappingURL=ClassMap.js.map