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

import { Object as RealmObject } from "../Object";

export type DefaultObject = Record<string, unknown>;
export type Constructor<T = unknown> = { new (...args: unknown[]): T };
export type RealmObjectConstructor<T = unknown> = Constructor<RealmObject<T> & T>;

export type PropertyTypeName =
  | "bool"
  | "int"
  | "float"
  | "double"
  | "decimal128"
  | "objectId"
  | "string"
  | "data"
  | "date"
  | "list"
  | "linkingObjects"
  | "mixed"
  | "uuid"
  | "dictionary"
  | "set"
  | "object";

export type PropertyType = string | PropertyTypeName;

/**
 * The canonical representation of the schema of a specific type of object.
 */
export type CanonicalObjectSchema<T = DefaultObject> = {
  name: string;
  properties: Record<keyof T, CanonicalObjectSchemaProperty>;
  primaryKey?: string;
  embedded?: boolean;
  asymmetric?: boolean;
};

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
};

/**
 * The relaxed representation of the schema of a specific type of object.
 */
export type ObjectSchema = {
  name: string;
  primaryKey?: string;
  embedded?: boolean;
  asymmetric?: boolean;
  properties: PropertiesTypes;
};

export type PropertiesTypes = {
  [keys: string]: ObjectSchemaProperty | PropertyType;
};

// TODO: Rename this to PropertySchema
/**
 * The relaxed representation of the schema of a specific property.
 */
export type ObjectSchemaProperty = {
  type: PropertyType;
  objectType?: string;
  property?: string;
  default?: unknown;
  optional?: boolean;
  indexed?: boolean;
  mapTo?: string;
};
