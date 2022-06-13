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

export function generateTypeScript({ spec, file }: TemplateContext): void {
  const out = file("index.d.ts", "eslint --fix");
  out("// This file is generated: Update the spec instaed of editing this file directly", "!");
  out.spaced("// This", "is", "a", "spaced", "test");
  out.lines("// This", "// Is", "// A", "// Test");
}
