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

import { camelCase } from "change-case";

import { TemplateContext } from "../context";

function generateTSType(specType: string) {
  return "unknown";
}

function generateArguments(specType: string) {
  return "/* arguments */";
}

export function generateTypeScript({ spec, file }: TemplateContext): void {
  const out = file("index.d.ts", "eslint");
  out("// This file is generated: Update the spec instead of editing this file directly", "!");
  for (const [name, { methods, properties, staticMethods }] of Object.entries(spec.classes)) {
    out(`declare class ${name} {`);
    for (const [name, types] of Object.entries(staticMethods)) {
      for (const type of types) {
        out("static", camelCase(name), "(", generateArguments(type), "): unknown;");
      }
    }
    for (const [name, type] of Object.entries(properties)) {
      out(camelCase(name), `: ${generateTSType(type)}`);
    }
    for (const [name, types] of Object.entries(methods)) {
      for (const type of types) {
        out("static", camelCase(name), "(", generateArguments(type), "): unknown;");
      }
    }
    out(`}`);
  }
}
