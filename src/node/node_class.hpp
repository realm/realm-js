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
	//Napi: This is called when ObjectWrap<ClassType> objects are created from JS. This is the new "construct" method. 
	WrappedObject(const Napi::CallbackInfo& info);
	static Napi::Value create_instance_with_proxy_parent(const Napi::CallbackInfo& info);

	static Napi::Function init(Napi::Env env, const std::string& name, node::Types::FunctionCallback constructor_callback, const std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties, const IndexPropertyType* indexPropertyHandlers = nullptr, const StringPropertyType* namedPropertyHandlers = nullptr);

	//NAPI: remove if not used
	//static Napi::Function create_proxy(Napi::Env env);

	static Napi::Object create_instance(Napi::Env env);
	
	static bool is_instance(Napi::Env env, const Napi::Object& object);

	Internal* get_internal();
	void set_internal(Internal* internal);

	Napi::Value method_callback(const Napi::CallbackInfo& info);
	Napi::Value getter_callback(const Napi::CallbackInfo& info);
	Napi::Value setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value);


private:
	std::unique_ptr<Internal> m_internal;
	static Napi::FunctionReference constructor;
	static IndexPropertyType* m_indexPropertyHandlers;
	static StringPropertyType* m_namedPropertyHandlers;

	class ProxyHandler {
		public:
			static Napi::Value get_proxy_handler(Napi::Env env);
		
		private:
			static Napi::ObjectReference proxyHandler;
		
			static Napi::Value getProxyTrap(const Napi::CallbackInfo& info);
			static Napi::Value setProxyTrap(const Napi::CallbackInfo& info);
		};
		
	//NAPI: remove if not needed
	//static Napi::FunctionReference constructorProxy;
};

template<typename ClassType>
Napi::FunctionReference WrappedObject<ClassType>::constructor;

template<typename ClassType>
IndexPropertyType* WrappedObject<ClassType>::m_indexPropertyHandlers;

template<typename ClassType>
StringPropertyType* WrappedObject<ClassType>::m_namedPropertyHandlers;

template<typename ClassType>
Napi::ObjectReference WrappedObject<ClassType>::ProxyHandler::proxyHandler;

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
	
	//Gives access to ObjectWrap<ClassType> init _class private static member. See https://stackoverflow.com/a/40937193
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

    static void get_indexes(const Nan::PropertyCallbackInfo<v8::Array>&);
    static void set_property(v8::Local<v8::String>, v8::Local<v8::Value>, const v8::PropertyCallbackInfo<v8::Value>&);

    static void set_readonly_property(v8::Local<v8::String> property, v8::Local<v8::Value> value, const Nan::PropertyCallbackInfo<void>& info) {
        std::string message = std::string("Cannot assign to read only property '") + std::string(String(property)) + "'";
        Nan::ThrowError(message.c_str());
    }

    static void set_readonly_index(uint32_t index, v8::Local<v8::Value> value, const Nan::PropertyCallbackInfo<v8::Value>& info) {
        std::string message = std::string("Cannot assign to read only index ") + util::to_string(index);
        Nan::ThrowError(message.c_str());
    }

    static void get_nonexistent_property(v8::Local<v8::String>, const v8::PropertyCallbackInfo<v8::Value>&) {
        // Do nothing. This function exists only to prevent a crash where it is used.
    }

	/*struct PropertyDescriptorData {
		std::string name = {};
		uint32_t index = {};
	};*/
};

template<>
class ObjectWrap<void> {
  public:
    using Internal = void;

    /*static v8::Local<v8::FunctionTemplate> get_template() {
        return v8::Local<v8::FunctionTemplate>();
    }*/

	static Napi::Function create_constructor(Napi::Env env) {
		return Napi::Function();
	}

	static Napi::Function init_class(Napi::Env env) {
		return Napi::Function();
	}
};

//Gives access to ObjectWrap<ClassType> init _class private static member. See https://stackoverflow.com/a/40937193
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

static inline node::Arguments get_arguments(const Napi::CallbackInfo& info) {
	size_t count = info.Length();
	std::vector<Napi::Value> arguments;
	arguments.reserve(count);

	for (int i = 0; i < count; i++) {
		arguments.push_back(info[i]);
	}

	node::Arguments args{ info.Env(), count, arguments.data() };

	return args;
}

// The static class variable must be defined as well.
template<typename ClassType>
ClassType ObjectWrap<ClassType>::s_class;

template<typename ClassType>
WrappedObject<ClassType>::WrappedObject(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WrappedObject<ClassType>>(info) {
	if (!info.IsConstructCall()) {
		Napi::Error::New(info.Env(), "Constructor must be called with new").ThrowAsJavaScriptException();
	}

	node::Types::FunctionCallback constructor_callback = (node::Types::FunctionCallback)info.Data();
	constructor_callback(info);
}

template<typename ClassType>
Napi::Function WrappedObject<ClassType>::init(Napi::Env env, const std::string& name, node::Types::FunctionCallback constructor_callback, const std::vector<Napi::ClassPropertyDescriptor<WrappedObject<ClassType>>>& properties, const IndexPropertyType* indexPropertyHandlers = nullptr, const StringPropertyType* namedPropertyHandlers = nullptr) {
	Napi::EscapableHandleScope scope(env);

	//Napi: internal field should be set as last argument
	Napi::Function ctor = Napi::ObjectWrap<WrappedObject<ClassType>>::DefineClass(env, name.c_str(), properties, (void*)constructor_callback);
	
	constructor = Napi::Persistent(ctor);
	constructor.SuppressDestruct();

	m_indexPropertyHandlers = const_cast<IndexPropertyType*>(indexPropertyHandlers);
	m_namedPropertyHandlers = const_cast<StringPropertyType*>(namedPropertyHandlers);

	return scope.Escape(ctor).As<Napi::Function>();
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
template<typename ClassType>
Napi::Value WrappedObject<ClassType>::create_instance_with_proxy_parent(const Napi::CallbackInfo& info) {
	if (constructor.IsEmpty()) {
		throw std::runtime_error("Class not initialized. Call init() first");
	}

	if (!info.IsConstructCall()) {
		throw std::runtime_error("This function should be called as a constructor");
	}

	Napi::Env env = info.Env();
	Napi::HandleScope scope(env);

	//NAPI: pass the arguments here as well
	Napi::Object instance = constructor.New({});


	auto proxyFunc = env.Global().Get("Proxy").As<Napi::Function>();
	Napi::Object parentProxy = proxyFunc.New({ Napi::Object::New(env), ProxyHandler::get_proxy_handler(env) });


	auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
	if (setPrototypeOfFunc.IsEmpty()) {
		throw std::runtime_error("no 'setPrototypeOf'");
	}
	
	auto getPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("getPrototypeOf").As<Napi::Function>();
	if (getPrototypeOfFunc.IsEmpty()) {
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

	return instance;
}

template<typename ClassType>
Napi::Object WrappedObject<ClassType>::create_instance(Napi::Env env) {
	if (constructor.IsEmpty()) {
		throw std::runtime_error("Class not initialized. Call init() first");
	}

	Napi::Object instance = constructor.New({});
	return instance;
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
Napi::Value WrappedObject<ClassType>::setter_callback(const Napi::CallbackInfo& info, const Napi::Value& value) {
	PropertyType* propertyType = (PropertyType*)info.Data();
	return propertyType->setter(info, value);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::get_proxy_handler(Napi::Env env) {
	//NAPI: possibly enable a JS proxy handler impl in debug
	//return env.Global().Get("realmHandler");

	if (!proxyHandler.IsEmpty()) {
		return proxyHandler.Value();
	}

	Napi::EscapableHandleScope scope(env);

	Napi::Object proxyObj = Napi::Object::New(env);
	Napi::PropertyDescriptor getTrapFunc = Napi::PropertyDescriptor::Function("get", getProxyTrap);
	Napi::PropertyDescriptor setTrapFunc = Napi::PropertyDescriptor::Function("set", setProxyTrap);
	proxyObj.DefineProperties({ getTrapFunc , setTrapFunc });

	proxyHandler = Napi::Persistent(proxyObj);
	return scope.Escape(proxyObj);
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::getProxyTrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::String property = info[1].As<Napi::String>();
	std::string text = property;


	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
	if (wrappedObject->m_indexPropertyHandlers == nullptr && wrappedObject->m_namedPropertyHandlers == nullptr) {
		//Sanity check. get and set proxy callbacks should be called only when either an index or a named property handler is set
		Napi::Error::New(info.Env(), "Internal error. No index or named property handler is set").ThrowAsJavaScriptException();
	}


	//if accessor is a number call index get handler
	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		napi_value prop_value = property;
		napi_value res;
		napi_status status = napi_coerce_to_number(env, prop_value, &res);
		if (status == napi_ok) {
			int32_t index = -1;
			status = napi_get_value_int32(env, res, &index);
			if (status != napi_ok || index < 0) {
				Napi::Error::New(info.Env(), "Index should be a positive integer number").ThrowAsJavaScriptException();
			}

			Napi::Value result = wrappedObject->m_indexPropertyHandlers->getter(info, index);
			return scope.Escape(result);
		}
	}

	//call accessor as named handler
	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Value result = wrappedObject->m_namedPropertyHandlers->getter(info, property);
		return scope.Escape(result);
	}

	return scope.Escape(env.Undefined());
}

template<typename ClassType>
Napi::Value WrappedObject<ClassType>::ProxyHandler::setProxyTrap(const Napi::CallbackInfo& info) {
	/*Napi::Object target = info[0].As<Napi::Object>();
	Napi::Value property = info[1];
	Napi::Value value = info[2];
	target.Set(property, value);*/

	Napi::Env env = info.Env();
	Napi::EscapableHandleScope scope(env);

	Napi::Object target = info[0].As<Napi::Object>();
	Napi::String property = info[1].As<Napi::String>();
	Napi::Value value = info[2];
	std::string text = property;


	Napi::Object instance = target.Get("_instance").As<Napi::Object>();
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
	if (wrappedObject->m_indexPropertyHandlers == nullptr && wrappedObject->m_namedPropertyHandlers == nullptr) {
		//Sanity check. get and set proxy callbacks should be called only when either an index or a named property handler is set
		Napi::Error::New(info.Env(), "Internal error. No index or named property handler is set").ThrowAsJavaScriptException();
	}


	//if accessor is a number call index handler
	if (wrappedObject->m_indexPropertyHandlers != nullptr) {
		napi_value prop_value = property;
		napi_value res;
		napi_status status = napi_coerce_to_number(env, prop_value, &res);
		if (status == napi_ok) {
			int32_t index = -1;
			status = napi_get_value_int32(env, res, &index);
			if (status != napi_ok || index < 0) {
				Napi::Error::New(info.Env(), "Index should be a positive integer number").ThrowAsJavaScriptException();
			}

			Napi::Value result = wrappedObject->m_indexPropertyHandlers->setter(info, index, value);
			return scope.Escape(result);
		}
	}

	//call accessor as named handler
	if (wrappedObject->m_namedPropertyHandlers != nullptr) {
		Napi::Value result = wrappedObject->m_namedPropertyHandlers->setter(info, property, value);
		return scope.Escape(result);
	}

	return scope.Escape(env.Undefined());
}

template<typename ClassType>
inline Napi::Function ObjectWrap<ClassType>::create_constructor(Napi::Env env) {
	Napi::Function ctor = init_class(env);
	
	bool hasHandlers = s_class.index_accessor.getter || s_class.index_accessor.setter || s_class.string_accessor.getter || s_class.string_accessor.setter;

	if (!hasHandlers) {
		return ctor;
	}

	//since NAPI ctors can't change the returned type we need to return a factory func which will be called when 'new ctor()' is called from JS. 
	//This will create a JS Proxy on top of the prototype chain of that instance and return the instance to the caller. The proxy is needed to support named and index handlers
	Napi::Function factory = Napi::Function::New(env, WrappedObject<ClassType>::create_instance_with_proxy_parent, s_class.name);
	auto ctorPrototypeProperty = ctor.Get("prototype");
	auto factoryPrototypeProperty = factory.Get("prototype");
	auto setPrototypeOfFunc = env.Global().Get("Object").As<Napi::Object>().Get("setPrototypeOf").As<Napi::Function>();
	if (setPrototypeOfFunc.IsEmpty()) {
		throw std::runtime_error("no 'setPrototypeOf'");
	}

	setPrototypeOfFunc.Call({ factoryPrototypeProperty, ctorPrototypeProperty });
	setPrototypeOfFunc.Call({ factory, ctor });

	return factory;
}

//NAPI: revisit throw exceptions. if js or std exception should be thrown
template<typename ClassType>
Napi::Function ObjectWrap<ClassType>::init_class(Napi::Env env) {
	Napi::EscapableHandleScope scope(env);

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

	//Napi: named and index handlers are setup in create_constructor where either a constructor or a constructor with proxy parent is returned. The proxy handles the index and named properties callbacks
	//if (s_class.index_accessor.getter) {
	//	auto& index_accessor = s_class.index_accessor;
	//	Nan::SetIndexedPropertyHandler(instance_tpl, index_accessor.getter, index_accessor.setter ? index_accessor.setter : set_readonly_index, 0, 0, get_indexes);
	//}

	//if (s_class.string_accessor.getter || s_class.index_accessor.getter || s_class.index_accessor.setter) {
	//	// Use our own wrapper for the setter since we want to throw for negative indices.
	//	auto& string_accessor = s_class.string_accessor;
	//	instance_tpl->SetNamedPropertyHandler(string_accessor.getter ? string_accessor.getter : get_nonexistent_property, set_property, 0, 0, string_accessor.enumerator);
	//}

	bool has_index_accessor = (s_class.index_accessor.getter || s_class.index_accessor.setter);
	const IndexPropertyType* index_accessor = has_index_accessor ? &s_class.index_accessor : nullptr;

	bool has_string_accessor = (s_class.string_accessor.getter || s_class.string_accessor.setter);
	const StringPropertyType* string_accessor = has_string_accessor ? &s_class.string_accessor : nullptr;
	
	Napi::Function ctor = WrappedObject<ClassType>::init(env, s_class.name, &ObjectWrap<ClassType>::constructor_callback, properties, index_accessor, string_accessor);

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

	return scope.Escape(ctor).As<Napi::Function>();
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

	Napi::Object instance = WrappedObject<ClassType>::create_instance(env);
	if (internal) {
		WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(instance);
		wrappedObject->set_internal(internal);
	}
	
    return scope.Escape(instance).As<Napi::Object>();
}

template<typename ClassType>
inline bool ObjectWrap<ClassType>::is_instance(Napi::Env env, const Napi::Object& object) {
	return WrappedObject<ClassType>::is_instance(env, object);
}

template<typename ClassType>
typename ClassType::Internal* ObjectWrap<ClassType>::get_internal(const Napi::Object& object) {
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(object);
	return wrappedObject->get_internal();
}

template<typename ClassType>
void ObjectWrap<ClassType>::set_internal(const Napi::Object& object, typename ClassType::Internal* internal) {
	WrappedObject<ClassType>* wrappedObject = WrappedObject<ClassType>::Unwrap(object);
	wrappedObject->set_internal(internal);
}

template<typename ClassType>
Napi::Value ObjectWrap<ClassType>::constructor_callback(const Napi::CallbackInfo& info) {
	if (reinterpret_cast<void*>(ObjectWrap<ClassType>::s_class.constructor) != nullptr) {
		try {
			auto arguments = get_arguments(info);
			s_class.constructor(info.Env(), info.This().As<Napi::Object>(), arguments);
			return Napi::Value();
		}
		catch (std::exception & e) {
			Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
		}
	}
	else {
		Napi::Error::New(info.Env(), "Illegal constructor").ThrowAsJavaScriptException();
	}
}


//Napi: not needed using create_constructor only
//template<typename ClassType>
//inline v8::Local<v8::FunctionTemplate> ObjectWrap<ClassType>::create_template() {
//	Nan::EscapableHandleScope scope;
//
//	v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(construct);
//	v8::Local<v8::ObjectTemplate> instance_tpl = tpl->InstanceTemplate();
//	v8::Local<v8::String> name = Nan::New(s_class.name).ToLocalChecked();
//
//	tpl->SetClassName(name);
//	instance_tpl->SetInternalFieldCount(1);
//
//	v8::Local<v8::FunctionTemplate> super_tpl = ObjectWrap<ParentClassType>::get_template();
//	if (!super_tpl.IsEmpty()) {
//		tpl->Inherit(super_tpl);
//	}
//
//	// Static properties are setup in create_constructor() because V8.
//	for (auto& pair : s_class.static_methods) {
//		setup_static_method(tpl, pair.first, pair.second);
//	}
//	for (auto& pair : s_class.methods) {
//		setup_method(tpl, pair.first, pair.second);
//	}
//	for (auto& pair : s_class.properties) {
//		setup_property<v8::ObjectTemplate>(instance_tpl, pair.first, pair.second);
//	}
//
//	if (s_class.index_accessor.getter) {
//		auto& index_accessor = s_class.index_accessor;
//		Nan::SetIndexedPropertyHandler(instance_tpl, index_accessor.getter, index_accessor.setter ? index_accessor.setter : set_readonly_index, 0, 0, get_indexes);
//	}
//	if (s_class.string_accessor.getter || s_class.index_accessor.getter || s_class.index_accessor.setter) {
//		// Use our own wrapper for the setter since we want to throw for negative indices.
//		auto& string_accessor = s_class.string_accessor;
//		instance_tpl->SetNamedPropertyHandler(string_accessor.getter ? string_accessor.getter : get_nonexistent_property, set_property, 0, 0, string_accessor.enumerator);
//	}
//
//	return scope.Escape(tpl);
//}

//template<typename ClassType>
//static void ObjectWrap<ClassType>::setup_prototype(Napi::Env env, const Napi::Function& constructor) {
//	Napi::Function parentCtor = ObjectWrap<ParentClassType>::create_constructor(env);
//	if (parentCtor.IsEmpty()) {
//		return;
//	}
//
//	auto ctorPrototype = constructor.Get("prototype");
//	if (ctorPrototype.IsEmpty()) {
//		throw std::runtime_error("no prototype property on class");
//	}
//
//	Napi::Value parentCtorPrototype = parentCtor.Get("prototype");
//	if (parentCtorPrototype.IsEmpty()) {
//		throw std::runtime_error("no prototype property on parent class");
//	}
//
//	Napi::Object globalObject = env.Global().Get("Object").As<Napi::Object>()
//	if (globalObject.IsEmpty()) {
//		throw std::runtime_error("no global object");
//	}
//
//	Napi::Function setPrototypeOfFunc = globalObject.Get("setPrototypeOf").As<Napi::Function>();
//	if (setPrototypeOfFunc.IsEmpty()) {
//		throw std::runtime_error("no setPrototypeOf function on global object");
//	}
//
//	try {
//		setPrototypeOfFunc.Call({ ctorPrototype, parentCtorPrototype });
//		setPrototypeOfFunc.Call({ ctor, parentCtor });
//	}
//	catch (const Napi::Error& e) {
//		throw node::Exception(env, e.Message());
//	}
//}


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
template<typename ClassType>
inline Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	auto methodCallback = (WrappedObject<ClassType>::InstanceMethodCallback)(&WrappedObject<ClassType>::method_callback);
	return WrappedObject<ClassType>::InstanceMethod(name.c_str(), methodCallback, napi_static, (void*)callback);
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
inline Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_method(Napi::Env env, const std::string& name, node::Types::FunctionCallback callback) {
	return Napi::ObjectWrap<WrappedObject<ClassType>>::StaticMethod(name.c_str(), callback, napi_static);
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
inline Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_property(Napi::Env env, const std::string& name, const PropertyType& property) {
	napi_property_attributes napi_attributes = napi_default | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);
	
	auto getterCallback = (WrappedObject<ClassType>::InstanceGetterCallback)(&WrappedObject<ClassType>::getter_callback);
	auto setterCallback = (WrappedObject<ClassType>::InstanceSetterCallback)(&WrappedObject<ClassType>::setter_callback);
	return WrappedObject<ClassType>::InstanceAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, (void*)&property);
}

template<typename ClassType>
inline Napi::ClassPropertyDescriptor<WrappedObject<ClassType>> ObjectWrap<ClassType>::setup_static_property(Napi::Env env, const std::string& name, const PropertyType& property) {
	napi_property_attributes napi_attributes = napi_static | (realm::js::PropertyAttributes::DontEnum | realm::js::PropertyAttributes::DontDelete);

	auto getterCallback = (WrappedObject<ClassType>::StaticGetterCallback)(property.getter);
	auto setterCallback = (WrappedObject<ClassType>::StaticSetterCallback)(property.setter);

	return WrappedObject<ClassType>::StaticAccessor(name.c_str(), getterCallback, setterCallback, napi_attributes, nullptr);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::get_indexes(const Nan::PropertyCallbackInfo<v8::Array>& info) {
    uint32_t length;
    try {
        length = Object::validated_get_length(info.GetIsolate(), info.This());
    }
    catch (std::exception &) {
        // Enumerating properties should never throw an exception.
        return;
    }

    v8::Local<v8::Array> array = Nan::New<v8::Array>(length);
    for (uint32_t i = 0; i < length; i++) {
        Nan::Set(array, i, Nan::New(i));
    }

    info.GetReturnValue().Set(array);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::set_property(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<v8::Value>& info) {
    if (s_class.index_accessor.getter || s_class.index_accessor.setter) {
        try {
            // Negative indices are passed into this string property interceptor, so check for them here.
            validated_positive_index(node::String(property));
        }
        catch (std::out_of_range &e) {
            Nan::ThrowError(Exception::value(info.GetIsolate(), e));
            return;
        }
        catch (std::invalid_argument &) {
            // Property is not a number.
        }
    }
    if (auto string_setter = s_class.string_accessor.setter) {
        string_setter(property, value, info);
    }
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
	auto args = node::get_arguments(info);
	node::ReturnValue result(env);

	try {
		F(env, info.This().As<Napi::Object>(), args, result);
		return result.ToValue();
	}
	catch (std::exception& e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::Value& value) {
	Napi::Env env = info.Env();

    try {
		F(env, info.This().As<Napi::Object>(), value);
		return Napi::Value::From(env, env.Undefined());
    }
    catch (std::exception& e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info, uint32_t index) {
	Napi::Env env = info.Env();
    node::ReturnValue result(env);

	try {
		try {
			F(env, info.This().As<Napi::Object>(), index, result);
			return result.ToValue();
		}
		catch (std::out_of_range&) {
			// Out-of-bounds index getters should just return undefined in JS.
			result.set_undefined();
		}
	}
    catch (std::exception &e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info, uint32_t index, const Napi::Value& value) {
	Napi::Env env = info.Env();

    try {
		bool success = F(env, info.This().As<Napi::Object>(), index, value);
		
		// Indicate that the property was intercepted.
		return Napi::Value::From(env, success);
    }
    catch (std::exception &e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::String& property) {
	Napi::Env env = info.Env();
	node::ReturnValue result(env);
	
	try {
        F(env, info.This().As<Napi::Object>(), property, result);
		return result.ToValue();
    }
    catch (std::exception &e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info, const Napi::String& property, const Napi::Value& value) {
	Napi::Env env = info.Env();
    try {
		bool success = F(env, info.This().As<Napi::Object>(), property, value);
		
		// Indicate that the property was intercepted.
		return Napi::Value::From(env, success);
    }
    catch (std::exception &e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
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
Napi::Value wrap(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
    
	try {
		auto names = F(env, info.This().As<Napi::Object>());

		int count = (int)names.size();
		Napi::Array array = Napi::Array::New(env, count);
		for (int i = 0; i < count; i++) {
			array.Set(i, names[i]);
		}

		return array;
	}
	catch (std::exception & e) {
		Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
	}
}

} // js
} // realm
