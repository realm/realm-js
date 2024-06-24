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

import { CanonicalObjectSchema, assert, binding, createPropertyHelpers } from "./internal";
import { HelperOptions, PropertyHelpers } from "./property-accessors/types";

class UninitializedPropertyMapError extends Error {
  constructor() {
    super("Property Map was accessed before it got initialized");
  }
}

/** @internal */
export class PropertyMap {
  private objectSchemaName: string | null = null;
  private initialized = false;
  private mapping: Record<string, PropertyHelpers | undefined> = {};
  /**
   * Note: Cannot key by the binding.ColKey directly, as this is `Long` on JSC (which does not pass equality checks like `bigint` does)
   */
  private nameByColumnKeyString: Map<string, string> = new Map();
  private _names: string[] = [];

  public initialize(
    objectSchema: binding.ObjectSchema,
    canonicalObjectSchema: CanonicalObjectSchema,
    defaults: Record<string, unknown>,
    options: HelperOptions,
  ) {
    const { name: objectSchemaName, persistedProperties, computedProperties } = objectSchema;
    this.objectSchemaName = objectSchemaName;
    const properties = [...persistedProperties, ...computedProperties];
    this.mapping = Object.fromEntries(
      properties.map((property) => {
        const propertyName = property.publicName || property.name;
        const embedded = property.objectType
          ? options.getClassHelpers(property.objectType).objectSchema.tableType === binding.TableType.Embedded
          : false;

        const canonicalPropertySchema = canonicalObjectSchema.properties[propertyName];
        assert(canonicalPropertySchema, `Expected '${propertyName}' to exist on the CanonicalObjectSchema.`);
        const helpers = createPropertyHelpers(
          { ...property, embedded, objectSchemaName, presentation: canonicalPropertySchema.presentation },
          options,
        );
        // Allow users to override the default value of properties
        const defaultValue = defaults[propertyName];
        helpers.default = typeof defaultValue !== "undefined" ? defaultValue : helpers.default;

        return [propertyName, helpers];
      }),
    );
    this.nameByColumnKeyString = new Map(properties.map((p) => [p.columnKey.toString(), p.publicName || p.name]));
    this._names = properties.map((p) => p.publicName || p.name);
    this.initialized = true;
  }

  public get = (property: string): PropertyHelpers => {
    if (this.initialized) {
      const helpers = this.mapping[property];
      if (!helpers) {
        throw new Error(`Property '${property}' does not exist on '${this.objectSchemaName}' objects`);
      }
      return helpers;
    } else {
      throw new UninitializedPropertyMapError();
    }
  };

  public getName = <T>(columnKey: binding.ColKey): keyof T => {
    if (this.initialized) {
      return this.nameByColumnKeyString.get(columnKey.toString()) as keyof T;
    } else {
      throw new UninitializedPropertyMapError();
    }
  };

  public get names(): string[] {
    if (this.initialized) {
      return this._names;
    } else {
      throw new UninitializedPropertyMapError();
    }
  }
}
