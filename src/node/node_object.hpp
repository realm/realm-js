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

inline napi_property_attributes operator|(napi_property_attributes a, PropertyAttributes b) {
	int flag = napi_default;

	if ((b & DontEnum) != DontEnum) {
		flag |= napi_enumerable;
	}

	if ((b & DontDelete) != DontDelete) {
		flag |= napi_configurable;
	}

	if ((b & ReadOnly) != ReadOnly) {
		flag |= napi_writable;
	}

	napi_property_attributes napi_flag = static_cast<napi_property_attributes>(a | flag);
	return napi_flag;
}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, StringData key) {
	try {
		return object.Get(key);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, const node::String &key) {
	try {
		return object.Get(key);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

template<>
inline Napi::Value node::Object::get_property(Napi::Env env, const Napi::Object& object, uint32_t index) {
	try {
		return object.Get(index);
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

template<>
inline void node::Object::set_property(Napi::Env env, const Napi::Object& object, const node::String& key, const Napi::Value& value, PropertyAttributes attributes) {
	try {
		Napi::Object obj = object;
		if (attributes) {
			napi_property_attributes napi_attributes = napi_default | attributes;
			std::string name = key;
			auto propDescriptor = Napi::PropertyDescriptor::Value(name, value, napi_attributes);
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

template<>
inline Napi::Value node::Object::get_prototype(Napi::Env env, const Napi::Object& object) {
	napi_value result;
	napi_status status = napi_get_prototype(env, object, &result);
	if (status != napi_ok) {
		throw node::Exception(env, "Failed to get object's prototype");
	}
	return Napi::Object(env, result);
}

template<>
inline void node::Object::set_prototype(Napi::Env env, const Napi::Object& object, const Napi::Value& prototype) {
	auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
	if (setPrototypeOfFunc.IsEmpty() || setPrototypeOfFunc.IsUndefined()) {
		throw std::runtime_error("no 'setPrototypeOf'");
	}

	setPrototypeOfFunc.Call({ object, prototype });
}

template<>
inline Napi::Object node::Object::create_empty(Napi::Env env) {
	return Napi::Object::New(env);
}

template<>
inline Napi::Object node::Object::create_array(Napi::Env env, uint32_t length, const Napi::Value values[]) {
	Napi::Array array = Napi::Array::New(env, length);
    for (uint32_t i = 0; i < length; i++) {
        set_property(env, array, i, values[i]);
    }
    return array;
}

template<>
inline Napi::Object node::Object::create_date(Napi::Env env, double time) {
	Napi::Function date_constructor = env.Global().Get("Date").As<Napi::Function>();
	Napi::Number value = Napi::Number::New(env, time);
	return date_constructor.New({ value });
}

template<>
template<typename ClassType>
inline Napi::Object node::Object::create_instance(Napi::Env env, typename ClassType::Internal* internal) {
    return node::ObjectWrap<ClassType>::create_instance(env, internal);
}

template<>
template<typename ClassType>
inline Napi::Object node::Object::create_instance_by_schema(Napi::Env env, Napi::Function& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal* internal) {
	return node::ObjectWrap<ClassType>::create_instance_by_schema(env, constructor, schema, internal);
}

template<typename ClassType>
inline void on_context_destroy(Napi::Env env, std::string realmPath) {
	node::ObjectWrap<ClassType>::on_context_destroy(env, realmPath);
}

template<>
template<typename ClassType>
inline bool node::Object::is_instance(Napi::Env env, const Napi::Object& object) {
    return node::ObjectWrap<ClassType>::is_instance(env, object);
}

template<>
template<typename ClassType>
inline typename ClassType::Internal* node::Object::get_internal(Napi::Env env, const Napi::Object& object) {
	return node::ObjectWrap<ClassType>::get_internal(env, object);
}

template<>
template<typename ClassType>
inline void node::Object::set_internal(Napi::Env env, const Napi::Object& object, typename ClassType::Internal* internal) {
	return node::ObjectWrap<ClassType>::set_internal(env, object, internal);
}

template<>
inline void node::Object::set_global(Napi::Env env, const node::String &key, const Napi::Value &value) {
	Object::set_property(env, env.Global(), key, value);
}

template<>
inline Napi::Value node::Object::get_global(Napi::Env env, const node::String &key) {
	return Object::get_property(env, env.Global(), key);
}

} // js
} // realm
