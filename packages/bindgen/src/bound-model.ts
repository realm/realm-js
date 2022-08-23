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

class Const {
  readonly kind = "Const";
  constructor(public type: Type) {}

  toString() {
    return `${this.type} const`;
  }
}

class Pointer {
  readonly kind = "Pointer";
  constructor(public type: Type) {}

  toString() {
    return `${this.type}*`;
  }
}

class Ref {
  readonly kind = "Ref";
  constructor(public type: Type) {}

  toString() {
    return `${this.type}&`;
  }
}

class RRef {
  readonly kind = "RRef";
  constructor(public type: Type) {}

  toString() {
    return `${this.type}&&`;
  }
}

export class Arg {
  constructor(public name: string, public type: Type) {}

  toString() {
    return `${this.name}: ${this.type}`;
  }
}

class Func {
  readonly kind = "Func";

  constructor(public ret: Type, public args: Arg[], public isConst: boolean, public noexcept: boolean) {}

  toString() {
    const args = this.args.map((a) => a.toString()).join(", ");
    return `(${args})${this.isConst ? " const" : ""}${this.noexcept ? " noexcept" : ""} -> ${this.ret}`;
  }
}

class Template {
  readonly kind = "Template";
  constructor(public name: string, public args: Type[]) {}

  toString() {
    return `${this.name}<${this.args.join(", ")}>`;
  }
}

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

  get id() {
    return `${this.on.name}::${this.unique_name}`;
  }

  abstract call({ self }: { self: string }, ...args: string[]): string;
}

class InstanceMethod extends Method {
  readonly isStatic = false;
  call({ self }: { self: string }, ...args: string[]) {
    return `${self}.${this.cppName}(${args})`;
  }
}
class StaticMethod extends Method {
  readonly isStatic = true;
  call(_ignored: { self?: string }, ...args: string[]) {
    return `${this.on.cppName}::${this.cppName}(${args})`;
  }
}
class Constructor extends StaticMethod {
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

export class Property {
  constructor(public name: string, public type: Type) {}
}

export class NamedType {
  constructor(public name: string) {}
}

class Class extends NamedType {
  readonly kind = "Class";
  cppName!: string;
  isInterface = false;
  properties: Property[] = [];
  methods: Method[] = [];
  sharedPtrWrapped = false;
  needsDeref = false;
  iterable?: Type;

  toString() {
    return `class ${this.name}`;
  }
}

class Interface extends Class {
  readonly isInterface = true;
  readonly sharedPtrWrapped = true;
  readonly needsDeref = true;
}

export class Field {
  constructor(public name: string, public type: Type, public required: boolean) {}
}

class Struct extends NamedType {
  readonly kind = "Struct";
  cppName!: string;
  fields: Field[] = [];

  toString() {
    return `struct ${this.name}`;
  }
}

class Primitive {
  readonly kind = "Primitive";
  constructor(public name: string) {}

  toString() {
    return this.name;
  }
}

class Opaque extends NamedType {
  readonly kind = "Opaque";
}

class Enumerator {
  constructor(public name: string, public value: number) {}
}

class Enum extends NamedType {
  readonly kind = "Enum";
  cppName!: string;
  enumerators: Enumerator[] = [];

  toString() {
    return `enum ${this.name}`;
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
  | Interface
  | Struct
  | Primitive
  | Opaque
  | Enum;

export class BoundSpec {
  // Note: For now, all aliases are fully resolved and no trace is left here.
  // Most consumers don't care about them. Will see if we ever want to use aliases
  // TS definition files for documentation purposes.
  classes: Class[] = [];
  records: Struct[] = [];
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
    if (typeSpec.kind == "function") {
      return new Func(
        resolveTypes(typeSpec.return),
        typeSpec.arguments.map((a) => new Arg(a.name, resolveTypes(a.type))),
        typeSpec.isConst,
        typeSpec.isNoExcept,
      );
    }

    // Note: order of these checks is very important!
    // TODO do this during parse so we don't lose information
    if (typeSpec.isReference) {
      return new Ref(resolveTypes({ ...typeSpec, isReference: false }));
    } else if (typeSpec.isRvalueReference) {
      return new RRef(resolveTypes({ ...typeSpec, isRvalueReference: false }));
    } else if (typeSpec.isPointer) {
      return new Pointer(resolveTypes({ ...typeSpec, isPointer: false }));
    } else if (typeSpec.isConst) {
      return new Const(resolveTypes({ ...typeSpec, isConst: false }));
    }

    const name = unqualify(typeSpec.names);
    switch (typeSpec.kind) {
      case "qualified-name":
        assert(name in out.types, `no such type: ${name}`);
        return out.types[name];
      case "template-instance":
        assert(templates.has(name), `no such template: ${name}`);
        const argCount = templates.get(name);
        if (argCount != "*")
          assert.equal(typeSpec.templateArguments.length, argCount, `template ${name} takes ${argCount} args`);
        return new Template(name, typeSpec.templateArguments.map(resolveTypes));
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

  function unqualify(names: string[]) {
    assert(names.length);
    return names.join("::");
  }

  // Attach names to instences of Type in types
  for (const [name, args] of Object.entries(spec.templates)) {
    templates.set(name, args);
  }

  for (const name of spec.primitives) {
    addType(name, Primitive);
  }

  for (const [subtree, ctor] of [
    ["classes", Class],
    ["interfaces", Interface],
  ] as const) {
    for (const [name, { sharedPtrWrapped }] of Object.entries(spec[subtree])) {
      const cls = addType<Class>(name, ctor);
      out.classes.push(cls);
      if (sharedPtrWrapped) {
        cls.sharedPtrWrapped = true;
        addShared(sharedPtrWrapped, cls);
      }
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
    struct.fields = Object.entries(fields).map(
      ([name, field]) => new Field(name, resolveTypes(field.type), field.default === undefined),
    );
  }

  for (const subtree of ["classes", "interfaces"] as const) {
    for (const [name, raw] of Object.entries(spec[subtree])) {
      const cls = out.types[name] as Class;
      cls.cppName = raw.cppName ?? name;
      handleMethods(InstanceMethod, cls, raw.methods);
      handleMethods(StaticMethod, cls, raw.staticMethods);
      if (subtree == "classes") {
        const rawCls = raw as ClassSpec;
        cls.needsDeref = rawCls.needsDeref;

        if (rawCls.iterable) cls.iterable = resolveTypes(rawCls.iterable);

        // Constructors are exported to js as named static methods. The "real" js constructors
        // are only used internally for attaching the C++ instance to a JS object.
        cls.methods.push(
          ...Object.entries(rawCls.constructors).flatMap(([name, rawSig]) => {
            const sig = resolveTypes(rawSig);
            // Constructors implicitly return the type of the class.
            assert(sig.kind == "Func" && sig.ret.kind == "Primitive" && sig.ret.name == "void");
            sig.ret = cls.sharedPtrWrapped ? new Template("std::shared_ptr", [cls]) : cls;
            return new Constructor(cls, name, sig);
          }),
        );

        for (const [name, type] of Object.entries(rawCls.properties ?? {})) {
          cls.properties.push(new Property(name, resolveTypes(type)));
        }
      }
    }
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
