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

import {
  ObjectSchema as BindingObjectSchema,
  Property as BindingProperty,
  PropertyType as BindingPropertyType,
} from "@realm/bindgen";
import { COLLECTION_TYPES, PRIMITIVE_TYPES } from "./normalize";
import { CanonicalObjectSchema, CanonicalObjectSchemaProperty, PropertyTypeName } from "./types";

export const TYPE_MAPPINGS: Record<PropertyTypeName, BindingPropertyType> = {
  int: BindingPropertyType.Int,
  bool: BindingPropertyType.Bool,
  string: BindingPropertyType.String,
  data: BindingPropertyType.Data,
  date: BindingPropertyType.Date,
  float: BindingPropertyType.Float,
  double: BindingPropertyType.Double,
  mixed: BindingPropertyType.Mixed,
  objectId: BindingPropertyType.ObjectId,
  decimal128: BindingPropertyType.Decimal,
  uuid: BindingPropertyType.UUID,
  list: BindingPropertyType.Array,
  set: BindingPropertyType.Set,
  dictionary: BindingPropertyType.Dictionary,
  linkingObjects: BindingPropertyType.LinkingObjects,
  object: BindingPropertyType.Object,
};

export function transformRealmSchema(schema: CanonicalObjectSchema[]): BindingObjectSchema[] {
  return schema.map(transformObjectSchema);
}

export function transformObjectSchema(schema: CanonicalObjectSchema): BindingObjectSchema {
  // TODO: Enable declaring the alias of the object schema
  // TODO: Enable declaring the table type (asymmetric / embedded)
  // TODO: Enable declaring computed properties
  const properties = Object.entries(schema.properties).map(([name, property]) =>
    transformPropertySchema(name, property),
  );
  return {
    name: schema.name,
    primaryKey: schema.primaryKey,
    persistedProperties: properties.filter((p) => p.type !== BindingPropertyType.LinkingObjects),
    computedProperties: properties.filter((p) => p.type === BindingPropertyType.LinkingObjects),
  };
}

export function transformPropertySchema(name: string, schema: CanonicalObjectSchemaProperty): BindingProperty {
  if (name !== schema.name) {
    // TODO: Consider if this API should be used to support declaring an alias?
    throw new Error("The key of a property must match its name property");
  }
  const result: BindingProperty = {
    name,
    type: transformPropertyType(schema),
    isIndexed: schema.indexed,
    publicName: name !== schema.mapTo ? schema.mapTo : undefined,
    objectType: schema.objectType && schema.objectType in TYPE_MAPPINGS ? undefined : schema.objectType,
  };
  return result;
}

export function transformPropertyType(schema: CanonicalObjectSchemaProperty): BindingPropertyType {
  let type = TYPE_MAPPINGS[schema.type];
  if (schema.objectType) {
    if (schema.objectType in TYPE_MAPPINGS) {
      type |= TYPE_MAPPINGS[schema.objectType as PropertyTypeName];
    } else {
      type |= BindingPropertyType.Object;
    }
  }
  if (schema.optional && !(type & BindingPropertyType.Collection)) {
    type |= BindingPropertyType.Nullable;
  }
  return type;

  /*
  
    using realm::PropertyType;
    if (!type || !type.size()) {
        throw std::logic_error(util::format("Property '%1.%2' must have a non-empty type", object_name, prop.name));
    }

    if (type.ends_with("[]")) {
        prop.type |= PropertyType::Array;
        type = type.substr(0, type.size() - 2);
    }

    if (type.ends_with("<>")) {
        prop.type |= PropertyType::Set;
        type = type.substr(0, type.size() - 2);
    }

    if (type.ends_with("?")) {
        prop.type |= PropertyType::Nullable;
        type = type.substr(0, type.size() - 1);
    }

    if (type.ends_with("{}")) {
        prop.type |= PropertyType::Dictionary;
        type = type.substr(0, type.size() - 2);

        if (type == "") {
            prop.type |= PropertyType::Mixed | PropertyType::Nullable;
            return;
        }
    }

    if (type == "bool") {
        prop.type |= PropertyType::Bool;
    }
    else if (type == "mixed") {
        prop.type |= PropertyType::Nullable | PropertyType::Mixed;
    }
    else if (type == "int") {
        prop.type |= PropertyType::Int;
    }
    else if (type == "float") {
        prop.type |= PropertyType::Float;
    }
    else if (type == "double") {
        prop.type |= PropertyType::Double;
    }
    else if (type == "string") {
        prop.type |= PropertyType::String;
    }
    else if (type == "date") {
        prop.type |= PropertyType::Date;
    }
    else if (type == "data") {
        prop.type |= PropertyType::Data;
    }
    else if (type == "decimal128") {
        prop.type |= PropertyType::Decimal;
    }
    else if (type == "objectId") {
        prop.type |= PropertyType::ObjectId;
    }
    else if (type == "uuid") {
        prop.type |= PropertyType::UUID;
    }
    else if (type == "list") {
        if (prop.object_type == "bool") {
            prop.type |= PropertyType::Bool | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "int") {
            prop.type |= PropertyType::Int | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "float") {
            prop.type |= PropertyType::Float | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "double") {
            prop.type |= PropertyType::Double | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "string") {
            prop.type |= PropertyType::String | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "date") {
            prop.type |= PropertyType::Date | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "data") {
            prop.type |= PropertyType::Data | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "decimal128") {
            prop.type |= PropertyType::Decimal | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "objectId") {
            prop.type |= PropertyType::ObjectId | PropertyType::Array;
            prop.object_type = "";
        }
        else if (prop.object_type == "uuid") {
            prop.type |= PropertyType::UUID | PropertyType::Array;
            prop.object_type = "";
        }

        else {
            if (is_nullable(prop.type)) {
                throw std::logic_error(
                    util::format("List property '%1.%2' cannot be optional", object_name, prop.name));
            }
            if (is_array(prop.type)) {
                throw std::logic_error(
                    util::format("List property '%1.%2' must have a non-list value type", object_name, prop.name));
            }
            prop.type |= PropertyType::Object | PropertyType::Array;
        }
    }
    else if (type == "set") {
        // apply the correct properties for sets
        realm::js::set::derive_property_type(object_name, prop); // may throw std::logic_error
    }
    else if (type == "dictionary") {
        // apply the correct properties for dictionaries
        realm::js::dictionary::derive_property_type(object_name, prop); // may throw std::logic_error
    }
    else if (type == "linkingObjects") {
        prop.type |= PropertyType::LinkingObjects | PropertyType::Array;
    }
    else if (type == "object") {
        prop.type |= PropertyType::Object;
    }
    else {
        // The type could be the name of another object type in the same schema.
        prop.type |= PropertyType::Object;
        prop.object_type = type;
        // Dictionary of object properties are implicitly optional
        if (is_dictionary(prop.type)) {
            prop.type |= PropertyType::Nullable;
        }
    }

    // Only Object properties are implicitly optional
    if (prop.type == PropertyType::Object && !is_array(prop.type) && !is_set(prop.type)) {
        prop.type |= PropertyType::Nullable;
    }
   */
}
