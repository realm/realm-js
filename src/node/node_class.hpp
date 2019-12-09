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

//struct ReadOnlyError : public Napi::Error {
//public:
//	ReadOnlyError() : Napi::Error() {}
//	ReadOnlyError(napi_env env, napi_value message) : Napi::Error(env, message) {}
//
//	static inline ReadOnlyError ReadOnlyError::New(napi_env env, const std::string& message) {
//		return Error::New<ReadOnlyError>(env, message.c_str(), message.size(), napi_create_error);
//	}
//};

struct ReadOnlyError : std::runtime_error {
public:
	ReadOnlyError(const std::string& message) : std::runtime_error(message) {}
};

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

	//NAPI: remove if not used
	//static Napi::Function create_proxy(Napi::Env env);

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
			//static Napi::Value get_proxy_handler(Napi::Env env);
			static Napi::Value get_instance_proxy_handler(Napi::Env env);
		
		private:
			static Napi::ObjectReference proxyHandler;
		
			//static Napi::Value getProxyTrap(const Napi::CallbackInfo& info);
			//static Napi::Value setProxyTrap(const Napi::CallbackInfo& info);

			static Napi::Value combinedGetProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value combinedSetProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value combinedGetProxyTrapHandleFunctions(const Napi::CallbackInfo& info, bool* handled);
			//static Napi::Value instanceGetProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value ownKeysProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value hasProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value getOwnPropertyDescriptorTrap(const Napi::CallbackInfo& info);
			static Napi::Value getPrototypeofProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value setPrototypeofProxyTrap(const Napi::CallbackInfo& info);
		};
		
	//NAPI: remove if not needed
	//static Napi::FunctionReference constructorProxy;
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
Napi::ObjectReference WrappedObject<ClassType>::ProxyHandler::proxyHandler;

template<typename ClassType>
std::string WrappedObject<ClassType>::m_name;

template<typename ClassType>
std::function<bool(const std::string&)> WrappedObject<ClassType>::m_has_native_methodFunc;

template<typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
	//static v8::Local<v8::Function> create_constructor(v8::Isolate*);
    static Napi::Function create_constructor(Napi::Env env);

    //static v8::Local<v8::Object> create_instance(v8::Isolate*, Internal* = nullptr);
	static Napi::Object create_instance(Napi::Env env, Internal* = nullptr);
	static bool is_instance(Napi::Env env, const Napi::Object& object);
	static Internal* get_internal(const Napi::Object& object);
	static void set_internal(const Napi::Object& object, Internal* data);

    //Napi: not needed. 
    //static v8::Local<v8::FunctionTemplate> get_template() {
    //    static Nan::Persistent<v8::FunctionTemplate> js_template(create_template());
    //    return Nan::New(js_template);
    //}

	//Napi: moved to WrappedObject ctor
    //static void construct(const Nan::FunctionCallbackInfo<v8::Value>&);
	static Napi::Value constructor_callback(const Napi::CallbackInfo& info);
	static bool has_native_method(const std::string& name);

   /* static bool has_instance(v8::Isolate* isolate, const v8::Local<v8::Value> &value) {
        return get_template()->HasInstance(value);
    }*/

    /*operator Internal*() const {
        return m_object.get();
    }*/

    /*ObjectWrap<ClassType>& operator=(Internal* object) {
        if (m_object.get() != object) {
            m_object = std::unique_ptr<Internal>(object);
        }
        return *this;
    }*/

  private:
    static ClassType s_class;
	
	//Gives access to ObjectWrap<ClassType> init_class private static member. See https://stackoverflow.com/a/40937193
	template<typename ClassType>
	friend struct ObjectWrapAccessor;
	
	//Napi: the JS constructor for this native class. Used to created JS instances from native code
	//static Napi::FunctionReference wrappedObject;

    //std::unique_ptr<Internal> m_object;

	static Napi::Function init_class(Napi::Env env);

	//Napi: This is called when ObjectWrap<ClassType> objects are created from native code
    //ObjectWrap(Internal* object = nullptr) m_object(object) {}
	
	//static v8::Local<v8::FunctionTemplate> create_template();
    //static Napi::Function create_template();

	//static void setup_prototype(Napi::Env env, const Napi::Function& constructor);
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

//Napi: reimplemented
// This helper function is needed outside the scope of the ObjectWrap class as well.
//static inline std::vector<v8::Local<v8::Value>> get_arguments(const Nan::FunctionCallbackInfo<v8::Value> &info) {
//    int count = info.Length();
//    std::vector<v8::Local<v8::Value>> arguments;
//    arguments.reserve(count);
//
//    for (int i = 0; i < count; i++) {
//        arguments.push_back(info[i]);
//    }
//    
//    return arguments;
//}

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
	//skip the constructor_callback if create_instance is creating a JS instance only
	if (info.Length() == 1 && info[0].IsNull())	{
		return;
	}

	node::Types::FunctionCallback constructor_callback = (node::Types::FunctionCallback)info.Data();
	constructor_callback(info);
}

template<typename ClassType>
Napi::Function WrappedObject<ClassType>::init(Napi::Env env, 
	const std::string& name, 
	node::Types::FunctionCallback constructor_callback, 
	std::function<bool(const std::string&)> has_native_method_callback,
	const std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties, 
	const IndexPropertyType* indexPropertyHandlers = nullptr, 
	const StringPropertyType* namedPropertyHandlers = nullptr) {

	//Napi: internal field should be set as last argument
	Napi::Function ctor = Napi::ObjectWrap<WrappedObject<ClassType>>::DefineClass(env, name.c_str(), properties, (void*)constructor_callback);
	
	constructor = Napi::Persistent(ctor);
	constructor.SuppressDestruct();

	m_indexPropertyHandlers = const_cast<IndexPropertyType*>(indexPropertyHandlers);
	m_namedPropertyHandlers = const_cast<StringPropertyType*>(namedPropertyHandlers);
	m_name = name;
	m_has_native_methodFunc = has_native_method_callback;
	return ctor;
}

//NAPI: revisit thrown exceptions. If JS or std exception should be thrown?
//NAPI: remove if not used
//template<typename ClassType>
//Napi::Function WrappedObject<ClassType>::create_proxy(Napi::Env env) {
//	Napi::EscapableHandleScope scope(env);
//
//	if (constructor.IsEmpty()) {
//		throw std::runtime_error("Class not initialized. Call init() first");
//	}
//
//	if (!constructorProxy.IsEmpty()) {
//		return constructorProxy.Value();
//	}
//
//	//proxify
//	auto proxyFunc = env.Global().Get("Proxy").As<Napi::Function>();
//	Napi::Object ctorAsProxyObject = proxyFunc.New({ constructor.Value(),  ProxyHandler::get_proxy_handler(env) });
//	Napi::Function ctorAsProxy = ctorAsProxyObject.As<Napi::Function>();
//
//	ctorAsProxy.Set("prototype", constructor.Value());
//
//	constructorProxy = Napi::Persistent(ctorAsProxy);
//	constructorProxy.SuppressDestruct();
//
//	return scope.Escape(ctorAsProxy).As<Napi::Function>();
//}

//Napi: revisit thrown exceptions. If JS or std exception should be thrown?
//This creates the required JS instance with a Proxy parent to support get and set handlers and returns a proxy created on the JS instance to support property enumeration handler
//the returned JS Proxy has only ownKeys trap setup so that all other member accesses skip the Proxy and go directly to the JS instance
template<typename ClassType>
Napi::Value WrappedObject<ClassType>::create_instance_with_proxy(const Napi::CallbackInfo& info) {
	if (constructor.IsEmpty()) {
		throw std::runtime_error("Class not initialized. Call init() first");
	}

	if (!info.IsConstructCall()) {
		throw std::runtime_error("This function should be called as a constructor");
	}

	try {
		Napi::Env env = info.Env();
		Napi::HandleScope scope(env);

		auto arguments = get_arguments(info);
		std::vector<napi_value> arrgs(arguments.begin(), arguments.end());
		Napi::Object instance = constructor.New(arrgs);
		//using DefineProperty to make it non enumerable and non configurable and non writable

		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instance", instance, napi_default)); //instance.Set("_instance", instance);
		

		//NAPI: debugger calls this too many times. Consider doing that in debug only
		//NAPI: remove or define it only in debug
		//instance.DefineProperty(Napi::PropertyDescriptor::Value("splice", env.Undefined(), napi_default)); //instance.Set("splice", env.Undefined());
		
		
		info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("isRealmCtor", Napi::Boolean::New(env, true), napi_configurable)); //info.This().As<Napi::Object>().Set("isRealmCtor", Napi::Boolean::New(env, true));
		

		auto proxyFunc = env.Global().Get("Proxy").As<Napi::Function>();

		//Napi::Object parentProxy = proxyFunc.New({ Napi::Object::New(env), ProxyHandler::get_proxy_handler(env) });

		auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
		//NAPI: remove these checks
		if (setPrototypeOfFunc.IsUndefined()) {
			throw std::runtime_error("no 'setPrototypeOf'");
		}

		/*
		auto getPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("getPrototypeOf").As<Napi::Function>();
		if (getPrototypeOfFunc.IsUndefined()) {
			throw std::runtime_error("no 'getPrototypeOf'");
		}

		
		Napi::Value rootObject = instance;
		while (!rootObject.IsNull() && !rootObject.IsEmpty() && !rootObject.IsUndefined()) {
			 Napi::Value proto = getPrototypeOfFunc.Call({ rootObject });
			 if (proto.IsObject()) {
				 Napi::Value protoParent = getPrototypeOfFunc.Call({ proto.As<Napi::Object>() });
				 if (protoParent.IsNull() || protoParent.IsUndefined()) {
					 break;
				 }
			 }
			 rootObject = proto;
		}

		//change the root of the prototype chain to be a JS Proxy instead of JS Object
		setPrototypeOfFunc.Call({ rootObject, parentProxy });
		*/

		auto instanceProxyFunc = env.Global().Get("Proxy").As<Napi::Function>();

		setPrototypeOfFunc.Call({ info.This(), instance });
		Napi::Object instanceProxy = proxyFunc.New({ info.This(), ProxyHandler::get_instance_proxy_handler(env) });
		
		instance.DefineProperty(Napi::PropertyDescriptor::Value("_instanceProxy", instanceProxy, napi_default)); //instance.Set("_instanceProxy", instanceProxy);
		return instanceProxy;
	}
	catch (std::exception & e) {
		throw Napi::Error::New(info.Env(), e.what());
	}
}

//NAPI: this should call create_instance_with_proxy_parent to get the whole js proto chain
template<typename ClassType>
Napi::Object WrappedObject<ClassType>::create_instance(Napi::Env env) {
	
	if (constructor.IsEmpty() || factory_constructor.IsEmpty()) {
		throw std::runtime_error("Class not initialized. Call init() first");
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
		//NAPI: JS or std error here?
		throw std::runtime_error("Class not initialized. Call init() first");
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
	//throw ReadOnlyError::New(info.Env(), "Cannot assign to read only property");
	//throw std::runtime_error("Cannot assign to read only property");
	throw ReadOnlyError("Cannot assign to read only property");
}

template<typename ClassType>
void WrappedObject<ClassType>::readonly_static_setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	//throw ReadOnlyError::New(info.Env(), "Cannot assign to read only property");
	throw ReadOnlyError("Cannot assign to read only property");
}

//template<typename ClassType>
//Napi::Value WrappedObject<ClassType>::ProxyHandler::get_proxy_handler(Napi::Env env) {
//	//NAPI: is caching this working
//	/*if (!proxyHandler.IsEmpty()) {
//		return proxyHandler.Value();
//	}*/
//
//	Napi::EscapableHandleScope scope(env);
//
//	Napi::Object proxyObj = Napi::Object::New(env);
//	Napi::PropertyDescriptor getTrapFunc = Napi::PropertyDescriptor::Function("get", getProxyTrap);
//	Napi::PropertyDescriptor setTrapFunc = Napi::PropertyDescriptor::Function("set", setProxyTrap);
//	proxyObj.DefineProperties({ getTrapFunc , setTrapFunc });
//
//	proxyHandler = Napi::Persistent(proxyObj);
//	return scope.Escape(proxyObj);
//}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_instance_proxy_handler(Napi::Env env) {
	Napi::EscapableHandleScope scope(env);

	Napi::Object proxyObj = Napi::Object::New(env);
	Napi::PropertyDescriptor instanceGetTrapFunc = Napi::PropertyDescriptor::Function("get", &WrappedObject<ClassType>::ProxyHandler::combinedGetProxyTrap);
	Napi::PropertyDescriptor instanceSetTrapFunc = Napi::PropertyDescriptor::Function("set", &WrappedObject<ClassType>::ProxyHandler::combinedSetProxyTrap);
	Napi::PropertyDescriptor ownKeysTrapFunc = Napi::PropertyDescriptor::Function("ownKeys", &WrappedObject<ClassType>::ProxyHandler::ownKeysProxyTrap);
	Napi::PropertyDescriptor hasTrapFunc = Napi::PropertyDescriptor::Function("has", &WrappedObject<ClassType>::ProxyHandler::hasProxyTrap);
	Napi::PropertyDescriptor getOwnPropertyDescriptorTrapFunc = Napi::PropertyDescriptor::Function("getOwnPropertyDescriptor", &WrappedObject<ClassType>::ProxyHandler::getOwnPropertyDescriptorTrap);
	Napi::PropertyDescriptor getPrototypeOfFunc = Napi::PropertyDescriptor::Function("getPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::getPrototypeofProxyTrap);
	Napi::PropertyDescriptor setPrototypeOfFunc = Napi::PropertyDescriptor::Function("setPrototypeOf", &WrappedObject<ClassType>::ProxyHandler::setPrototypeofProxyTrap);
	
	proxyObj.DefineProperties({ instanceGetTrapFunc, instanceSetTrapFunc, ownKeysTrapFunc, hasTrapFunc, getOwnPropertyDescriptorTrapFunc, getPrototypeOfFunc, setPrototypeOfFunc });
	
	return scope.Escape(proxyObj);

	//NAPI: version with function members

	/*Napi::Object proxyObj = Napi::Object::New(env);

	Napi::Function instanceGetTrapFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::combinedGetProxyTrap, "get");
	proxyObj.Set("get", instanceGetTrapFunc);

	Napi::Function instanceSetTrapFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::combinedSetProxyTrap, "set");
	proxyObj.Set("set", instanceSetTrapFunc);

	Napi::Function ownKeysTrapFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::ownKeysProxyTrap, "ownKeys");
	proxyObj.Set("ownKeys", ownKeysTrapFunc);

	Napi::Function hasTrapFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::hasProxyTrap, "has");
	proxyObj.Set("has", hasTrapFunc);

	Napi::Function getOwnPropertyDescriptorTrapFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::getOwnPropertyDescriptorTrap, "getOwnPropertyDescriptor");
	proxyObj.Set("getOwnPropertyDescriptor", getOwnPropertyDescriptorTrapFunc);

	Napi::Function getPrototypeOfFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::getPrototypeofProxyTrap, "getPrototypeOf");
	proxyObj.Set("getPrototypeOf", getPrototypeOfFunc);

	Napi::Function setPrototypeOfFunc = Napi::Function::New(env, &WrappedObject<ClassType>::ProxyHandler::setPrototypeofProxyTrap, "setPrototypeOf");
	proxyObj.Set("setPrototypeOf", setPrototypeOfFunc);

	
	return proxyObj;*/


}

//template<typename ClassType>
//Napi::Value WrappedObject<ClassType>::ProxyHandler::getProxyTrap(const Napi::CallbackInfo& info) {
//	Napi::Env env = info.Env();
//	Napi::EscapableHandleScope scope(env);
//
//	Napi::Object target = info[0].As<Napi::Object>();
//	auto tt = info[1].Type();
//	if (!info[1].IsString())	{
//		Napi::Value value = target.Get(info[1]);
//		return scope.Escape(value);
//	}
//
//	Napi::String property = info[1].As<Napi::String>();
//	std::string text = property;
//
//
//	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
//	if (instance.IsEmpty() || instance.IsUndefined() || instance.IsNull()) {
//		Napi::Value value = target.Get(info[1]);
//		return scope.Escape(value);
//	}
//
//	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
//	if (wrappedObject->m_indexPropertyHandlers == nullptr && wrappedObject->m_namedPropertyHandlers == nullptr) {
//		//Sanity check. get and set proxy callbacks should be called only when either an index or a named property handler is set
//		throw std::runtime_error("Internal error. No index or named property handler is set");
//	}
//
//
//	//if accessor is a number call index get handler
//	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
//		napi_value prop_value = property;
//		napi_value res;
//		napi_status status = napi_coerce_to_number(env, prop_value, &res);
//		if (status == napi_ok) {
//			int32_t index = -1;
//			status = napi_get_value_int32(env, res, &index);
//			if (status != napi_ok || index < 0) {
//				throw Napi::Error::New(info.Env(), "Index should be a positive integer number");
//			}
//
//			Napi::Value result = wrappedObject->m_indexPropertyHandlers->getter(info, index);
//			return scope.Escape(result);
//		}
//	}
//
//	//call accessor as named handler
//	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
//		Napi::Value result = wrappedObject->m_namedPropertyHandlers->getter(info, property);
//		return scope.Escape(result);
//	}
//
//	Napi::Value value = target.Get(info[1]);
//	return scope.Escape(value);
//}
//
//template<typename ClassType>
//Napi::Value WrappedObject<ClassType>::ProxyHandler::setProxyTrap(const Napi::CallbackInfo& info) {
//	Napi::Env env = info.Env();
//	Napi::EscapableHandleScope scope(env);
//
//	Napi::Object target = info[0].As<Napi::Object>();
//	Napi::String property = info[1].As<Napi::String>();
//	Napi::Value value = info[2];
//	std::string text = property;
//
//
//	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
//	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
//	if (wrappedObject->m_indexPropertyHandlers == nullptr && wrappedObject->m_namedPropertyHandlers == nullptr) {
//		//Sanity check. get and set proxy callbacks should be called only when either an index or a named property handler is set
//		throw Napi::Error::New(info.Env(), "Internal error. No index or named property handler is set");
//	}
//
//
//	//if accessor is a number call index handler
//	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
//		napi_value prop_value = property;
//		napi_value res;
//		napi_status status = napi_coerce_to_number(env, prop_value, &res);
//		if (status == napi_ok) {
//			int32_t index = -1;
//			status = napi_get_value_int32(env, res, &index);
//			if (status != napi_ok || index < 0) {
//				throw Napi::Error::New(info.Env(), "Index should be a positive integer number");
//			}
//
//			Napi::Value result = wrappedObject->m_indexPropertyHandlers->setter(info, index, value);
//			return scope.Escape(result);
//		}
//	}
//
//	//call accessor as named handler
//	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
//		Napi::Value result = wrappedObject->m_namedPropertyHandlers->setter(info, property, value);
//		return scope.Escape(result);
//	}
//
//	return scope.Escape(env.Undefined());
//}

//template<typename ClassType>
//Napi::Value WrappedObject<ClassType>::ProxyHandler::instanceGetProxyTrap(const Napi::CallbackInfo& info) {
//	Napi::Env env = info.Env();
//	Napi::EscapableHandleScope scope(env);
//
//	Napi::Object target = info[0].As<Napi::Object>();
//	Napi::Value arg1 = info[1];
//	if (!arg1.IsString()) {
//		Napi::Value value = target.Get(arg1);
//		return scope.Escape(value);
//	}
//
//	Napi::String property = arg1.As<Napi::String>();
//	std::string propertyName = property;
//
//	//NAPI: cache this function for performance 
//	auto getPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("getPrototypeOf").As<Napi::Function>();
//	if (getPrototypeOfFunc.IsUndefined()) {
//		throw std::runtime_error("no 'getPrototypeOf'");
//	}
//
//	Napi::Object targetPrototype = getPrototypeOfFunc.Call({ target }).As<Napi::Object>();
//
//
//	//NAPI: preserve a FunctionReference to this 'hasOwnProperty' function when creating the ProxyHandler and use that to optimize this call a bit
//	//this checks for property existence without trigering the get trap of index and named handlers
//	Napi::Boolean targetHasProperty = env.Global().Get("Object").As<Napi::Object>().Get("hasOwnProperty").As<Napi::Function>().Call(target, { property }).As<Napi::Boolean>();
//
//	if (!targetHasProperty)	{
//		Napi::Value propertyValue = targetPrototype.Get(propertyName);
//		
//		if (propertyValue.IsFunction()) {
//			Napi::Function bindFunc = propertyValue.As<Napi::Function>().Get("bind").As<Napi::Function>();
//			if (bindFunc.IsEmpty() || bindFunc.IsUndefined()) {
//				throw std::runtime_error("bind function not found on function " + propertyName);
//			}
//
//			Napi::Function boundFunc = bindFunc.Call(propertyValue, { targetPrototype }).As<Napi::Function>();
//			target.Set(propertyName, boundFunc);
//
//			return scope.Escape(boundFunc);
//		}
//
//		return scope.Escape(propertyValue);
//	}
//
//	Napi::Value propertyValue = target.Get(propertyName);
//	return scope.Escape(propertyValue);
//}

//inline static Napi::Object GetPrototype(Napi::Env env, const Napi::Object& object) {
//	auto getPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("getPrototypeOf").As<Napi::Function>();
//	if (getPrototypeOfFunc.IsUndefined()) {
//		throw std::runtime_error("no 'getPrototypeOf'");
//	}
//
//	Napi::Object instance = getPrototypeOfFunc.Call({ object }).As<Napi::Object>();
//	return instance;
//}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::combinedGetProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	//if its a function property return it
	bool handled = true;
	Napi::Value result = combinedGetProxyTrapHandleFunctions(info, &handled);
	if (handled) {
		return scope.Escape(result);
	}

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
	//NAPI: remove
	//WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::TryUnwrap(target);
	//if (wrappedObject->m_indexPropertyHandlers == nullptr && wrappedObject->m_namedPropertyHandlers == nullptr) {
	//	//Sanity check. get and set proxy callbacks should be called only when either an index or a named property handler is set
	//	//throw std::runtime_error("Internal error. No index or named property handler is set");
	//	Napi::Value value = target.Get(info[1]);
	//	return scope.Escape(value);
	//}


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

//Napi: this is handling not only bound functions but also decides if index and named handlers will be called. Make this as the default get Proxy trap and call index and named handlers from it
template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::combinedGetProxyTrapHandleFunctions(const Napi::CallbackInfo& info, bool* handled) {
	*handled = true;
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value arg1 = info[1];
	

	if (target.HasOwnProperty("_proto")) {
		Napi::Object proto = target.Get("_proto").As<Napi::Object>();
		//if the _proto prototype chain has the property return it
		if (proto.Has(arg1)) {
			Napi::Value propertyValue = proto.Get(arg1);
			return scope.Escape(propertyValue);
		}
	}

	//if the target prototype chain don't have the property return any value to allow named and index handlers to kick in
	if (!target.Has(arg1)) {
		*handled = false;
		return scope.Escape(env.Undefined());
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

	//NAPI: cache this function for performance 
	//NAPI: preserve a FunctionReference to this 'hasOwnProperty' function when creating the ProxyHandler and use that to optimize this call a bit
	//this checks for property existence without going up the proptotype chain.
	//NAPI: consider using target.HasOwnProperty()
	Napi::Boolean targetHasOwnProperty = env.Global().Get("Object").As<Napi::Object>().Get("hasOwnProperty").As<Napi::Function>().Call(target, { property }).As<Napi::Boolean>();

	if (targetHasOwnProperty) {
		Napi::Value propertyValue = target.Get(propertyName);
		return scope.Escape(propertyValue);
	}

	Napi::Value propertyValue = instance.Get(propertyName);

	//bind the function from the instance and set it on the target object. Napi does not work if a function is invoked with 'this' instance different than the class it is defined onto
	if (propertyValue.IsFunction()) {
		//do not bind the non native functions. These are attached from extensions.js and should be called on the instanceProxy.
		if (!m_has_native_methodFunc(propertyName)) {
			//return the function without binding it to the instance
			return scope.Escape(propertyValue);
		}

		Napi::Function bindFunc = propertyValue.As<Napi::Function>().Get("bind").As<Napi::Function>();
		if (bindFunc.IsEmpty() || bindFunc.IsUndefined()) {
			throw std::runtime_error("bind function not found on function " + propertyName);
		}

		Napi::Function boundFunc = bindFunc.Call(propertyValue, { instance }).As<Napi::Function>();
		target.Set(propertyName, boundFunc);

		return scope.Escape(boundFunc);
	}
	
	//return the non function property on the instance
	return scope.Escape(propertyValue);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::combinedSetProxyTrap(const Napi::CallbackInfo& info) {
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
				throw Napi::Error::New(info.Env(), e.what());
			}

			if (wrappedObject->m_indexPropertyHandlers->setter == nullptr) {
				std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
				throw Napi::Error::New(info.Env(), message);
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
		catch (const ReadOnlyError& e) {
			std::string message = "Cannot assign to read only property '" + propertyText + "'";
			throw Napi::Error::New(info.Env(), message);
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

	//skip symbols etc
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
		//Napi:: use napi_get_prototype
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
		throw std::runtime_error("no 'setPrototypeOf'");
	}

	//the factory function should have the same prototype property as the constructor.prototype so `instanceOf` works
	factory.Set("prototype", ctorPrototypeProperty);
	setPrototypeOfFunc.Call({ factory, ctor });

	WrappedObject<ClassType>::set_factory_constructor(factory);

	return factory;
}

//NAPI: revisit throw exceptions. if js or std exception should be thrown
template<typename ClassType>
Napi::Function ObjectWrap<ClassType>::init_class(Napi::Env env) {
	//check if the constructor is already created. It means this class and it's parent are already initialized.
	Napi::Function ctor = WrappedObject<ClassType>::get_constructor(env);
	if (!ctor.IsNull()) {
		return ctor;
	}

	std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>> properties;

	for (auto& pair : s_class.static_properties) {
		Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> statc_property = setup_static_property(env, pair.first, pair.second);
		properties.push_back(statc_property);
	}

	//Napi: setup properties and accessors on the class
	// Static properties are setup in create_constructor() because V8.
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

	Napi::Function parentCtor = ObjectWrapAccessor<ParentClassType>::init_class(env); //ObjectWrap<ParentClassType>::init_class(env);
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

//template<typename ClassType>
//inline v8::Local<v8::Object> ObjectWrap<ClassType>::create_instance(v8::Isolate* isolate, Internal* internal) {
//    Nan::EscapableHandleScope scope;
//
//    v8::Local<v8::FunctionTemplate> tpl = get_template();
//    v8::Local<v8::Object> instance = Nan::NewInstance(tpl->InstanceTemplate()).ToLocalChecked();
//
//    auto wrap = new ObjectWrap<ClassType>(internal);
//    wrap->Wrap(instance);
//
//    return scope.Escape(instance);
//}

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
	if (reinterpret_cast<void*>(ObjectWrap<ClassType>::s_class.constructor) != nullptr) {
		//NAPI: remove try catch commented code
		//try {
			auto arguments = get_arguments(info);
			node::Arguments args { info.Env(), arguments.size(), arguments.data() };
			s_class.constructor(info.Env(), info.This().As<Napi::Object>(), args);
			return Napi::Value(); //return a value to comply with Napi::FunctionCallback
		//}
		//catch (std::exception & e) {
			//throw Napi::Error::New(info.Env(), e.what());
			//throw std::runtime_error("Invalid arguments when constructing 'Realm'");
		//}
	}
	else {
		//return Napi::Value();
		throw std::runtime_error("Illegal constructor");
	}
}

template<typename ClassType>
bool ObjectWrap<ClassType>::has_native_method(const std::string& name) {
	if (s_nativeMethods.find(name) != s_nativeMethods.end()) {
		return true;
	}

	return ObjectWrap<ParentClassType>::has_native_method(name);
}



//template<typename ClassType>
//inline void ObjectWrap<ClassType>::setup_method(v8::Local<v8::FunctionTemplate> tpl, const std::string& name, Nan::FunctionCallback callback) {
//	v8::Local<v8::Signature> signature = Nan::New<v8::Signature>(tpl);
//	v8::Local<v8::FunctionTemplate> fn_tpl = Nan::New<v8::FunctionTemplate>(callback, v8::Local<v8::Value>(), signature);
//	v8::Local<v8::String> fn_name = Nan::New(name).ToLocalChecked();
//
//	// The reason we use this rather than Nan::SetPrototypeMethod is DontEnum.
//	tpl->PrototypeTemplate()->Set(fn_name, fn_tpl, v8::PropertyAttribute::DontEnum);
//	fn_tpl->SetClassName(fn_name);
//}

//NAPI: shouldn't this have the Readonly flag as well
template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	auto methodCallback = (WrappedObject<ClassType>::InstanceMethodCallback)(&WrappedObject<ClassType>::method_callback);
	s_nativeMethods.insert(name);
	return WrappedObject<ClassType>::InstanceMethod(name.c_str(), methodCallback, napi_default | realm::js::PropertyAttributes::DontEnum, (void*)callback);
}

//template<typename ClassType>
//inline void ObjectWrap<ClassType>::setup_static_method(v8::Local<v8::FunctionTemplate> tpl, const std::string &name, Nan::FunctionCallback callback) {
//    v8::Local<v8::FunctionTemplate> fn_tpl = Nan::New<v8::FunctionTemplate>(callback);
//    v8::Local<v8::String> fn_name = Nan::New(name).ToLocalChecked();
//
//    tpl->Set(fn_name, fn_tpl, v8::PropertyAttribute::DontEnum);
//    fn_tpl->SetClassName(fn_name);
//}
template<typename ClassType>
Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	return Napi::ObjectWrap<WrappedObject<ClassType>>::StaticMethod(name.c_str(), callback, napi_static | realm::js::PropertyAttributes::DontEnum);
}

//template<typename ClassType>
//template<typename TargetType>
//inline void ObjectWrap<ClassType>::setup_property(v8::Local<TargetType> target, const std::string &name, const PropertyType &property) {
//    v8::Local<v8::String> prop_name = Nan::New(name).ToLocalChecked();
//    v8::PropertyAttribute attributes = v8::PropertyAttribute(v8::DontEnum | v8::DontDelete);
//
//    Nan::SetAccessor(target, prop_name, property.getter, property.setter ? property.setter : set_readonly_property, v8::Local<v8::Value>(), v8::DEFAULT, attributes);
//}
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

//template<node::ArgumentsMethodType F>
//void wrap(const Nan::FunctionCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    auto arguments = node::get_arguments(info);
//    node::Arguments args{isolate, arguments.size(), arguments.data()};
//    node::ReturnValue return_value(info.GetReturnValue());
//
//    try {
//        F(isolate, info.This(), args, return_value);
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}

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
		//throw e;
	}
}

//template<node::PropertyType::GetterType F>
//void wrap(v8::Local<v8::String> property, const Nan::PropertyCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    node::ReturnValue return_value(info.GetReturnValue());
//    try {
//        F(isolate, info.This(), return_value);
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}
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


//template<node::PropertyType::SetterType F>
//void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, const Nan::PropertyCallbackInfo<void>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    try {
//        F(isolate, info.This(), value);
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}
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

//
//template<node::IndexPropertyType::GetterType F>
//void wrap(uint32_t index, const Nan::PropertyCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    node::ReturnValue return_value(info.GetReturnValue());
//    try {
//        F(isolate, info.This(), index, return_value);
//    }
//    catch (std::out_of_range &) {
//        // Out-of-bounds index getters should just return undefined in JS.
//        return_value.set_undefined();
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}
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

//template<node::IndexPropertyType::SetterType F>
//void wrap(uint32_t index, v8::Local<v8::Value> value, const Nan::PropertyCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    try {
//        if (F(isolate, info.This(), index, value)) {
//            // Indicate that the property was intercepted.
//            info.GetReturnValue().Set(value);
//        }
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}
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

//template<node::StringPropertyType::GetterType F>
//void wrap(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    node::ReturnValue return_value(info.GetReturnValue());
//    try {
//        F(isolate, info.This(), property, return_value);
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}
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

//template<node::StringPropertyType::SetterType F>
//void wrap(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
//    v8::Isolate* isolate = info.GetIsolate();
//    try {
//        if (F(isolate, info.This(), property, value)) {
//            // Indicate that the property was intercepted.
//            info.GetReturnValue().Set(value);
//        }
//    }
//    catch (std::exception &e) {
//        Nan::ThrowError(node::Exception::value(isolate, e));
//    }
//}

//Napi: all Setters should return true
template<node::StringPropertyType::SetterType F>
//Napi::Value wrap(const Napi::String& property, const Napi::Value& value, const Napi::CallbackInfo& info) {
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

//template<node::StringPropertyType::EnumeratorType F>
//void wrap(const v8::PropertyCallbackInfo<v8::Array>& info) {
//    auto names = F(info.GetIsolate(), info.This());
//    int count = (int)names.size();
//    v8::Local<v8::Array> array = Nan::New<v8::Array>(count);
//
//    for (int i = 0; i < count; i++) {
//        Nan::Set(array, i, v8::Local<v8::String>(names[i]));
//    }
//
//    info.GetReturnValue().Set(array);
//}

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
