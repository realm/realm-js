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

inline napi_property_attributes operator|(napi_property_attributes a, PropertyAttributes b) {
	int flag = napi_default;

	if (!(b & DontEnum)) {
		flag |= napi_enumerable;
	}

	if (!(b & DontDelete)) {
		flag |= napi_configurable;
	}

	if (!(b & ReadOnly)) {
		flag |= napi_writable;
	}

	napi_property_attributes napi_flag = static_cast<napi_property_attributes>(a | flag);
	return napi_flag;
}

//template<>
//inline v8::Local<v8::Value> node::Object::get_property(Napi::Env env, const v8::Local<v8::Object> &object, StringData key) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	Nan::TryCatch trycatch;
//    v8::Local<v8::String> node_key;
//
//    // If we have just plain ASCII, we can skip the conversion from UTF-8
//    if (std::all_of(key.data(), key.data() + key.size(), [](char c) { return c <= 127; })) {
//        node_key = v8::String::NewExternal(isolate, new v8::ExternalOneByteStringResourceImpl(key.data(), key.size()));
//    }
//    else {
//        node_key = v8::String::NewFromUtf8(isolate, key.data(), v8::String::kNormalString, key.size());
//    }
//
//    auto value = Nan::Get(object, node_key);
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//    return value.ToLocalChecked();
//}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, StringData key) {
	try {
		return object.Get(key);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline v8::Local<v8::Value> node::Object::get_property(Napi::Env env, const v8::Local<v8::Object> &object, const node::String &key) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	Nan::TryCatch trycatch;
//    auto value = Nan::Get(object, v8::Local<v8::String>(key));
//
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//    return value.ToLocalChecked();
//}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, const node::String &key) {
	try {
		return object.Get(key);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline v8::Local<v8::Value> node::Object::get_property(Napi::Env env, const v8::Local<v8::Object> &object, uint32_t index) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	Nan::TryCatch trycatch;
//    auto value = Nan::Get(object, index);
//
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//    return value.ToLocalChecked();
//}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, uint32_t index) {
	try {
		return object.Get(index);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline void node::Object::set_property(Napi::Env env, const v8::Local<v8::Object> &object, const node::String &key, const v8::Local<v8::Value> &value, PropertyAttributes attributes) {
//    Nan::TryCatch trycatch;
//
//    if (attributes) {
//        Nan::ForceSet(object, v8::Local<v8::String>(key), value, v8::PropertyAttribute(attributes));
//    }
//    else {
//        Nan::Set(object, v8::Local<v8::String>(key), value);
//    }
//
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//}

template<>
inline void node::Object::set_property(Napi::Env env, const Napi::Object& object, const node::String& key, const Napi::Value& value, PropertyAttributes attributes) {
	try {
		Napi::Object obj = object;
		if (attributes) {
			//Napi: is this setting property value or defining new property
			napi_property_attributes napi_attributes = napi_default | attributes;
			auto propDescriptor = Napi::PropertyDescriptor::Value(key, value, napi_attributes);
			obj.DefineProperty(propDescriptor);
		}
		else {
			obj.Set(key, value);
		}
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline void node::Object::set_property(Napi::Env env, const v8::Local<v8::Object> &object, uint32_t index, const v8::Local<v8::Value> &value) {
//    Nan::TryCatch trycatch;
//    Nan::Set(object, index, value);
//
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//}

template<>
inline void node::Object::set_property(Napi::Env env, const Napi::Object& object, uint32_t index, const Napi::Value& value) {
	try {
		Napi::Object obj = object;
		obj.Set(index, value);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline std::vector<node::String> node::Object::get_property_names(Napi::Env env, const v8::Local<v8::Object> &object) {
//    auto maybe_array = Nan::GetPropertyNames(object);
//    if (maybe_array.IsEmpty()) {
//        return std::vector<node::String>();
//    }
//
//    auto array = maybe_array.ToLocalChecked();
//    uint32_t count = array->Length();
//
//    std::vector<node::String> names;
//    names.reserve(count);
//
//    for (uint32_t i = 0; i < count; i++) {
//        names.push_back(array->Get(i)->ToString());
//    }
//
//    return names;
//}

template<>
inline std::vector<node::String> node::Object::get_property_names(Napi::Env env, const Napi::Object& object) {
	try {
		auto propertyNames = object.GetPropertyNames();

		uint32_t count = propertyNames.Length();
		std::vector<node::String> names;
		names.reserve(count);

		for (uint32_t i = 0; i < count; i++) {
			names.push_back(node::Value::to_string(env, propertyNames[i]));
		}

		return names;
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template<>
//inline v8::Local<v8::Value> node::Object::get_prototype(Napi::Env env, const v8::Local<v8::Object> &object) {
//    return object->GetPrototype();
//}

template<>
inline Napi::Value node::Object::get_prototype(Napi::Env env, const Napi::Object& object) {
	napi_value result;
	napi_status status = napi_get_prototype(env, object, &result);
	if (status != napi_ok) {
		throw node::Exception(env, "Failed to get object's prototype");
	}
	return Napi::Object(env, result);
}

//template<>
//inline void node::Object::set_prototype(Napi::Env env, const v8::Local<v8::Object> &object, const v8::Local<v8::Value> &prototype) {
//    Nan::SetPrototype(object, prototype);
//}

//NAPI: SetPrototype is not available in napi
template<>
inline void node::Object::set_prototype(Napi::Env env, const Napi::Object& object, const Napi::Value& prototype) {
	auto v8Value = *reinterpret_cast<v8::Local<v8::Object>*>((napi_value)object);
	auto v8ProtoValue = *reinterpret_cast<v8::Local<v8::Value>*>((napi_value)prototype);
	Nan::SetPrototype(v8Value, v8ProtoValue);
}

//template<>
//inline v8::Local<v8::Object> node::Object::create_empty(Napi::Env env) {
//    return Nan::New<v8::Object>();
//}

template<>
inline Napi::Object node::Object::create_empty(Napi::Env env) {
	return Napi::Object();
}

//template<>
//inline v8::Local<v8::Object> node::Object::create_array(Napi::Env env, uint32_t length, const v8::Local<v8::Value> values[]) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	v8::Local<v8::Array> array = Nan::New<v8::Array>(length);
//    for (uint32_t i = 0; i < length; i++) {
//        set_property(env, array, i, values[i]);
//    }
//    return array;
//}

template<>
inline Napi::Object node::Object::create_array(Napi::Env env, uint32_t length, const Napi::Value values[]) {
	Napi::Array array = Napi::Array();
    for (uint32_t i = 0; i < length; i++) {
        set_property(env, array, i, values[i]);
    }
    return array;
}

//template<>
//inline v8::Local<v8::Object> node::Object::create_date(Napi::Env env, double time) {
//    return Nan::New<v8::Date>(time).ToLocalChecked();
//}

//NAPI: Napi::Date is experimental it seems. 
template<>
inline Napi::Object node::Object::create_date(Napi::Env env, double time) {
	Napi::Function date_constructor = env.Global().Get("Date").As<Napi::Function>();
	Napi::Number value = Napi::Number::New(env, time);
	return date_constructor.New({ value });
}

//template<>
//template<typename ClassType>
//inline v8::Local<v8::Object> node::Object::create_instance(Napi::Env env, typename ClassType::Internal* internal) {
//    return node::ObjectWrap<ClassType>::create_instance(isolate, internal);
//}

template<>
template<typename ClassType>
inline Napi::Object node::Object::create_instance(Napi::Env env, typename ClassType::Internal* internal) {
    return node::ObjectWrap<ClassType>::create_instance(env, internal);
}

//template<>
//template<typename ClassType>
//inline bool node::Object::is_instance(Napi::Env env, const v8::Local<v8::Object> &object) {
//    return node::ObjectWrap<ClassType>::has_instance(isolate, object);
//}

template<>
template<typename ClassType>
inline bool node::Object::is_instance(Napi::Env env, const Napi::Object& object) {
    return node::ObjectWrap<ClassType>::is_instance(env, object);
}

//template<>
//template<typename ClassType>
//inline typename ClassType::Internal* node::Object::get_internal(const v8::Local<v8::Object> &object) {
//    return *Nan::ObjectWrap::Unwrap<node::ObjectWrap<ClassType>>(object);
//}

template<>
template<typename ClassType>
inline typename ClassType::Internal* node::Object::get_internal(const Napi::Object& object) {
    return node::ObjectWrap<ClassType>::get_internal(object);
}

//template<>
//template<typename ClassType>
//inline void node::Object::set_internal(const v8::Local<v8::Object> &object, typename ClassType::Internal* ptr) {
//    auto wrap = Nan::ObjectWrap::Unwrap<node::ObjectWrap<ClassType>>(object);
//    *wrap = ptr;
//}

template<>
template<typename ClassType>
inline void node::Object::set_internal(const Napi::Object& object, typename ClassType::Internal* internal) {
	return node::ObjectWrap<ClassType>::set_internal(object, internal);
}

//template<>
//inline void node::Object::set_global(Napi::Env env, const node::String &key, const v8::Local<v8::Value> &value) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	Object::set_property(env, isolate->GetCurrentContext()->Global(), key, value);
//}

template<>
inline void node::Object::set_global(Napi::Env env, const node::String &key, const Napi::Value &value) {
	Object::set_property(env, env.Global(), key, value);
}

//template<>
//inline v8::Local<v8::Value> node::Object::get_global(Napi::Env env, const node::String &key) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	return Object::get_property(env, isolate->GetCurrentContext()->Global(), key);
//}

template<>
inline Napi::Value node::Object::get_global(Napi::Env env, const node::String &key) {
	return Object::get_property(env, env.Global(), key);
}

} // js
} // realm
