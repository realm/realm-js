import { TemplateContext } from "@realm/bindgen/context";

import { doJsPasses } from "../js-passes";
import { eslintFormatter } from "../formatters";
import { BoundSpec, Class, Enum, Method, NamedType, Property, Struct, Type } from "@realm/bindgen/bound-model";
import assert from "node:assert";

function generateEnumDeclaration(e: Enum) {
  return `export const enum ${e.jsName} { ${e.enumerators.map(({ jsName, value }) => `${jsName} = ${value}`)} };`;
}

const PRIMITIVES_MAPPING: Record<string, string | undefined> = {
  void: "void",
  bool: "boolean",
  double: "number",
  float: "Float",
  int64_t: "Int64",
  int32_t: "number",
  count_t: "number",
  uint64_t: "Int64",
  "std::chrono::milliseconds": "Int64",
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
  Status: "Status",
  EJson: "EJson",
  EJsonArray: "EJson[]",
  EJsonObj: "Record<string, EJson>",
  "bson::BsonDocument": "Record<string, EJson>",
  "bson::BsonArray": "EJson[]",
  QueryArg: "(MixedArg | MixedArg[])",
  "std::uint_fast16_t": "number",
};

const enum Kind {
  Argument, // JS -> CPP
  Return, // Cpp -> JS
}

function suffix(kind: Kind) {
  return kind === Kind.Argument ? "_Relaxed" : "";
}

function getTypeFromPrimitive(name: string) {
  const result = PRIMITIVES_MAPPING[name];
  assert(typeof result === "string", `Expected a mapping for '${name}' primitive`);
  return result;
}

// Be Careful! These need to apply to the *whole* type, so arg[] would be problematic if arg is A|B.
const TEMPLATE_MAPPING: Record<string, (...args: string[]) => string> = {
  "std::vector": (arg) => `Array<${arg}>`,
  "std::optional": (arg) => `undefined | ${arg}`,
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

function getTypeFactoryFromTemplate(name: string) {
  const result = TEMPLATE_MAPPING[name];
  assert(typeof result === "function", `Expected a mapping for '${name}' template`);
  return result;
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
      if (type.name === "Mixed") return kind === Kind.Argument ? "MixedArg" : "Mixed";
      return getTypeFromPrimitive(type.name);

    case "Template":
      return getTypeFactoryFromTemplate(type.name)(...type.args.map((arg) => generateType(spec, arg, kind)));

    case "Func":
      // When a js function is passed to cpp, its arguments behave like Ret and its return value behaves like Arg.
      const Arg = kind === Kind.Argument ? Kind.Return : Kind.Argument;
      const Ret = kind === Kind.Argument ? Kind.Argument : Kind.Return;

      const args = type.argsSkippingIgnored().map((arg) => arg.name + ": " + generateType(spec, arg.type, Arg));
      return `((${args.join(", ")}) => ${generateType(spec, type.ret, Ret)})`;
  }
}

function generateRecordDeclaration(spec: BoundSpec, record: Struct) {
  return [Kind.Return, Kind.Argument]
    .flatMap((kind) => {
      // Skip function fields when converting records from C++ to JS.
      const fields = kind === Kind.Argument ? record.fields : record.fields.filter((field) => !field.type.isFunction());

      if (fields.length === 0) {
        // ESLint complains if we use {} as a type, which would otherwise happen in this case.
        return `export type ${record.jsName}${suffix(kind)} = Record<string, never>;`;
      }

      // TODO consider making the Arg version just alias the Ret version if the bodies are the same.
      const fieldDeclarations = record.fields.map((field) => {
        // For optional<T> fields, the field will always be there in Ret mode, but it may be undefined.
        // This is handled by optional<T> becoming `undefined | T`.
        const optField = !field.required && kind === Kind.Argument;
        const hasInterestingDefault = ![undefined, "", "{}", "[]"].includes(field.defaultVal);

        const docLines: string[] = [];
        if (!field.isOptedInTo) {
          docLines.push(
            `@deprecated Add '${field.name}' to your opt-in list (under 'records/${record.name}/fields/') to use this.`,
          );
        }

        if (hasInterestingDefault) {
          docLines.push(`@default ${field.defaultVal}`);
        }

        let docComment = "";
        if (docLines.length > 1) {
          docComment = `/**\n * ${docLines.join("\n * ")}\n */\n`;
        } else if (docLines.length === 1) {
          docComment = `/** ${docLines[0]} */\n`;
        }

        return `${docComment} ${field.jsName}${optField ? "?" : ""}: ${generateType(spec, field.type, kind)};`;
      });

      return `export type ${record.jsName}${suffix(kind)} = {${fieldDeclarations.join("\n")}}`;
    })
    .join("\n");
}

function generateMethodDeclaration(spec: BoundSpec, method: Method) {
  if (method instanceof Property) {
    return `get ${method.jsName}(): ${generateType(spec, method.type, Kind.Return)}`;
  } else {
    const transformedSignature = method.sig.asyncTransformOrSelf();
    const returnType = generateType(spec, transformedSignature.ret, Kind.Return);
    const argumentDeclarations = transformedSignature.args.map(
      (arg) => `${arg.name}: ${generateType(spec, arg.type, Kind.Argument)}`,
    );
    return (method.isStatic ? "static " : "") + method.jsName + `(${argumentDeclarations.join(", ")}): ${returnType};`;
  }
}

function generateClassDeclaration(spec: BoundSpec, cls: Class) {
  const methodDeclarations = cls.methods
    .filter((method) => method.isOptedInTo)
    .map(generateMethodDeclaration.bind(undefined, spec));
  return `
    export declare class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} {
      /** Opting out of structural typing */
      private brandFor${cls.jsName};
      ${cls.subclasses.length === 0 ? "private" : "protected"} constructor();
      ${methodDeclarations.join("\n")}
      ${cls.iterable ? `[Symbol.iterator](): Iterator<${generateType(spec, cls.iterable, Kind.Return)}>;` : ""}
    }`;
}

/**
 * Generates code wrapping the native module, making it more suitable for consumption.
 */
export function generate({ spec: boundSpec, rawSpec, file }: TemplateContext): void {
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
  const out = file("wrapper.generated.ts", eslintFormatter);

  out("/* this will be replaced by a header comment */");
  out("// This file is generated: Update the spec instead of editing this file directly");

  out.lines(
    'import { ObjectId, UUID, Decimal128 } from "bson";',
    "// eslint-disable-next-line @typescript-eslint/no-namespace",
    "export namespace binding {",
  );

  out.lines("// Enums", ...spec.enums.map(generateEnumDeclaration));

  // TODO: Attempt to move this into a proper .ts file
  out.lines(
    `
    // Wrapped types
    export class Float {
      constructor(public value: number) {}
      valueOf() { return this.value; }
    }
    export class Status {
      public isOk: boolean;
      public code?: number;
      public reason?: string;
      constructor(isOk: boolean) { this.isOk = isOk; }
    }
    export const ListSentinel = Symbol.for("Realm.List");
    export const DictionarySentinel = Symbol.for("Realm.Dictionary");
    `,

    "// Utilities",
    "export type AppError = Error & {code: number};",
    "export type CppErrorCode = Error & {code: number, category: string};",
    "export type EJson = null | string | number | boolean | EJson[] | {[name: string]: EJson}",

    `
    // WeakRef polyfill for Hermes.
    export declare class WeakRef<T extends object> {
      constructor(obj: T);
      deref(): T | undefined;
    }

    export const enum Int64Type {} // This shouldn't need to be exported, but rollup complains if it isn't.
    export type Int64 = Int64Type;
    export declare const Int64: {
      add(a: Int64, b: Int64): Int64;
      equals(a: Int64, b: Int64 | number | string): boolean;
      isInt(a: unknown): a is Int64;
      numToInt(a: number): Int64;
      strToInt(a: string): Int64;
      intToNum(a: Int64): number;
    }
    `,
  );

  out.lines(
    "// Mixed types",
    `export type Mixed = null | symbol | ${spec.mixedInfo.getters
      .map(({ type }) => generateType(spec, type, Kind.Return))
      .join(" | ")};`,
    `export type MixedArg = null | ${spec.mixedInfo.ctors.map((type) => generateType(spec, type, Kind.Argument)).join(" | ")};`,
  );

  out.lines(
    "// Opaque types (including Key types)",
    ...[...(spec.opaqueTypes as NamedType[]), ...spec.keyTypes].map(
      ({ jsName }) => `/** Using an empty enum to express a nominal type */ export enum ${jsName} {}`,
    ),
  );

  out.lines("// Records", ...spec.records.map(generateRecordDeclaration.bind(undefined, spec)));

  out.lines("// Classes", ...spec.classes.map(generateClassDeclaration.bind(undefined, spec)));

  out("}"); // Closing bracket for the namespace
}
