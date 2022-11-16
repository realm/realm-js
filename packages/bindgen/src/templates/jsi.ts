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
import { strict as assert } from "assert";

import { TemplateContext } from "../context";
import { CppDecls } from "../cpp";
import { bindModel, BoundSpec } from "../bound-model";

import { doJsPasses } from "../js-passes";

class JsiCppDecls extends CppDecls {
  constructor(spec: BoundSpec) {
    super();
    assert("TODO");
  }
}

export function generate({ spec, file: makeFile }: TemplateContext): void {
  const out = makeFile("jsi_init.cpp", "clang-format");

  // HEADER
  out(`// This file is generated: Update the spec instead of editing this file directly`);

  for (const header of spec.headers) {
    out(`#include <${header}>`);
  }

  out(`
      #include <jsi/jsi.h>
      #include <realm_js_helpers.h>

      // Using all-caps JSI to avoid risk of conflicts with jsi namespace from fb.
      namespace realm::js::JSI {
      namespace {
    `);

  new JsiCppDecls(doJsPasses(bindModel(spec))).outputDefsTo(out);

  out(`
        } // namespace
        } // namespace realm::js::JSI
    `);
}
