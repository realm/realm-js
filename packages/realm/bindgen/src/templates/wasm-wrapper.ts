////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
  const out = context.file("native.wasm.mjs", eslintFormatter);

  out("// This file is generated: Update the spec instead of editing this file directly");

  out(`
    /*global window, FinalizationRegistry*/
    import Module from "../../prebuilds/wasm/realm-js-wasm.mjs";
    const nativeModule = await Module(); // loading WASM 
    nativeModule.browserInit();
    export const WeakRef = window.WeakRef;
  `);

  generateNativeBigIntSupport(out);

  out(`
    export const Int64 = NativeBigIntSupport; // Browsers always supports BigInt
  `);

  generateBase({
    context,
    out,
    classExtras(cls) {
      return `const _${cls.jsName}_registery = (nativeModule.${cls.jsName}_deleter) ? new FinalizationRegistry(nativeModule.${cls.jsName}_deleter) : undefined;`;
    },
    emitConstructor(symb, cls) {
      return `constructor(ptr) { this[${symb}] = ptr; 
        if (_${cls.jsName}_registery) _${cls.jsName}_registery.register(this, ptr);
      };`;
    },
  });

  context.file("native.wasm.d.mts", eslintFormatter)("export * from './native'");
  context.file("native.wasm.d.cts", eslintFormatter)("import * as binding from './native'; export = binding;");
}
