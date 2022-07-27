import { strict as assert } from 'assert';

export class CppVar {
    public value?: string
    public isStatic?: boolean
    constructor(
        public readonly type: string,
        public readonly name: string,
        {value, static: isStatic}: {value?: string, static?: boolean} = {}) {
        this.value = value
        this.isStatic = isStatic
    }

    arg_definition() {
        return `${this.type} ${this.name}`
    }

    arg_declaration() {
        let value = this.value ? ` = ${this.value}` : ''
        return `${this.type} ${this.name}${value}`
    }

    definition() {
        let staticTok = this.isStatic ? 'static' : ''
        return `${staticTok} ${this.arg_declaration()};`
    }
}

type CppFuncProp = "static" | "const" | "noexcept" | "override"
export interface CppFuncProps {
    "static"?: boolean,
    "const"?: boolean,
    noexcept?: boolean,
    override?: boolean,
    body?: string,
    attributes?: string
}
export class CppFunc {
    constructor(
        public readonly name: string,
        public ret: string,
        public args: CppVar[],
        public _props: CppFuncProps = {},
    ) {}


    props(...names: CppFuncProp[]) {
        return names.map(n => this.prop(n)).join(' ')
    }

    prop(name: CppFuncProp) {
        return this._props[name] ? name : ''
    }

    declaration() {
        return `${this._props.attributes ?? ''} ${this.prop("static")} ${this.ret} ${this.name}`
            + `(${this.args.map(a => a.arg_declaration()).join(", ")}) `
            + `${this.props("const", "noexcept", "override")};`
    }

    definition(bodyReplacement?: string) {
        return `${this.ret} ${this.qualName()}`
            + `(${this.args.map(a => a.arg_definition()).join(", ")}) `
            + `${this.props("const", "noexcept")} `
            + `{ ${bodyReplacement ?? this.body} }`
    }

    qualName() { return this.name }

    get body() { return this._props.body ?? '' }
    set body(val: string) { this._props.body = val }
}

export class CppMemInit {
    constructor(
        public readonly name: string,
        public val: string,
    ) {}

    init() {
        return `${this.name}(${this.val})`
    }
}

export class CppMethod extends CppFunc {
    public on?: CppClass
    qualName() {return `${this.on!.name}::${this.name}`}
}

export interface CppCtorProps extends CppFuncProps {
    static?: false
    const?: false
    mem_inits?: CppMemInit[]
}

export class CppCtor extends CppMethod {
    public mem_inits: CppMemInit[] = []
    constructor(
        public readonly name: string,
        public args: CppVar[],
        public _props: CppCtorProps = {}
    ) {
        super(name, '', args, _props)
        if (_props.mem_inits)
            this.mem_inits = _props.mem_inits
    }

    definition(bodyReplacement?: string) {
        assert.equal(this.ret, '')
        assert.equal(!!this._props.const, false)
        assert.equal(!!this._props.static, false)

        let mem_inits = this.mem_inits.length == 0 ? '' : `: ${this.mem_inits.map(m => m.init()).join(", ")}`
        return `${this.qualName()}(${this.args.map(a => a.arg_definition()).join(", ")}) ${mem_inits} {
            ${bodyReplacement ?? this.body}
        }`
    }
}

export class CppClass {
    public methods: CppMethod[] = []
    public members: CppVar[] = []
    public bases: string[] = []

    constructor(public readonly name: string) {}

    withCrtpBase(name: string) {
        this.bases.push(`${name}<${this.name}>`)
        return this;
    }

    addMethod<CppMethodDerived extends CppMethod>(meth: CppMethodDerived) {
        meth.on = this
        this.methods.push(meth)
        return meth
    }

    fwdDecl() {
        return `class ${this.name};`
    }

    definition() {
        let base = ''
        if (this.bases.length) {
            base = ` : ${this.bases.map(b => `public ${b}`).join(', ')} `
        }

        return `class ${this.name}${base}{
            public:
                ${this.methods.map(m => m.declaration()).join('\n')}

                ${this.members.map(m => m.definition()).join('\n')}
            };`
    }

    methodDefs() {
        return this.methods.map(m => m.definition()).join('\n')
    }
}

export class CppDecls {
    public classes: CppClass[] = []
    public free_funcs: CppFunc[] = []
    public free_vars: CppVar[] = []

    outputDefsTo(out: (...parts: string[]) => void) {
        for (let c of this.classes) { out(c.fwdDecl()); }
        for (let f of this.free_funcs) { out(f.declaration()); }
        for (let v of this.free_vars) { out(v.definition()); } 
        for (let c of this.classes) { out(c.definition()); }
        for (let c of this.classes) { out(c.methodDefs()); }
        for (let f of this.free_funcs) { out(f.definition()); }
    }
}
