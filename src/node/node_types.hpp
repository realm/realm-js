////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include <nan.h>

#include "js_types.hpp"

namespace realm {
namespace node {

struct Types {
    using Context = v8::Isolate*;
    using GlobalContext = v8::Local<v8::Context>;
    using Value = v8::Local<v8::Value>;
    using Object = v8::Local<v8::Object>;
    using String = v8::Local<v8::String>;
    using Function = v8::Local<v8::Function>;

    using ConstructorCallback = Nan::FunctionCallback;
    using FunctionCallback = Nan::FunctionCallback;
    using PropertyGetterCallback = Nan::GetterCallback;
    using PropertySetterCallback = Nan::SetterCallback;
    using IndexPropertyGetterCallback = Nan::IndexGetterCallback;
    using IndexPropertySetterCallback = Nan::IndexSetterCallback;
    using StringPropertyGetterCallback = Nan::PropertyGetterCallback;
    using StringPropertySetterCallback = Nan::PropertySetterCallback;
    using StringPropertyEnumeratorCallback = Nan::PropertyEnumeratorCallback;
};

template<typename T>
class Protected {
    // TODO: Figure out why Nan::CopyablePersistentTraits causes a build failure.
    Nan::Persistent<T, v8::CopyablePersistentTraits<T>> m_value;

  public:
    Protected(v8::Local<T> value) : m_value(value) {}

    operator v8::Local<T>() const {
        return Nan::New(m_value);
    }
    bool operator==(const v8::Local<T> &other) const {
        return m_value == other;
    }
    bool operator!=(const v8::Local<T> &other) const {
        return m_value != other;
    }
    bool operator==(const Protected<T> &other) const {
        return m_value == other.m_value;
    }
    bool operator!=(const Protected<T> &other) const {
        return m_value != other.m_value;
    }
    bool operator<(const Protected<T> &other) const {
        return *Nan::New(m_value) < *Nan::New(other.m_value);
    }
};

template<typename T>
class ObjectWrap;

using String = js::String<Types>;
using Context = js::Context<Types>;
using Value = js::Value<Types>;
using Function = js::Function<Types>;
using Object = js::Object<Types>;
using Exception = js::Exception<Types>;
using ReturnValue = js::ReturnValue<Types>;

} // node

namespace js {

template<>
class String<node::Types> {
    std::string m_str;

  public:
    String(const char* s) : m_str(s) {}
    String(const std::string &s) : m_str(s) {}
    String(const v8::Local<v8::String> &s) : m_str(*Nan::Utf8String(s)) {}
    String(v8::Local<v8::String> &&s) : String(s) {}

    operator std::string() const {
        return m_str;
    }
    operator v8::Local<v8::String>() const {
        return Nan::New(m_str).ToLocalChecked();
    }
};

template<>
class ReturnValue<node::Types> {
    Nan::ReturnValue<v8::Value> m_value;

  public:
    ReturnValue(Nan::ReturnValue<v8::Value> value) : m_value(value) {}

    void set(const v8::Local<v8::Value> &value) {
        m_value.Set(value);
    }
    void set(const std::string &string) {
        if (string.empty()) {
            m_value.SetEmptyString();
        }
        else {
            m_value.Set(Nan::New(string).ToLocalChecked());
        }
    }
    void set(bool boolean) {
        m_value.Set(boolean);
    }
    void set(double number) {
        m_value.Set(number);
    }
    void set(int32_t number) {
        m_value.Set(number);
    }
    void set(uint32_t number) {
        m_value.Set(number);
    }
    void set_null() {
        m_value.SetNull();
    }
    void set_undefined() {
        m_value.SetUndefined();
    }
};

template<>
class Protected<node::Types::GlobalContext> : public node::Protected<v8::Context> {
  public:
    Protected(v8::Local<v8::Context> ctx) : node::Protected<v8::Context>(ctx) {}

    operator v8::Isolate*() const {
        return v8::Local<v8::Context>(*this)->GetIsolate();
    }
};

template<>
class Protected<node::Types::Value> : public node::Protected<v8::Value> {
  public:
    Protected(v8::Isolate* isolate, v8::Local<v8::Value> value) : node::Protected<v8::Value>(value) {}
};

template<>
class Protected<node::Types::Object> : public node::Protected<v8::Object> {
  public:
    Protected(v8::Isolate* isolate, v8::Local<v8::Object> object) : node::Protected<v8::Object>(object) {}
};

template<>
class Protected<node::Types::Function> : public node::Protected<v8::Function> {
  public:
    Protected(v8::Isolate* isolate, v8::Local<v8::Function> object) : node::Protected<v8::Function>(object) {}
};

template<>
inline v8::Local<v8::Context> node::Context::get_global_context(v8::Isolate* isolate) {
    return isolate->GetCurrentContext();
}

template<>
inline bool node::Value::is_array(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsArray();
}

template<>
inline bool node::Value::is_array_buffer(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsArrayBuffer();
}

template<>
inline bool node::Value::is_date(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsDate();
}

template<>
inline bool node::Value::is_boolean(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsBoolean();
}

template<>
inline bool node::Value::is_constructor(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsFunction();
}

template<>
inline bool node::Value::is_function(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsFunction();
}

template<>
inline bool node::Value::is_null(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsNull();
}

template<>
inline bool node::Value::is_number(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsNumber();
}

template<>
inline bool node::Value::is_object(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsObject();
}

template<>
inline bool node::Value::is_string(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsString();
}

template<>
inline bool node::Value::is_undefined(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsUndefined();
}

template<>
inline bool node::Value::is_valid(const v8::Local<v8::Value> &value) {
    return !value.IsEmpty();
}

template<>
inline v8::Local<v8::Value> node::Value::from_boolean(v8::Isolate* isolate, bool boolean) {
    return Nan::New(boolean);
}

template<>
inline v8::Local<v8::Value> node::Value::from_null(v8::Isolate* isolate) {
    return Nan::Null();
}

template<>
inline v8::Local<v8::Value> node::Value::from_number(v8::Isolate* isolate, double number) {
    return Nan::New(number);
}

template<>
inline v8::Local<v8::Value> node::Value::from_string(v8::Isolate* isolate, const node::String &string) {
    return v8::Local<v8::String>(string);
}

template<>
inline v8::Local<v8::Value> node::Value::from_undefined(v8::Isolate* isolate) {
    return Nan::Undefined();
}

template<>
inline bool node::Value::to_boolean(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return Nan::To<bool>(value).FromMaybe(false);
}

template<>
inline double node::Value::to_number(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    double number = Nan::To<double>(value).FromMaybe(NAN);
    if (isnan(number)) {
        throw std::invalid_argument("Value not convertible to a number.");
    }
    return number;
}

template<>
inline node::String node::Value::to_string(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->ToString();
}

template<>
inline v8::Local<v8::Object> node::Value::to_object(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return Nan::To<v8::Object>(value).FromMaybe(v8::Local<v8::Object>());
}

template<>
inline v8::Local<v8::Object> node::Value::to_array(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return to_object(isolate, value);
}

template<>
inline v8::Local<v8::Object> node::Value::to_date(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return to_object(isolate, value);
}

template<>
inline v8::Local<v8::Function> node::Value::to_function(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsFunction() ? v8::Local<v8::Function>::Cast(value) : v8::Local<v8::Function>();
}

template<>
inline v8::Local<v8::Function> node::Value::to_constructor(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return to_function(isolate, value);
}

template<>
inline v8::Local<v8::Value> node::Function::call(v8::Isolate* isolate, const v8::Local<v8::Function> &function, const v8::Local<v8::Object> &this_object, size_t argc, const v8::Local<v8::Value> arguments[]) {
    Nan::TryCatch trycatch;
    auto result = Nan::Call(function, this_object, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return result.ToLocalChecked();
}

template<>
inline v8::Local<v8::Object> node::Function::construct(v8::Isolate* isolate, const v8::Local<v8::Function> &function, size_t argc, const v8::Local<v8::Value> arguments[]) {
    Nan::TryCatch trycatch;
    auto result = Nan::NewInstance(function, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return result.ToLocalChecked();
}

template<>
inline bool node::Object::has_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, const node::String &key) {
    return Nan::Has(object, key).FromMaybe(false);
}

template<>
inline bool node::Object::has_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, uint32_t index) {
    return Nan::Has(object, index).FromMaybe(false);
}

template<>
inline v8::Local<v8::Value> node::Object::get_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, const node::String &key) {
    Nan::TryCatch trycatch;
    auto value = Nan::Get(object, v8::Local<v8::String>(key));

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return value.ToLocalChecked();
}

template<>
inline v8::Local<v8::Value> node::Object::get_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, uint32_t index) {
    Nan::TryCatch trycatch;
    auto value = Nan::Get(object, index);

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return value.ToLocalChecked();
}

template<>
inline void node::Object::set_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, const node::String &key, const v8::Local<v8::Value> &value, PropertyAttributes attributes) {
    Nan::TryCatch trycatch;

    if (attributes) {
        Nan::ForceSet(object, v8::Local<v8::String>(key), value, v8::PropertyAttribute(attributes));
    }
    else {
        Nan::Set(object, v8::Local<v8::String>(key), value);
    }

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
}

template<>
inline void node::Object::set_property(v8::Isolate* isolate, const v8::Local<v8::Object> &object, uint32_t index, const v8::Local<v8::Value> &value) {
    Nan::TryCatch trycatch;
    Nan::Set(object, index, value);

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
}

template<>
inline std::vector<node::String> node::Object::get_property_names(v8::Isolate* isolate, const v8::Local<v8::Object> &object) {
    auto maybe_array = Nan::GetPropertyNames(object);
    if (maybe_array.IsEmpty()) {
        return std::vector<node::String>();
    }

    auto array = maybe_array.ToLocalChecked();
    uint32_t count = array->Length();

    std::vector<node::String> names;
    names.reserve(count);

    for (uint32_t i = 0; i < count; i++) {
        names.push_back(array->Get(i)->ToString());
    }

    return names;
}

template<>
inline v8::Local<v8::Value> node::Object::get_prototype(v8::Isolate* isolate, const v8::Local<v8::Object> &object) {
    return object->GetPrototype();
}

template<>
inline void node::Object::set_prototype(v8::Isolate* isolate, const v8::Local<v8::Object> &object, const v8::Local<v8::Value> &prototype) {
    Nan::SetPrototype(object, prototype);
}

template<>
inline v8::Local<v8::Object> node::Object::create_empty(v8::Isolate* isolate) {
    return Nan::New<v8::Object>();
}

template<>
inline v8::Local<v8::Object> node::Object::create_array(v8::Isolate* isolate, uint32_t length, const v8::Local<v8::Value> values[]) {
    v8::Local<v8::Array> array = Nan::New<v8::Array>(length);
    for (uint32_t i = 0; i < length; i++) {
        set_property(isolate, array, i, values[i]);
    }
    return array;
}

template<>
inline v8::Local<v8::Object> node::Object::create_date(v8::Isolate* isolate, double time) {
    return Nan::New<v8::Date>(time).ToLocalChecked();
}

template<>
template<typename U>
inline v8::Local<v8::Object> node::Object::create_instance(v8::Isolate* isolate, U* internal) {
    return node::ObjectWrap<U>::create_instance(isolate, internal);
}

template<>
template<typename U>
inline bool node::Object::is_instance(v8::Isolate* isolate, const v8::Local<v8::Object> &object) {
    return node::ObjectWrap<U>::has_instance(isolate, object);
}

template<>
template<typename U>
inline U* node::Object::get_internal(const v8::Local<v8::Object> &object) {
    return *Nan::ObjectWrap::Unwrap<node::ObjectWrap<U>>(object);
}

template<>
template<typename U>
inline void node::Object::set_internal(const v8::Local<v8::Object> &object, U* ptr) {
    auto wrap = Nan::ObjectWrap::Unwrap<node::ObjectWrap<U>>(object);
    *wrap = ptr;
}

template<>
inline v8::Local<v8::Value> node::Exception::value(v8::Isolate* isolate, const std::string &message) {
    return Nan::Error(message.c_str());
}

} // js
} // realm
