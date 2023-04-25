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

import { Spec, TypeSpec, ClassSpec, MethodSpec } from "./spec";

abstract class TypeBase {
  abstract readonly kind: TypeKind;

  /**
   * Converts a Type object to its spelling in C++, eg to be used to declare an argument or template parameter.
   */
  abstract toCpp(): string;

  // This is mostly because TS doesn't know that Type covers all types derived from TypeBase.
  is<Kind extends TypeKind>(kind: Kind): this is Type & { kind: Kind } {
    return this.kind == kind;
  }

  isOptional(): this is Template & { name: "util::Optional" };
  isOptional(type: string): boolean;
  isOptional(type?: string): boolean {
    return this.isTemplate("util::Optional") && (!type || ("name" in this.args[0] && this.args[0].name == type));
  }

  isNullable(): this is Template & { name: "Nullable" };
  isNullable(type: string): boolean;
  isNullable(type?: string): boolean {
    return this.isTemplate("Nullable") && (!type || ("name" in this.args[0] && this.args[0].name == type));
  }

  isTemplate(): this is Template;
  isTemplate<Name extends string>(type: Name): this is Template & { name: Name };
  isTemplate(type?: string): boolean {
    return this.is("Template") && (!type || this.name == type);
  }

  isPrimitive(): this is Primitive;
  isPrimitive<Name extends string>(type: Name): this is Primitive & { name: Name };
  isPrimitive(type?: string): boolean {
    return this.is("Primitive") && (!type || this.name == type);
  }

  isVoid(): this is Primitive & { name: "void" } {
    return this.isPrimitive("void");
  }

  // This is primarily intended to be used to detect function object fields in records,
  // since they only need to be converted to C++ not from it.
  // TODO: consider better names for this function.
  isFunction() {
    return false;
  }

  removeConstRef(this: Type): Exclude<Type, Const | Ref | RRef> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;
    while (self.is("Const") || self.is("Ref") || self.is("RRef")) {
      self = self.type;
    }
    return self;
  }
}

abstract class WrapperType extends TypeBase {
  abstract readonly suffix: string;
  constructor(public type: Type) {
    super();
  }

  isFunction(): boolean {
    return this.type.isFunction();
  }

  toString() {
    return `${this.type}${this.suffix}`;
  }

  toCpp(): string {
    return `${this.type.toCpp()}${this.suffix}`;
  }
}

export class Const extends WrapperType {
  readonly kind = "Const";
  readonly suffix = " const";
}

export class Pointer extends WrapperType {
  readonly kind = "Pointer";
  readonly suffix = "*";
}

export class Ref extends WrapperType {
  readonly kind = "Ref";
  readonly suffix = "&";
}

export class RRef extends WrapperType {
  readonly kind = "RRef";
  readonly suffix = "&&";
}

export class Arg {
  constructor(public name: string, public type: Type) {
    assert(!name.startsWith("_"), `argument "${name}" starts with a '_', but that is reserved`);
  }

  toString() {
    return `${this.name}: ${this.type}`;
  }
}

export class Func extends TypeBase {
  readonly kind = "Func";

  constructor(
    public ret: Type,
    public args: Arg[],
    public isConst: boolean,
    public noexcept: boolean,
    public isOffThread: boolean,
  ) {
    super();
  }

  toString() {
    const args = this.args.map((a) => a.toString()).join(", ");
    return `(${args})${this.isConst ? " const" : ""}${this.noexcept ? " noexcept" : ""} -> ${this.ret}`;
  }

  toCpp(): string {
    // This will often just produce a lambda which has an unutterable type.
    // However we can make a signature type (eg int(string, string)) to be
    // the template argument of something like std::function.
    assert.fail(
      `Cannot convert function types to Cpp type names: ${this}.\n` +
        "Call toCppFunctionType() to get a signature type.",
    );
  }

  toCppFunctionType() {
    return `${this.ret.toCpp()}(${this.args.map((arg) => arg.type.toCpp()).join(", ")})`;
  }

  isFunction(): boolean {
    return true;
  }

  argsSkippingIgnored() {
    return this.args.filter((arg) => !arg.type.isTemplate("IgnoreArgument"));
  }

  // For functions that take a final AsyncCallback argument, transforms into a
  // function signature that omits that argument and returns an AsyncResult.
  // Other functions return undefined.
  asyncTransform(): Func | undefined {
    if (!this.ret.isVoid()) return undefined;
    const voidType = this.ret;
    if (this.args.length == 0) return undefined;
    const lastArgType = this.args[this.args.length - 1].type.removeConstRef();
    if (!lastArgType.isTemplate("AsyncCallback")) return undefined;

    // Now we know we are an async function. Validate requirements and do the transform.
    const cb = lastArgType.args[0];
    assert.equal(cb.kind, "Func" as const);
    assert.equal(cb.ret, voidType);

    // Callback arguments are either (error?) or (result?, error?).
    // In the latter case, result is the "real" return value from the async op.
    assert([1, 2].includes(cb.args.length));
    const lastCbArgType = cb.args[cb.args.length - 1].type;
    assert(
      lastCbArgType.isOptional("AppError") ||
        lastCbArgType.isOptional("Status") ||
        lastCbArgType.isPrimitive("Status") ||
        lastCbArgType.isNullable("std::error_code") ||
        lastCbArgType.isNullable("std::exception_ptr"),
      "Last arg to AsyncCallback must be one of " +
        "util::Optional<AppError>, util::Optional<Status>, Status, Nullable<std::exception_ptr>, r Nullable<std::error_code>, " +
        `but got ${lastCbArgType}`,
    );
    let res: Type = voidType;
    if (cb.args.length == 2) {
      res = cb.args[0].type.removeConstRef();
      if (res.isOptional() || res.isNullable()) {
        res = res.args[0];
      }
    }
    return new Func(
      new Template("AsyncResult", [res]),
      this.args.slice(0, -1),
      this.isConst,
      this.noexcept,
      this.isOffThread,
    );
  }

  // Like asyncTransform(), but returns self for non-async functions. This is useful if you only care
  // about the exposed signature, and not whether it is an async function.
  asyncTransformOrSelf(): Func {
    return this.asyncTransform() ?? this;
  }
}

export class Template extends TypeBase {
  readonly kind = "Template";
  constructor(public name: string, public args: Type[]) {
    super();
  }

  toString() {
    return `${this.name}<${this.args.join(", ")}>`;
  }

  toCpp(): string {
    assert.notEqual(this.name, "AsyncResult", "Should never see AsyncResult here");

    // These are just markers, not actually a part of the C++ interface.
    if (["Nullable", "IgnoreArgument"].includes(this.name)) return this.args[0].toCpp();

    const templateMap: Record<string, string> = {
      AsyncCallback: "util::UniqueFunction",
    };
    const cppTemplate = templateMap[this.name] ?? this.name;
    let args;
    if (["util::UniqueFunction", "std::function"].includes(cppTemplate)) {
      // Functions can't normally be toCpp'd because lambda types are unutterable.
      // But if a wrapper type is used, we can do this.
      assert.equal(this.args.length, 1);
      const func = this.args[0];
      assert.equal(func.kind, "Func" as const);
      args = func.toCppFunctionType();
    } else {
      args = this.args.map((arg) => arg.toCpp()).join(", ");
    }
    return `${cppTemplate}<${args}>`;
  }

  isFunction(): boolean {
    // This isn't 100% accurate, since eg vector<someFunc> isn't really a function.
    // However, for the purposes of this method, it would still be correct to treat it as such.
    return this.args.some((arg) => arg.isFunction());
  }
}

export type MethodCallSig = ({ self }: { self: string }, ...args: string[]) => string;

export abstract class Method {
  isConstructor = false;
  abstract isStatic: boolean;
  constructor(
    public on: Class,
    public name: string,
    public unique_name: string,
    public cppName: string,
    public sig: Func,
  ) {}

  /**
   * This is a valid identifier for this method that is unique across all classes.
   */
  get id() {
    return `${this.on.name}_${this.unique_name}`;
  }

  // This is basically `abstract call: MethodCallSig`, but I can't write that due to
  // https://github.com/microsoft/TypeScript/issues/51261.
  abstract call(...args: Parameters<MethodCallSig>): ReturnType<MethodCallSig>;
}

export class InstanceMethod extends Method {
  readonly isStatic = false;
  call({ self }: { self: string }, ...args: string[]) {
    return `${self}.${this.cppName}(${args})`;
  }
}
export class StaticMethod extends Method {
  readonly isStatic = true;
  call(_ignored: { self?: string }, ...args: string[]) {
    return `${this.on.cppName}::${this.cppName}(${args})`;
  }
}
export class Constructor extends StaticMethod {
  readonly isConstructor = true;
  constructor(on: Class, name: string, sig: Func) {
    super(on, "", name, "", sig);
  }
  call(_ignored: { self?: string }, ...args: string[]) {
    if (this.on.sharedPtrWrapped) {
      return `std::make_shared<${this.on.cppName}>(${args})`;
    } else {
      return `${this.on.cppName}(${args})`;
    }
  }
}

export class Property extends InstanceMethod {
  constructor(on: Class, name: string, type: Type) {
    // TODO should noexcept be true? Maybe provide a way to specify it?
    super(on, name, name, name, new Func(type, [], true, /*noexcept*/ false, /*isOffThread*/ false));
  }

  get type() {
    return this.sig.ret;
  }
}

export abstract class NamedType extends TypeBase {
  constructor(public name: string) {
    super();
    assert(!name.includes("_"), `Illegal type name '${name}': '_' is not allowed.`);
  }
}

export class Class extends NamedType {
  readonly kind = "Class";
  cppName!: string;
  abstract = false;
  base?: Class;
  subclasses: Class[] = [];
  methods: Method[] = [];
  sharedPtrWrapped = false;
  needsDeref = false;
  iterable?: Type;

  toString() {
    return `class ${this.name}`;
  }

  toCpp() {
    return this.cppName;
  }

  rootBase() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cls: Class = this;
    while (cls.base) {
      cls = cls.base;
    }
    return cls;
  }

  *decedents(): Iterable<Class> {
    for (const sub of this.subclasses) {
      assert.notEqual(sub, this, `base class loop detected on ${this.name}`);
      yield sub;
      yield* sub.decedents();
    }
  }
}

export class Field {
  constructor(
    public name: string,
    public cppName: string,
    public type: Type,
    public required: boolean,
    public defaultVal: undefined | string,
  ) {}
}

export class Struct extends NamedType {
  readonly kind = "Struct";
  cppName!: string;
  fields: Field[] = [];

  toString() {
    return `struct ${this.name}`;
  }

  toCpp() {
    return this.cppName;
  }
}

export class Primitive extends TypeBase {
  readonly kind = "Primitive";
  constructor(public name: string) {
    super();
  }

  toString() {
    return this.name;
  }

  toCpp() {
    const primitiveMap: Record<string, string> = {
      count_t: "size_t",
      EncryptionKey: "std::vector<char>",
      AppError: "app::AppError",
      EJson: "std::string",
      EJsonObj: "std::string",
      EJsonArray: "std::string",
      QueryArg: "mpark::variant<Mixed, std::vector<Mixed>>",
    };
    return primitiveMap[this.name] ?? this.name;
  }
}

export class Opaque extends NamedType {
  readonly kind = "Opaque";

  toCpp() {
    return this.name;
  }
}

export class Enumerator {
  constructor(public name: string, public value: number) {}
}

export class Enum extends NamedType {
  readonly kind = "Enum";
  cppName!: string;
  enumerators: Enumerator[] = [];

  toString() {
    return `enum ${this.name}`;
  }

  toCpp() {
    return this.cppName;
  }
}

export class KeyType extends NamedType {
  readonly kind = "KeyType";
  type!: Type;

  toCpp() {
    return this.name;
  }
}

export type Type =
  | Const //
  | Pointer
  | Ref
  | RRef
  | Func
  | Template
  | Class
  | Struct
  | Primitive
  | Opaque
  | KeyType
  | Enum;

export type TypeKind = Type["kind"];

export class BoundSpec {
  // Note: For now, all aliases are fully resolved and no trace is left here.
  // Most consumers don't care about them. Will see if we ever want to use aliases
  // TS definition files for documentation purposes.

  /** base classes are guaranteed to be at an earlier index than their subclasses to simplify consumption. */
  classes: Class[] = [];
  records: Struct[] = [];
  keyTypes: KeyType[] = [];
  enums: Enum[] = [];
  opaqueTypes: Opaque[] = [];
  mixedInfo!: MixedInfo;
  types: Record<string, Type> = {};
}

type MixedInfo = {
  getters: { dataType: string; getter: string; type: Type }[];
  unusedDataTypes: string[];
  ctors: Type[];
};

export function bindModel(spec: Spec): BoundSpec {
  const templates: Map<string, Spec["templates"][string]> = new Map();
  const rootClasses: Class[] = [];

  const out = new BoundSpec();

  function addType<T extends Type>(name: string, type: T | (new (name: string) => T)) {
    assert(!(name in out.types));
    if (typeof type == "function") type = new type(name);

    out.types[name] = type;
    return type;
  }
  function addShared<T extends Type>(name: string, type: T) {
    assert(!(name in out.types));
    return (out.types[name] = new Template("std::shared_ptr", [type]));
  }

  function resolveTypes(typeSpec: TypeSpec): Type {
    switch (typeSpec.kind) {
      case "const":
        return new Const(resolveTypes(typeSpec.type));
      case "pointer":
        return new Pointer(resolveTypes(typeSpec.type));
      case "ref":
        return new Ref(resolveTypes(typeSpec.type));
      case "rref":
        return new RRef(resolveTypes(typeSpec.type));

      case "function": {
        return new Func(
          resolveTypes(typeSpec.ret),
          typeSpec.args.map((a) => new Arg(a.name, resolveTypes(a.type))),
          typeSpec.isConst,
          typeSpec.isNoExcept,
          typeSpec.isOffThread,
        );
      }

      case "type-name": {
        const name = typeSpec.name;
        assert(name in out.types, `no such type: ${name}`);
        return out.types[name];
      }

      case "template-instance": {
        const name = typeSpec.name;
        assert(templates.has(name), `no such template: ${name}`);
        const argCount = templates.get(name);
        if (argCount != "*")
          assert.equal(typeSpec.templateArguments.length, argCount, `template ${name} takes ${argCount} args`);
        return new Template(name, typeSpec.templateArguments.map(resolveTypes));
      }
    }
  }

  function handleMethods<Out extends Method>(
    OutType: new (...args: ConstructorParameters<typeof Method>) => Out,
    on: Class,
    methods: Record<string, MethodSpec[]>,
  ) {
    for (const [name, overloads] of Object.entries(methods)) {
      for (const overload of overloads) {
        on.methods.push(
          new OutType(
            on,
            name,
            overload.suffix ? `${name}_${overload.suffix}` : name,
            overload.cppName ?? name,
            resolveTypes(overload.sig) as Func,
          ),
        );
      }
    }
  }

  // Attach names to instences of Type in types
  for (const [name, args] of Object.entries(spec.templates)) {
    templates.set(name, args);
  }

  for (const name of spec.primitives) {
    addType(name, Primitive);
  }

  for (const [name, { sharedPtrWrapped }] of Object.entries(spec["classes"])) {
    const cls = addType<Class>(name, Class);
    if (sharedPtrWrapped) {
      cls.sharedPtrWrapped = true;
      addShared(sharedPtrWrapped, cls);
    }
  }

  for (const [name, { cppName, values }] of Object.entries(spec.enums)) {
    const enm = addType(name, Enum);
    out.enums.push(enm);
    enm.cppName = cppName ?? name;
    for (const [name, value] of Object.entries(values)) {
      enm.enumerators.push(new Enumerator(name, value));
    }
  }

  for (const name of Object.keys(spec.records)) {
    out.records.push(addType(name, Struct));
  }
  for (const name of Object.keys(spec.keyTypes)) {
    out.keyTypes.push(addType(name, KeyType));
  }
  for (const name of spec.opaqueTypes) {
    out.opaqueTypes.push(addType(name, Opaque));
  }

  for (const [name, type] of Object.entries(spec.typeAliases)) {
    addType(name, resolveTypes(type));
  }

  // Now clean up the Type instances to refer to other Types, rather than just using strings.

  for (const [name, { cppName, fields }] of Object.entries(spec.records)) {
    const struct = out.types[name] as Struct;
    struct.cppName = cppName ?? name;
    struct.fields = Object.entries(fields).map(([name, field]) => {
      const type = resolveTypes(field.type);
      // Optional and Nullable fields are never required.
      const required = field.default === undefined && !(type.isNullable() || type.isOptional());
      return new Field(name, field.cppName ?? name, type, required, field.default);
    });
  }

  for (const [name, type] of Object.entries(spec.keyTypes)) {
    const keyType = out.types[name] as KeyType;
    keyType.type = resolveTypes(type);
  }

  for (const [name, raw] of Object.entries(spec["classes"])) {
    const cls = out.types[name] as Class;
    cls.cppName = raw.cppName ?? name;
    handleMethods(InstanceMethod, cls, raw.methods);
    handleMethods(StaticMethod, cls, raw.staticMethods);

    if (raw.base) {
      const base = out.types[raw.base];
      assert(base, `${name} has unknown base ${raw.base}`);
      assert(base instanceof Class, `Bases must be classes, but ${raw.base} is a ${base.constructor.name}`);
      cls.base = base;
      base.subclasses.push(cls);
    } else {
      rootClasses.push(cls);
    }

    cls.needsDeref = raw.needsDeref;
    cls.abstract = raw.abstract;

    if (raw.iterable) cls.iterable = resolveTypes(raw.iterable);

    // Constructors are exported to js as named static methods. The "real" js constructors
    // are only used internally for attaching the C++ instance to a JS object.
    cls.methods.push(
      ...Object.entries(raw.constructors).flatMap(([name, rawSig]) => {
        const sig = resolveTypes(rawSig);
        // Constructors implicitly return the type of the class.
        assert(sig.kind == "Func" && sig.ret.isVoid());
        sig.ret = cls.sharedPtrWrapped ? new Template("std::shared_ptr", [cls]) : cls;
        return new Constructor(cls, name, sig);
      }),
    );

    for (const [name, type] of Object.entries(raw.properties ?? {})) {
      cls.methods.push(new Property(cls, name, resolveTypes(type)));
    }
  }

  for (const cls of rootClasses) {
    out.classes.push(cls, ...cls.decedents());
  }

  out.mixedInfo = {
    getters: Object.entries(spec.mixedInfo.dataTypes).map(([k, v]) => ({
      dataType: k,
      getter: v.getter,
      type: out.types[v.type],
    })),
    unusedDataTypes: spec.mixedInfo.unusedDataTypes,
    ctors: spec.mixedInfo.extraCtors
      .map((t) => out.types[t])
      .concat(Object.values(spec.mixedInfo.dataTypes).map(({ type }) => out.types[type])),
  };

  return out;
}
