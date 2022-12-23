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
  Realm, // Used by TS docs
  RealmObject,
} from "../internal";

export type DefaultObject = Record<string, unknown>;
export type Constructor<T = unknown> = { new (...args: any): T };
export type RealmObjectConstructor<T extends RealmObject = RealmObject> = {
  new (...args: any): T;
  schema: ObjectSchema;
};

/**
 * The names of the supported Realm property types.
 */
export type PropertyTypeName = PrimitivePropertyTypeName | CollectionPropertyTypeName | RelationshipPropertyTypeName;

/**
 * The names of the supported Realm primitive property types.
 */
export type PrimitivePropertyTypeName =
  | "bool"
  | "int"
  | "float"
  | "double"
  | "decimal128"
  | "objectId"
  | "string"
  | "data"
  | "date"
  | "mixed"
  | "uuid";

/**
 * The names of the supported Realm collection property types.
 */
export type CollectionPropertyTypeName = "list" | "dictionary" | "set";

/**
 * The names of the supported Realm relationship property types.
 */
export type RelationshipPropertyTypeName = "object" | "linkingObjects";

/**
 * The name of a user-defined Realm object type. It must contain at least 1 character
 * and cannot be a {@link PropertyTypeName}. (Unicode is supported.)
 */
export type UserTypeName = string;

// TODO: Can be removed when ObjectSchemaProperty is removed
export type PropertyType = UserTypeName | PropertyTypeName;

/**
 * The list of object schemas belonging to a specific {@link Realm}.
 */
export type CanonicalRealmSchema = CanonicalObjectSchema[];

/**
 * The canonical representation of the schema of a specific type of object.
 */
export type CanonicalObjectSchema<T = DefaultObject> = {
  name: string;
  properties: Record<keyof T, CanonicalObjectSchemaProperty>;
  primaryKey?: string;
  embedded?: boolean;
  asymmetric?: boolean;
  ctor?: RealmObjectConstructor;
};

// TODO: Rename to CanonicalPropertySchema (when ObjectSchemaProperty is renamed to PropertySchema)
/**
 * The canonical representation of the schema of a specific property.
 */
export type CanonicalObjectSchemaProperty = {
  name: string;
  type: PropertyTypeName;
  optional: boolean;
  indexed: boolean;
  mapTo: string; // TODO: Make this optional and leave it out when it equals the name
  objectType?: string;
  property?: string;
  default?: unknown;
};

/**
 * The schema for specifying the type of Realm object.
 */
export type ObjectSchema = {
  /**
   * The name of the Realm object type. The name must be unique across all objects
   * within the same Realm.
   */
  name: string;
  /**
   * The name of the property in `properties` that is used as the primary key. The
   * value of that property must be unique across all objects of this type within
   * the same Realm.
   */
  primaryKey?: string;
  /**
   * Whether the object is embedded. An embedded object always belongs to exactly
   * one parent object and is deleted if its parent is deleted.
   *
   * Default value: `false`.
   */
  embedded?: boolean;
  /**
   * Whether the object is used in asymmetric sync. An object that is asymmetrically
   * synced is not stored locally and cannot be accessed locally. Querying such
   * objects will throw an error. This is useful for write-heavy applications that
   * only need to get data from devices to the cloud fast.
   *
   * Default value: `false`.
   */
  asymmetric?: boolean;
  /**
   * The properties and their types belonging to this object.
   */
  properties: PropertiesTypes;
};

/**
 * The properties of a Realm object defined in {@link ObjectSchema.properties} where
 * the key is the name of the property and the value is its type.
 */
export type PropertiesTypes = {
  [key: string]: PropertySchema | PropertySchemaShorthand;
};

// TODO: When we rename this to PropertySchema, use the PropertySchema type already
//       defined further below in this file which has the correct documentation.
/**
 * The relaxed representation of the schema of a specific property.
 */
export type ObjectSchemaProperty = {
  type: PropertyType;
  objectType?: string; // TODO: Rename to elementType
  property?: string;
  default?: unknown;
  optional?: boolean;
  indexed?: boolean;
  mapTo?: string;
};

/**
 * The shorthand string representation of a schema for specifying the type of a
 * Realm object property.
 *
 * Required string structure:
 * - ({@link PrimitivePropertyTypeName} | {@link UserTypeName})(`"?"` | `""`)(`"[]"` | `"{}"` | `"<>"` | `""`)
 *   - `"?"`
 *     - The marker to declare an optional type or an optional element in a collection
 *       if the type itself is a collection. Can only be used when declaring property
 *       types using this shorthand string notation.
 *   - `"[]"` (list)
 *   - `"{}"` (dictionary)
 *   - `"<>"` (set)
 *     - The markers to declare a collection type. Can only be used when declaring
 *       property types using this shorthand string notation.
 *
 * @example
 * "int"
 * "int?"
 * "int[]"
 * "int?[]"
 */
export type PropertySchemaShorthand = string;

/**
 * The schema for specifying the type of a specific Realm object property.
 *
 * Requirements:
 * - `"mixed"` types are always optional because `null` is a valid value within `"mixed"`
 *   itself. Therefore, they cannot be made non-optional.
 * - User-defined object types are always optional except in lists and sets due to the
 *   object being deleted whenever it is removed from lists and sets and are therefore
 *   never set to `null` or `undefined`. Whereas in in dictionaries, deleted values are
 *   set to `null` and cannot be made non-optional.
 * - Properties declared as the primary key in {@link ObjectSchema.primaryKey} are always
 *   indexed. In such cases, they cannot be made non-indexed.
 *
 * @see {@link PropertySchemaStrict} for a precise type definition of the requirements
 * with the allowed combinations. This type is less strict in order to provide a more
 * user-friendly option due to misleading TypeScript error messages when working with
 * the strict type. This type is currently recommended for that reason, but the strict
 * type is provided as guidance. (Exact errors will always be shown when creating a
 * {@link Realm} instance if the schema is invalid.)
 */
export type PropertySchema = {
  /**
   * The type of the property.
   */
  type: PropertyTypeName;
  /**
   * The type of the elements in the collection if `type` is a {@link CollectionPropertyTypeName},
   * or the specific Realm object type if `type` is a {@link RelationshipPropertyTypeName}.
   */
  objectType?: PrimitivePropertyTypeName | UserTypeName;
  /**
   * The name of the property of the object specified in `objectType` that creates this
   * link. (Can only be set for linking objects.)
   */
  property?: string;
  /**
   * Whether to allow `null` or `undefined` to be assigned to the property; or in the
   * case of a collection, to be assigned to its elements. (Realm object types in lists
   * and sets cannot be optional.)
   *
   * Default value: `false` except in cases listed in the documentation for this type.
   */
  optional?: boolean;
  /**
   * Whether the property should be indexed.
   *
   * Default value: `false` if the property is not a primary key, otherwise `true`.
   */
  indexed?: boolean;
  /**
   * The name to be persisted in the Realm file if it differs from the already-defined
   * JavaScript/TypeScript (JS/TS) property name. This is useful for allowing different
   * naming conventions than what is persisted in the Realm file. Reading and writing
   * properties must be done using the JS/TS name, but queries can use either the JS/TS
   * name or the persisted name.
   */
  mapTo?: string;
  /**
   * The default value that the property will be set to when created.
   */
  default?: unknown;
};

/**
 * Keys used in the property schema that are common among all variations of {@link PropertySchemaStrict}.
 */
type PropertySchemaCommon = {
  indexed?: boolean;
  mapTo?: string;
  default?: unknown;
};

/**
 * The strict schema for specifying the type of a specific Realm object property.
 *
 * Unlike the less strict {@link PropertySchema}, this type precisely defines the type
 * requirements and their allowed combinations; however, TypeScript error messages tend
 * to be more misleading. {@link PropertySchema} is recommended for that reason, but the
 * strict type is provided as guidance.
 *
 * @see {@link PropertySchema} for a textual explanation of the requirements defined here,
 *   as well as documentation for each property.
 */
export type PropertySchemaStrict = PropertySchemaCommon &
  (
    | {
        type: Exclude<PrimitivePropertyTypeName, "mixed">;
        optional?: boolean;
      }
    | {
        type: "mixed";
        optional?: true;
      }
    | {
        type: CollectionPropertyTypeName;
        objectType: Exclude<PrimitivePropertyTypeName, "mixed">;
        optional?: boolean;
      }
    | {
        type: CollectionPropertyTypeName;
        objectType: "mixed";
        optional?: true;
      }
    | {
        type: "list" | "set";
        objectType: UserTypeName;
        optional?: false;
      }
    | {
        type: "dictionary";
        objectType: UserTypeName;
        optional?: true;
      }
    | {
        type: "object";
        objectType: UserTypeName;
        optional?: true;
      }
    | {
        type: "linkingObjects";
        objectType: UserTypeName;
        property: string;
        optional?: false;
      }
  );
