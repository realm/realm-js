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
import { Arg, bindModel, BoundSpec, Type } from "../bound-model";
import { strict as assert } from "assert";

import "../js-passes";

const PRIMITIVES_MAPPING: Record<string, string> = {
  void: "void",
  bool: "boolean",
  double: "number",
  float: "Float",
  int64_t: "bigint",
  int32_t: "number",
  count_t: "number",
  uint64_t: "bigint",
  "std::string": "string",
  StringData: "string",
  EncryptionKey: "ArrayBuffer",
  BinaryData: "ArrayBuffer",
  OwnedBinaryData: "ArrayBuffer",
  ObjectId: "ObjectId",
  UUID: "UUID",
  Decimal128: "Decimal128",
};

const TEMPLATE_MAPPING: Record<string, (...args: string[]) => string> = {
  "std::vector": (arg) => `${arg}[]`,
  "util::Optional": (arg) => `(${arg} | null)`,
  "std::shared_ptr": (arg) => arg,
  "std::pair": (a, b) => `[${a}, ${b}]`,
  "std::tuple": (...args) => `[${args}]`,
};

const enum Kind {
  Arg, // JS -> CPP
  Ret, // Cpp -> JS
}

function generateType(spec: BoundSpec, type: Type, kind: Kind): string {
  switch (type.kind) {
    case "Pointer":
    case "Ref":
    case "RRef":
      // No impact on JS semantics.
      return generateType(spec, type.type, kind);

    case "Const":
      return `Readonly<${generateType(spec, type.type, kind)}>`;

    case "Opaque":
    case "Enum":
    case "Class":
      return type.jsName;

    case "Struct":
      return kind == Kind.Arg ? type.jsName : `DeepRequired<${type.jsName}>`;

    case "Primitive":
      if (type.name == "Mixed") return kind == Kind.Arg ? "MixedArg" : "Mixed";
      return PRIMITIVES_MAPPING[type.name];

    case "Template":
      return TEMPLATE_MAPPING[type.name](...type.args.map((arg) => generateType(spec, arg, kind)));

    case "Func":
      // When a js function is passed to cpp, its arguments behave like Ret and its return value behaves like Arg.
      const Arg = kind == Kind.Arg ? Kind.Ret : Kind.Arg;
      const Ret = kind == Kind.Arg ? Kind.Arg : Kind.Ret;

      const args = type.args.map((arg) => arg.name + ": " + generateType(spec, arg.type, Arg));
      return `((${args.join(", ")}) => ${generateType(spec, type.ret, Ret)})`;
  }
}

function generateArguments(spec: BoundSpec, args: Arg[]) {
  return args.map((arg) => `${arg.name}: ${generateType(spec, arg.type, Kind.Arg)}`).join(", ");
}

function generateMixedTypes(spec: BoundSpec) {
  // TODO should undefined be allowed in MixedArg?
  // TODO consider interface rather than type here.
  return `
    export type Mixed = null | ${spec.mixedInfo.getters
      .map(({ type }) => generateType(spec, type, Kind.Ret))
      .join(" | ")};
    export type MixedArg = null | ${spec.mixedInfo.ctors.map((type) => generateType(spec, type, Kind.Arg)).join(" | ")};
  `;
}

export function generateTypeScript({ spec: rawSpec, file }: TemplateContext): void {
  // Check the support for primitives used
  for (const primitive of rawSpec.primitives) {
    if (primitive == "Mixed") continue;
    assert(
      Object.keys(PRIMITIVES_MAPPING).includes(primitive),
      `Spec declares an unsupported primitive: "${primitive}"`,
    );
  }

  // Check the support for template instances used
  for (const template of Object.keys(rawSpec.templates)) {
    assert(
      Object.keys(TEMPLATE_MAPPING).includes(template),
      `Spec declares an unsupported template instance: "${template}"`,
    );
  }

  const spec = bindModel(rawSpec);

  const coreOut = file("core.ts", "eslint", "typescript-checker");
  coreOut("// This file is generated: Update the spec instead of editing this file directly");

  coreOut("// Enums");
  for (const e of spec.enums) {
    // Using const enum to avoid having to emit JS backing these
    coreOut(`export const enum ${e.jsName} {`);
    coreOut(...e.enumerators.map(({ name, value }) => `${name} = ${value},\n`));
    coreOut("};");
  }
  coreOut(`
    // Wrapped types
    export class Float {
      constructor(public value: number) {}
      valueOf() { return this.value; }
    }
  `);

  const js = file("native.mjs", "eslint");
  js("// This file is generated: Update the spec instead of editing this file directly");
  js(`
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const nativeModule = require("./realm.node");

    import { ObjectId, UUID, Decimal128 } from "bson";
    import { Float } from "./core";
    nativeModule.injectInjectables({ Float, ObjectId, UUID, Decimal128 });
  `);

  const out = file("native.d.mts", "eslint", "typescript-checker");
  out("// This file is generated: Update the spec instead of editing this file directly");

  out('import { ObjectId, UUID, Decimal128 } from "bson";');
  out("import { Float, ", spec.enums.map((e) => e.name).join(", "), '} from "./core";');
  out('export * from "./core";');
  js('export * from "./core";');

  out("// Utilities");
  out(`type DeepRequired<T> = 
          T extends CallableFunction ? T :
          T extends object ? {[K in keyof T]-? : DeepRequired<T[K]>} :
          T;`);

  out("// Mixed types");
  out(generateMixedTypes(spec));

  out("// Opaque types");
  for (const { jsName } of spec.opaqueTypes) {
    out.lines("/** Using an empty enum to express a nominal type */", `export declare enum ${jsName} {}`);
  }

  out("// Records");
  for (const rec of spec.records) {
    out(`export type ${rec.jsName} = {`);
    for (const field of rec.fields) {
      // Using Kind.Arg here because when a Record is used as a Ret, it will be "fixed" to behave like one.
      out(field.jsName, field.required ? "" : "?", ": ", generateType(spec, field.type, Kind.Arg), ";");
    }
    out(`}`);
  }

  out("// Classes");
  for (const cls of spec.classes) {
    js(`export const {${cls.jsName}} = nativeModule;`);
    out(`export class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} {`);
    out(`${cls.subclasses.length == 0 ? "private" : "protected"} constructor();`);
    for (const prop of cls.properties) {
      out(prop.jsName, ": ", generateType(spec, prop.type, Kind.Ret));
    }
    for (const meth of cls.methods) {
      out(
        meth.isStatic ? "static" : "",
        meth.jsName,
        "(",
        generateArguments(spec, meth.sig.args),
        "):",
        generateType(spec, meth.sig.ret, Kind.Ret),
        ";",
      );
    }
    if (cls.iterable) {
      out(`[Symbol.iterator](): Iterator<${generateType(spec, cls.iterable, Kind.Ret)}>;`);
    }
    out(`}`);
  }
}
