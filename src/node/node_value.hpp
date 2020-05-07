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
#include "napi.h"

namespace realm {
namespace js {

template<>
inline const char* node::Value::typeof(Napi::Env env, const Napi::Value& value) {
	if (value.IsNull()) { return "null"; }
	if (value.IsNumber()) { return "number"; }
	if (value.IsString()) { return "string"; }
	if (value.IsBoolean()) { return "boolean"; }
	if (value.IsUndefined()) { return "undefined"; }
	if (value.IsObject()) { return "object"; }
	return "unknown";
}

template<>
inline bool node::Value::is_array(Napi::Env env, const Napi::Value& value) {
	return value.IsArray();
}

template<>
inline bool node::Value::is_array_buffer(Napi::Env env, const Napi::Value& value) {
	return value.IsArrayBuffer();
}

template<>
inline bool node::Value::is_array_buffer_view(Napi::Env env, const Napi::Value& value) {
	return value.IsTypedArray() || value.IsDataView();
}

template<>
inline bool node::Value::is_date(Napi::Env env, const Napi::Value& value) {
	return value.IsObject() && value.As<Napi::Object>().InstanceOf(env.Global().Get("Date").As<Napi::Function>());
}

template<>
inline bool node::Value::is_boolean(Napi::Env env, const Napi::Value& value) {
    return value.IsBoolean();
}

template<>
inline bool node::Value::is_constructor(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction();
}


template<>
inline bool node::Value::is_function(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction();
}

template<>
inline bool node::Value::is_null(Napi::Env env, const Napi::Value& value) {
	return value.IsNull();
}

template<>
inline bool node::Value::is_number(Napi::Env env, const Napi::Value& value) {
	return value.IsNumber();
}

template<>
inline bool node::Value::is_object(Napi::Env env, const Napi::Value& value) {
	return value.IsObject();
}

template<>
inline bool node::Value::is_string(Napi::Env env, const Napi::Value& value) {
	return value.IsString();
}

template<>
inline bool node::Value::is_undefined(Napi::Env env, const Napi::Value& value) {
	return value.IsUndefined();
}

template<>
inline bool node::Value::is_binary(Napi::Env env, const Napi::Value& value) {
	return Value::is_array_buffer(env, value) || Value::is_array_buffer_view(env, value);
}

template<>
inline bool node::Value::is_valid(const Napi::Value& value) {
	return !value.IsEmpty();
}

template<>
inline Napi::Value node::Value::from_boolean(Napi::Env env, bool boolean) {
	return Napi::Boolean::New(env, boolean);
}


template<>
inline Napi::Value node::Value::from_null(Napi::Env env) {
	return Napi::Value(env, env.Null());
}

template<>
inline Napi::Value node::Value::from_number(Napi::Env env, double number) {
	return Napi::Number::New(env, number);
}

template<>
inline Napi::Value node::Value::from_nonnull_string(Napi::Env env, const node::String& string) {
	return Napi::String::New(env, string);
}

template<>
inline Napi::Value node::Value::from_nonnull_binary(Napi::Env env, BinaryData data) {
	Napi::EscapableHandleScope scope(env);

	Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, data.size());

	if (data.size()) {
		memcpy(buffer.Data(), data.data(), data.size());
	}

	return scope.Escape(buffer);
}

template<>
inline Napi::Value node::Value::from_undefined(Napi::Env env) {
	return Napi::Value(env, env.Undefined());
}

template<>
inline bool node::Value::to_boolean(Napi::Env env, const Napi::Value& value) {
	return value.ToBoolean();
}

template<>
inline node::String node::Value::to_string(Napi::Env env, const Napi::Value& value) {
	return value.ToString();
}

template<>
inline double node::Value::to_number(Napi::Env env, const Napi::Value& value) {
	double number = value.ToNumber();
	if (std::isnan(number)) {
		throw std::invalid_argument(util::format("Value '%1' not convertible to a number.", (std::string)to_string(env, value)));
	}
	
	return number;
}

template<>
inline OwnedBinaryData node::Value::to_binary(Napi::Env env, const Napi::Value value) {
	// Make a non-null OwnedBinaryData, even when `data` is nullptr.
	auto make_owned_binary_data = [](const char* data, size_t length) {
		REALM_ASSERT(data || length == 0);
		char placeholder;
		return OwnedBinaryData(data ? data : &placeholder, length);
	};

	if (Value::is_array_buffer(env, value)) {
		auto arrayBuffer = value.As<Napi::ArrayBuffer>();
		return make_owned_binary_data(static_cast<char*>(arrayBuffer.Data()), arrayBuffer.ByteLength());
	}
	else if (Value::is_array_buffer_view(env, value)) {
		int64_t byteLength = value.As<Napi::Object>().Get("byteLength").As<Napi::Number>();
		int64_t byteOffset = value.As<Napi::Object>().Get("byteOffset").As<Napi::Number>();
		Napi::ArrayBuffer arrayBuffer = value.As<Napi::Object>().Get("buffer").As<Napi::ArrayBuffer>();
		return make_owned_binary_data(static_cast<char*>(arrayBuffer.Data()) + byteOffset, byteLength);
	}
	else {
		throw std::runtime_error("Can only convert Buffer, ArrayBuffer, and ArrayBufferView objects to binary");
	}
}

template<>
inline Napi::Object node::Value::to_object(Napi::Env env, const Napi::Value& value) {
	return value.ToObject();
}

template<>
inline Napi::Object node::Value::to_array(Napi::Env env, const Napi::Value& value) {
	return to_object(env, value);
}

template<>
inline Napi::Function node::Value::to_function(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction() ? value.As<Napi::Function>() : Napi::Function();
}

template<>
inline Napi::Function node::Value::to_constructor(Napi::Env env, const Napi::Value& value) {
	return to_function(env, value);
}

template<>
inline Napi::Object node::Value::to_date(Napi::Env env, const Napi::Value& value) {
	if (value.IsString()) {
		Napi::Function date_constructor = to_constructor(env, env.Global().Get("Date"));
		std::array<Napi::Value, 1 > args{ {value} };
		return node::Function::construct(env, date_constructor, args.size(), args.data());
	}

	return to_object(env, value);
}

} // js
} // realm
