import {strict as assert} from 'assert'

import {Spec, TypeSpec, ClassSpec, QualifiedNameSpec, MethodSpec} from './spec'

class Const {
    readonly kind = 'Const'
    constructor(public type: Type) {}

    toString() {return `${this.type} const`}
}

class Pointer {
    readonly kind = 'Pointer'
    constructor(public type: Type) {}

    toString() {return `${this.type}*`}
}

class Ref {
    readonly kind = 'Ref'
    constructor(public type: Type) {}

    toString() {return `${this.type}&`}
}

class Arg {
    constructor(public name: string, public type: Type) {}

    toString() {return `${this.name}: ${this.type}`}
}

class Func {
    readonly kind = 'Func'

    constructor(public ret: Type, public args: Arg[], public isConst: boolean, public noexcept: boolean) {}

    toString() {
        const args = this.args.map(a => a.toString()).join(', ')
        return `(${args})${this.isConst ? ' const' : ''}${this.noexcept ? ' noexcept' : ''} -> ${this.ret}`
    }
}

class Template {
    readonly kind = 'Template'
    constructor(public name: string, public args: Type[]) {}

    toString() {
        return `${this.name}<${this.args.join(', ')}>`
    }
}

class Method {
    isConstructor = false;
    constructor(public name: string, public unique_name: string, public sig: Func) {}
}
class Constructor extends Method {
    readonly isConstructor = true
    constructor(public name: string, public sig: Func) {
        super(name, name, sig)
    }
}

class Class {
    readonly kind = 'Class'
    isInterface = false
    properties: Record<string, Type> = {}
    methods: Method[] = []
    staticMethods: Method[] = []
    sharedPtrWrapped = false
    constructor(public name: string) {}

    toString() { return `class ${this.name}` }
}

class Interface extends Class {
    readonly isInterface = true
    readonly sharedPtrWrapped = true
}

class Field {
    constructor(public name: string, public type: Type, public required: boolean) {}
}

class Struct {
    readonly kind = 'Struct'
    fields: Field[] = []
    constructor(public name: string) {}

    toString() { return `struct ${this.name}` }
}

class Primitive {
    readonly kind = 'Primitive'
    constructor(public name: string) {}

    toString() { return this.name }
}

class Opaque {
    readonly kind = 'Opaque'
    constructor(public name: string) {}
}

class Enumerator {
    constructor(public name: string, public type: Type) {}
}

class Enum {
    readonly kind = 'Enum'
    enumerators: Enumerator[] = []
    constructor(public name: string) {}

    toString() { return `enum ${this.name}` }
}

export type Type =
    Const
    | Pointer
    | Ref
    | Func
    | Template
    | Class
    | Interface
    | Struct
    | Primitive
    | Opaque
    | Enum

type TypeKind = Type['kind']

export class BoundSpec {
    classes: Class[] = []
    records: Struct[] = []
    enums: Enum[] = []
}

export function bindModel(spec: Spec): BoundSpec {
    const templates: Set<string> = new Set()
    const types: Record<string, Type> = {}

    const out = new BoundSpec()

    function addType<T extends Type>(name: string, type: T | (new (name: string) => T)) {
        assert(!(name in types))
        if (typeof type == 'function')
            type = new type(name)

        types[name] = type
        return type
    }
    function addShared<T extends Type>(name: string, type: T) {
        assert(!(name in types))
        return types[name] = new Template('std::shared_ptr', [type])
    }

    function resolveTypes(typeSpec: TypeSpec): Type {
        if (typeSpec.kind == 'function') {
            return new Func(
                resolveTypes(typeSpec.return),
                typeSpec.arguments.map(a => new Arg(a.name, resolveTypes(a.type))),
                typeSpec.isConst,
                typeSpec.isNoExcept)
        }

        // Note: order of these checks is very important!
        // TODO do this during parse so we don't lose information
        assert(!typeSpec.isRvalueReference, "rvalue refs are not supported yet")
        if (typeSpec.isReference) {
            return new Ref(resolveTypes({...typeSpec, isReference: false}))
        } else if (typeSpec.isPointer) {
            return new Pointer(resolveTypes({...typeSpec, isPointer: false}))
        } else if (typeSpec.isConst) {
            return new Const(resolveTypes({...typeSpec, isConst: false}))
        }

        const name = unqualify(typeSpec.names)
        switch (typeSpec.kind) {
            case "qualified-name":
                assert(name in types, `no such type: ${name}`)
                return types[name]
            case "template-instance":
                assert(templates.has(name), `no such template: ${name}`)
                return new Template(name, typeSpec.templateArguments.map(resolveTypes))
        }
    }

    function overloadToMethod(name: string, overload: MethodSpec) {
        return new Method(
            name,
            overload.suffix ? `${name}_${overload.suffix}` : name,
            resolveTypes(overload.sig) as Func)
    }

    function unqualify(names: string[]) {
        assert(names.length)
        return names.join('::')
    }

    // Attach names to instences of Type in types
    for (const name of spec.templates) {
        templates.add(name)
    }

    for (const name of spec.primitives) {
        addType(name, Primitive)
    }

    for (const [subtree, ctor] of [['classes', Class], ['interfaces', Interface]] as const) {
        for (const [name, {sharedPtrWrapped}] of Object.entries(spec[subtree])) {
            const cls = addType<Class>(name, ctor)
            out.classes.push(cls)
            if (sharedPtrWrapped) {
                cls.sharedPtrWrapped = true
                addShared(sharedPtrWrapped, cls)
            }
        }
    }

    for (const [name, {values}] of Object.entries(spec.enums)) {
        const enm = addType(name, Enum)
        out.enums.push(enm)
        // TODO values
    }

    for (const name of Object.keys(spec.records)) {
        out.records.push(addType(name, Struct))
    }
    for (const name of spec.opaqueTypes) {
        addType(name, Opaque)
    }

    for (const [name, type] of Object.entries(spec.typeAliases)) {
        addType(name, resolveTypes(type))
    }

    // Now clean up the Type instances to refer to other Types, rather than just using strings.
    for (const [name, {fields}] of Object.entries(spec.records)) {
        (types[name] as Struct).fields =
            Object.entries(fields)
            .map(([name, field]) => new Field(name, resolveTypes(field.type), field.default === undefined))
    }

    for (const subtree of ['classes', 'interfaces'] as const) {
        for (const [name, raw] of Object.entries(spec[subtree])) {
            const cls = types[name] as Class
            cls.methods = Object.entries(raw.methods)
                .flatMap(([name, overloads]) => overloads.map(o => overloadToMethod(name, o)))
            cls.staticMethods = Object.entries(raw.staticMethods)
                .flatMap(([name, overloads]) => overloads.map(o => overloadToMethod(name, o)))
            if (subtree == 'classes') {
                // Constructors are exported to js as named static methods. The "real" js constructors
                // are only used internally for attaching the C++ instance to a JS object.
                cls.staticMethods.push(...Object.entries((raw as ClassSpec).constructors)
                    .flatMap(([name, rawSig]) => {
                        const sig = resolveTypes(rawSig)
                        // Constructors implicitly return the type of the class.
                        assert(sig.kind == 'Func' && sig.ret.kind == 'Primitive' && sig.ret.name == 'void')
                        sig.ret = cls
                        return new Constructor(name, sig)
                    }));
                for (const [name, type] of Object.entries((raw as ClassSpec).properties ?? {})) {
                    cls.properties[name] = resolveTypes(type)
                }
            }
        }
    }

    return out
}
