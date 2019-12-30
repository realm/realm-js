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

#include "napi.h"
#include "node_napi_convert.hpp"

namespace realm {
namespace node {

template<typename T>
using ClassDefinition = js::ClassDefinition<Types, T>;

using ConstructorType = js::ConstructorType<Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<Types>;
using Arguments = js::Arguments<Types>;
using PropertyType = js::PropertyType<Types>;
using IndexPropertyType = js::IndexPropertyType<Types>;
using StringPropertyType = js::StringPropertyType<Types>;

template<typename ClassType>
class WrappedObject : public Napi::ObjectWrap<WrappedObject<ClassType>> {
	using Internal = typename ClassType::Internal;
public:
	WrappedObject(const Napi::CallbackInfo& info);

	static Napi::Value create_instance_with_proxy(const Napi::CallbackInfo& info);

	static Napi::Function init(Napi::Env env, 
		const std::string& name, 
		node::Types::FunctionCallback constructor_callback, 
		std::function<bool(const std::string&)> has_native_method_callback,
		const std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties, 
		const IndexPropertyType* indexPropertyHandlers = nullptr, 
		const StringPropertyType* namedPropertyHandlers = nullptr);

	static Napi::Object create_instance(Napi::Env env);
	
	static bool is_instance(Napi::Env env, const Napi::Object& object);

	static WrappedObject<ClassType>* TryUnwrap(const Napi::Object& object);

	Internal* get_internal();
	void set_internal(Internal* internal);
	static void set_factory_constructor(const Napi::Function& factoryConstructor);
	static Napi::Function get_constructor(Napi::Env env);

	Napi::Value method_callback(const Napi::CallbackInfo& info);
	Napi::Value getter_callback(const Napi::CallbackInfo& info);
	void setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value);
	void readonly_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value);
	static void readonly_static_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value);

private:
	std::unique_ptr<Internal> m_internal;
	static Napi::FunctionReference constructor;
	static Napi::FunctionReference factory_constructor;
	static IndexPropertyType* m_indexPropertyHandlers;
	static StringPropertyType* m_namedPropertyHandlers;
	static std::string m_name;
	static std::function<bool(const std::string&)> m_has_native_methodFunc;

	class ProxyHandler {
		public:
			static Napi::Value get_instance_proxy_handler(Napi::Env env);
		
		private:
			static Napi::Value bindFunction(Napi::Env env, const std::string& functionName, const Napi::Function& function, const Napi::Object& thisObject);
		
			

			static Napi::Value getProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value getProxyTrapInvokeNamedAndIndexHandlers(const Napi::CallbackInfo& info);
			static Napi::Value setProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value ownKeysProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value hasProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value getOwnPropertyDescriptorTrap(const Napi::CallbackInfo& info);
			static Napi::Value getPrototypeofProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value setPrototypeofProxyTrap(const Napi::CallbackInfo& info);
		};
};

template<typename ClassType>
Napi::FunctionReference WrappedObject<ClassType>::constructor;

template<typename ClassType>
Napi::FunctionReference WrappedObject<ClassType>::factory_constructor;

template<typename ClassType>
IndexPropertyType* WrappedObject<ClassType>::m_indexPropertyHandlers;

template<typename ClassType>
StringPropertyType* WrappedObject<ClassType>::m_namedPropertyHandlers;

template<typename ClassType>
std::string WrappedObject<ClassType>::m_name;

template<typename ClassType>
std::function<bool(const std::string&)> WrappedObject<ClassType>::m_has_native_methodFunc;

template<typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
    static Napi::Function create_constructor(Napi::Env env);

	static Napi::Object create_instance(Napi::Env env, Internal* = nullptr);
	static bool is_instance(Napi::Env env, const Napi::Object& object);
	static Internal* get_internal(const Napi::Object& object);
	static void set_internal(const Napi::Object& object, Internal* data);

	static Napi::Value constructor_callback(const Napi::CallbackInfo& info);
	static bool has_native_method(const std::string& name);

  private:
    static ClassType s_class;
	
	//Gives access to ObjectWrap<ClassType> init_class private static member. See https://stackoverflow.com/a/40937193
	template<typename ClassType>
	friend struct ObjectWrapAccessor;
	
	static Napi::Function init_class(Napi::Env env);

	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback);
	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_static_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback);
    static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_property(Napi::Env env, const std::string& name, const PropertyType&);
	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_static_property(Napi::Env env, const std::string& name, const PropertyType&);
	
	static std::unordered_set<std::string> s_nativeMethods;
};

template<>
class ObjectWrap<void> {
  public:
    using Internal = void;

	static Napi::Function create_constructor(Napi::Env env) {
		return Napi::Function();
	}

	static Napi::Function init_class(Napi::Env env) {
		return Napi::Function();
	}

	static bool has_native_method(const std::string& name) {
		return false;
	}
	
};

//Gives access to ObjectWrap<ClassType> init_class private static member. See https://stackoverflow.com/a/40937193
template<typename ClassType>
struct ObjectWrapAccessor {
	inline static Napi::Function init_class(Napi::Env env) {
		return ObjectWrap<ClassType>::init_class(env);
	}
};

static inline std::vector<Napi::Value> get_arguments(const Napi::CallbackInfo& info) {
	size_t count = info.Length();
	std::vector<Napi::Value> arguments;
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
std::unordered_set<std::string> ObjectWrap<ClassType>::s_nativeMethods;

template<typename ClassType>
WrappedObject<ClassType>::WrappedObject(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WrappedObject<ClassType>>(info) {
	Napi::Env env = info.Env();

	//skip the constructor_callback if create_instance is creating a JS instance only
	if (info.Length() == 1 && info[0].IsNull())	{
		return;
	}

	try {
		node::Types::FunctionCallback constructor_callback = (node::Types::FunctionCallback)info.Data();
		constructor_callback(info);
	}
	catch (const std::exception& e) {
		throw Napi::Error::New(env, e.what());
	}
}

template<typename ClassType>
Napi::Function WrappedObject<ClassType>::init(Napi::Env env, 
	const std::string& name, 
	node::Types::FunctionCallback constructor_callback, 
	std::function<bool(const std::string&)> has_native_method_callback,
	const std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties, 
	const IndexPropertyType* indexPropertyHandlers = nullptr, 
	const StringPropertyType* namedPropertyHandlers = nullptr) {

	Napi::Function ctor = Napi::ObjectWrap<WrappedObject<ClassType>>::DefineClass(env, name.c_str(), properties, (void*)constructor_callback);
	
	constructor = Napi::Persistent(ctor);
	constructor.SuppressDestruct();

	m_indexPropertyHandlers = const_cast<IndexPropertyType*>(indexPropertyHandlers);
	m_namedPropertyHandlers = const_cast<StringPropertyType*>(namedPropertyHandlers);
	m_name = name;
	m_has_native_methodFunc = has_native_method_callback;
	return ctor;
}

//This creates the required JS instance with a Proxy parent to support get and set handlers and returns a proxy created on the JS instance to support property enumeration handler
//the returned JS Proxy has only ownKeys trap setup so that all other member accesses skip the Proxy and go directly to the JS instance
template<typename ClassType>
Napi::Value WrappedObject<ClassType>::create_instance_with_proxy(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (constructor.IsEmpty()) {
		throw Napi::Error::New(env, "Class not initialized. Call init() first");
	}

	if (!info.IsConstructCall()) {
		throw Napi::Error::New(env, "This function should be called as a constructor");
	}

	Napi::EscapableHandleScope scope(env);

	try {

		auto arguments = get_arguments(info);
		std::vector<napi_value> arrgs(arguments.begin(), arguments.end());
	
		Napi::Object instance = constructor.New(arrgs);

		//using DefineProperty to make it non enumerable and non configurable and non writable
		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instance", instance, napi_default));
		
		info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("isRealmCtor", Napi::Boolean::New(env, true), napi_configurable)); 
		
		auto proxyFunc = env.Global().Get("Proxy").As<Napi::Function>();

		auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
		if (setPrototypeOfFunc.IsUndefined()) {
			throw std::runtime_error("no 'setPrototypeOf'");
		}

		auto instanceProxyFunc = env.Global().Get("Proxy").As<Napi::Function>();

		setPrototypeOfFunc.Call({ info.This(), instance });
		Napi::Object instanceProxy = proxyFunc.New({ info.This(), ProxyHandler::get_instance_proxy_handler(env) });
		
		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instanceProxy", instanceProxy, napi_default));
		return scope.Escape(instanceProxy);
	}
	catch (std::exception & e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

template<typename ClassType>
Napi::Object WrappedObject<ClassType>::create_instance(Napi::Env env) {
	if (constructor.IsEmpty() || factory_constructor.IsEmpty()) {
		throw Napi::Error::New(env, "Class not initialized. Call init() first");
	}
	Napi::EscapableHandleScope scope(env);

	//creating a JS instance only. pass null as first and single argument
	Napi::Object instance = factory_constructor.New({ env.Null() });
	return scope.Escape(instance).As<Napi::Object>();
}

template<typename ClassType>
WrappedObject<ClassType>* WrappedObject<ClassType>::TryUnwrap(const Napi::Object& object) {
	Napi::Env env = object.Env();

	WrappedObject<ClassType>* unwrapped;
	napi_status status = napi_unwrap(env, object, reinterpret_cast<void**>(&unwrapped));
	if ((status) != napi_ok) {
		Napi::Object instance = object.Get("_instance").As<Napi::Object>();
		if (instance.IsUndefined() || instance.IsNull()) {
			throw Napi::Error::New(env, "Invalid object. No _instance member");
		}

		status = napi_unwrap(env, instance, reinterpret_cast<void**>(&unwrapped));
	}

	NAPI_THROW_IF_FAILED(env, status, nullptr);
	return unwrapped;
}

template<typename ClassType>
inline typename ClassType::Internal* WrappedObject<ClassType>::get_internal() {
	return m_internal.get();
}

template<typename ClassType>
inline void WrappedObject<ClassType>::set_internal(Internal* internal) {
	if (internal != nullptr) {
		m_internal = std::unique_ptr<Internal>(internal);
	}
}

template<typename ClassType>
void WrappedObject<ClassType>::set_factory_constructor(const Napi::Function& factoryConstructor) {
	factory_constructor = Napi::Persistent(factoryConstructor);
	factory_constructor.SuppressDestruct();
}

template<typename ClassType>
Napi::Function WrappedObject<ClassType>::get_constructor(Napi::Env env) {
	if (!constructor.IsEmpty()) {
		return constructor.Value();
	}

	return Napi::Function(env, env.Null());
}


template<typename ClassType>
inline bool WrappedObject<ClassType>::is_instance(Napi::Env env, const Napi::Object& object) {
	if (constructor.IsEmpty()) {
		throw Napi::Error::New(env, "Class not initialized. Call init() first");
	}

	Napi::HandleScope scope(env);

	Napi::Function ctor  = constructor.Value();
	return object.InstanceOf(ctor);
}


template<typename ClassType>
Napi::Value WrappedObject<ClassType>::method_callback(const Napi::CallbackInfo& info) {
	node::Types::FunctionCallback method = (node::Types::FunctionCallback)info.Data();
	return method(info);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::getter_callback(const Napi::CallbackInfo& info) {
	PropertyType* propertyType = (PropertyType*)info.Data();
	return propertyType->getter(info);
}

template<typename ClassType>
void WrappedObject<ClassType>::setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	PropertyType* propertyType = (PropertyType*)info.Data();
	propertyType->setter(info, value);
}

template<typename ClassType>
void WrappedObject<ClassType>::readonly_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	throw Napi::Error::New(info.Env(), "Cannot assign to read only property");
}

template<typename ClassType>
void WrappedObject<ClassType>::readonly_static_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	throw Napi::Error::New(info.Env(), "Cannot assign to read only static property");
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_instance_proxy_handler(Napi::Env env) {
	Napi::EscapableHandleScope scope(env);

	Napi::Object proxyObj = Napi::Object::New(env);
	Napi::PropertyDescriptor instanceGetTrapFunc = Napi::PropertyDescriptor::Function("get", &WrappedObject<ClassType>::ProxyHandler::getProxyTrap);
	Napi::PropertyDescriptor instanceSetTrapFunc = Napi::PropertyDescriptor::Function("set", &WrappedObject<ClassType>::ProxyHandler::setProxyTrap);
	Napi::PropertyDescriptor ownKeysTrapFunc = Napi::PropertyDescriptor::Function("ownKeys", &WrappedObject<ClassType>::ProxyHandler::ownKeysProxyTrap);
	Napi::PropertyDescriptor hasTrapFunc = Napi::PropertyDescriptor::Function("has", &WrappedObject<ClassType>::ProxyHandler::hasProxyTrap);
	Napi::PropertyDescriptor getOwnPropertyDescriptorTrapFunc = Napi::PropertyDescriptor::Function("getOwnPropertyDescriptor", &WrappedObject<ClassType>::ProxyHandler::getOwnPropertyDescriptorTrap);
	Napi::PropertyDescriptor getPrototypeOfFunc = Napi::PropertyDescriptor::Function("getPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::getPrototypeofProxyTrap);
	Napi::PropertyDescriptor setPrototypeOfFunc = Napi::PropertyDescriptor::Function("setPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::setPrototypeofProxyTrap);
	
	proxyObj.DefineProperties({ instanceGetTrapFunc, instanceSetTrapFunc, ownKeysTrapFunc, hasTrapFunc, getOwnPropertyDescriptorTrapFunc, getPrototypeOfFunc, setPrototypeOfFunc });
	
	return scope.Escape(proxyObj);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::bindFunction(Napi::Env env, const std::string& functionName, const Napi::Function& function, const Napi::Object& thisObject) {
	Napi::EscapableHandleScope scope(env);

	//do not bind the non native functions. These are attached from extensions.js and should be called on the instanceProxy.
	if (!m_has_native_methodFunc(functionName)) {
		//return the function without binding it to the instance
		return scope.Escape(function);
	}

	Napi::Function bindFunc = function.As<Napi::Function>().Get("bind").As<Napi::Function>();
	if (bindFunc.IsEmpty() || bindFunc.IsUndefined()) {
		throw Napi::Error::New(env, "bind function not found on function " + functionName);
	}

	Napi::Function boundFunc = bindFunc.Call(function, { thisObject }).As<Napi::Function>();
	return scope.Escape(boundFunc);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::getProxyTrapInvokeNamedAndIndexHandlers(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value propertyArg = info[1];

	if (!propertyArg.IsString()) {
		Napi::Value value = target.Get(propertyArg);
		return scope.Escape(value);
	}

	Napi::String property = propertyArg.As<Napi::String>();
	std::string propertyText = property;

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		Napi::Value value = target.Get(propertyArg);
		return scope.Escape(value);
	}

	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);

	//if accessor is a number call index get handler
	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		bool success = false;
		int32_t index = 0;
		try {
			index = std::stoi(propertyText);
			success = true;
		}
		catch (const std::exception) {}

		if (success) {
			Napi::Value result = wrappedObject->m_indexPropertyHandlers->getter(info, instance, index);
			return scope.Escape(result);
		}
	}

	//call accessor as named handler
	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Value result = wrappedObject->m_namedPropertyHandlers->getter(info, instance, property);
		return scope.Escape(result);
	}

	Napi::Value value = target.Get(property);
	return scope.Escape(value);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::getProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value arg1 = info[1];
	

	if (target.HasOwnProperty("_proto")) {
		Napi::Object proto = target.Get("_proto").As<Napi::Object>();
		//if the _proto prototype chain has the property return it
		if (proto.Has(arg1)) {
			Napi::Value propertyValue = proto.Get(arg1);
			if (propertyValue.IsFunction()) {
				Napi::String function = arg1.As<Napi::String>();
				std::string functionName = function;
				Napi::Object instance = target.Get("_instance").As<Napi::Object>();
				Napi::Value boundFunc = bindFunction(env, functionName, propertyValue.As<Napi::Function>(), instance);
				target.Set(functionName, boundFunc);
				return scope.Escape(boundFunc);
			}

			return scope.Escape(propertyValue);
		}
	}

	//if the target prototype chain don't have the property invoke the named and index handlers to handle the get property call
	if (!target.Has(arg1)) {
		Napi::Value result = getProxyTrapInvokeNamedAndIndexHandlers(info);
		return scope.Escape(result);
	}

	//skip non string property names like Symbol
	if (!arg1.IsString()) {
		Napi::Value value = target.Get(arg1);
		return scope.Escape(value);
	}

	Napi::String property = arg1.As<Napi::String>();
	std::string propertyName = property;

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		throw Napi::Error::New(env, "Invalid object. No _instance member");
	}

	//this checks for property existence without going up the proptotype chain.
	Napi::Boolean targetHasOwnProperty = env.Global().Get("Object").As<Napi::Object>().Get("hasOwnProperty").As<Napi::Function>().Call(target, { property }).As<Napi::Boolean>();

	if (targetHasOwnProperty) {
		Napi::Value propertyValue = target.Get(propertyName);
		return scope.Escape(propertyValue);
	}

	Napi::Value propertyValue = instance.Get(propertyName);

	//bind the function from the instance and set it on the target object. Napi does not work if a function is invoked with 'this' instance different than the class it is defined onto
	if (propertyValue.IsFunction()) {
		Napi::Value boundFunc = bindFunction(env, propertyName, propertyValue.As<Napi::Function>(), instance);
		target.Set(propertyName, boundFunc);
		return scope.Escape(boundFunc);
	}
	
	//return the non function property on the instance
	return scope.Escape(propertyValue);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::setProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value arg1 = info[1];
	Napi::Value value = info[2];

	Napi::String property = info[1].As<Napi::String>();
	std::string propertyText = property;

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);

	//if accessor is a number call index handler
	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		bool success = false;
		int32_t index = 0;
		try {
			index = std::stoi(propertyText);
			success = true;
		}
		catch (const std::exception) {}

		if (success) {
			try {
				realm::js::validated_positive_index(propertyText);
			}
			catch (std::out_of_range& e) {
				throw Napi::Error::New(env, e.what());
			}

			if (wrappedObject->m_indexPropertyHandlers->setter == nullptr) {
				std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
				throw Napi::Error::New(env, message);
			}

			Napi::Value result = wrappedObject->m_indexPropertyHandlers->setter(info, instance, index, value);
			return scope.Escape(result);
		}
	}

	if (target.HasOwnProperty("_proto")) {
		Napi::Object proto = target.Get("_proto").As<Napi::Object>();
		if (proto.Has(property)) {
			proto.Set(property, value);
			return scope.Escape(Napi::Boolean::New(env, true));
		}
	}

	if (instance.Has(property)) {
		try {
			instance.Set(property, value);
			return scope.Escape(Napi::Boolean::New(env, true));
		}
		catch (const Napi::Error& e) {
			std::string message = e.Message();
			if (message.find("read only") != std::string::npos) {
				message = "Cannot assign to read only property '" + propertyText + "'";
			}
			
			throw Napi::Error::New(env, message);
		}
	}

	//call accessor as named handler
	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Boolean result = wrappedObject->m_namedPropertyHandlers->setter(info, instance, property, value).As<Napi::Boolean>();
		if (result) {
			return scope.Escape(result);
		}
	}

	//create the new property on the instance
	instance.Set(propertyText, value);
	return scope.Escape(Napi::Boolean::New(env, true));
}



template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::ownKeysProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	
	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Value result = wrappedObject->m_namedPropertyHandlers->enumerator(info, instance);
		return scope.Escape(result);
	}

	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		uint32_t length = instance.Get("length").As<Napi::Number>();
		Napi::Array array = Napi::Array::New(env, length);
		for (uint32_t i = 0; i < length; i++) {
			array.Set(i, Napi::Number::New(env, i).ToString());
		}
		return scope.Escape(array);
	}

	return scope.Escape(Napi::Array::New(env, 0));
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::hasProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value propertyArg = info[1];

	if (target.HasOwnProperty("_proto")) {
		Napi::Object proto = target.Get("_proto").As<Napi::Object>();
		if (proto.Has(propertyArg)) {
			return scope.Escape(Napi::Boolean::From(env, true));
		}
	}

	//skip symbols
	if (!propertyArg.IsString()) {
		bool hasProperty = target.Has(propertyArg);
		return scope.Escape(Napi::Boolean::From(env, hasProperty));
	}

	Napi::String property = propertyArg.As<Napi::String>();
	std::string propertyText = property;

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		bool hasProperty = target.Has(propertyArg);
		return scope.Escape(Napi::Boolean::From(env, hasProperty));
	}

	if (target.Has(property)) {
		return scope.Escape(Napi::Boolean::From(env, true));
	}

	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);

	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		bool success = false;
		int32_t index = 0;
		try {
			index = std::stoi(propertyText);
			success = true;
		}
		catch (const std::exception) {}

		if (success) {
			int32_t length = instance.Get("length").As<Napi::Number>();
			bool hasIndex = index >= 0 && index < length;
			return scope.Escape(Napi::Boolean::From(env, hasIndex));
		}
	}

	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Array array = wrappedObject->m_namedPropertyHandlers->enumerator(info, instance).As<Napi::Array>();
		uint32_t count = array.Length();

		for (uint32_t i = 0; i < count; i++) {
			Napi::String arrayValue = array.Get(i).As<Napi::String>();
			if (!arrayValue.IsUndefined()) {
				std::string propertyName = arrayValue;
				if (propertyName == propertyText) {
					return scope.Escape(Napi::Boolean::From(env, true));
				}
			}
		}
	}

	return scope.Escape(Napi::Boolean::From(env, false));
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::getOwnPropertyDescriptorTrap(const Napi::CallbackInfo& info) {
	//This exists only for ownKeysTrap to work properly with Object.keys(). It does not check if the property is from the named handler or it is an existing property on the instance. 
	//This implementation can be extended to return the true property descriptor if the property is an existing one
	
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::String key = info[1].As<Napi::String>();
	std::string text = key;

	Napi::Object descriptor = Napi::Object::New(env);
	descriptor.Set("enumerable", Napi::Boolean::New(env, true));
	descriptor.Set("configurable", Napi::Boolean::New(env, true));
	
	return scope.Escape(descriptor);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::getPrototypeofProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Object proto = target.Get("_proto").As<Napi::Object>();
	
	if (proto.IsUndefined()) {
		auto getPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("getPrototypeOf").As<Napi::Function>();
		proto = getPrototypeOfFunc.Call({ target }).As<Napi::Object>();
	}
	
	return scope.Escape(proto);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::setPrototypeofProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value proto = info[1];
	target.Set("_proto", proto);

	return scope.Escape(Napi::Boolean::New(env, true));
}

template<typename ClassType>
Napi::Function ObjectWrap<ClassType>::create_constructor(Napi::Env env) {
	Napi::Function ctor = init_class(env);
	
	//since NAPI ctors can't change the returned type we need to return a factory func which will be called when 'new ctor()' is called from JS. 
	//This will create a JS Proxy on top of the prototype chain of that instance and return the instance to the caller. The proxy is needed to support named and index handlers
	Napi::Function factory = Napi::Function::New(env, WrappedObject<ClassType>::create_instance_with_proxy, s_class.name);
	auto ctorPrototypeProperty = ctor.Get("prototype");
	auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
	if (setPrototypeOfFunc.IsEmpty()) {
		throw Napi::Error::New(env, "no 'setPrototypeOf'");
	}

	//the factory function should have the same prototype property as the constructor.prototype so `instanceOf` works
	factory.Set("prototype", ctorPrototypeProperty);
	setPrototypeOfFunc.Call({ factory, ctor });

	WrappedObject<ClassType>::set_factory_constructor(factory);

	return factory;
}

template<typename ClassType>
Napi::Function ObjectWrap<ClassType>::init_class(Napi::Env env) {
	//check if the constructor is already created. It means this class and it's parent are already initialized.
	Napi::Function ctor = WrappedObject<ClassType>::get_constructor(env);
	if (!ctor.IsNull()) {
		return ctor;
	}

	std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>> properties;

	//setup properties and accessors on the class
	for (auto& pair : s_class.static_properties) {
		Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> statc_property = setup_static_property(env, pair.first, pair.second);
		properties.push_back(statc_property);
	}

	for (auto& pair : s_class.static_methods) {
		Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> staticMethod = setup_static_method(env, pair.first, pair.second);
		properties.push_back(staticMethod);
	}

	for (auto& pair : s_class.methods) {
		Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> method = setup_method(env, pair.first, pair.second);
		properties.push_back(method);
	}

	for (auto& pair : s_class.properties) {
		Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> property = setup_property(env, pair.first, pair.second);
		properties.push_back(property);
	}

	bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
	const IndexPropertyType* index_accessor = has_index_accessor ? &s_class.index_accessor : nullptr;

	bool has_string_accessor = (s_class.string_accessor.getter || s_class.string_accessor.setter);
	const StringPropertyType* string_accessor = has_string_accessor ? &s_class.string_accessor : nullptr;
	
	ctor = WrappedObject<ClassType>::init(env, s_class.name, &ObjectWrap<ClassType>::constructor_callback, &ObjectWrap<ClassType>::has_native_method, properties, index_accessor, string_accessor);

	auto ctorPrototypeProperty = ctor.Get("prototype");
	if (ctorPrototypeProperty.IsUndefined()) {
		throw std::runtime_error("undefined 'prototype' on construtor");
	}

	Napi::Function parentCtor = ObjectWrapAccessor<ParentClassType>::init_class(env);
	if (!parentCtor.IsEmpty()) {

		auto parentCtorPrototypeProperty = parentCtor.Get("prototype");
		if (parentCtorPrototypeProperty.IsUndefined()) {
			throw std::runtime_error("undefined 'prototype' on parent construtor");
		}

		auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
		setPrototypeOfFunc.Call({ ctorPrototypeProperty, parentCtorPrototypeProperty });
		setPrototypeOfFunc.Call({ ctor, parentCtor });
	}

	return ctor;
}

template<typename ClassType>
Napi::Object ObjectWrap<ClassType>::create_instance(Napi::Env env, Internal* internal) {
	Napi::EscapableHandleScope scope(env);

	Napi::Object factory = WrappedObject<ClassType>::create_instance(env);
	Napi::Object instance = factory.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		throw Napi::Error::New(env, "Invalid object. No _instance member");
	}

	if (internal) {
		WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
		wrappedObject->set_internal(internal);
	}
	
    return scope.Escape(factory).As<Napi::Object>();
}

template<typename ClassType>
inline bool ObjectWrap<ClassType>::is_instance(Napi::Env env, const Napi::Object& object) {
	return WrappedObject<ClassType>::is_instance(env, object);
}

template<typename ClassType>
typename ClassType::Internal* ObjectWrap<ClassType>::get_internal(const Napi::Object& object) {
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::TryUnwrap(object);
	return wrappedObject->get_internal();
}

template<typename ClassType>
void ObjectWrap<ClassType>::set_internal(const Napi::Object& object, typename ClassType::Internal* internal) {
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::TryUnwrap(object);
	wrappedObject->set_internal(internal);
}

template<typename ClassType>
Napi::Value ObjectWrap<ClassType>::constructor_callback(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	if (reinterpret_cast<void*>(ObjectWrap<ClassType>::s_class.constructor) != nullptr) {
		auto arguments = get_arguments(info);
		node::Arguments args { env, arguments.size(), arguments.data() };
		s_class.constructor(env, info.This().As<Napi::Object>(), args);
		return scope.Escape(env.Null()); //return a value to comply with Napi::FunctionCallback
	}
	else {
		throw Napi::Error::New(env, "Illegal constructor");
	}
}

template<typename ClassType>
bool ObjectWrap<ClassType>::has_native_method(const std::string& name) {
	if (s_nativeMethods.find(name) != s_nativeMethods.end()) {
		return true;
	}

	return ObjectWrap<ParentClassType>::has_native_method(name);
}

template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	auto methodCallback = (WrappedObject<ClassType>::InstanceMethodCallback)(&WrappedObject<ClassType>::method_callback);
	s_nativeMethods.insert(name);
	return WrappedObject<ClassType>::InstanceMethod(name.c_str(), methodCallback, napi_default | realm::js::PropertyAttributes::DontEnum, (void*)callback);
}

template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	return Napi::ObjectWrap<WrappedObject<ClassType>>::StaticMethod(name.c_str(), callback, napi_static | realm::js::PropertyAttributes::DontEnum);
}

template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_property(Napi::Env env, const std::string& name, const PropertyType& property) {
	napi_property_attributes napi_attributes = napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
	
	auto getterCallback = (WrappedObject<ClassType>::InstanceGetterCallback)(&WrappedObject<ClassType>::getter_callback);
	auto setterCallback = (WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::readonly_setter_callback);
	if (property.setter) {
		setterCallback = (WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::setter_callback);
	}

	return WrappedObject<ClassType>::InstanceAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, (void*)&property);
}

template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_property(Napi::Env env, const std::string& name, const PropertyType& property) {
	napi_property_attributes napi_attributes = napi_static | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);

	auto getterCallback = (WrappedObject<ClassType>::StaticGetterCallback)(property.getter);
	WrappedObject<ClassType>::StaticSetterCallback setterCallback = &WrappedObject<ClassType>::readonly_static_setter_callback;
	if (property.setter) {
		setterCallback = (WrappedObject<ClassType>::StaticSetterCallback)(property.setter);
	}

	return WrappedObject<ClassType>::StaticAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, nullptr);
}

} // node

namespace js {

template<typename ClassType>
class ObjectWrap<node::Types, ClassType> : public node::ObjectWrap<ClassType> {};

template<node::ArgumentsMethodType F>
Napi::Value wrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	auto arguments = node::get_arguments(info);
	node::Arguments args { info.Env(), arguments.size(), arguments.data() };
	node::ReturnValue result(env);

	Napi::Object instanceProxy = info.This().As<Napi::Object>().Get("_instanceProxy").As<Napi::Object>();
	if (instanceProxy.IsUndefined()) {
		instanceProxy = info.This().As<Napi::Object>();
	}

	try {
		F(env, instanceProxy, args, result);
		return result.ToValue();
	}
	catch (std::exception& e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

template<node::PropertyType::GetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	node::ReturnValue result(env);
	try {
		F(env, info.This().As<Napi::Object>(), result);
		return result.ToValue();
	}
	catch (std::exception& e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

template<node::PropertyType::SetterType F>
void wrap(const Napi::CallbackInfo& info, const Napi::Value& value) {
	Napi::Env env = info.Env();

    try {
		F(env, info.This().As<Napi::Object>(), value);
    }
    catch (std::exception& e) {
		throw Napi::Error::New(info.Env(), e.what());
    }
}

template<node::IndexPropertyType::GetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, uint32_t index) {
	Napi::Env env = info.Env();
    node::ReturnValue result(env);

	try {
		try {
			F(env, instance, index, result);
			return result.ToValue();
		}
		catch (std::out_of_range&) {
			// Out-of-bounds index getters should just return undefined in JS.
			result.set_undefined();
			return result.ToValue();
		}
	}
    catch (std::exception &e) {
		throw Napi::Error::New(info.Env(), e.what());
    }
}

template<node::IndexPropertyType::SetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, uint32_t index, const Napi::Value& value) {
	Napi::Env env = info.Env();

    try {
		bool success = F(env, instance, index, value);
		
		// Indicate that the property was intercepted.
		return Napi::Value::From(env, success);
    }
    catch (std::exception &e) {
		throw Napi::Error::New(info.Env(), e.what());
    }
}

template<node::StringPropertyType::GetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property) {
	Napi::Env env = info.Env();
	node::ReturnValue result(env);
	
	try {
        F(env, instance, property, result);
		return result.ToValue();
    }
    catch (std::exception &e) {
		throw Napi::Error::New(info.Env(), e.what());
    }
}

template<node::StringPropertyType::SetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property, const Napi::Value& value) {
	Napi::Env env = info.Env();
    try {
		bool success = F(env, instance, property, value);
		return Napi::Value::From(env, success);
    }
    catch (std::exception &e) {
		throw Napi::Error::New(info.Env(), e.what());
    }
}

template<node::StringPropertyType::EnumeratorType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance) {
	Napi::Env env = info.Env();
    
	try {
		auto names = F(env, instance);

		int count = (int)names.size();
		Napi::Array array = Napi::Array::New(env, count);
		for (int i = 0; i < count; i++) {
			array.Set(i, names[i]);
		}

		return array;
	}
	catch (std::exception & e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

} // js
} // realm
