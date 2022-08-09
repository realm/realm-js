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

abstract class Method {
  isConstructor = false;
  abstract isStatic: boolean;
  constructor(public name: string, public unique_name: string, public sig: Func) {}
}

class InstanceMethod extends Method {
  readonly isStatic = false;
}
class StaticMethod extends Method {
  readonly isStatic = true;
}
class Constructor extends StaticMethod {
  readonly isConstructor = true;
  constructor(public name: string, public sig: Func) {
    super(name, name, sig);
  }
}

class Class {
  readonly kind = "Class";
  isInterface = false;
  properties: Record<string, Type> = {};
  methods: Method[] = [];
  sharedPtrWrapped = false;
  needsDeref = false;
  iterable?: Type;
  constructor(public name: string) {}

  toString() {
    return `class ${this.name}`;
  }
}

class Interface extends Class {
  readonly isInterface = true;
  readonly sharedPtrWrapped = true;
  readonly needsDeref = true;
}

class Field {
  constructor(public name: string, public type: Type, public required: boolean) {}
}

class Struct {
  readonly kind = "Struct";
  fields: Field[] = [];
  constructor(public name: string) {}

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

class Opaque {
  readonly kind = "Opaque";
  constructor(public name: string) {}
}

class Enumerator {
  constructor(public name: string, public value: number) {}
}

class Enum {
  readonly kind = "Enum";
  enumerators: Enumerator[] = [];
  constructor(public name: string) {}

  toString() {
    return `enum ${this.name}`;
  }
}

export type Type =
  | Const //
  | Pointer
  | Ref
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
}

export function bindModel(spec: Spec): BoundSpec {
  const templates: Set<string> = new Set();
  const types: Record<string, Type> = {};

  const out = new BoundSpec();

  function addType<T extends Type>(name: string, type: T | (new (name: string) => T)) {
    assert(!(name in types));
    if (typeof type == "function") type = new type(name);

    types[name] = type;
    return type;
  }
  function addShared<T extends Type>(name: string, type: T) {
    assert(!(name in types));
    return (types[name] = new Template("std::shared_ptr", [type]));
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
    assert(!typeSpec.isRvalueReference, "rvalue refs are not supported yet");
    if (typeSpec.isReference) {
      return new Ref(resolveTypes({ ...typeSpec, isReference: false }));
    } else if (typeSpec.isPointer) {
      return new Pointer(resolveTypes({ ...typeSpec, isPointer: false }));
    } else if (typeSpec.isConst) {
      return new Const(resolveTypes({ ...typeSpec, isConst: false }));
    }

    const name = unqualify(typeSpec.names);
    switch (typeSpec.kind) {
      case "qualified-name":
        assert(name in types, `no such type: ${name}`);
        return types[name];
      case "template-instance":
        assert(templates.has(name), `no such template: ${name}`);
        return new Template(name, typeSpec.templateArguments.map(resolveTypes));
    }
  }

  function handleMethods<Out extends Method>(
    OutType: new (...args: ConstructorParameters<typeof Method>) => Out,
    methods: Record<string, MethodSpec[]>,
  ): Out[] {
    return Object.entries(methods).flatMap(([name, overloads]) =>
      overloads.map(
        (overload) =>
          new OutType(name, overload.suffix ? `${name}_${overload.suffix}` : name, resolveTypes(overload.sig) as Func),
      ),
    );
  }

  function unqualify(names: string[]) {
    assert(names.length);
    return names.join("::");
  }

  // Attach names to instences of Type in types
  for (const name of spec.templates) {
    templates.add(name);
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

  for (const [name, { values }] of Object.entries(spec.enums)) {
    const enm = addType(name, Enum);
    out.enums.push(enm);
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
  for (const [name, { fields }] of Object.entries(spec.records)) {
    (types[name] as Struct).fields = Object.entries(fields).map(
      ([name, field]) => new Field(name, resolveTypes(field.type), field.default === undefined),
    );
  }

  for (const subtree of ["classes", "interfaces"] as const) {
    for (const [name, raw] of Object.entries(spec[subtree])) {
      const cls = types[name] as Class;
      cls.methods.push(...handleMethods(InstanceMethod, raw.methods));
      cls.methods.push(...handleMethods(StaticMethod, raw.staticMethods));
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
            sig.ret = cls;
            return new Constructor(name, sig);
          }),
        );

        for (const [name, type] of Object.entries(rawCls.properties ?? {})) {
          cls.properties[name] = resolveTypes(type);
        }
      }
    }
  }

  return out;
}
