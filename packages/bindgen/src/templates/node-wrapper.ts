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
import { bindModel, Property } from "../bound-model";
import { TemplateContext } from "../context";

import "../js-passes";

export function generateNodeWrapper({ spec: rawSpec, file }: TemplateContext): void {
  const spec = bindModel(rawSpec);

  const js = file("native.mjs", "eslint");
  js("// This file is generated: Update the spec instead of editing this file directly");
  js(`
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const nativeModule = require("./realm.node");

    import { ObjectId, UUID, Decimal128 } from "bson";
    import { Float } from "./core";

    export * from "./core";
  `);

  const injectables = ["Float", "ObjectId", "UUID", "Decimal128"];

  for (const cls of spec.classes) {
    injectables.push(cls.jsName);

    let body = "";

    // It will always be accessed via this name rather than a static to enable optimizations
    // that depend on the symbol not changing.
    const symb = `${cls.rootBase().jsName}_Symbol`;

    if (!cls.base) {
      // Only root classes get symbols and constructors
      js(`const ${symb} = Symbol("Realm.${cls.jsName}.external_pointer");`);

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
      const native = `native_${method.id}`;
      js(`const ${native} = nativeModule.${method.id};`);
      const self = method.isStatic ? "" : `this[${symb}], `;
      // TODO consider pre-extracting class-typed arguments while still in JIT VM.
      const args = method.sig.args.map((a) => a.name);
      body += `
        ${method.isStatic ? "static" : ""}
        ${method instanceof Property ? "get" : ""}
        ${method.jsName}(${args}) {
          return ${native}(${self} ${args});
        }`;
    }

    if (cls.iterable) {
      const native = `native_${cls.iteratorMethodId()}`;
      js(`const ${native} = nativeModule.${cls.iteratorMethodId()};`);
      body += `\n[Symbol.iterator]() { return ${native}(this[${symb}]); }`;
    }

    js(`export class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} { ${body} }`);
  }

  js(`nativeModule.injectInjectables({ ${injectables} });`);
}
