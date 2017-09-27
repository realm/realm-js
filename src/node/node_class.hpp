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

#include "node_types.hpp"

#include "js_class.hpp"
#include "js_util.hpp"

namespace realm {
namespace node {

template<typename T>
using ClassDefinition = js::ClassDefinition<Types, T>;

using ConstructorType = js::ConstructorType<Types>;
using MethodType = js::MethodType<Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<Types>;
using Arguments = js::Arguments<Types>;
using PropertyType = js::PropertyType<Types>;
using IndexPropertyType = js::IndexPropertyType<Types>;
using StringPropertyType = js::StringPropertyType<Types>;

template<typename ClassType>
class ObjectWrap : public Nan::ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
    static v8::Local<v8::Function> create_constructor(v8::Isolate*);
    static v8::Local<v8::Object> create_instance(v8::Isolate*, Internal* = nullptr);

    static v8::Local<v8::FunctionTemplate> get_template() {
        static Nan::Persistent<v8::FunctionTemplate> js_template(create_template());
        return Nan::New(js_template);
    }

    static void construct(const v8::FunctionCallbackInfo<v8::Value>&);

    static bool has_instance(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
        return get_template()->HasInstance(value);
    }

    operator Internal*() const {
        return m_object.get();
    }

    ObjectWrap<ClassType>& operator=(Internal* object) {
        if (m_object.get() != object) {
            m_object = std::unique_ptr<Internal>(object);
        }
        return *this;
    }

  private:
    static ClassType s_class;

    std::unique_ptr<Internal> m_object;

    ObjectWrap(Internal* object = nullptr) : m_object(object) {}

    static v8::Local<v8::FunctionTemplate> create_template();

    static void setup_method(v8::Local<v8::FunctionTemplate>, const std::string &, v8::FunctionCallback);
    static void setup_static_method(v8::Local<v8::FunctionTemplate>, const std::string &, v8::FunctionCallback);

    template<typename TargetType>
    static void setup_property(v8::Local<TargetType>, const std::string &, const PropertyType &);

    static void get_indexes(const v8::PropertyCallbackInfo<v8::Array>&);
    static void set_property(v8::Local<v8::String>, v8::Local<v8::Value>, const v8::PropertyCallbackInfo<v8::Value>&);

    static void set_readonly_property(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<void>& info) {
        std::string message = std::string("Cannot assign to read only property '") + std::string(String(property)) + "'";
        Nan::ThrowError(message.c_str());
    }

    static void set_readonly_index(uint32_t index, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
        std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
        Nan::ThrowError(message.c_str());
    }

    static void get_nonexistent_property(v8::Local<v8::String>, const v8::PropertyCallbackInfo<v8::Value>&) {
        // Do nothing. This function exists only to prevent a crash where it is used.
    }
};

template<>
class ObjectWrap<void> {
  public:
    using Internal = void;

    static v8::Local<v8::FunctionTemplate> get_template() {
        return v8::Local<v8::FunctionTemplate>();
    }
};

// This helper function is needed outside the scope of the ObjectWrap class as well.
static inline std::vector<v8::Local<v8::Value>> get_arguments(const v8::FunctionCallbackInfo<v8::Value> &info) {
    int count = info.Length();
    std::vector<v8::Local<v8::Value>> arguments;
    arguments.reserve(count);

    for (int i = 0; i < count; i++) {
        arguments.push_back(info[i]);
    }
    
    return arguments;
}

// The static class variable must be defined as well.
template<typename ClassType>
ClassType ObjectWrap<ClassType>::s_class;

template<typename ClassType>
inline v8::Local<v8::Function> ObjectWrap<ClassType>::create_constructor(v8::Isolate* isolate) {
    Nan::EscapableHandleScope scope;

    v8::Local<v8::FunctionTemplate> tpl = get_template();
    v8::Local<v8::Function> constructor = Nan::GetFunction(tpl).ToLocalChecked();

    for (auto &pair : s_class.static_properties) {
        setup_property<v8::Object>(constructor, pair.first, pair.second);
    }

    return scope.Escape(constructor);
}

template<typename ClassType>
inline v8::Local<v8::Object> ObjectWrap<ClassType>::create_instance(v8::Isolate* isolate, Internal* internal) {
    Nan::EscapableHandleScope scope;

    v8::Local<v8::FunctionTemplate> tpl = get_template();
    v8::Local<v8::Object> instance = Nan::NewInstance(tpl->InstanceTemplate()).ToLocalChecked();

    auto wrap = new ObjectWrap<ClassType>(internal);
    wrap->Wrap(instance);

    return scope.Escape(instance);
}

template<typename ClassType>
inline v8::Local<v8::FunctionTemplate> ObjectWrap<ClassType>::create_template() {
    Nan::EscapableHandleScope scope;

    v8::Local<v8::FunctionTemplate> tpl = v8::FunctionTemplate::New(v8::Isolate::GetCurrent(), construct);
    v8::Local<v8::ObjectTemplate> instance_tpl = tpl->InstanceTemplate();
    v8::Local<v8::String> name = Nan::New(s_class.name).ToLocalChecked();

    tpl->SetClassName(name);
    instance_tpl->SetInternalFieldCount(1);

    v8::Local<v8::FunctionTemplate> super_tpl = ObjectWrap<ParentClassType>::get_template();
    if (!super_tpl.IsEmpty()) {
        tpl->Inherit(super_tpl);
    }

    // Static properties are setup in create_constructor() because V8.
    for (auto &pair : s_class.static_methods) {
        setup_static_method(tpl, pair.first, pair.second);
    }
    for (auto &pair : s_class.methods) {
        setup_method(tpl, pair.first, pair.second);
    }
    for (auto &pair : s_class.properties) {
        setup_property<v8::ObjectTemplate>(instance_tpl, pair.first, pair.second);
    }

    if (s_class.index_accessor.getter) {
        auto &index_accessor = s_class.index_accessor;
        instance_tpl->SetIndexedPropertyHandler(index_accessor.getter, index_accessor.setter ? index_accessor.setter : set_readonly_index, 0, 0, get_indexes);
    }
    if (s_class.string_accessor.getter || s_class.index_accessor.getter || s_class.index_accessor.setter) {
        // Use our own wrapper for the setter since we want to throw for negative indices.
        auto &string_accessor = s_class.string_accessor;
        instance_tpl->SetNamedPropertyHandler(string_accessor.getter ? string_accessor.getter : get_nonexistent_property, set_property, 0, 0, string_accessor.enumerator);
    }

    return scope.Escape(tpl);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::setup_method(v8::Local<v8::FunctionTemplate> tpl, const std::string &name, v8::FunctionCallback callback) {
    v8::Local<v8::Signature> signature = Nan::New<v8::Signature>(tpl);
    v8::Local<v8::FunctionTemplate> fn_tpl = v8::FunctionTemplate::New(v8::Isolate::GetCurrent(), callback, v8::Local<v8::Value>(), signature);
    v8::Local<v8::String> fn_name = Nan::New(name).ToLocalChecked();

    // The reason we use this rather than Nan::SetPrototypeMethod is DontEnum.
    tpl->PrototypeTemplate()->Set(fn_name, fn_tpl, v8::PropertyAttribute::DontEnum);
    fn_tpl->SetClassName(fn_name);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::setup_static_method(v8::Local<v8::FunctionTemplate> tpl, const std::string &name, v8::FunctionCallback callback) {
    v8::Local<v8::FunctionTemplate> fn_tpl = v8::FunctionTemplate::New(v8::Isolate::GetCurrent(), callback);
    v8::Local<v8::String> fn_name = Nan::New(name).ToLocalChecked();

    tpl->Set(fn_name, fn_tpl, v8::PropertyAttribute::DontEnum);
    fn_tpl->SetClassName(fn_name);
}

template<typename ClassType>
template<typename TargetType>
inline void ObjectWrap<ClassType>::setup_property(v8::Local<TargetType> target, const std::string &name, const PropertyType &property) {
    v8::Local<v8::String> prop_name = Nan::New(name).ToLocalChecked();
    v8::PropertyAttribute attributes = v8::PropertyAttribute(v8::DontEnum | v8::DontDelete);

    target->SetAccessor(prop_name, property.getter, property.setter ? property.setter : set_readonly_property, v8::Local<v8::Value>(), v8::DEFAULT, attributes);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::construct(const v8::FunctionCallbackInfo<v8::Value>& info) {
    if (!info.IsConstructCall()) {
        Nan::ThrowError("Constructor must be called with new");
    }
    if (reinterpret_cast<void*>(s_class.constructor)) {
        auto isolate = info.GetIsolate();
        auto arguments = get_arguments(info);
        v8::Local<v8::Object> this_object = info.This();
        info.GetReturnValue().Set(this_object);

        auto wrap = new ObjectWrap<ClassType>();
        wrap->Wrap(this_object);

        try {
            s_class.constructor(isolate, this_object, arguments.size(), arguments.data());
        }
        catch (std::exception &e) {
            Nan::ThrowError(node::Exception::value(isolate, e));
        }
    }
    else {
        Nan::ThrowError("Illegal constructor");
    }
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::get_indexes(const v8::PropertyCallbackInfo<v8::Array>& info) {
    uint32_t length;
    try {
        length = Object::validated_get_length(info.GetIsolate(), info.This());
    }
    catch (std::exception &) {
        // Enumerating properties should never throw an exception.
        return;
    }

    v8::Local<v8::Array> array = Nan::New<v8::Array>(length);
    for (uint32_t i = 0; i < length; i++) {
        Nan::Set(array, i, Nan::New(i));
    }

    info.GetReturnValue().Set(array);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::set_property(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
    if (s_class.index_accessor.getter || s_class.index_accessor.setter) {
        try {
            // Negative indices are passed into this string property interceptor, so check for them here.
            validated_positive_index(node::String(property));
        }
        catch (std::out_of_range &e) {
            Nan::ThrowError(Exception::value(info.GetIsolate(), e));
            return;
        }
        catch (std::invalid_argument &) {
            // Property is not a number.
        }
    }
    if (auto string_setter = s_class.string_accessor.setter) {
        string_setter(property, value, info);
    }
}

} // node

namespace js {

template<typename ClassType>
class ObjectWrap<node::Types, ClassType> : public node::ObjectWrap<ClassType> {};

template<node::MethodType F>
void wrap(const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    auto arguments = node::get_arguments(info);

    try {
        F(isolate, info.Callee(), info.This(), arguments.size(), arguments.data(), return_value);
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::ArgumentsMethodType F>
void wrap(const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    auto arguments = node::get_arguments(info);

    try {
        F(isolate, info.This(), node::Arguments{isolate, arguments.size(), arguments.data()}, return_value);
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}


template<node::PropertyType::GetterType F>
void wrap(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), return_value);
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::PropertyType::SetterType F>
void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<void>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        F(isolate, info.This(), value);
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::IndexPropertyType::GetterType F>
void wrap(uint32_t index, const v8::PropertyCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), index, return_value);
    }
    catch (std::out_of_range &) {
        // Out-of-bounds index getters should just return undefined in JS.
        return_value.set_undefined();
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::IndexPropertyType::SetterType F>
void wrap(uint32_t index, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        if (F(isolate, info.This(), index, value)) {
            // Indicate that the property was intercepted.
            info.GetReturnValue().Set(value);
        }
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::GetterType F>
void wrap(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), property, return_value);
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::SetterType F>
void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        if (F(isolate, info.This(), property, value)) {
            // Indicate that the property was intercepted.
            info.GetReturnValue().Set(value);
        }
    }
    catch (std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::EnumeratorType F>
void wrap(const v8::PropertyCallbackInfo<v8::Array>& info) {
    auto names = F(info.GetIsolate(), info.This());
    int count = (int)names.size();
    v8::Local<v8::Array> array = Nan::New<v8::Array>(count);

    for (int i = 0; i < count; i++) {
        Nan::Set(array, i, v8::Local<v8::String>(names[i]));
    }

    info.GetReturnValue().Set(array);
}

} // js
} // realm
