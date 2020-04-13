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

#include <ctype.h>
#include <unordered_set>
#include <vector>
#include <functional>
#include <string>
#include <unordered_map>
#include <exception>

//forward declare the types for gcc to compile correctly
namespace realm {
	namespace js {
		template<typename T>
		struct RealmObjectClass;
	}
	namespace node {
		struct Types;
	}
}

namespace realm {
namespace node {

static Napi::FunctionReference ObjectGetOwnPropertyDescriptor;
static node::Protected<Napi::Symbol> ExternalSymbol;
static Napi::FunctionReference ObjectSetPrototypeOf;
static Napi::FunctionReference GlobalProxy;
static Napi::FunctionReference FunctionBind;

static void node_class_init(Napi::Env env) {
	auto setPrototypeOf = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
	ObjectSetPrototypeOf = Napi::Persistent(setPrototypeOf);
	ObjectSetPrototypeOf.SuppressDestruct();

	auto getOwnPropertyDescriptor = env.Global().Get("Object").As<Napi::Object>().Get("getOwnPropertyDescriptor").As<Napi::Function>();
	ObjectGetOwnPropertyDescriptor = Napi::Persistent(getOwnPropertyDescriptor);
	ObjectGetOwnPropertyDescriptor.SuppressDestruct();

	auto proxy = env.Global().Get("Proxy").As<Napi::Function>();
	GlobalProxy = Napi::Persistent(proxy);
	GlobalProxy.SuppressDestruct();


	auto bind = env.Global().Get("Function").As<Napi::Function>().Get("prototype").As<Napi::Object>().Get("bind").As<Napi::Function>();
	FunctionBind = Napi::Persistent(bind);
	FunctionBind.SuppressDestruct();

	Napi::Symbol ext = Napi::Symbol::New(env, "_external");
	ExternalSymbol = node::Protected<Napi::Symbol>(env, ext);
	ExternalSymbol.SuppressDestruct();
}

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
		const IndexPropertyType* indexPropertyHandlers = nullptr);

	static Napi::Object create_instance(Napi::Env env, Internal* internal = nullptr);
	
	static bool is_instance(Napi::Env env, const Napi::Object& object);

	static WrappedObject<ClassType>* try_unwrap(const Napi::Object& object);

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
	static std::string m_name;
	static std::function<bool(const std::string&)> m_has_native_methodFunc;
	static Napi::Reference<Napi::External<Internal>> m_nullExternal;

	class ProxyHandler {
		public:
			static Napi::Value get_instance_proxy_handler(Napi::Env env);
		
		private:
			static Napi::Value bind_native_function(Napi::Env env, const std::string& functionName, const Napi::Function& function, const Napi::Object& thisObject);
			static Napi::ObjectReference m_proxyHandler;
			

			static Napi::Value get_proxy_trap(const Napi::CallbackInfo& info);
			static Napi::Value set_proxy_trap(const Napi::CallbackInfo& info);
			static Napi::Value own_keys_proxy_trap(const Napi::CallbackInfo& info);
			static Napi::Value has_proxy_trap(const Napi::CallbackInfo& info);
			static Napi::Value get_own_property_descriptor_trap(const Napi::CallbackInfo& info);
			static Napi::Value get_prototype_of_proxy_trap(const Napi::CallbackInfo& info);
			static Napi::Value set_prototype_of_proxy_trap(const Napi::CallbackInfo& info);
		};
};

template<typename ClassType>
Napi::FunctionReference WrappedObject<ClassType>::constructor;

template<typename ClassType>
Napi::FunctionReference WrappedObject<ClassType>::factory_constructor;

template<typename ClassType>
IndexPropertyType* WrappedObject<ClassType>::m_indexPropertyHandlers;

template<typename ClassType>
std::string WrappedObject<ClassType>::m_name;

template<typename ClassType>
std::function<bool(const std::string&)> WrappedObject<ClassType>::m_has_native_methodFunc;

template<typename ClassType>
Napi::Reference<Napi::External<typename ClassType::Internal>> WrappedObject<ClassType>::m_nullExternal;


struct SchemaObjectType {
	Napi::FunctionReference constructor;
};

template<typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
    static Napi::Function create_constructor(Napi::Env env);

	static Napi::Object create_instance(Napi::Env env, Internal* = nullptr);
	static Napi::Object create_instance_by_schema(Napi::Env env, Napi::Function& constructor, const realm::ObjectSchema& schema, Internal* internal = nullptr);
	static void internal_finalizer(Napi::Env, typename ClassType::Internal* internal);

	static void on_context_destroy(Napi::Env env, std::string realmPath);
	static bool is_instance(Napi::Env env, const Napi::Object& object);
	
	static Internal* get_internal(Napi::Env env, const Napi::Object& object);
	static void set_internal(Napi::Env env, const Napi::Object& object, Internal* data);

	static Napi::Value constructor_callback(const Napi::CallbackInfo& info);
	static bool has_native_method(const std::string& name);

  private:
    static ClassType s_class;
	
	//Gives access to ObjectWrap<ClassType> init_class private static member. See https://stackoverflow.com/a/40937193
	template<typename T>
	friend struct ObjectWrapAccessor;
	
	static Napi::Function init_class(Napi::Env env);

	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback);
	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_static_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback);
    static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_property(Napi::Env env, const std::string& name, const PropertyType&);
	static Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> setup_static_property(Napi::Env env, const std::string& name, const PropertyType&);
	
	static std::unordered_set<std::string> s_nativeMethods;
	static std::unordered_map<std::string, std::unordered_map<std::string, SchemaObjectType*>*> s_schemaObjectTypes;
	
	static Napi::Value property_getter(const Napi::CallbackInfo& info);
	static void property_setter(const Napi::CallbackInfo& info);
	static std::vector<Napi::PropertyDescriptor> create_napi_property_descriptors(Napi::Env env, const Napi::Object& constructorPrototype, const realm::ObjectSchema& schema, bool redefine = true);
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
template<typename T>
struct ObjectWrapAccessor {
	inline static Napi::Function init_class(Napi::Env env) {
		return ObjectWrap<T>::init_class(env);
	}
};

static inline std::vector<Napi::Value> get_arguments(const Napi::CallbackInfo& info) {
	size_t count = info.Length();
	std::vector<Napi::Value> arguments;
	arguments.reserve(count);

	for (u_int i = 0; i < count; i++) {
		arguments.push_back(info[i]);
	}

	return arguments;
}

static inline std::vector<napi_value> napi_get_arguments(const Napi::CallbackInfo& info) {
	size_t count = info.Length();
	std::vector<napi_value> arguments;
	arguments.reserve(count);

	for (u_int i = 0; i < count; i++) {
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
std::unordered_map<std::string, std::unordered_map<std::string, SchemaObjectType*>*> ObjectWrap<ClassType>::s_schemaObjectTypes;

//A cache for property names. The pair is property name and a node::String* to the same string representation.
//The cache is persisted throughout the process life time to preseve property names between constructor cache invalidations (on_destory_context is called) 
//Since RealmObjectClass instances may be used after context is destroyed, their property names should be valid
static std::unordered_map<std::string, node::String*> propertyNamesCache;

static node::String* get_cached_property_name(const std::string& name) {
	if (propertyNamesCache.count(name)) {
		node::String* cachedName = propertyNamesCache.at(name);
		return cachedName;
	}

	node::String* result = new node::String(name);
	propertyNamesCache.emplace(name, result);
	return result;
}


inline static void copy_object(Napi::Env env, const Napi::Value& source, const Napi::Error& target) {
	Napi::HandleScope scope(env);

	if (source.IsEmpty() || source.IsNull() || source.IsUndefined()) {
		return;
	}

	Napi::Function objectFunc = env.Global().Get("Object").As<Napi::Function>();
	Napi::Function assignFunc = objectFunc.Get("assign").As<Napi::Function>();
	assignFunc.Call({ target.Value(), source });
}

template<typename ClassType>
WrappedObject<ClassType>::WrappedObject(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WrappedObject<ClassType>>(info) {
	Napi::Env env = info.Env();

	//skip the constructor_callback if create_instance is creating a JS instance only
	if (info.Length() == 1 && info[0].IsExternal())	{
		Napi::External<Internal> external = info[0].As<Napi::External<Internal>>();
		if (!external.Data()) {
			return;
		}

		Internal* internal = external.Data();
		set_internal(internal);
		return;
	}

	try {
		node::Types::FunctionCallback constructor_callback = (node::Types::FunctionCallback)info.Data();
		constructor_callback(info);
	}
	catch (const node::Exception& e) {
		Napi::Error error = Napi::Error::New(info.Env(), e.what());
		copy_object(env, e.m_value, error);
		throw error;
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
	const IndexPropertyType* indexPropertyHandlers) {

	m_name = name;
	m_has_native_methodFunc = has_native_method_callback;
	WrappedObject<ClassType>::m_nullExternal = Napi::Persistent(Napi::External<Internal>::New(env, nullptr));
	WrappedObject<ClassType>::m_nullExternal.SuppressDestruct();

	Napi::Function ctor = Napi::ObjectWrap<WrappedObject<ClassType>>::DefineClass(env, name.c_str(), properties, (void*)constructor_callback);
	
	constructor = Napi::Persistent(ctor);
	constructor.SuppressDestruct();

	m_indexPropertyHandlers = const_cast<IndexPropertyType*>(indexPropertyHandlers);
	return ctor;
}

//This creates the required JS instance with a Proxy parent to support get and set handlers and returns a proxy created on the JS instance to support property enumeration handler
//the returned JS Proxy has only ownKeys trap setup so that all other member accesses skip the Proxy and go directly to the JS instance
template<typename ClassType>
Napi::Value WrappedObject<ClassType>::create_instance_with_proxy(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();

	if (constructor.IsEmpty()) {
		std::string typeName(typeid(ClassType).name());
		std::string errorMessage = util::format("create_instance_with_proxy: Class %s not initialized. Call init() first", typeName);
		throw Napi::Error::New(env, errorMessage);
	}

	if (!info.IsConstructCall()) {
		throw Napi::Error::New(env, "This function should be called as a constructor");
	}

	Napi::EscapableHandleScope scope(env);

	try {

		auto arguments = napi_get_arguments(info);
		Napi::Object instance = constructor.New(arguments);

		//using DefineProperty to make it non enumerable and non configurable and non writable
		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instance", instance, napi_default));
		
		info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("isRealmCtor", Napi::Boolean::New(env, true), napi_configurable)); 
		
		ObjectSetPrototypeOf.Call({ info.This(), instance });
		Napi::Object instanceProxy = GlobalProxy.New({ info.This(), ProxyHandler::get_instance_proxy_handler(env) });
		
		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instanceProxy", instanceProxy, napi_default));
		return scope.Escape(instanceProxy);
	}
	catch (const Napi::Error & e) {
		throw e;
	}
	catch (const std::exception& e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

template<typename ClassType>
Napi::Object WrappedObject<ClassType>::create_instance(Napi::Env env, Internal* internal) {
	if (constructor.IsEmpty() || factory_constructor.IsEmpty()) {
		std::string typeName(typeid(ClassType).name());
		std::string errorMessage = util::format("create_instance: Class %s not initialized. Call init() first", typeName);
		throw Napi::Error::New(env, errorMessage);
	}
	Napi::EscapableHandleScope scope(env);

	//creating a JS instance only. pass null as first and single argument
	//Internal intern = &std::shared_ptr<Internal>(internal);
	Napi::External<Internal> external;
	if (internal) {
		external = Napi::External<Internal>::New(env, internal);
	}
	else {
		external = WrappedObject<ClassType>::m_nullExternal.Value();
	}

	Napi::Object instance = factory_constructor.New({ external });
	return scope.Escape(instance).As<Napi::Object>();
}

template<typename ClassType>
WrappedObject<ClassType>* WrappedObject<ClassType>::try_unwrap(const Napi::Object& object) {
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
	m_internal = std::unique_ptr<Internal>(internal);
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
		std::string typeName(typeid(ClassType).name());
		std::string errorMessage = util::format("is_instance: Class %s not initialized. Call init() first", typeName);
		throw Napi::Error::New(env, errorMessage);
	}

	Napi::HandleScope scope(env);

	//Check the object is instance of the constructor. This will be true when the object have it's prototype set with setPrototypeOf. 
	//This is true for objects configured in the schema with a function type.
	Napi::Function ctor  = constructor.Value();
	bool isInstanceOf = object.InstanceOf(ctor);
	if (isInstanceOf) {
		return true;
	}

	//Object store needs is_instance to return true when called with RealmObject instance even if the prototype was changed with setPrototypeOf
	Napi::Object instance = object.Get("_instance").As<Napi::Object>();
	if (!instance.IsUndefined()) {
		isInstanceOf = instance.InstanceOf(ctor);
	}

	return isInstanceOf;
}


static inline Napi::Value method_callback(const Napi::CallbackInfo& info) {
	node::Types::FunctionCallback method = (node::Types::FunctionCallback)info.Data();
	return method(info);
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
	Napi::Error error = Napi::Error::New(info.Env(), "Cannot assign to read only property");
	error.Set("readOnly", true);
	throw error;
}

template<typename ClassType>
void WrappedObject<ClassType>::readonly_static_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	Napi::Error error = Napi::Error::New(info.Env(), "Cannot assign to read only static property");
	error.Set("readOnly", true);
	throw error;
}

template<typename ClassType>
Napi::ObjectReference WrappedObject<ClassType>::ProxyHandler::m_proxyHandler;

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_instance_proxy_handler(Napi::Env env) {
	if (!m_proxyHandler.IsEmpty()) {
		return m_proxyHandler.Value();
	}

	Napi::Object proxyObject = Napi::Object::New(env);
	Napi::PropertyDescriptor instanceGetTrapFunc = Napi::PropertyDescriptor::Function("get", &WrappedObject<ClassType>::ProxyHandler::get_proxy_trap);
	Napi::PropertyDescriptor instanceSetTrapFunc = Napi::PropertyDescriptor::Function("set", &WrappedObject<ClassType>::ProxyHandler::set_proxy_trap);
	Napi::PropertyDescriptor ownKeysTrapFunc = Napi::PropertyDescriptor::Function("ownKeys", &WrappedObject<ClassType>::ProxyHandler::own_keys_proxy_trap);
	Napi::PropertyDescriptor hasTrapFunc = Napi::PropertyDescriptor::Function("has", &WrappedObject<ClassType>::ProxyHandler::has_proxy_trap);
	Napi::PropertyDescriptor getOwnPropertyDescriptorTrapFunc = Napi::PropertyDescriptor::Function("getOwnPropertyDescriptor", &WrappedObject<ClassType>::ProxyHandler::get_own_property_descriptor_trap);
	Napi::PropertyDescriptor getPrototypeOfFunc = Napi::PropertyDescriptor::Function("getPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::get_prototype_of_proxy_trap);
	Napi::PropertyDescriptor setPrototypeOfFunc = Napi::PropertyDescriptor::Function("setPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::set_prototype_of_proxy_trap);
	
	proxyObject.DefineProperties({ instanceGetTrapFunc, instanceSetTrapFunc, ownKeysTrapFunc, hasTrapFunc, getOwnPropertyDescriptorTrapFunc, getPrototypeOfFunc, setPrototypeOfFunc });
	
	m_proxyHandler = Napi::Persistent(proxyObject);
	m_proxyHandler.SuppressDestruct();
	return proxyObject;
}

static Napi::Value bind_function(Napi::Env env, const std::string& functionName, const Napi::Function& function, const Napi::Object& thisObject) {
	Napi::Function boundFunc = FunctionBind.Call(function, { thisObject }).As<Napi::Function>();
	return boundFunc;
}


template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::bind_native_function(Napi::Env env, const std::string& functionName, const Napi::Function& function, const Napi::Object& thisObject) {
	Napi::EscapableHandleScope scope(env);

	//do not bind the non native functions. These are attached from extensions.js and should be called on the instanceProxy.
	if (!m_has_native_methodFunc(functionName)) {
		//return undefined to indicate this is not a native function
		return scope.Escape(env.Undefined());
	}

	Napi::Value result = bind_function(env, functionName, function, thisObject);
	return scope.Escape(result);
}

static inline Napi::Object get_prototype(Napi::Env env, const Napi::Object& object) {
	napi_value napi_proto;
	napi_status status = napi_get_prototype(env, object, &napi_proto);
	if (status != napi_ok) {
		throw Napi::Error::New(env, "Invalid object. Couldn't get prototype of object");
	}
	Napi::Object prototypeObject = Napi::Object(env, napi_proto);
	return prototypeObject;
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value property = info[1];

#if DEBUG
	std::string _debugproperty = property.IsString() ? (std::string)property.As<Napi::String>() : "";
	const char* _debugPropertyName = _debugproperty.c_str();
	(void)_debugPropertyName; //disable unused variable warning
#endif

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		throw Napi::Error::New(env, "Invalid object. No _instance member");
	}

	//skip Symbols
	if (!property.IsString()) {
		Napi::Value propertyValue = instance.Get(property);
		return scope.Escape(propertyValue);
	}

	Napi::String propertyName = property.As<Napi::String>();
	std::string propertyText = propertyName;

	if (propertyText == "_instance") {
		return scope.Escape(instance);
	}
	
	//Order of execution
	//1.check for number and call get index handlers
	//2.check if its a native function
	//3.get any other property name from the instance


	//1.Check property is number and call index handler
	char firstChar = *propertyText.c_str();

	//myobject[""] and negative indexes return undefined in JavaScript
	if (propertyText.length() == 0 || firstChar == '-') {
		return scope.Escape(env.Undefined());
	}

	bool isNumber = isdigit(firstChar) || firstChar == '+';
	if (isNumber) {
		int32_t index = 0;
		try {
			index = std::stoi(propertyText);
		}
		catch (const std::exception & e) {
			throw Napi::Error::New(env, "Invalid number " + propertyText);
		}

		WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
		Napi::Value result = wrappedObject->m_indexPropertyHandlers->getter(info, instance, index);
		return scope.Escape(result);
	}


	//2. Check if its a native function
	if (m_has_native_methodFunc(propertyText)) {
		//TODO: cache this function in the wrappedObject of this instance
		Napi::Value propertyValue = instance.Get(property);
		Napi::Value result = bind_function(env, propertyText, propertyValue.As<Napi::Function>(), instance);
		return scope.Escape(result);
	}

	//return all other properties from the instance
	Napi::Value propertyValue = instance.Get(property);
	return scope.Escape(propertyValue);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::set_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value property = info[1];
	Napi::Value value = info[2];

#if DEBUG
	std::string _debugproperty = property.IsString() ? (std::string)property.As<Napi::String>() : "";
	const char* _debugPropertyName = _debugproperty.c_str();
	(void)_debugPropertyName; //disable unused variable warning
#endif


	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		throw Napi::Error::New(env, "Invalid object. No _instance member");
	}

	//skip Symbols
	if (!property.IsString()) {
		instance.Set(property, value);
		return scope.Escape(value);
	}

	Napi::String propertyName = property.As<Napi::String>();
	std::string propertyText = propertyName;

	//Order of execution
	//1.check for number and call set index handlers
	//2.get any other property name from the instance

	//do not assign empty property name. myarray[''] = 42; is valid in JS
	if (propertyText.length() == 0) {
		throw Napi::Error::New(env, "Invalid number ''");
	}

	//1.Check property is number and call set index handler
	char firstChar = *propertyText.c_str();
	bool isNumber = isdigit(firstChar) || firstChar == '+' || firstChar == '-';
	if (isNumber) {
		try {
			realm::js::validated_positive_index(propertyText);
		}
		catch (const std::out_of_range & e) {
			throw Napi::Error::New(env, e.what());
		}

		int32_t index = 0;
		try {
			index = std::stoi(propertyText);
		}
		catch (const std::exception & e) {
			throw Napi::Error::New(env, "Invalid number " + propertyText);
		}

		WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
		if (wrappedObject->m_indexPropertyHandlers->setter == nullptr) {
			std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
			throw Napi::Error::New(env, message);
		}

		Napi::Value result = wrappedObject->m_indexPropertyHandlers->setter(info, instance, index, value);
		return scope.Escape(result);
	}

	//call Set on the instance for non indexed properties
	try {
		instance.Set(property, value);
		return scope.Escape(Napi::Boolean::New(env, true));
	}
	catch (const Napi::Error & e) {
		Napi::Boolean readOnly = e.Get("readOnly").As<Napi::Boolean>();
		if (!readOnly.IsUndefined() && readOnly) {
			std::string message = "Cannot assign to read only property '" + propertyText + "'";
			throw Napi::Error::New(env, message);
		}

		throw e;
	}
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::own_keys_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	
	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);

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
Napi::Value WrappedObject<ClassType>::ProxyHandler::has_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value propertyArg = info[1];


	//skip symbols
	if (!propertyArg.IsString()) {
		bool hasProperty = target.Has(propertyArg);
		return scope.Escape(Napi::Boolean::From(env, hasProperty));
	}

	Napi::String property = propertyArg.As<Napi::String>();
	std::string propertyText = property;

	if (propertyText.length() == 0) {
		return scope.Escape(Napi::Boolean::From(env, false));
	}

	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	if (instance.IsUndefined() || instance.IsNull()) {
		bool hasProperty = target.Has(propertyArg);
		return scope.Escape(Napi::Boolean::From(env, hasProperty));
	}

	if (target.Has(property)) {
		return scope.Escape(Napi::Boolean::From(env, true));
	}

	//Property should be a number from here on
	char firstChar = *propertyText.c_str();
	bool isNumber = isdigit(firstChar) || firstChar == '+';

	//return false for negative indexes and non numbers
	if (!isNumber || firstChar == '-') {
		return scope.Escape(Napi::Boolean::From(env, false));
	}

	int32_t index = 0;
	try {
		index = std::stoi(propertyText);
	}
	catch (const std::exception& e) {
		//not a number. return false;
		return scope.Escape(Napi::Boolean::From(env, false));
	}
	
	int32_t length = instance.Get("length").As<Napi::Number>();
	bool hasIndex = index >= 0 && index < length;
	return scope.Escape(Napi::Boolean::From(env, hasIndex));
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_own_property_descriptor_trap(const Napi::CallbackInfo& info) {
	//This exists only for ownKeysTrap to work properly with Object.keys(). It does not check if the property is from the named handler or it is an existing property on the instance. 
	//This implementation can be extended to return the true property descriptor if the property is an existing one
	
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	//Napi::Object target = info[0].As<Napi::Object>();
	Napi::String key = info[1].As<Napi::String>();
	std::string text = key;

	Napi::Object descriptor = Napi::Object::New(env);
	descriptor.Set("enumerable", Napi::Boolean::New(env, true));
	descriptor.Set("configurable", Napi::Boolean::New(env, true));
	
	return scope.Escape(descriptor);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_prototype_of_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Object proto = get_prototype(env, target);
	return scope.Escape(proto);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::set_prototype_of_proxy_trap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	throw Napi::Error::New(env, "Setting the prototype on this type of object is not supported");
}

static Napi::Value property_getter_callback(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	try {
		PropertyType* propertyType = (PropertyType*)info.Data();
		Napi::Value result = propertyType->getter(info);
		return result;
	}
	catch (const Napi::Error & e) {
		e.ThrowAsJavaScriptException();
		return env.Undefined();
	}
}

template<typename ClassType>
Napi::Value ObjectWrap<ClassType>::property_getter(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	try {
		auto propertyName = (node::String*)info.Data();
		return s_class.string_accessor.getter(info, info.This().As<Napi::Object>(), propertyName->ToString(env));
	}
	catch (const Napi::Error & e) {
		e.ThrowAsJavaScriptException();
		return env.Undefined();
	}
}

template<typename ClassType>
void ObjectWrap<ClassType>::property_setter(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	try {
		auto propertyName = (node::String*)info.Data();
		auto value = info[0];
		s_class.string_accessor.setter(info, info.This().As<Napi::Object>(), propertyName->ToString(env), value);
	}
	catch (const Napi::Error & e) {
		e.ThrowAsJavaScriptException();
	}
}

template<typename ClassType>
Napi::Function ObjectWrap<ClassType>::create_constructor(Napi::Env env) {
	Napi::Function ctor = init_class(env);
	
	//If the class has no index accessor we can create an instance of the class itself and can skip proxy objects
	bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;

	if (!has_index_accessor || isRealmObjectClass) {
		WrappedObject<ClassType>::set_factory_constructor(ctor);
		return ctor;
	}

	//since NAPI ctors can't change the returned type we need to return a factory func which will be called when 'new ctor()' is called from JS. 
	//This will create a JS Proxy and return it to the caller. The proxy is needed to support named and index handlers
	Napi::Function factory = Napi::Function::New(env, WrappedObject<ClassType>::create_instance_with_proxy, s_class.name);
	auto ctorPrototypeProperty = ctor.Get("prototype");

	//the factory function should have the same prototype property as the constructor.prototype so `instanceOf` works
	factory.Set("prototype", ctorPrototypeProperty);
	ObjectSetPrototypeOf.Call({ factory, ctor });

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

	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;

	std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>> properties;

	if (!isRealmObjectClass) {
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
	}

	bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
	const IndexPropertyType* index_accessor = has_index_accessor ? &s_class.index_accessor : nullptr;

	ctor = WrappedObject<ClassType>::init(env, s_class.name, &ObjectWrap<ClassType>::constructor_callback, &ObjectWrap<ClassType>::has_native_method, properties, index_accessor);

	auto ctorPrototypeProperty = ctor.Get("prototype");
	if (ctorPrototypeProperty.IsUndefined()) {
		throw std::runtime_error("undefined 'prototype' on constructor");
	}

	Napi::Function parentCtor = ObjectWrapAccessor<ParentClassType>::init_class(env);
	if (!parentCtor.IsEmpty()) {

		auto parentCtorPrototypeProperty = parentCtor.Get("prototype");
		if (parentCtorPrototypeProperty.IsUndefined()) {
			throw std::runtime_error("undefined 'prototype' on parent constructor");
		}

		ObjectSetPrototypeOf.Call({ ctorPrototypeProperty, parentCtorPrototypeProperty });
		ObjectSetPrototypeOf.Call({ ctor, parentCtor });
	}

	//use PropertyDescriptors instead of ClassPropertyDescriptors, since ClassPropertyDescriptors requires the JS instance members callbacks to be instance members of the WrappedObject<ClassType> class
	if (isRealmObjectClass) {
		std::vector<Napi::PropertyDescriptor> properties;
		auto ctorPrototype = ctor.Get("prototype").As<Napi::Object>();
		for (auto& pair : s_class.methods) {
			auto descriptor = Napi::PropertyDescriptor::Function(env, ctorPrototype, Napi::String::New(env, pair.first) /*name*/, &method_callback, napi_default | realm::js::PropertyAttributes::DontEnum, (void*)pair.second /*callback*/);
			properties.push_back(descriptor);
		}

		for (auto& pair : s_class.properties) {
			napi_property_attributes napi_attributes = napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
			auto descriptor = Napi::PropertyDescriptor::Accessor<property_getter_callback>(Napi::String::New(env, pair.first) /*name*/, napi_attributes, (void*)&pair.second /*callback*/);
			properties.push_back(descriptor);
		}
		
		ctorPrototype.DefineProperties(properties);
	}

	return ctor;
}

template<typename ClassType>
Napi::Object ObjectWrap<ClassType>::create_instance(Napi::Env env, Internal* internal) {
	Napi::EscapableHandleScope scope(env);


	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;

	if (isRealmObjectClass && !internal) {
		throw Napi::Error::New(env, "RealmObjectClass requires an internal realm object when creating instances");
	}

	Napi::Object factory = WrappedObject<ClassType>::create_instance(env, internal);
    return scope.Escape(factory).As<Napi::Object>();
}

inline static void schema_object_type_constructor(const Napi::CallbackInfo& info) {
}

template<typename ClassType>
void ObjectWrap<ClassType>::internal_finalizer(Napi::Env, typename ClassType::Internal* internal) {
	if (internal) {
		delete internal;
		internal = nullptr;
	}
}

static inline void remove_schema_object(std::unordered_map<std::string, SchemaObjectType*>* schemaObjects, const std::string& schemaName) {
	bool schemaExists = schemaObjects->count(schemaName);
	if (!schemaExists) {
		return;
	}

	SchemaObjectType* schemaObjectType = schemaObjects->at(schemaName);
	schemaObjects->erase(schemaName);
	schemaObjectType->constructor.Reset();
	delete schemaObjectType;
}

template<typename ClassType>
inline std::vector<Napi::PropertyDescriptor> ObjectWrap<ClassType>::create_napi_property_descriptors(Napi::Env env, const Napi::Object& constructorPrototype, const realm::ObjectSchema& schema, bool redefine) {
	std::vector<Napi::PropertyDescriptor> properties;

	for (auto& property : schema.persisted_properties) {
		std::string propName = property.public_name.empty() ? property.name : property.public_name;
		if (redefine || !constructorPrototype.HasOwnProperty(propName)) {
			node::String* name = get_cached_property_name(propName);
			auto descriptor = Napi::PropertyDescriptor::Accessor<property_getter, property_setter>(name->ToString(env), napi_enumerable, (void*)name);
			properties.push_back(descriptor);
		}
	}

	for (auto& property : schema.computed_properties) {
		std::string propName = property.public_name.empty() ? property.name : property.public_name;
		if (redefine || !constructorPrototype.HasOwnProperty(propName)) {
			node::String* name = get_cached_property_name(propName);
			auto descriptor = Napi::PropertyDescriptor::Accessor<property_getter, property_setter>(name->ToString(env), napi_enumerable, (void*)name);
			properties.push_back(descriptor);
		}
	}

	return properties;
}

template<typename ClassType>
Napi::Object ObjectWrap<ClassType>::create_instance_by_schema(Napi::Env env, Napi::Function& constructor, const realm::ObjectSchema& schema, Internal* internal) {
	Napi::EscapableHandleScope scope(env);

	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;
	if (!isRealmObjectClass) {
		throw Napi::Error::New(env, "Creating instances by schema is supported for RealmObjectClass only");
	}

	if (isRealmObjectClass && !internal) {
		throw Napi::Error::New(env, "RealmObjectClass requires an internal realm object when creating instances by schema");
	}

	Napi::Object instance;
	auto config = internal->realm()->config();
	std::string path = config.path;
	auto version = internal->realm()->schema_version();
	std::string schemaName = schema.name + ":" + std::to_string(version); 

	std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
	if (!s_schemaObjectTypes.count(path)) {
		//std::map<std::string, std::map<std::string, SchemaObjectType*>>
		schemaObjects = new std::unordered_map<std::string, SchemaObjectType*>();
		s_schemaObjectTypes.emplace(path, schemaObjects);
	}
	else {
		schemaObjects = s_schemaObjectTypes.at(path);
	}

	Napi::Function schemaObjectConstructor;
	Napi::Symbol externalSymbol = ExternalSymbol;
	//if we are creating a RealmObject from schema with no user defined constructor
	if (constructor.IsEmpty()) {
		//1.Check by name if the constructor is already created for this RealmObject 
		if (!schemaObjects->count(schemaName)) {

			//2.Create the constructor

			//get or create the RealmObjectClass<T> constructor

			//create the RealmObject function by name
			schemaObjectConstructor = Napi::Function::New(env, schema_object_type_constructor, schema.name);

			Napi::Function realmObjectClassConstructor = ObjectWrap<ClassType>::create_constructor(env);
			auto parentCtorPrototypeProperty = realmObjectClassConstructor.Get("prototype");
			auto childPrototypeProperty = schemaObjectConstructor.Get("prototype").As<Napi::Object>();
			ObjectSetPrototypeOf.Call({ childPrototypeProperty, parentCtorPrototypeProperty });
			ObjectSetPrototypeOf.Call({ schemaObjectConstructor, realmObjectClassConstructor });

			//get all properties from the schema 
			std::vector<Napi::PropertyDescriptor> properties = create_napi_property_descriptors(env, childPrototypeProperty, schema, true /*redefine*/);

			//define the properties on the prototype of the schema object constructor
			childPrototypeProperty.DefineProperties(properties);
			
			SchemaObjectType* schemaObjectType = new SchemaObjectType();
			schemaObjects->emplace(schemaName, schemaObjectType);
			schemaObjectType->constructor = Napi::Persistent(schemaObjectConstructor);
			schemaObjectType->constructor.SuppressDestruct();
		}
		else {
			//hot path. The constructor for this schema object is already cached. use it and return a new instance
			SchemaObjectType* schemaObjectType = schemaObjects->at(schemaName);
			schemaObjectConstructor = schemaObjectType->constructor.Value();
		}

		Napi::External<Internal> externalValue = Napi::External<Internal>::New(env, internal, internal_finalizer);
		instance = schemaObjectConstructor.New({});
		instance.Set(externalSymbol, externalValue);
	}
	else {
		//creating a RealmObject with user defined constructor

		bool schemaExists = schemaObjects->count(schemaName);
		SchemaObjectType* schemaObjectType;
		if (schemaExists) {
			schemaObjectType = schemaObjects->at(schemaName);
			schemaObjectConstructor = schemaObjectType->constructor.Value();
			
			//check if constructors have changed for the same schema object and name
			if (!schemaObjectConstructor.StrictEquals(constructor)) {
				schemaExists = false;
				remove_schema_object(schemaObjects, schemaName);
			}
		}

		//hot path. The constructor for this schema object is already cached. use it and return a new instance
		if (schemaExists) {
			schemaObjectType = schemaObjects->at(schemaName);
			schemaObjectConstructor = schemaObjectType->constructor.Value();

			instance = schemaObjectConstructor.New({});

			Napi::External<Internal> externalValue = Napi::External<Internal>::New(env, internal, internal_finalizer);
			instance.Set(externalSymbol, externalValue);

			return scope.Escape(instance).As<Napi::Object>();
		}

		schemaObjectConstructor = constructor;
		Napi::Object constructorPrototype = constructor.Get("prototype").As<Napi::Object>();

		//get all properties from the schema 
		std::vector<Napi::PropertyDescriptor> properties = create_napi_property_descriptors(env, constructorPrototype, schema, false /*redefine*/);

		Napi::Function realmObjectClassConstructor = ObjectWrap<ClassType>::create_constructor(env);
		bool isInstanceOfRealmObjectClass = constructorPrototype.InstanceOf(realmObjectClassConstructor);

		//Skip if the user defined constructor inherited the RealmObjectClass. All RealmObjectClass members are available already.
		if (!isInstanceOfRealmObjectClass) {
			//setup all RealmObjectClass<T> methods to the prototype of the object
			for (auto& pair : s_class.methods) {
				//don't redefine if exists
				if (!constructorPrototype.HasOwnProperty(pair.first)) {
					auto descriptor = Napi::PropertyDescriptor::Function(env, constructorPrototype, Napi::String::New(env, pair.first) /*name*/, &method_callback, napi_default | realm::js::PropertyAttributes::DontEnum, (void*)pair.second /*callback*/);
					properties.push_back(descriptor);
				}
			}

			for (auto& pair : s_class.properties) {
				//don't redefine if exists
				if (!constructorPrototype.HasOwnProperty(pair.first)) {
					napi_property_attributes napi_attributes = napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
					auto descriptor = Napi::PropertyDescriptor::Accessor<property_getter_callback>(Napi::String::New(env, pair.first) /*name*/, napi_attributes, (void*)&pair.second /*callback*/);
					properties.push_back(descriptor);
				}
			}
		}

		//define the properties on the prototype of the schema object constructor
		if (properties.size() > 0) {
			constructorPrototype.DefineProperties(properties);
		}

		instance = schemaObjectConstructor.New({});
		if (!instance.InstanceOf(schemaObjectConstructor)) {
			throw Napi::Error::New(env, "Realm object constructor must not return another value");
		}

		Napi::External<Internal> externalValue = Napi::External<Internal>::New(env, internal, internal_finalizer);
		instance.Set(externalSymbol, externalValue);

		schemaObjectType = new SchemaObjectType();
		schemaObjects->emplace(schemaName, schemaObjectType);
		schemaObjectType->constructor = Napi::Persistent(schemaObjectConstructor);
		schemaObjectType->constructor.SuppressDestruct();
	}
	
	return scope.Escape(instance).As<Napi::Object>();
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::on_context_destroy(Napi::Env env, std::string realmPath) {
	std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
	if (!s_schemaObjectTypes.count(realmPath)) {
		return;
	}
	
	schemaObjects = s_schemaObjectTypes.at(realmPath);
	for (auto it = schemaObjects->begin(); it != schemaObjects->end(); ++it) {
		it->second->constructor.Reset();
		SchemaObjectType* schemaObjecttype = it->second;
		delete schemaObjecttype;
	}
	s_schemaObjectTypes.erase(realmPath);

	delete schemaObjects;
}

template<typename ClassType>
inline bool ObjectWrap<ClassType>::is_instance(Napi::Env env, const Napi::Object& object) {
	return WrappedObject<ClassType>::is_instance(env, object);
}

template<typename ClassType>
typename ClassType::Internal* ObjectWrap<ClassType>::get_internal(Napi::Env env, const Napi::Object& object) {
	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;
	if (isRealmObjectClass) {
		Napi::External<typename ClassType::Internal> external = object.Get(ExternalSymbol).As<Napi::External<typename ClassType::Internal>>();
		if (external.IsUndefined()) {
			return nullptr;
		}

		return external.Data();
	}

	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::try_unwrap(object);
	return wrappedObject->get_internal();
}

template<typename ClassType>
void ObjectWrap<ClassType>::set_internal(Napi::Env env, const Napi::Object& object, typename ClassType::Internal* internal) {
	bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;
	if (isRealmObjectClass) {
		Napi::Object& obj = const_cast<Napi::Object&>(object);
		obj.Set(ExternalSymbol, Napi::External<typename ClassType::Internal>::New(env, internal));
		return;
	}

	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::try_unwrap(object);
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
		bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::node::Types>>::value;
		if (isRealmObjectClass) {
			return scope.Escape(env.Null()); //return a value to comply with Napi::FunctionCallback
		}

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
	auto methodCallback = (typename WrappedObject<ClassType>::InstanceMethodCallback)(&WrappedObject<ClassType>::method_callback);
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
	
	auto getterCallback = (typename WrappedObject<ClassType>::InstanceGetterCallback)(&WrappedObject<ClassType>::getter_callback);
	auto setterCallback = (typename WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::readonly_setter_callback);
	if (property.setter) {
		setterCallback = (typename WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::setter_callback);
	}

	return WrappedObject<ClassType>::InstanceAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, (void*)&property);
}

template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_property(Napi::Env env, const std::string& name, const PropertyType& property) {
	napi_property_attributes napi_attributes = napi_static | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);

	auto getterCallback = (typename WrappedObject<ClassType>::StaticGetterCallback)(property.getter);
	typename WrappedObject<ClassType>::StaticSetterCallback setterCallback = &WrappedObject<ClassType>::readonly_static_setter_callback;
	if (property.setter) {
		setterCallback = (typename WrappedObject<ClassType>::StaticSetterCallback)(property.setter);
	}

	return WrappedObject<ClassType>::StaticAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, nullptr);
}

} // node

namespace js {

template<typename ClassType>
class ObjectWrap<node::Types, ClassType> : public node::ObjectWrap<ClassType> {};


#define HANDLE_WRAP_EXCEPTION           \
catch (const Napi::Error & e) { \
	throw;\
}\
catch (const node::Exception & e) {\
	Napi::Error error = Napi::Error::New(info.Env(), e.what());\
	copy_object(env, e.m_value, error);\
	throw error;\
}\
catch (const std::exception & e) {\
	throw Napi::Error::New(info.Env(), e.what());\
}


template<node::ArgumentsMethodType F>
Napi::Value wrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	auto arguments = node::get_arguments(info);
	node::Arguments args{ info.Env(), arguments.size(), arguments.data() };
	node::ReturnValue result(env);

	Napi::Object instanceProxy = info.This().As<Napi::Object>().Get("_instanceProxy").As<Napi::Object>();
	if (instanceProxy.IsUndefined()) {
		instanceProxy = info.This().As<Napi::Object>();
	}

	try {
		F(env, instanceProxy, args, result);
		return result.ToValue();
	}
	HANDLE_WRAP_EXCEPTION
}

template<node::PropertyType::GetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	node::ReturnValue result(env);
	try {
		F(env, info.This().As<Napi::Object>(), result);
		return result.ToValue();
	}
	HANDLE_WRAP_EXCEPTION
}

template<node::PropertyType::SetterType F>
void wrap(const Napi::CallbackInfo& info, const Napi::Value& value) {
	Napi::Env env = info.Env();

	try {
		F(env, info.This().As<Napi::Object>(), value);
	}
	HANDLE_WRAP_EXCEPTION
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
		catch (const std::out_of_range& e) {
			// Out-of-bounds index getters should just return undefined in JS.
			result.set_undefined();
			return result.ToValue();
		}
	}
	HANDLE_WRAP_EXCEPTION
}

template<node::IndexPropertyType::SetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, uint32_t index, const Napi::Value& value) {
	Napi::Env env = info.Env();

	try {
		bool success = F(env, instance, index, value);

		// Indicate that the property was intercepted.
		return Napi::Value::From(env, success);
	}
	HANDLE_WRAP_EXCEPTION
}

template<node::StringPropertyType::GetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property) {
	Napi::Env env = info.Env();
	node::ReturnValue result(env);

	try {
		F(env, instance, property, result);
		return result.ToValue();
	}
	HANDLE_WRAP_EXCEPTION
}

template<node::StringPropertyType::SetterType F>
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property, const Napi::Value& value) {
	Napi::Env env = info.Env();
	try {
		bool success = F(env, instance, property, value);
		return Napi::Value::From(env, success);
	}
	HANDLE_WRAP_EXCEPTION
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
	HANDLE_WRAP_EXCEPTION
}

} // js
} // realm
