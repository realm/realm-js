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
import { assert } from "../internal";
const TYPE_MAPPINGS = {
    [0 /* PropertyType.Int */]: "int",
    [1 /* PropertyType.Bool */]: "bool",
    [2 /* PropertyType.String */]: "string",
    [3 /* PropertyType.Data */]: "data",
    [4 /* PropertyType.Date */]: "date",
    [5 /* PropertyType.Float */]: "float",
    [6 /* PropertyType.Double */]: "double",
    [9 /* PropertyType.Mixed */]: "mixed",
    [10 /* PropertyType.ObjectId */]: "objectId",
    [11 /* PropertyType.Decimal */]: "decimal128",
    [12 /* PropertyType.UUID */]: "uuid",
    [128 /* PropertyType.Array */]: "list",
    [256 /* PropertyType.Set */]: "set",
    [512 /* PropertyType.Dictionary */]: "dictionary",
    [8 /* PropertyType.LinkingObjects */]: "linkingObjects",
    [7 /* PropertyType.Object */]: "object",
    // These have no direct
    [64 /* PropertyType.Nullable */]: null,
    //
    [896 /* PropertyType.Collection */]: null,
    [960 /* PropertyType.Flags */]: null,
};
/**
 * Get the string representation of a property type's base type (not including flags)
 * @internal
 */
export function getTypeName(type, objectType) {
    const baseType = type & ~960 /* PropertyType.Flags */;
    if (type & 128 /* PropertyType.Array */) {
        if (baseType === 7 /* PropertyType.Object */) {
            return `list<${objectType}>`;
        }
        else {
            return `list<${getTypeName(baseType, objectType)}>`;
        }
    }
    else if (type & 256 /* PropertyType.Set */) {
        return `set<${getTypeName(baseType, objectType)}>`;
    }
    else if (type & 512 /* PropertyType.Dictionary */) {
        return `dictionary<${getTypeName(baseType, objectType)}>`;
    }
    else if (baseType === 7 /* PropertyType.Object */ && objectType) {
        assert.string(objectType, "objectType");
        return `<${objectType}>`;
    }
    else {
        const result = TYPE_MAPPINGS[baseType];
        assert(result, `Unexpected type ${type}`);
        return result;
    }
}
const COLLECTION_TYPES = [128 /* PropertyType.Array */, 256 /* PropertyType.Set */, 512 /* PropertyType.Dictionary */];
/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L433-L478
 * @param objectSchema The object schema, as represented by the binding.
 * @returns The object schema, as represented by the SDK.
 * @internal
 */
export function fromBindingObjectSchema({ name, computedProperties, persistedProperties, primaryKey, tableType, }) {
    const properties = [...computedProperties, ...persistedProperties];
    const result = {
        constructor: undefined,
        name,
        properties: Object.fromEntries(properties.map((property) => [property.publicName || property.name, fromBindingPropertySchema(property)])),
        embedded: tableType === 1 /* TableType.Embedded */,
        asymmetric: tableType === 2 /* TableType.TopLevelAsymmetric */,
    };
    // The primary key from the binding is an empty string when not set
    if (primaryKey) {
        result.primaryKey = primaryKey;
    }
    return result;
}
/**
 * Implements https://github.com/realm/realm-js/blob/v11/src/js_schema.hpp#L480-L530
 * @param propertySchema The property schema, as represented by the binding.
 * @returns The property schema, as represented by the SDK.
 * @internal
 */
export function fromBindingPropertySchema(propertySchema) {
    const { name, isIndexed, publicName } = propertySchema;
    const result = {
        name,
        indexed: isIndexed,
        mapTo: name,
        ...fromBindingPropertyTypeName(propertySchema),
    };
    if (publicName) {
        result.name = publicName;
    }
    return result;
}
/**
 * Used to
 * @param propertySchema The property schema, as represented by the binding.
 * @returns A partial property schema, as represented by the SDK.
 */
function fromBindingPropertyTypeName(propertySchema) {
    const { type, objectType, linkOriginPropertyName } = propertySchema;
    const itemType = type & ~896 /* PropertyType.Collection */;
    if (type & 64 /* PropertyType.Nullable */) {
        const item = fromBindingPropertyTypeName({ ...propertySchema, type: type & ~64 /* PropertyType.Nullable */ });
        return { ...item, optional: true };
    }
    if (itemType === 8 /* PropertyType.LinkingObjects */) {
        assert(type & 128 /* PropertyType.Array */);
        assert.string(linkOriginPropertyName, "linkOriginPropertyName");
        return {
            type: "linkingObjects",
            optional: false,
            objectType,
            property: linkOriginPropertyName,
        };
    }
    for (const collectionType of COLLECTION_TYPES) {
        if (type & collectionType) {
            const item = fromBindingPropertyTypeName({ ...propertySchema, type: itemType });
            return {
                type: TYPE_MAPPINGS[collectionType],
                objectType: item.type === "object" ? item.objectType : item.type,
                optional: item.type === "object" ? false : item.optional,
            };
        }
    }
    if (type === 7 /* PropertyType.Object */) {
        if (!objectType) {
            throw new Error("Expected property with 'object' type to declare an objectType");
        }
        // TODO: Decide if this change is resonable
        return { type: "object", objectType, optional: true }; // Implicitly nullable
    }
    else if (type === 8 /* PropertyType.LinkingObjects */) {
        if (!objectType) {
            throw new Error("Expected property with 'object' type to declare an objectType");
        }
        return { type: "linkingObjects", objectType, optional: false };
    }
    const mappedType = TYPE_MAPPINGS[type];
    if (mappedType) {
        return { type: mappedType, optional: false };
    }
    else {
        throw new Error(`Unexpected type '${type}'`);
    }
}
/** @internal */
export function fromBindingRealmSchema(schema) {
    return schema.map(fromBindingObjectSchema);
}
//# sourceMappingURL=from-binding.js.map