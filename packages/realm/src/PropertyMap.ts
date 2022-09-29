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

import * as binding from "./binding";

import { createHelpers, HelperOptions, PropertyHelpers } from "./PropertyHelpers";

type BindingObjectSchema = binding.Realm["schema"][0];

class UninitializedPropertyMapError extends Error {
  constructor() {
    super("Property Map was accessed before it got initialized");
  }
}

/** @internal */
export class PropertyMap {
  private initialized = false;
  private mapping: Record<string, PropertyHelpers> = {};
  private nameByColumnKey: Map<binding.ColKey, string> = new Map();
  private _names: string[] = [];

  public initialize(objectSchema: BindingObjectSchema, defaults: Record<string, unknown>, options: HelperOptions) {
    const properties = [...objectSchema.persistedProperties, ...objectSchema.computedProperties];
    this.mapping = Object.fromEntries(
      properties.map((property) => {
        const helpers = createHelpers(property, options);
        // Allow users to override the default value of properties
        const defaultValue = defaults[property.name];
        helpers.default = typeof defaultValue !== "undefined" ? defaultValue : helpers.default;
        return [property.name, helpers];
      }),
    );
    this.nameByColumnKey = new Map(properties.map((p) => [p.columnKey, p.publicName || p.name]));
    this._names = properties.map((p) => p.publicName || p.name);
    this.initialized = true;
  }

  public get = (property: string): PropertyHelpers => {
    if (this.initialized) {
      return this.mapping[property];
    } else {
      throw new UninitializedPropertyMapError();
    }
  };

  public getName = <T>(columnKey: binding.ColKey): keyof T => {
    if (this.initialized) {
      return this.nameByColumnKey.get(columnKey) as keyof T;
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
