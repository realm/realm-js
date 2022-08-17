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

import { TemplateContext } from "../context";
import { bindModel } from "../bound-model";

export function generateNodeLoader({ spec: rawSpec, file }: TemplateContext): void {
  const spec = bindModel(rawSpec);
  const js = file("native.mjs", "eslint");
  js("// This file is generated: Update the spec instead of editing this file directly");
  js("import bindings from 'bindings';");
  js('export * from "./enums";');
  js(`export const {${spec.classes.map((cls) => cls.jsName).join(", ")}} = bindings("realm.node");`);
}
