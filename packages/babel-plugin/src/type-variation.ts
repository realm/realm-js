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

export enum OptionalVariant {
  Required = "required",
  QuestionMark = "question-mark",
  UndefinedLeft = "undefined-left",
  UndefinedRight = "undefined-right",
}

export type TypeVariant = {
  optional: OptionalVariant;
  propertyName: string;
  typeName?: string;
  initializer?: string;
};

export type TypeGeneratorOptions = {
  name: string;
  types: (string | undefined)[];
  initializer?: string;
  optionals: OptionalVariant[];
};

export function generateTypeString({ optional, propertyName, typeName, initializer }: TypeVariant): string {
  let result = propertyName;
  if (optional === OptionalVariant.QuestionMark) {
    result += "?";
  }
  if (typeName !== undefined) {
    result += ": ";
  }
  if (optional === OptionalVariant.UndefinedLeft) {
    result += "undefined | ";
  }
  if (typeName !== undefined) {
    result += typeName;
  }
  if (optional === OptionalVariant.UndefinedRight) {
    result += " | undefined";
  }
  if (initializer !== undefined) {
    result += " = " + initializer;
  }
  result += ";";
  return result;
}

export function generateTypeVariants({ name, types, initializer, optionals }: TypeGeneratorOptions): TypeVariant[] {
  const result: TypeVariant[] = [];
  for (const type of types) {
    for (const optional of optionals) {
      if (typeof type === "undefined" && optional !== OptionalVariant.Required) {
        // Cannot generate an optional property without a type
        continue;
      } else if (typeof type === "undefined" && typeof initializer === "undefined") {
        // Cannot infer type when no initializer is given
        continue;
      }
      result.push({ optional, typeName: type, propertyName: name, initializer });
    }
  }
  return result;
}
