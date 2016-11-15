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

namespace realm {
namespace js {

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
template<typename ClassType>
inline v8::Local<v8::Object> node::Object::create_instance(v8::Isolate* isolate, typename ClassType::Internal* internal) {
    return node::ObjectWrap<ClassType>::create_instance(isolate, internal);
}

template<>
template<typename ClassType>
inline bool node::Object::is_instance(v8::Isolate* isolate, const v8::Local<v8::Object> &object) {
    return node::ObjectWrap<ClassType>::has_instance(isolate, object);
}

template<>
template<typename ClassType>
inline typename ClassType::Internal* node::Object::get_internal(const v8::Local<v8::Object> &object) {
    return *Nan::ObjectWrap::Unwrap<node::ObjectWrap<ClassType>>(object);
}

template<>
template<typename ClassType>
inline void node::Object::set_internal(const v8::Local<v8::Object> &object, typename ClassType::Internal* ptr) {
    auto wrap = Nan::ObjectWrap::Unwrap<node::ObjectWrap<ClassType>>(object);
    *wrap = ptr;
}

template<>
inline void node::Object::set_global(v8::Isolate* isolate, const node::String &key, const v8::Local<v8::Value> &value) {
    Object::set_property(isolate, isolate->GetCurrentContext()->Global(), key, value);
}

template<>
inline v8::Local<v8::Value> node::Object::get_global(v8::Isolate* isolate, const node::String &key) {
    return Object::get_property(isolate, isolate->GetCurrentContext()->Global(), key);
}

} // js
} // realm
