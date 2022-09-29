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

/** @internal */
export class PropertyMap {
  private mapping: Record<string, PropertyHelpers>;
  private readonly nameByColumnKey: Map<binding.ColKey, string>;

  public names: string[];

  /**
   * @param objectSchema
   * TODO: Refactor this to use the binding.ObjectSchema type once the DeepRequired gets removed from types
   */
  constructor(objectSchema: BindingObjectSchema, defaults: Record<string, unknown>, options: HelperOptions) {
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
    // TODO: Consider including the computed properties?
    this.names = properties.map((p) => p.publicName || p.name);
  }

  public get = (property: string): PropertyHelpers => {
    return this.mapping[property];
  };

  public getName = <T>(columnKey: binding.ColKey): keyof T => {
    return this.nameByColumnKey.get(columnKey) as keyof T;
  };
}
