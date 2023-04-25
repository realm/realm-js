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
import { bindModel, Property } from "@realm/bindgen/bound-model";
import { TemplateContext } from "@realm/bindgen/context";

import { doJsPasses } from "../js-passes";

export function generate({ spec: rawSpec, file }: TemplateContext): void {
  const spec = doJsPasses(bindModel(rawSpec));
  const reactLines = [];
  const nodeLines = [];
  function both(content: string) {
    reactLines.push(content);
    nodeLines.push(content);
  }

  both("// This file is generated: Update the spec instead of editing this file directly");

  // TODO RN vs Node will probably diverge further in the future and will likely need different templates.
  // But for now, this should work to let us load the native module for both platforms.
  reactLines.push(`
    /*global global*/
    import { Platform, NativeModules } from "react-native";
    if (Platform.OS === "android") {
      // Getting the native module on Android will inject the Realm global
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const RealmNativeModule = NativeModules.Realm;
    }
    // TODO: Remove the need to store Realm as a global
    // @see https://github.com/realm/realm-js/issues/2126
    const nativeModule = global.__RealmFuncs;

    export const WeakRef = global.WeakRef ?? class WeakRef {
        constructor(obj) { this.native = nativeModule.createWeakRef(obj) }
        deref() { return nativeModule.lockWeakRef(this.native) }
    };
  `);
  nodeLines.push(`
    /*global global, require */
    import { createRequire } from 'node:module';
    const nodeRequire = typeof require === 'function' ? require : createRequire(import.meta.url);
    const nativeModule = nodeRequire("./realm.node");

    // We know that node always has real WeakRefs so just use them.
    export const WeakRef = global.WeakRef;
  `);

  both(`
    const NativeBigIntSupport = Object.freeze({
      add(a, b) { return a + b; },
      equals(a, b) { return a == b; }, // using == rather than === to support number and string RHS!
      isInt(a) { return typeof(a) === "bigint"; },
      numToInt(a) { return BigInt(a); },
      strToInt(a) { return BigInt(a); },
      intToNum(a) { return Number(a); },
    });
  `);
  nodeLines.push(`
    export const Int64 = NativeBigIntSupport; // Node always supports BigInt
  `);
  reactLines.push(`
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

  both(`
    import { Long, ObjectId, UUID, Decimal128, EJSON } from "bson";
    import { Float } from "./core";

    export * from "./core";

    // Copied from lib/utils.js.
    // TODO consider importing instead.
    // Might be slightly faster to make dedicated wrapper for 1 and 2 argument forms, but unlikely to be worth it.
    function _promisify(nullAllowed, func) {
      return new Promise((resolve, reject) => {
        func((...cbargs) => {
          // Any errors in this function should flow into the Promise chain, rather than out to the caller,
          // since callers of async callbacks aren't expecting exceptions.
          try {
            if (cbargs.length < 1 || cbargs.length > 2) throw Error("invalid cbargs length " + cbargs.length);
            let error = cbargs[cbargs.length - 1];
            if (error) {
              reject(error);
            } else if (cbargs.length == 2) {
              const result = cbargs[0];
              if (!nullAllowed && (result === null || result === undefined)) {
                throw new Error("Unexpected null or undefined successful result");
              }
              resolve(result);
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  `);

  const injectables = [
    "Long",
    "ArrayBuffer",
    "Float",
    "ObjectId",
    "UUID",
    "Decimal128",
    "EJSON_parse: EJSON.parse",
    "EJSON_stringify: EJSON.stringify",
  ];

  for (const cls of spec.classes) {
    injectables.push(cls.jsName);

    let body = "";

    // It will always be accessed via this name rather than a static to enable optimizations
    // that depend on the symbol not changing.
    const symb = `_${cls.rootBase().jsName}_Symbol`;

    if (!cls.base) {
      // Only root classes get symbols and constructors
      both(`const ${symb} = Symbol("Realm.${cls.jsName}.external_pointer");`);

      body += `constructor(ptr) { this[${symb}] = ptr};`;
    }

    // This will override the extractor from the base class to do a more specific type check.
    body += `
      static _extract(self) {
        if (!(self instanceof ${cls.jsName}))
          throw new TypeError("Expected a ${cls.jsName}");
        const out = self[${symb}];
        if (!out)
          throw new TypeError("received an improperly constructed ${cls.jsName}");
        return out;
      };
    `;

    for (const method of cls.methods) {
      // Eagerly bind the name once from the native module.
      const native = `_native_${method.id}`;
      both(`const ${native} = nativeModule.${method.id};`);
      // TODO consider pre-extracting class-typed arguments while still in JIT VM.
      const asyncSig = method.sig.asyncTransform();
      const params = (asyncSig ?? method.sig).args.map((a) => a.name);
      const args = [
        method.isStatic ? [] : `this[${symb}]`, //
        ...params,
        asyncSig ? "_cb" : [],
      ].flat();
      let call = `${native}(${args})`;
      if (asyncSig) {
        // JS can't distinguish between a `const EJson*` that is nullptr (which can't happen), and
        // one that points to the string "null" because both become null by the time they reach JS.
        // In order to allow the latter (which does happen! E.g. the promise from `response.text()`
        // can resolve to `"null"`) we need a special case here.
        // TODO see if there is a better approach.
        assert(asyncSig.ret.isTemplate("AsyncResult"));
        const ret = asyncSig.ret.args[0];
        const nullAllowed = !!(ret.is("Pointer") && ret.type.kind == "Const" && ret.type.type.isPrimitive("EJson"));
        call = `_promisify(${nullAllowed}, _cb => ${call})`;
      }
      body += `
        ${method.isStatic ? "static" : ""}
        ${method instanceof Property ? "get" : ""}
        ${method.jsName}(${params}) {
          return ${call};
        }`;
    }

    if (cls.iterable) {
      const native = `_native_${cls.iteratorMethodId()}`;
      both(`const ${native} = nativeModule.${cls.iteratorMethodId()};`);
      body += `\n[Symbol.iterator]() { return ${native}(this[${symb}]); }`;
    }

    both(`export class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} { ${body} }`);
  }

  both(`nativeModule.injectInjectables({ ${injectables} });`);

  file("native.mjs", "eslint")(nodeLines.join("\n"));
  file("native-rn.mjs", "eslint")(reactLines.join("\n"));
}
