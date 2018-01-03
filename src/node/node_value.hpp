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
inline bool node::Value::is_array(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->IsArray();
}

template<>
inline bool node::Value::is_array_buffer(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
#if REALM_V8_ARRAY_BUFFER_API
    return value->IsArrayBuffer();
#else
    // TODO: Implement this!
#endif
}

template<>
inline bool node::Value::is_array_buffer_view(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
#if REALM_V8_ARRAY_BUFFER_API
    return value->IsArrayBufferView();
#else
    // TODO: Implement this!
#endif
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
inline bool node::Value::is_binary(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return Value::is_array_buffer(isolate, value) || Value::is_array_buffer_view(isolate, value)
        || ::node::Buffer::HasInstance(value);
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
inline v8::Local<v8::Value> node::Value::from_binary(v8::Isolate* isolate, BinaryData data) {
#if REALM_V8_ARRAY_BUFFER_API
    size_t byte_count = data.size();
    void* bytes = nullptr;

    if (byte_count) {
        bytes = memcpy(malloc(byte_count), data.data(), byte_count);
    }

    // An "internalized" ArrayBuffer will free the malloc'd memory when garbage collected.
    return v8::ArrayBuffer::New(isolate, bytes, byte_count, v8::ArrayBufferCreationMode::kInternalized);
#else
    // TODO: Implement this for older V8
#endif
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
    if (std::isnan(number)) {
        throw std::invalid_argument("Value not convertible to a number.");
    }
    return number;
}

template<>
inline node::String node::Value::to_string(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
    return value->ToString();
}

template<>
inline OwnedBinaryData node::Value::to_binary(v8::Isolate* isolate, v8::Local<v8::Value> value) {
    // Make a non-null OwnedBinaryData, even when `data` is nullptr.
    auto make_owned_binary_data = [](const char* data, size_t length) {
        REALM_ASSERT(data || length == 0);
        char placeholder;
        return OwnedBinaryData(data ? data : &placeholder, length);
    };

    if (Value::is_array_buffer(isolate, value)) {
        // TODO: This probably needs some abstraction for older V8.
#if REALM_V8_ARRAY_BUFFER_API
        v8::Local<v8::ArrayBuffer> array_buffer = value.As<v8::ArrayBuffer>();
        v8::ArrayBuffer::Contents contents = array_buffer->GetContents();

        return make_owned_binary_data(static_cast<char*>(contents.Data()), contents.ByteLength());
#else
        // TODO: Implement this for older V8
#endif
    }
    else if (Value::is_array_buffer_view(isolate, value)) {
        Nan::TypedArrayContents<char> contents(value);

        return make_owned_binary_data(*contents, contents.length());
    }
    else if (::node::Buffer::HasInstance(value)) {
        return make_owned_binary_data(::node::Buffer::Data(value), ::node::Buffer::Length(value));
    }
    else {
        throw std::runtime_error("Can only convert Buffer, ArrayBuffer, and TypedArray objects to binary");
    }
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
    
} // js
} // realm
