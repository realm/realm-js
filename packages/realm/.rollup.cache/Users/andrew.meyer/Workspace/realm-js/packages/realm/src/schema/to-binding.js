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
/** @internal */
export const TYPE_MAPPINGS = {
    int: 0 /* BindingPropertyType.Int */,
    bool: 1 /* BindingPropertyType.Bool */,
    string: 2 /* BindingPropertyType.String */,
    data: 3 /* BindingPropertyType.Data */,
    date: 4 /* BindingPropertyType.Date */,
    float: 5 /* BindingPropertyType.Float */,
    double: 6 /* BindingPropertyType.Double */,
    mixed: 9 /* BindingPropertyType.Mixed */,
    objectId: 10 /* BindingPropertyType.ObjectId */,
    decimal128: 11 /* BindingPropertyType.Decimal */,
    uuid: 12 /* BindingPropertyType.UUID */,
    list: 128 /* BindingPropertyType.Array */,
    set: 256 /* BindingPropertyType.Set */,
    dictionary: 512 /* BindingPropertyType.Dictionary */,
    linkingObjects: 8 /* BindingPropertyType.LinkingObjects */,
    object: 7 /* BindingPropertyType.Object */,
};
function deriveTableType(schema) {
    if (schema.embedded) {
        assert.boolean(schema.asymmetric, `'${schema.name}' cannot be both embedded and asymmetric`);
        return 1 /* TableType.Embedded */;
    }
    else if (schema.asymmetric) {
        return 2 /* TableType.TopLevelAsymmetric */;
    }
    else {
        return 0 /* TableType.TopLevel */;
    }
}
/** @internal */
export function toBindingSchema(schema) {
    return schema.map(toBindingObjectSchema);
}
/** @internal */
export function toBindingObjectSchema(schema) {
    // TODO: Enable declaring the alias of the object schema
    // TODO: Enable declaring computed properties
    const properties = Object.entries(schema.properties)
        .map(([name, property]) => toBindingPropertySchema(name, property))
        .map((property) => {
        // Ensure the primary property is marked accordingly
        if (property.name === schema.primaryKey) {
            property.isPrimary = true;
        }
        return property;
    });
    const result = {
        name: schema.name,
        tableType: deriveTableType(schema),
        persistedProperties: properties.filter((p) => (p.type & ~960 /* BindingPropertyType.Flags */) !== 8 /* BindingPropertyType.LinkingObjects */),
        computedProperties: properties.filter((p) => (p.type & ~960 /* BindingPropertyType.Flags */) === 8 /* BindingPropertyType.LinkingObjects */),
    };
    // The object schema itself must also know the name of the primary key
    if (schema.primaryKey) {
        result.primaryKey = schema.primaryKey;
    }
    return result;
}
/** @internal */
export function toBindingPropertySchema(name, schema) {
    if (name !== schema.name) {
        // TODO: Consider if this API should be used to support declaring an alias?
        throw new Error("The key of a property must match its name property");
    }
    const result = {
        name,
        type: toBindingPropertyType(schema),
        isIndexed: schema.indexed,
        objectType: schema.objectType && schema.objectType in TYPE_MAPPINGS ? undefined : schema.objectType,
        linkOriginPropertyName: schema.property,
    };
    if (schema.mapTo && schema.mapTo !== schema.name) {
        result.publicName = result.name;
        result.name = schema.mapTo;
    }
    return result;
}
/** @internal */
export function toBindingPropertyType(schema) {
    let type = TYPE_MAPPINGS[schema.type];
    let isNullable = schema.optional;
    if (type === 8 /* BindingPropertyType.LinkingObjects */) {
        return type | 128 /* BindingPropertyType.Array */;
    }
    else if (schema.objectType) {
        if (schema.objectType in TYPE_MAPPINGS) {
            type |= TYPE_MAPPINGS[schema.objectType];
            if (schema.objectType === "mixed") {
                // Implicitly nullable - will throw if not sat
                isNullable = true;
            }
        }
        else {
            type |= 7 /* BindingPropertyType.Object */;
            // Implicitly nullable - will throw if sat
            if (!(type & 512 /* BindingPropertyType.Dictionary */)) {
                isNullable = false;
            }
        }
    }
    if (schema.type === "object" || schema.type === "mixed") {
        // Implicitly nullable - will throw if not sat
        isNullable = true;
    }
    if (isNullable) {
        type |= 64 /* BindingPropertyType.Nullable */;
    }
    return type;
}
//# sourceMappingURL=to-binding.js.map