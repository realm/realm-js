import { TemplateContext } from "@realm/bindgen/context";

import { BoundSpec, Class, Enum, Method, NamedType, Property, Struct, Type } from "@realm/bindgen/bound-model";
import assert from "node:assert";
import { eslintFormatter } from "../formatters";
import { doJsPasses } from "../js-passes";

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
const TEMPLATE_MAPPING: Record<string, ((...args: string[]) => string) | undefined> = {
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
    'import { Long, ObjectId, UUID, Decimal128, EJSON } from "bson";',
    'import { _throwOnAccess } from "./utils";',
    'import * as utils from "./utils";',
    'import { applyPatch } from "./patch";',
    "// eslint-disable-next-line @typescript-eslint/no-namespace",
    "export namespace binding {",
  );

  out.lines("// Enums", ...spec.enums.map(generateEnumDeclaration));

  // TODO: Attempt to move this into a proper .ts file
  out.lines(
    "// Utilities",
    "export type AppError = Error & {code: number};",
    "export type CppErrorCode = Error & {code: number, category: string};",
    "export type EJson = null | string | number | boolean | EJson[] | {[name: string]: EJson}",
    "export import Float = utils.Float;",
    "export import Status = utils.Status;",
    "export import ListSentinel = utils.ListSentinel;",
    "export import DictionarySentinel = utils.DictionarySentinel;",

    `
    // WeakRef polyfill for Hermes.
    export declare class WeakRef<T extends object> {
      constructor(obj: T);
      deref(): T | undefined;
    }

    export declare class Int64 {
      private brandForInt64;
      static add(a: Int64, b: Int64): Int64;
      static equals(a: Int64, b: Int64 | number | string): boolean;
      static isInt(a: unknown): a is Int64;
      static numToInt(a: number): Int64;
      static strToInt(a: string): Int64;
      static intToNum(a: Int64): number;
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

  out(
    `
    Object.defineProperties(binding, {
      ${spec.classes.map((cls) => `${cls.jsName}: { get: _throwOnAccess.bind(undefined, "${cls.jsName}"), configurable: true }`)}
    });
    `,
  );

  out(
    `
    /**
     * Is true when the native module has been injected.
     * Useful to perform asserts on platforms which inject the native module synchronously.
     */
    export let isReady = false;

    // TODO: Replace with Promise.withResolvers() once it's supported on all supported platforms.
    let resolveReadyPromise: () => void = () => { throw new Error('Expected a synchronous Promise constructor'); }
    /**
     * Resolves when the native module has been injected.
     * Useful to perform asserts on platforms which inject the native module asynchronously.
     */
    export const ready = new Promise<void>((resolve) => { resolveReadyPromise = resolve });
    `,
  );

  out(
    `
    type Extras = {
      Int64: typeof binding.Int64;
      WeakRef: typeof binding.WeakRef;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function injectNativeModule(nativeModule: any, extras: Extras) {
      Object.assign(binding, extras);
    `,
  );

  // TODO: Handle injectables

  const injectables = [
    "Long",
    "ArrayBuffer",
    "Float: utils.Float",
    "Status: utils.Status",
    "ObjectId",
    "UUID",
    "Decimal128",
    "EJSON_parse: EJSON.parse",
    "EJSON_stringify: EJSON.stringify",
    "Symbol_for: Symbol.for",
    ...spec.classes.map((cls) => cls.jsName),
  ];

  for (const cls of spec.classes) {
    const symbolName = `_${cls.rootBase().jsName}_Symbol`;
    const bodyLines: string[] = [];

    if (!cls.base) {
      // Only root classes get symbols and constructors
      out(`const ${symbolName} = Symbol("Realm.${cls.jsName}.external_pointer");`);
      bodyLines.push(`${cls.subclasses.length === 0 ? "private" : "protected"} declare [${symbolName}]: unknown;`);
      bodyLines.push(
        `${cls.subclasses.length === 0 ? "private" : "protected"} constructor(ptr: unknown) { this[${symbolName}] = ptr};`,
      );
    }

    bodyLines.push(`
      static _extract(self: unknown) {
        if (!(self instanceof ${cls.jsName}))
          throw new TypeError("Expected a ${cls.jsName}");
        const out = self[${symbolName}];
        if (!out)
          throw new TypeError("Received an improperly constructed ${cls.jsName}");
        return out;
      };  
    `);

    const availableMethods = cls.methods.filter((method) => method.isOptedInTo);

    for (const method of availableMethods) {
      // Eagerly bind the name once from the native module to prevent object property lookups on every call
      const nativeFreeFunctionName = `_native_${method.id}`;
      out(`const ${nativeFreeFunctionName} = nativeModule.${method.id};`);
      // TODO consider pre-extracting class-typed arguments while still in JIT VM.
      const asyncSig = method.sig.asyncTransform();
      const params = (asyncSig ?? method.sig).args.map((arg) => arg.name);
      const args = [method.isStatic ? [] : `this[${symbolName}]`, ...params, asyncSig ? "_cb" : []].flat();
      let call = `${nativeFreeFunctionName}(${args})`;
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
      bodyLines.push(
        method.isStatic ? "static" : "",
        method instanceof Property ? "get" : "",
        `${method.jsName}(${params.map((name) => name + ": unknown")}) { return ${call}; }`,
      );
    }

    if (cls.iterable) {
      const native = `_native_${cls.iteratorMethodId()}`;
      out(`const ${native} = nativeModule.${cls.iteratorMethodId()};`);
      bodyLines.push(`[Symbol.iterator]() { return ${native}(this[${symbolName}]); }`);
    }

    out.lines(`class ${cls.jsName} ${cls.base ? `extends ${cls.base.jsName}` : ""} {`, ...bodyLines, `}`);
  }

  out(`
    Object.defineProperties(binding, {
      ${spec.classes.map((cls) => `${cls.jsName}: { value: ${cls.jsName}, writable: false, configurable: false }`)}
    });
  `);

  out(`nativeModule.injectInjectables({ ${injectables} });`);

  out("applyPatch(binding); isReady = true; resolveReadyPromise(); }");
}
