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

import { strict as assert } from "node:assert";

import { TemplateContext } from "@realm/bindgen/context";
import { Arg, BoundSpec, NamedType, Property, Type } from "@realm/bindgen/bound-model";

import { doJsPasses } from "../js-passes";
import { eslint } from "../eslint-formatter";

const PRIMITIVES_MAPPING: Record<string, string> = {
  void: "void",
  bool: "boolean",
  double: "number",
  float: "Float",
  int64_t: "Int64",
  int32_t: "number",
  count_t: "number",
  uint64_t: "Int64",
  "std::string": "string",
  "std::string_view": "string",
  StringData: "string",
  EncryptionKey: "ArrayBuffer",
  BinaryData: "ArrayBuffer",
  OwnedBinaryData: "ArrayBuffer",
  ObjectId: "ObjectId",
  UUID: "UUID",
  Decimal128: "Decimal128",
  AppError: "AppError",
  "std::exception_ptr": "Error",
  "std::error_code": "CppErrorCode",
  Status: "Error", // We don't currently expose the code.
  EJson: "EJson",
  EJsonArray: "EJson[]",
  EJsonObj: "Record<string, EJson>",
  "bson::BsonDocument": "Record<string, EJson>",
  "bson::BsonArray": "EJson[]",
  QueryArg: "(MixedArg | MixedArg[])",
};

// Be Careful! These need to apply to the *whole* type, so arg[] would be problematic if arg is A|B.
const TEMPLATE_MAPPING: Record<string, (...args: string[]) => string> = {
  "std::vector": (arg) => `Array<${arg}>`,
  "util::Optional": (arg) => `undefined | ${arg}`,
  Nullable: (t) => `null | ${t}`,
  "std::shared_ptr": (arg) => arg,
  "std::pair": (a, b) => `[${a}, ${b}]`,
  "std::tuple": (...args) => `[${args}]`,
  "std::map": (k, v) => `Record<${k}, ${v}>`,
  "std::unordered_map": (k, v) => `Record<${k}, ${v}>`,
  "util::UniqueFunction": (f) => f,
  "std::function": (f) => f,
  AsyncResult: (t) => `Promise<${t}>`,
  AsyncCallback: (sig) => assert.fail(`async transform not applied to function taking AsyncCallback<${sig}>`),
  IgnoreArgument: () => assert.fail("Attempting to use an IgnoreArgument<>"),
};

const enum Kind {
  Arg, // JS -> CPP
  Ret, // Cpp -> JS
}
function suffix(kind: Kind) {
  return kind === Kind.Arg ? "_Relaxed" : "";
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

    case "KeyType":
    case "Opaque":
    case "Enum":
    case "Class":
      return type.jsName;

    case "Struct":
      return type.jsName + suffix(kind);

    case "Primitive":
      if (type.name === "Mixed") return kind === Kind.Arg ? "MixedArg" : "Mixed";
      return PRIMITIVES_MAPPING[type.name];

    case "Template":
      return TEMPLATE_MAPPING[type.name](...type.args.map((arg) => generateType(spec, arg, kind)));

    case "Func":
      // When a js function is passed to cpp, its arguments behave like Ret and its return value behaves like Arg.
      const Arg = kind === Kind.Arg ? Kind.Ret : Kind.Arg;
      const Ret = kind === Kind.Arg ? Kind.Arg : Kind.Ret;

      const args = type.argsSkippingIgnored().map((arg) => arg.name + ": " + generateType(spec, arg.type, Arg));
      return `((${args.join(", ")}) => ${generateType(spec, type.ret, Ret)})`;
  }
}

function generateArguments(spec: BoundSpec, args: Arg[]) {
  return args.map((arg) => `${arg.name}: ${generateType(spec, arg.type, Kind.Arg)}`).join(", ");
}

function generateMixedTypes(spec: BoundSpec) {
  return `
    export type Mixed = null | ${spec.mixedInfo.getters
      .map(({ type }) => generateType(spec, type, Kind.Ret))
      .join(" | ")};
    export type MixedArg = null | ${spec.mixedInfo.ctors.map((type) => generateType(spec, type, Kind.Arg)).join(" | ")};
  `;
}

export function generate({ rawSpec, spec: boundSpec, file }: TemplateContext): void {
  // Check the support for primitives used
  for (const primitive of rawSpec.primitives) {
    if (primitive === "Mixed") continue;
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

  const spec = doJsPasses(boundSpec);

  const coreOut = file("core.ts", eslint);
  coreOut("// This file is generated: Update the spec instead of editing this file directly");

  coreOut("// Enums");
  for (const e of spec.enums) {
    // Using const enum to avoid having to emit JS backing these
    coreOut(`export const enum ${e.jsName} {`);
    coreOut(...e.enumerators.map(({ jsName, value }) => `${jsName} = ${value},\n`));
    coreOut("};");
  }
  coreOut(`
    // Wrapped types
    export class Float {
      constructor(public value: number) {}
      valueOf() { return this.value; }
    }
  `);

  const out = file("native.d.mts", eslint);
  out("// This file is generated: Update the spec instead of editing this file directly");

  out("declare module 'realm/binding' {");

  out('import { ObjectId, UUID, Decimal128 } from "bson";');
  out("import { Float, ", spec.enums.map((e) => e.name).join(", "), '} from "realm/binding/core";');
  out('export * from "realm/binding/core";');

  out("// Utilities");
  out("export type AppError = Error & {code: number};");
  out("export type CppErrorCode = Error & {code: number, category: string};");

  out(`
    // WeakRef polyfill for Hermes.
    export class WeakRef<T extends object> {
      constructor(obj: T);
      deref(): T | undefined;
    }

    export const enum Int64Type {} // This shouldn't need to be exported, but rollup complains if it isn't.
    export type Int64 = Int64Type;
    export const Int64: {
      add(a: Int64, b: Int64): Int64;
      equals(a: Int64, b: Int64 | number | string): boolean;
      isInt(a: unknown): a is Int64;
      numToInt(a: number): Int64;
      strToInt(a: string): Int64;
      intToNum(a: Int64): number;
    }
  `);

  out("// Mixed types");
  out(generateMixedTypes(spec));
  out("export type EJson = null | string | number | boolean | EJson[] | {[name: string]: EJson}");

  out("// Opaque types (including Key types)");
  for (const { jsName } of (spec.opaqueTypes as NamedType[]).concat(spec.keyTypes)) {
    out.lines("/** Using an empty enum to express a nominal type */", `export enum ${jsName} {}`);
  }

  out("// Records");
  for (const rec of spec.records) {
    for (const kind of [Kind.Ret, Kind.Arg]) {
      // Skip function fields when converting records from C++ to JS.
      const fields = kind === Kind.Arg ? rec.fields : rec.fields.filter((field) => !field.type.isFunction());

      if (fields.length === 0) {
        // ESLint complains if we use {} as a type, which would otherwise happen in this case.
        out(`export type ${rec.jsName}${suffix(kind)} = Record<string, never>;`);
        continue;
      }

      // TODO consider making the Arg version just alias the Ret version if the bodies are the same.
      out(`export type ${rec.jsName}${suffix(kind)} = {`);
      for (const field of fields) {
        if (!field.isOptedInTo) {
          out(
            `/** @deprecated Add '${field.name}' to your opt-in list (under 'records: ${rec.cppName}: fields:') to use this. */`,
          );
        }

        // For Optional<T> fields, the field will always be there in Ret mode, but it may be undefined.
        // This is handled by Optional<T> becoming `undefined | T`.
        const optField = !field.required && kind === Kind.Arg;
        const hasInterestingDefault = ![undefined, "", "{}", "[]"].includes(field.defaultVal);
        out(
          hasInterestingDefault ? `/** @default ${field.defaultVal} */\n` : "",
          field.jsName,
          optField ? "?" : "",
          ": ",
          generateType(spec, field.type, kind),
          ";",
        );
      }
      out(`}`);
    }
  }

  out("// Classes");
  for (const cls of spec.classes) {
    out(`export class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} {`);
    out(`private brandFor${cls.jsName};`);
    out(`${cls.subclasses.length === 0 ? "private" : "protected"} constructor();`);
    for (const meth of cls.methods) {
      if (!meth.isOptedInTo) {
        out(
          `/** @deprecated Add '${meth.unique_name}' to your opt-in list (under 'classes: ${cls.cppName}: methods:') to use this. */`,
        );
      }
      if (meth instanceof Property) {
        out("readonly ", meth.jsName, ": ", generateType(spec, meth.type, Kind.Ret));
        continue;
      }
      const transformedSig = meth.sig.asyncTransformOrSelf();
      const ret = generateType(spec, transformedSig.ret, Kind.Ret);
      out(
        meth.isStatic ? "static" : "",
        meth.jsName,
        "(",
        generateArguments(spec, transformedSig.args),
        "):",
        ret,
        ";",
      );
    }
    if (cls.iterable) {
      out(`[Symbol.iterator](): Iterator<${generateType(spec, cls.iterable, Kind.Ret)}>;`);
    }
    out(`}`);
  }

  out("} // end of module declaration");
}
