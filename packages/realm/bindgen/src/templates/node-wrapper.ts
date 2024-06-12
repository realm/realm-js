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
import { TemplateContext } from "@realm/bindgen/context";

import { eslintFormatter } from "../formatters";
import { generate as generateBase, generateNativeBigIntSupport } from "./base-wrapper";

export function generate(context: TemplateContext): void {
  const out = context.file("native.node.mjs", eslintFormatter);

  out("// This file is generated: Update the spec instead of editing this file directly");

  out(`
    /* eslint-disable @typescript-eslint/no-var-requires */
    /* global global, require */
    const nativeBinding = require("#realm.node");

    if(!nativeBinding) {
      throw new Error("Could not find the Realm binary. Please consult our troubleshooting guide: https://www.mongodb.com/docs/realm-sdks/js/latest/#md:troubleshooting-missing-binary");
    }

    // We know that node always has real WeakRefs so just use them.
    export const WeakRef = global.WeakRef;
  `);

  generateNativeBigIntSupport(out);

  out(`
    export const Int64 = NativeBigIntSupport; // Node always supports BigInt
  `);

  generateBase(context, out);

  context.file("native.node.d.mts", eslintFormatter)("export * from './native'");
  context.file("native.node.d.cts", eslintFormatter)("import * as binding from './native'; export = binding;");
}
