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
  const out = context.file("native.react-native.mjs", eslintFormatter);

  out("// This file is generated: Update the spec instead of editing this file directly");

  out(`
    /* global global */

    import { NativeModules } from "react-native";
    const RealmNativeModule = NativeModules.Realm;

    /**
     * Injects, reads, deletes and returns the native module via a global property.
     */
    function getNativeModule() {
      RealmNativeModule.injectModuleIntoJSGlobal();
      // Read the global into the local scope
      const { __injectedRealmBinding } = global;
      // Delete the global again
      delete global.__injectedRealmBinding;
      if(typeof __injectedRealmBinding === "object") {
        return __injectedRealmBinding;
      } else {
        throw new Error("Could not find the Realm binary. Please consult our troubleshooting guide: https://www.mongodb.com/docs/realm-sdks/js/latest/#md:troubleshooting-missing-binary");
      }
    }

    const nativeModule = getNativeModule();

    export const WeakRef = global.WeakRef ?? class WeakRef {
        constructor(obj) { this.native = nativeModule.createWeakRef(obj) }
        deref() { return nativeModule.lockWeakRef(this.native) }
    };
  `);

  generateNativeBigIntSupport(out);

  out(`
    // Hermes supports BigInt, but JSC doesn't.
    export const Int64 = global.HermesInternal ? NativeBigIntSupport : {
      add(a, b) { return a.add(b); },
      equals(a, b) { return a.equals(b); },
      isInt(a) { return a instanceof Long; },
      numToInt(a) { return Long.fromNumber(a); },
      strToInt(a) { return Long.fromString(a); },
      intToNum(a) { return a.toNumber(); },
    }
  `);

  generateBase(context, out);

  context.file("native.react-native.d.mts", eslintFormatter)("export * from './native'");
  context.file("native.react-native.d.cts", eslintFormatter)("import * as binding from './native'; export = binding;");
}
