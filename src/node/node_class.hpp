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

namespace realm {
namespace node {

template<typename T>
using ClassDefinition = js::ClassDefinition<Types, T>;

using ConstructorType = js::ConstructorType<Types>;
using MethodType = js::MethodType<Types>;
using PropertyType = js::PropertyType<Types>;
using IndexPropertyType = js::IndexPropertyType<Types>;
using StringPropertyType = js::StringPropertyType<Types>;

static inline std::vector<v8::Local<v8::Value>> get_arguments(const Nan::FunctionCallbackInfo<v8::Value> &info) {
    int count = info.Length();
    std::vector<v8::Local<v8::Value>> arguments;
    arguments.reserve(count);

    for (int i = 0; i < count; i++) {
        arguments.push_back(info[i]);
    }

    return arguments;
}

static inline void setup_method(v8::Local<v8::FunctionTemplate> tpl, const std::string &name, Nan::FunctionCallback callback) {
    Nan::HandleScope scope;

    v8::Local<v8::Signature> signature = Nan::New<v8::Signature>(tpl);
    v8::Local<v8::FunctionTemplate> t = Nan::New<v8::FunctionTemplate>(callback, v8::Local<v8::Value>(), signature);
    v8::Local<v8::Function> fn = Nan::GetFunction(t).ToLocalChecked();
    v8::Local<v8::String> fn_name = Nan::New(name).ToLocalChecked();

    // The reason we use this rather than Nan::SetPrototypeMethod is DontEnum.
    tpl->PrototypeTemplate()->Set(fn_name, fn, v8::PropertyAttribute::DontEnum);
    fn->SetName(fn_name);
}

static inline void setup_property(v8::Local<v8::ObjectTemplate> tpl, const std::string &name, const PropertyType &property) {
    Nan::HandleScope scope;

    v8::Local<v8::String> prop_name = Nan::New(name).ToLocalChecked();
    v8::PropertyAttribute attributes = static_cast<v8::PropertyAttribute>(v8::DontEnum | v8::DontDelete | (property.setter ? v8::None : v8::ReadOnly));

    Nan::SetAccessor(tpl, prop_name, property.getter, property.setter, v8::Local<v8::Value>(), v8::DEFAULT, attributes);
}

template<typename T>
class ObjectWrap : public Nan::ObjectWrap {
    static ClassDefinition<T> s_class;
    static Nan::Persistent<v8::Function> s_constructor;
    static Nan::Persistent<v8::FunctionTemplate> s_template;

    std::unique_ptr<T> m_object;

    ObjectWrap(T* object = nullptr) : m_object(object) {}

  public:
    operator T*() const {
        return m_object.get();
    }
    ObjectWrap<T>& operator=(T* object) {
        if (m_object.get() != object) {
            m_object = std::unique_ptr<T>(object);
        }
        return *this;
    }

    static v8::Local<v8::Object> create_instance(v8::Isolate* isolate, T* internal = nullptr) {
        Nan::EscapableHandleScope scope;

        // TODO: Figure out why this template ends up being empty here.
        v8::Local<v8::FunctionTemplate> tpl = Nan::New(s_template);
        v8::Local<v8::Object> instance = Nan::NewInstance(tpl->InstanceTemplate()).ToLocalChecked();

        auto wrap = new ObjectWrap<T>(internal);
        wrap->Wrap(instance);

        return scope.Escape(instance);
    }

    static bool has_instance(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
        return Nan::New(s_template)->HasInstance(value);
    }

    static NAN_MODULE_INIT(init) {
        v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(construct);
        v8::Local<v8::ObjectTemplate> instance_tpl = tpl->InstanceTemplate();
        v8::Local<v8::String> name = Nan::New(s_class.name).ToLocalChecked();

        tpl->SetClassName(name);
        instance_tpl->SetInternalFieldCount(1);

        // TODO: Setup static properties and methods.
        for (auto &pair : s_class.methods) {
            setup_method(tpl, pair.first, pair.second);
        }
        for (auto &pair : s_class.properties) {
            setup_property(instance_tpl, pair.first, pair.second);
        }

        if (s_class.index_accessor.getter) {
            // TODO: Add our own index enumerator.
            auto &index_accessor = s_class.index_accessor;
            Nan::SetIndexedPropertyHandler(instance_tpl, index_accessor.getter, index_accessor.setter);
        }
        if (s_class.string_accessor.getter) {
            auto &string_accessor = s_class.string_accessor;
            Nan::SetNamedPropertyHandler(instance_tpl, string_accessor.getter, string_accessor.setter, 0, 0, string_accessor.enumerator);
        }

        v8::Local<v8::Function> constructor = Nan::GetFunction(tpl).ToLocalChecked();
        s_constructor.Reset(constructor);
        s_template.Reset(tpl);

        Nan::Set(target, name, constructor);
    }

    static NAN_METHOD(construct) {
        if (!info.IsConstructCall()) {
            Nan::ThrowError("Constructor must be called with new");
        }
        if (s_class.constructor) {
            auto isolate = info.GetIsolate();
            auto arguments = get_arguments(info);
            v8::Local<v8::Object> this_object = info.This();
            info.GetReturnValue().Set(this_object);

            auto wrap = new ObjectWrap<T>();
            wrap->Wrap(this_object);

            try {
                s_class.constructor(isolate, this_object, arguments.size(), arguments.data());
            }
            catch(std::exception &e) {
                Nan::ThrowError(node::Exception::value(isolate, e));
            }
        }
        else {
            Nan::ThrowError("Illegal constructor");
        }
    }
};

// The declared static variables must be defined as well.
template<typename T> ClassDefinition<T> ObjectWrap<T>::s_class;
template<typename T> Nan::Persistent<v8::Function> ObjectWrap<T>::s_constructor;
template<typename T> Nan::Persistent<v8::FunctionTemplate> ObjectWrap<T>::s_template;

} // node

namespace js {

template<typename T>
class ObjectWrap<node::Types, T> : public node::ObjectWrap<T> {};

template<node::MethodType F>
void wrap(Nan::NAN_METHOD_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    auto arguments = node::get_arguments(info);

    try {
        F(isolate, info.This(), arguments.size(), arguments.data(), return_value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

Type::template<node::PropertyType::GetterType F>
void wrap(v8::Local<v8::String> property, Nan::NAN_GETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), return_value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::PropertyType::SetterType F>
void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, Nan::NAN_SETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        F(isolate, info.This(), value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::IndexPropertyType::GetterType F>
void wrap(uint32_t index, Nan::NAN_INDEX_GETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), index, return_value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::IndexPropertyType::SetterType F>
void wrap(uint32_t index, v8::Local<v8::Value> value, Nan::NAN_INDEX_SETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        F(isolate, info.This(), index, value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::GetterType F>
void wrap(v8::Local<v8::String> property, Nan::NAN_PROPERTY_GETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    node::ReturnValue return_value(info.GetReturnValue());
    try {
        F(isolate, info.This(), property, return_value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::SetterType F>
void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, Nan::NAN_PROPERTY_SETTER_ARGS_TYPE info) {
    v8::Isolate* isolate = info.GetIsolate();
    try {
        F(isolate, info.This(), property, value);
    }
    catch(std::exception &e) {
        Nan::ThrowError(node::Exception::value(isolate, e));
    }
}

template<node::StringPropertyType::EnumeratorType F>
void wrap(Nan::NAN_PROPERTY_ENUMERATOR_ARGS_TYPE info) {
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
