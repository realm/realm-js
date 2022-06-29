import {camelCase, pascalCase} from "change-case";

import {TemplateContext} from "../context";
import {Spec, TypeSpec} from "../spec";
import {CppVar, CppFunc, CppFuncProps, CppMemInit, CppCtor, CppMethod, CppClass, CppDecls, CppCtorProps} from "../cpp"

// Code assumes this is a unique name that is always in scope to refer to the Napi::Env.
// Callbacks need to ensure this is in scope. Functions taking Env arguments must use this name.
const env = 'napi_env_var_ForBindGen'

const node_callback_info = new CppVar('const Napi::CallbackInfo&', 'info')
const envFromCbInfo = `auto ${env} = info.Env();\n`

class CppNodeMethod extends CppMethod {
    constructor(name: string, props?: CppFuncProps) {
        super(name, 'Napi::Value', [node_callback_info], props)
    }

    definition() {
        return super.definition(`
            ${envFromCbInfo}
            try {
                ${this.body}
            } catch (const std::exception& ex) {
                throw convertToNodeExceptionTODO(${env}, ex);
            }
        `)
    }
}

class CppNodeCtor extends CppCtor {
    constructor(name: string, props?: CppCtorProps) {
        super(name, [node_callback_info], props)
    }

    definition() {
        // Note: if we ever want need to try to catch failing member inits, need to
        // change CppCtor to support function-try blocks.
        return super.definition(`
            ${envFromCbInfo}
            try {
                ${this.body}
            } catch (const std::exception& ex) {
                throw convertToNodeExceptionTODO(${env}, ex);
            }
        `)
    }
}

function pushRet<T, U extends T>(arr: T[], elem: U) {
    arr.push(elem);
    return elem;
}

class NodeAddon extends CppClass {
    inits: string[] = []
    exports: Record<string, string> = {}

    constructor() {
        super("RealmAddon")
        this.withCrtpBase("Napi::Addon")
    }

    generateMembers() {
        this.addMethod(new CppCtor(
            this.name,
            [new CppVar('Napi::Env', env), new CppVar('Napi::Object', 'exports')],
            {
                body: `
                    ${this.inits.join('\n')}

                    DefineAddon(exports, {
                        ${Object.entries(this.exports)
                            .map(([name, val]) => `InstanceValue(${name}, ${val}.Value(), napi_enumerable),`)
                            .join('\n')
                        }
                    });
                    `
            }
        ))

    }

    addClass(cls: NodeObjectWrap) {
        const mem = this.memberNameFor(cls)
        this.members.push(new CppVar('Napi::FunctionReference', mem))
        this.inits.push(`${mem} = Persistent(${cls.name}::makeCtor(${env}));`)
        this.exports[`${cls.name}::jsName`] = mem;
    }

    memberNameFor(cls: CppClass) {
        return `m_cls_${cls.name}_ctor`
    }

    accessCtor(cls: CppClass) {
        return `${env}.GetInstanceData<${this.name}>()->${this.memberNameFor(cls)}`
    }
}

class NodeObjectWrap extends CppClass {
    ctor: CppCtor
    constructor(public jsName: string) {
        super(`Node_${jsName}`)
        this.withCrtpBase('Napi::ObjectWrap')

        this.ctor = this.addMethod(new CppCtor(this.name, [node_callback_info], {
            mem_inits: [new CppMemInit(this.bases[0], 'info')]
        }))
        this.ctor.body = envFromCbInfo

        this.members.push(new CppVar('constexpr const char*', 'jsName', {value: `"${jsName}"`, static: true}))
    }

}

function convertToNode(type: TypeSpec, val: string) {
    // TODO
    if (type.kind == 'qualified-name' && type.names[0] == 'void') 
        return `((void)(${val}), ${env}.Undefined())`
    return `convertToNodeTODO(${val})`
}

function convertFromNode(type: TypeSpec, val: string) {
    // TODO
    if (type.kind == 'qualified-name' && type.names[0] == 'void') 
        return `(void)(${val})`
    return `convertFromNodeTODO(${val})`
}

class NodeCppDecls extends CppDecls {
    inits: string[] = []
    addon = pushRet(this.classes, new NodeAddon())
    constructor(spec: Spec) {
        super()

        for (const [cppClassName, { methods, properties, staticMethods, sharedPtrWrapped }] of Object.entries(spec.classes)) {
            let jsName = pascalCase(cppClassName)
            let cls = pushRet(this.classes, new NodeObjectWrap(jsName))

            let descriptors: string[] = []

            const self = sharedPtrWrapped ? '(*m_ptr)' : '(m_val)';

            descriptors = []

            for (let [cppName, overloads] of Object.entries(methods)) {
                for (let overload of overloads) {
                    let jsName = camelCase(cppName + (overload.suffix ? `_${overload.suffix}`: ''))
                    let cppMeth = cls.addMethod(new CppNodeMethod(jsName))
                    descriptors.push(`InstanceMethod<&${cppMeth.qualName()}>("${jsName}")`)
                    let ret = overload.sig.return
                    let args = overload.sig.arguments
                    cppMeth.body += `
                        if (info.Length() != ${args.length})
                            throw Napi::TypeError::New(${env}, "expected ${args.length} arguments");

                        return ${
                            convertToNode(
                                ret,
                                `${self}.${cppName}(${args.map((a, i) => convertFromNode(a.type, `info[${i}]`)).join(', ')})`
                            )};
                    `
                }
            }
            for (let [cppName, overloads] of Object.entries(staticMethods)) {
                for (let overload of overloads) {
                    let jsName = camelCase(cppName + (overload.suffix ? `_${overload.suffix}`: ''))
                    let cppMeth = cls.addMethod(new CppNodeMethod(jsName, {static: true}))
                    descriptors.push(`StaticMethod<&${cppMeth.qualName()}>("${jsName}")`)
                    let ret = overload.sig.return
                    let args = overload.sig.arguments
                    //let ret_decl = 'auto&& val = ' if ret != Primitive('void') else ''
                    cppMeth.body += `
                        if (info.Length() != ${args.length})
                            throw Napi::TypeError::New(${env}, "expected ${args.length} arguments");

                        return ${
                            convertToNode(
                                ret,
                                `${cppClassName}::${cppName}(${args.map((a, i) => convertFromNode(a.type, `info[${i}]`)).join(', ')})`
                            )};
                    `
                }
            }

            for (let [cppPropName, type] of Object.entries(properties)) {
                let jsName = camelCase(cppPropName)
                let cppMeth = cls.addMethod(new CppNodeMethod(jsName))
                cppMeth.body += `return ${convertToNode(type, `${self}.${cppPropName}()`)};`
                descriptors.push(`InstanceAccessor<&${cppMeth.qualName()}>("${jsName}")`)
            }

            cls.ctor.body += `
                if (info.Length() != 1 || !info[0].IsExternal())
                    throw Napi::TypeError::New(${env}, "need 1 external argument");
            `

            if (sharedPtrWrapped) {
                let ptr = `std::shared_ptr<${cppClassName}>`
                cls.members.push(new CppVar(ptr, 'm_ptr'))
                cls.ctor.body += `m_ptr = std::move(*info[0].As<Napi::External<${ptr}>>().Data());`
                this.free_funcs.push(new CppFunc(
                    `NODE_TO_SHARED_${cppClassName}`,
                    `const ${ptr}&`,
                    [new CppVar('Napi::Value', 'val')],
                    {body: `return ${cls.name}::Unwrap(val.ToObject())->m_ptr;`}
                ))
                this.free_funcs.push(new CppFunc(
                    `NODE_FROM_SHARED_${cppClassName}`,
                    'Napi::Value',
                    [new CppVar('Napi::Env', env), new CppVar(ptr, 'ptr')],
                    {body: `return ${this.addon.accessCtor(cls)}.New({Napi::External<${ptr}>::New(${env}, &ptr)});`}
                ))
            } else {
                cls.members.push(new CppVar(cppClassName, 'm_val'))
                cls.ctor.body += `m_val = std::move(*info[0].As<Napi::External<${cppClassName}>>().Data());`

                this.free_funcs.push(new CppFunc(
                    `NODE_TO_CLASS_${cppClassName}`,
                    `const ${cppClassName}&`, // XXX should this be mutable?
                    [new CppVar('Napi::Value', 'val')],
                    {body: `return ${cls.name}::Unwrap(val.ToObject())->m_val;`}
                ))
                this.free_funcs.push(new CppFunc(
                    `NODE_FROM_CLASS_${cppClassName}`,
                    'Napi::Value',
                    [new CppVar('Napi::Env', env), new CppVar(cppClassName, 'val')],
                    {body: `return ${this.addon.accessCtor(cls)}.New({Napi::External<${cppClassName}>::New(${env}, &val)});`}
                ))
            }
            
            cls.addMethod(new CppMethod(
                'makeCtor',
                'Napi::Function',
                [new CppVar('Napi::Env', env)],
                {
                    static: true,
                    body: `return DefineClass(${env}, "${jsName}", { ${descriptors.map(d => d + ',').join('\n')} });`
                }
            ))

            this.addon.addClass(cls)
        }

        this.addon.generateMembers();
    }

    outputDefsTo(out: (...parts: string[]) => void) {
        super.outputDefsTo(out)
        out(`\nNODE_API_NAMED_ADDON(realm_cpp, ${this.addon.name})`)
    }
}

export function generateNode({ spec, file : makeFile  }: TemplateContext): void {
    const out = makeFile("node_init.cpp", "clang-format")

    // HEADER
    out(`// This file is generated: Update the spec instead of editing this file directly`)

    for (let header of spec.headers) {
        out(`#include <${header}>`)
    }

    out(`
        #include <napi.h>

        namespace realm::js::node {
        namespace {

        // TODO hacks, because we don't yet support defining types with QualName
        using RealmConfig = Realm::Config;
        using Scheduler = util::Scheduler;

        //TODO implement converions
        template <typename T> Napi::Value convertToNodeTODO(const T&);
        struct ConvertToAny {
            template <typename T>
            operator T&() const;
        };
        ConvertToAny convertFromNodeTODO(Napi::Value);

        Napi::Error convertToNodeExceptionTODO(Napi::Env&, const std::exception&);

        ////////////////////////////////////////////////////////////

    `)

    new NodeCppDecls(spec).outputDefsTo(out)

    out(`
        } // namespace
        } // namespace realm::js::node
    `)
}
