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

export type TypeVariant = {
  questionMark: boolean;
  propertyName: string;
  typeName?: string;
  initializer?: string;
};

export type TypeGeneratorOptions = {
  name: string;
  types: (string | undefined)[];
  initializer?: string;
  questionMark: boolean;
};

export function generateTypeString({ questionMark, propertyName, typeName, initializer }: TypeVariant): string {
  let result = propertyName;
  if (questionMark) {
    result += "?";
  }
  if (typeName !== undefined) {
    result += ": ";
  }
  if (typeName !== undefined) {
    result += typeName;
  }
  if (initializer !== undefined) {
    result += " = " + initializer;
  }
  result += ";";
  return result;
}

export function generateTypeVariants({ name, types, initializer, questionMark }: TypeGeneratorOptions): TypeVariant[] {
  const result: TypeVariant[] = [];
  for (const type of types) {
    if (typeof type === "undefined" && typeof initializer === "undefined") {
      // Cannot infer type when no initializer is given
      continue;
    }
    result.push({ questionMark, typeName: type, propertyName: name, initializer });
  }
  return result;
}
