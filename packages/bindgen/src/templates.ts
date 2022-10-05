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

import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { TemplateContext } from "./context";

const TEMPLATES_DIR = resolve(dirname(new URL(import.meta.url).pathname), "templates");

export type Template = (context: TemplateContext) => void;

export const TEMPLATES_NAMES = readdirSync(TEMPLATES_DIR).map((fileName) => fileName.replace(/\.ts$/, ""));

export async function importTemplate(name: string): Promise<Template> {
  if (TEMPLATES_NAMES.includes(name)) {
    const templatePath = resolve(TEMPLATES_DIR, `${name}.ts`);
    const template = (await import(templatePath)) as { generate: Template };
    if (typeof template !== "object" || typeof template.generate !== "function") {
      throw new Error("Expected template to export a 'generate' function");
    }
    return template.generate;
  } else {
    throw new Error(`Expected one of these template names: ${TEMPLATES_NAMES.join(", ")}`);
  }
}
