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
import { Class, Field, Method, NamedType, Property } from "./bound-model";
import { camelCase, pascalCase } from "change-case";
import { strict as assert } from "assert";

// Any js-specific data needed on the bound model will live in this file.

declare module "./bound-model" {
  interface Property {
    readonly jsName: string;
  }
  interface Method {
    readonly jsName: string;
  }
  interface NamedType {
    readonly jsName: string;
  }
  interface Field {
    readonly jsName: string;
  }
  interface Class {
    iteratorMethodId(): string;
  }
}

Object.defineProperty(Property.prototype, "jsName", {
  get(this: Property) {
    let name = this.name;
    if (name.startsWith("get_")) name = name.substring("get_".length);
    return camelCase(name);
  },
});

Object.defineProperty(Method.prototype, "jsName", {
  get(this: Method) {
    return camelCase(this.unique_name);
  },
});

Object.defineProperty(Field.prototype, "jsName", {
  get(this: Field) {
    return camelCase(this.name);
  },
});

Object.defineProperty(NamedType.prototype, "jsName", {
  get(this: NamedType) {
    return pascalCase(this.name);
  },
});

Class.prototype.iteratorMethodId = function () {
  assert(this.iterable);
  return `${this.name}_Symbol_iterator`;
};
