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

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { TemplateContext } from "./context";

export type Template = (context: TemplateContext) => void;

export async function importTemplate(path: string): Promise<Template> {
  const template = (await import(pathToFileURL(resolve(path)).toString())) as { generate: Template };
  if (typeof template !== "object" || typeof template.generate !== "function") {
    throw new Error("Expected template to export a 'generate' function");
  }
  return template.generate;
}
