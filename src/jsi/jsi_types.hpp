////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#pragma once

#include <cmath>
#include <functional>
#include <map>
#include <string>

#include <jsi/jsi.h>

#define HANDLESCOPE(env) ::facebook::jsi::Scope handle_scope(env);

#include "js_types.hpp"


namespace realm {

namespace fbjsi = facebook::jsi;

namespace js {
class JsiVal;
class JsiObj;
class JsiString;
class JsiFunc;

class JsiEnv {
public:
    /*implicit*/JsiEnv(fbjsi::Runtime& rt) : m_rt(&rt) {}
    /*implicit*/ operator fbjsi::Runtime&() const {
        return *m_rt;
    }

    fbjsi::Runtime* operator->() const {
        return m_rt;
    }
    fbjsi::Runtime& get() const {
        return *m_rt;
    }

    JsiVal operator()(const fbjsi::Value&) const;
    JsiVal operator()(fbjsi::Value&&) const;
    JsiObj operator()(const fbjsi::Object&) const;
    JsiObj operator()(fbjsi::Object&&) const;
    JsiString operator()(const fbjsi::String&) const;
    JsiString operator()(fbjsi::String&&) const;
    JsiFunc operator()(const fbjsi::Function&) const;
    JsiFunc operator()(fbjsi::Function&&) const;

    JsiVal null() const;
    JsiVal undefined() const;

    JsiObj global() const;

    /** Warning, this can only appear directly as an argument to callFoo(), not assigned to a variable! */
    const fbjsi::Value* args(const JsiVal* argv, size_t argc, std::vector<fbjsi::Value>&& buf = {}) const;

    friend bool operator==(const JsiEnv& a, const JsiEnv& b) {
        return a.m_rt == b.m_rt;
    }

    template <typename... Vals>
    JsiObj obj(std::pair<const char*, Vals>... pairs);

private:
    fbjsi::Runtime* m_rt;
};

template <typename T, typename CRTP>
class JsiWrap {
public:
    JsiWrap(JsiEnv env, T&& val) : m_env(env), m_val(std::move(val)) {}

    JsiWrap(JsiWrap&& other) = default;
    JsiWrap& operator=(JsiWrap&& other) = default;

    JsiWrap(const JsiWrap& other) : JsiWrap(CRTP(other.env(), other.get())) {}
    JsiWrap& operator=(const JsiWrap& other) {
        *this = JsiWrap(other);
    }

    T* operator->() { return &m_val; }
    const T* operator->() const { return &m_val; }

    /*implicit*/ operator const T&() const& { return m_val; }
    /*implicit*/ operator T&() & { return m_val; }
    /*implicit*/ operator T&&() && { return std::move(m_val); }

    const T& get() const& { return m_val; }
    T& get() & { return m_val; }
    T&& get() && { return std::move(m_val); }

    const JsiEnv& env() const {
        return m_env;
    }

    friend bool operator==(const JsiWrap& a, const JsiWrap& b) {
        REALM_ASSERT_RELEASE(&a.env().get() == &b.env().get());
        return T::strictEquals(a.env(), a.get(), b.get());
    }
    
protected:
    JsiEnv m_env;
    T m_val;
};

class JsiString : public JsiWrap<fbjsi::String, JsiString> {
public:
    using JsiWrap::JsiWrap;
    JsiString(JsiEnv env, const fbjsi::String& val) : JsiWrap(env, fbjsi::Value(env, val).getString(env)) {}
};

class JsiFunc : public JsiWrap<fbjsi::Function, JsiFunc> {
public:
    using JsiWrap::JsiWrap;
    JsiFunc(JsiEnv env, const fbjsi::Function& val) : JsiWrap(env, fbjsi::Value(env, val).getObject(env).getFunction(env)) {}
};

class JsiObj : public JsiWrap<fbjsi::Object, JsiObj> {
public:
    using JsiWrap::JsiWrap;
    JsiObj(JsiEnv env, const fbjsi::Object& val) : JsiWrap(env, fbjsi::Value(env, val).getObject(env)) {}
    /*implicit*/ JsiObj(JsiFunc f) : JsiWrap(f.env(), std::move(f).get()) {}
    explicit JsiObj(JsiEnv env) : JsiWrap(env, fbjsi::Object(env)) {}
};

class JsiVal : public JsiWrap<fbjsi::Value, JsiVal> {
public:
    using JsiWrap::JsiWrap;
    JsiVal(JsiEnv env, const fbjsi::Value& val) : JsiWrap(env, fbjsi::Value(env, val)) {}
    /*implicit*/ JsiVal(JsiString val) : JsiWrap(val.env(), std::move(val).get()) {}
    /*implicit*/ JsiVal(JsiFunc val) : JsiWrap(val.env(), std::move(val).get()) {}
    /*implicit*/ JsiVal(JsiObj val) : JsiWrap(val.env(), std::move(val).get()) {}

    JsiObj asObject() const & { return {env(), get().asObject(env())} ;}
    JsiObj asObject() && { return {env(), std::move(get()).asObject(env())} ;}
};

inline JsiVal JsiEnv::operator()(const fbjsi::Value& val) const { return {*this, val}; }
inline JsiVal JsiEnv::operator()(fbjsi::Value&& val) const { return {*this, std::move(val)}; }
inline JsiObj JsiEnv::operator()(const fbjsi::Object& val) const { return {*this, val}; }
inline JsiObj JsiEnv::operator()(fbjsi::Object&& val) const { return {*this, std::move(val)}; }
inline JsiString JsiEnv::operator()(const fbjsi::String& val) const { return {*this, val}; }
inline JsiString JsiEnv::operator()(fbjsi::String&& val) const { return {*this, std::move(val)}; }
inline JsiFunc JsiEnv::operator()(const fbjsi::Function& val) const { return {*this, val}; }
inline JsiFunc JsiEnv::operator()(fbjsi::Function&& val) const { return {*this, std::move(val)}; }

inline JsiVal JsiEnv::null() const {
    return {*this, fbjsi::Value::null()};
}
inline JsiVal JsiEnv::undefined() const {
    return {*this, fbjsi::Value::undefined()};
}
inline JsiObj JsiEnv::global() const {
    return {*this, m_rt->global()};
}
inline const fbjsi::Value* JsiEnv::args(const JsiVal* argv, size_t argc, std::vector<fbjsi::Value>&& buf) const {
    // Special case for 0 or 1 arguments to avoid any copies and allocations.
    if (argc == 0)
        return nullptr;
    if (argc == 1)
        return &argv[0].get();

    buf.reserve(argc);
    for (size_t i = 0; i < argc; i++) {
        buf.emplace_back(*this, argv[i]);
    }

    return buf.data();
}

template <typename... Vals>
JsiObj JsiEnv::obj(std::pair<const char*, Vals>... pairs) {
    auto obj = fbjsi::Object(*this);
    (..., obj.setProperty(*this, pairs.first, std::move(pairs.second)));
    return (*this)(std::move(obj));
}

namespace realmjsi {
struct Types {
	using Context = JsiEnv;
	using GlobalContext = JsiEnv;
	using Value = JsiVal;
	using Object = JsiObj;
	using String = JsiString;
	using Function = JsiFunc;

	using JsiFunctionCallback = fbjsi::Value(*)(fbjsi::Runtime& rt, const fbjsi::Value& thisVal, const fbjsi::Value* args, size_t count);

	using JsiIndexGetterCallback = JsiFunctionCallback;
	using JsiIndexSetterCallback = JsiFunctionCallback;
	using JsiPropertyGetterCallback = JsiFunctionCallback;
	using JsiPropertySetterCallback = JsiFunctionCallback;

	using JsiStringPropertyGetterCallback = JsiFunctionCallback;
	using JsiStringPropertySetterCallback = JsiFunctionCallback;
	using JsiStringPropertyEnumeratorCallback = JsiFunctionCallback;

	using ConstructorCallback = JsiFunctionCallback;
	using FunctionCallback = JsiFunctionCallback;
	using PropertyGetterCallback = JsiPropertyGetterCallback;
	using PropertySetterCallback = JsiPropertySetterCallback;
	using IndexPropertyGetterCallback = JsiIndexGetterCallback;
	using IndexPropertySetterCallback = JsiIndexSetterCallback;

	using StringPropertyGetterCallback = fbjsi::Value(*)(fbjsi::Runtime&, const fbjsi::Value&, const js::String<Types>&);
	using StringPropertySetterCallback = fbjsi::Value(*)(fbjsi::Runtime&, const fbjsi::Value&, const js::String<Types>&, const fbjsi::Value&);
	using StringPropertyEnumeratorCallback = JsiStringPropertyEnumeratorCallback;
};  // struct Types

template<typename ClassType>
class ObjectWrap;

using String = js::String<Types>;
using Context = js::Context<Types>;
using Value = js::Value<Types>;
using Function = js::Function<Types>;
using Object = js::Object<Types>;
using Exception = js::Exception<Types>;
using ReturnValue = js::ReturnValue<Types>;

} // realmjsi


template<>
inline realmjsi::Types::Context realmjsi::Context::get_global_context(realmjsi::Types::Context env) {
	return env;
}

inline fbjsi::Function globalType(fbjsi::Runtime& env, const char* name) {
    return env.global().getPropertyAsFunction(env, name);
}

} // js
} // realm

// A bit of a hack, but important for usability.
namespace facebook {
namespace jsi {
namespace detail {
template <>
inline Value toValue(Runtime&, const realm::js::JsiVal& val) { return realm::js::JsiVal(val).get(); }
template <>
inline Value toValue(Runtime&, const realm::js::JsiObj& val) { return realm::js::JsiVal(val).get(); }
template <>
inline Value toValue(Runtime&, const realm::js::JsiFunc& val) { return realm::js::JsiVal(val).get(); }
template <>
inline Value toValue(Runtime&, const realm::js::JsiString& val) { return realm::js::JsiVal(val).get(); }
}
}
}
