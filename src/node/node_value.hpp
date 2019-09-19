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
#include "node_napi_convert.hpp"

namespace realm {
namespace js {

//template<>
//inline const char *node::Value::typeof(Napi::Env env, const v8::Local<v8::Value> &value) {
//    if (value->IsNull()) { return "null"; }
//    if (value->IsNumber()) { return "number"; }
//    if (value->IsString()) { return "string"; }
//    if (value->IsBoolean()) { return "boolean"; }
//    if (value->IsUndefined()) { return "undefined"; }
//    if (value->IsObject()) { return "object"; }
//    return "unknown";
//}

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

//template<>
//inline bool node::Value::is_array(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsArray();
//}

template<>
inline bool node::Value::is_array(Napi::Env env, const Napi::Value& value) {
	return value.IsArray();
}

//template<>
//inline bool node::Value::is_array_buffer(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsArrayBuffer();
//}

template<>
inline bool node::Value::is_array_buffer(Napi::Env env, const Napi::Value& value) {
	return value.IsArrayBuffer();
}

//template<>
//inline bool node::Value::is_array_buffer_view(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsArrayBufferView();
//}

//NAPI: IsArrayBufferView does not exists in NAPI
template<>
inline bool node::Value::is_array_buffer_view(Napi::Env env, const Napi::Value& value) {
	auto v8Value  = reinterpret_cast<v8::Local<v8::Value>*>((napi_value)value);
	return (*v8Value)->IsArrayBufferView();
		
}

//template<>
//inline bool node::Value::is_date(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsDate();
//}

//NAPI: IsDate does not exists in NAPI
template<>
inline bool node::Value::is_date(Napi::Env env, const Napi::Value& value) {
	auto v8Value = reinterpret_cast<v8::Local<v8::Value>*>((napi_value)value);
	return (*v8Value)->IsDate();
}

//template<>
//inline bool node::Value::is_boolean(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsBoolean();
//}

template<>
inline bool node::Value::is_boolean(Napi::Env env, const Napi::Value& value) {
    return value.IsBoolean();
}

//template<>
//inline bool node::Value::is_constructor(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsFunction();
//}

template<>
inline bool node::Value::is_constructor(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction();
}

//template<>
//inline bool node::Value::is_function(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsFunction();
//}

template<>
inline bool node::Value::is_function(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction();
}

//template<>
//inline bool node::Value::is_null(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsNull();
//}

template<>
inline bool node::Value::is_null(Napi::Env env, const Napi::Value& value) {
	return value.IsNull();
}

//template<>
//inline bool node::Value::is_number(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsNumber();
//}

template<>
inline bool node::Value::is_number(Napi::Env env, const Napi::Value& value) {
	return value.IsNumber();
}

//template<>
//inline bool node::Value::is_object(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsObject();
//}

template<>
inline bool node::Value::is_object(Napi::Env env, const Napi::Value& value) {
	return value.IsObject();
}


//template<>
//inline bool node::Value::is_string(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsString();
//}

template<>
inline bool node::Value::is_string(Napi::Env env, const Napi::Value& value) {
	return value.IsString();
}

//template<>
//inline bool node::Value::is_undefined(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsUndefined();
//}

template<>
inline bool node::Value::is_undefined(Napi::Env env, const Napi::Value& value) {
	return value.IsUndefined();
}

//template<>
//inline bool node::Value::is_binary(Napi::Env env, const v8::Local<v8::Value> &value) {
//	return Value::is_array_buffer(env, value) || Value::is_array_buffer_view(env, value)
//        || ::node::Buffer::HasInstance(value);
//}

//NAPI: check is needed. Uses node api's. 
//NAPI: node::Buffer::HasInstance is doing value->IsArrayBufferView check internally. Seems redundant. Double check it
template<>
inline bool node::Value::is_binary(Napi::Env env, const Napi::Value& value) {
	auto v8Value = reinterpret_cast<v8::Local<v8::Value>*>((napi_value)value);
	return Value::is_array_buffer(env, value) || Value::is_array_buffer_view(env, value);
		//|| ::node::Buffer::HasInstance(*v8Value);
}

//template<>
//inline bool node::Value::is_valid(const v8::Local<v8::Value> &value) {
//    return !value.IsEmpty();
//}

template<>
inline bool node::Value::is_valid(const Napi::Value& value) {
	return !value.IsEmpty();
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_boolean(Napi::Env env, bool boolean) {
//    return Nan::New(boolean);
//}

template<>
inline Napi::Value node::Value::from_boolean(Napi::Env env, bool boolean) {
	return Napi::Boolean::New(env, boolean);
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_null(Napi::Env env) {
//    return Nan::Null();
//}

template<>
inline Napi::Value node::Value::from_null(Napi::Env env) {
	return env.Null();
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_number(Napi::Env env, double number) {
//    return Nan::New(number);
//}

template<>
inline Napi::Value node::Value::from_number(Napi::Env env, double number) {
	return Napi::Number::New(env, number);
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_nonnull_string(Napi::Env env, const node::String &string) {
//    return v8::Local<v8::String>(string);
//}

template<>
inline Napi::Value node::Value::from_nonnull_string(Napi::Env env, const node::String& string) {
	return Napi::String::New(env, string);
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_nonnull_binary(Napi::Env env, BinaryData data) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	v8::Local<v8::ArrayBuffer> buffer = v8::ArrayBuffer::New(isolate, data.size());
//    v8::ArrayBuffer::Contents contents = buffer->GetContents();
//
//    if (data.size()) {
//        memcpy(contents.Data(), data.data(), data.size());
//    }
//
//    return buffer;
//}

template<>
inline Napi::Value node::Value::from_nonnull_binary(Napi::Env env, BinaryData data) {
	//NAPI:: should probably use Napi::EscapableHandleScope or not
	Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, data.size());

	if (data.size()) {
		memcpy(buffer.Data(), data.data(), data.size());
	}

	return buffer;
}

//template<>
//inline v8::Local<v8::Value> node::Value::from_undefined(Napi::Env env) {
//    return Nan::Undefined();
//}

template<>
inline Napi::Value node::Value::from_undefined(Napi::Env env) {
	return env.Undefined();
}

//template<>
//inline bool node::Value::to_boolean(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return Nan::To<bool>(value).FromMaybe(false);
//}

template<>
inline bool node::Value::to_boolean(Napi::Env env, const Napi::Value& value) {
	return value.ToBoolean();
}

//template<>
//inline node::String node::Value::to_string(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->ToString();
//}

template<>
inline node::String node::Value::to_string(Napi::Env env, const Napi::Value& value) {
	return value.ToString();
}

//template<>
//inline double node::Value::to_number(Napi::Env env, const v8::Local<v8::Value> &value) {
//    double number = Nan::To<double>(value).FromMaybe(NAN);
//    if (std::isnan(number)) {
//        throw std::invalid_argument(util::format("Value '%1' not convertible to a number.",
//                                                 (std::string)to_string(env, value)));
//    }
//    return number;
//}

template<>
inline double node::Value::to_number(Napi::Env env, const Napi::Value& value) {
	return value.ToNumber();
}

//template<>
//inline OwnedBinaryData node::Value::to_binary(Napi::Env env, v8::Local<v8::Value> value) {
//    // Make a non-null OwnedBinaryData, even when `data` is nullptr.
//    auto make_owned_binary_data = [](const char* data, size_t length) {
//        REALM_ASSERT(data || length == 0);
//        char placeholder;
//        return OwnedBinaryData(data ? data : &placeholder, length);
//    };
//
//    if (Value::is_array_buffer(env, value)) {
//        v8::Local<v8::ArrayBuffer> array_buffer = value.As<v8::ArrayBuffer>();
//        v8::ArrayBuffer::Contents contents = array_buffer->GetContents();
//
//        return make_owned_binary_data(static_cast<char*>(contents.Data()), contents.ByteLength());
//    }
//    else if (Value::is_array_buffer_view(env, value)) {
//        v8::Local<v8::ArrayBufferView> array_buffer_view = value.As<v8::ArrayBufferView>();
//        std::unique_ptr<char[]> data(new char[array_buffer_view->ByteLength()]);
//
//        size_t bytes = array_buffer_view->CopyContents(data.get(), array_buffer_view->ByteLength());
//        OwnedData owned_data(std::move(data), bytes);
//
//        return *reinterpret_cast<OwnedBinaryData*>(&owned_data);
//    }
//    else if (::node::Buffer::HasInstance(value)) {
//        return make_owned_binary_data(::node::Buffer::Data(value), ::node::Buffer::Length(value));
//    }
//    else {
//        throw std::runtime_error("Can only convert Buffer, ArrayBuffer, and ArrayBufferView objects to binary");
//    }
//}

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
		//NAPI: fix for ArrayBufferView
		auto v8Value = *reinterpret_cast<v8::Local<v8::Value>*>((napi_value)value);
		v8::Local<v8::ArrayBufferView> array_buffer_view = v8Value.As<v8::ArrayBufferView>();
		std::unique_ptr<char[]> data(new char[array_buffer_view->ByteLength()]);

		size_t bytes = array_buffer_view->CopyContents(data.get(), array_buffer_view->ByteLength());
		OwnedData owned_data(std::move(data), bytes);

		return *reinterpret_cast<OwnedBinaryData*>(&owned_data);
	}
	//NAPI: redundant case of node::Buffer. Should be handled by the IsArrayBufferView check above
	//else if (::node::Buffer::HasInstance(value)) {
	//	return make_owned_binary_data(::node::Buffer::Data(value), ::node::Buffer::Length(value));
	//}
	else {
		throw std::runtime_error("Can only convert Buffer, ArrayBuffer, and ArrayBufferView objects to binary");
	}
}

//template<>
//inline v8::Local<v8::Object> node::Value::to_object(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return Nan::To<v8::Object>(value).FromMaybe(v8::Local<v8::Object>());
//}

template<>
inline Napi::Object node::Value::to_object(Napi::Env env, const Napi::Value& value) {
	return value.ToObject();
}

//template<>
//inline v8::Local<v8::Object> node::Value::to_array(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return to_object(env, value);
//}

template<>
inline Napi::Object node::Value::to_array(Napi::Env env, const Napi::Value& value) {
	return to_object(env, value);
}

//template<>
//inline v8::Local<v8::Function> node::Value::to_function(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return value->IsFunction() ? v8::Local<v8::Function>::Cast(value) : v8::Local<v8::Function>();
//}

template<>
inline Napi::Function node::Value::to_function(Napi::Env env, const Napi::Value& value) {
	return value.IsFunction() ? value.As<Napi::Function>() : Napi::Function();
}

//template<>
//inline v8::Local<v8::Function> node::Value::to_constructor(Napi::Env env, const v8::Local<v8::Value> &value) {
//    return to_function(env, value);
//}

template<>
inline Napi::Function node::Value::to_constructor(Napi::Env env, const Napi::Value& value) {
	return to_function(env, value);
}

//template<>
//inline v8::Local<v8::Object> node::Value::to_date(Napi::Env env, const v8::Local<v8::Value> &value) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	if (value->IsString()) {
//        v8::Local<v8::Function> date_constructor = to_constructor(env, node::Object::get_property(env, isolate->GetCurrentContext()->Global(), "Date"));
//        std::array<v8::Local<v8::Value>, 1> args { {value} };
//        return node::Function::construct(env, date_constructor, args.size(), args.data());
//    }
//    return to_object(env, value);
//}

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
