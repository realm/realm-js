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

#include "jsc_types.hpp"

#include "js_class.hpp"
#include "js_util.hpp"

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
namespace jsc {

extern js::Protected<JSObjectRef> ObjectDefineProperty;
extern js::Protected<JSObjectRef> FunctionPrototype;
extern js::Protected<JSObjectRef> RealmObjectClassConstructor;
extern js::Protected<JSObjectRef> RealmObjectClassConstructorPrototype;

static inline void jsc_class_init(JSContextRef ctx, JSObjectRef globalObject) {
    //handle ReactNative app refresh by reseting the cached constructor values
    if (RealmObjectClassConstructor) {
        RealmObjectClassConstructor = js::Protected<JSObjectRef>();
    }

    if (RealmObjectClassConstructorPrototype) {
        RealmObjectClassConstructorPrototype = js::Protected<JSObjectRef>();
    }

    JSValueRef value = nullptr;
    value = jsc::Object::get_property(ctx, globalObject, "Object");
    JSObjectRef objectClass = jsc::Value::to_object(ctx, value);

    value = jsc::Object::get_property(ctx, objectClass, "defineProperty");
    ObjectDefineProperty = js::Protected<JSObjectRef>(ctx, Value::to_object(ctx, value));

    value = jsc::Object::get_property(ctx, globalObject, "Function");
    JSObjectRef globalFunction = jsc::Value::to_object(ctx, value);
    value = jsc::Object::get_property(ctx, globalFunction, "prototype");
    FunctionPrototype = js::Protected<JSObjectRef>(ctx, Value::to_object(ctx, value));
}

template<typename T>
using ClassDefinition = js::ClassDefinition<Types, T>;

using ConstructorType = js::ConstructorType<Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<Types>;
using Arguments = js::Arguments<Types>;
using PropertyType = js::PropertyType<Types>;
using IndexPropertyType = js::IndexPropertyType<Types>;
using StringPropertyType = js::StringPropertyType<Types>;
using MethodMap = js::MethodMap<Types>;
using PropertyMap = js::PropertyMap<Types>;

struct SchemaObjectType {
	JSObjectRef constructor;
};

template<typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
    static JSObjectRef create_instance(JSContextRef ctx, Internal* internal = nullptr) {
        return JSObjectMake(ctx, get_class(), new ObjectWrap<ClassType>(internal));
    }

    static JSObjectRef create_instance_by_schema(JSContextRef ctx, JSObjectRef& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal* internal = nullptr);

    static JSObjectRef create_constructor(JSContextRef ctx) {
        bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
        if (isRealmObjectClass) {
             if (RealmObjectClassConstructor) {
                 return RealmObjectClassConstructor;
             }

            JSObjectRef constructor = JSObjectMake(ctx, get_constructor_class(ctx), nullptr);
            RealmObjectClassConstructor = js::Protected<JSObjectRef>(ctx, constructor);
            
            JSValueRef value = Object::get_property(ctx, RealmObjectClassConstructor, "prototype");
            RealmObjectClassConstructorPrototype = js::Protected<JSObjectRef>(ctx, Value::to_object(ctx, value));

            return RealmObjectClassConstructor;
        }
        
        return JSObjectMake(ctx, get_constructor_class(ctx), nullptr);
    }

    static JSClassRef get_class() {
        if (m_Class != nullptr) {
            return m_Class;
        }

        JSClassRef js_class = create_class();
        m_Class = JSClassRetain(js_class);
        return m_Class;
    }

    static JSClassRef get_constructor_class(JSContextRef ctx) {
        if (m_constructorClass != nullptr) {
            return m_constructorClass;
        }

        JSClassRef js_class = create_constructor_class();
        m_constructorClass = JSClassRetain(js_class);
        return m_constructorClass;
    }

    static bool has_instance(JSContextRef ctx, JSValueRef value);

    ObjectWrap<ClassType>& operator=(Internal* object) {
        if (m_object.get() != object) {
            m_object = std::unique_ptr<Internal>(object);
        }
        return *this;
    }

    static Internal* get_internal(JSContextRef ctx, const JSObjectRef &object);

    static void on_context_destroy(JSContextRef ctx, std::string realmPath);

  private:
    static ClassType s_class;
    static std::unordered_map<std::string, std::unordered_map<std::string, SchemaObjectType*>*> s_schemaObjectTypes;

    std::unique_ptr<Internal> m_object;
    
    static JSClassRef m_constructorClass;
    static JSClassRef m_Class;
    static JSClassRef m_internalValueClass;
    static JSClassRef m_getterAccessorClass;
    static JSClassRef m_setterAccessorClass;
    static JSClassRef m_NativePropertyGetterClass;

    ObjectWrap(Internal* object = nullptr) : m_object(object) {}

    static JSClassRef create_constructor_class();
    static JSClassRef create_class();

    static std::vector<JSStaticFunction> get_methods(const MethodMap &);
    static std::vector<JSStaticValue> get_properties(const PropertyMap &);

    static JSValueRef call(JSContextRef, JSObjectRef, JSObjectRef, size_t, const JSValueRef[], JSValueRef*);
    static JSObjectRef construct(JSContextRef, JSObjectRef, size_t, const JSValueRef[], JSValueRef*);
    static void initialize_constructor(JSContextRef, JSObjectRef);
    static void finalize(JSObjectRef);
    static void get_property_names(JSContextRef, JSObjectRef, JSPropertyNameAccumulatorRef);
    static JSValueRef get_property(JSContextRef, JSObjectRef, JSStringRef, JSValueRef*);
    static bool set_property(JSContextRef, JSObjectRef, JSStringRef, JSValueRef, JSValueRef*);

    static bool has_instance(JSContextRef ctx, JSObjectRef constructor, JSValueRef value, JSValueRef* exception);

    static bool set_readonly_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
        *exception = Exception::value(ctx, std::string("Cannot assign to read only property '") + std::string(String(property)) + "'");
        return false;
    }

    static void set_internal_property(JSContextRef ctx, JSObjectRef &instance, typename ClassType::Internal* internal);
    
    static void define_schema_properties(JSContextRef ctx, JSObjectRef constructorPrototype, const realm::ObjectSchema& schema, bool redefine);
    static void define_accessor_for_schema_property(JSContextRef ctx, JSObjectRef& target, jsc::String* name);
    static void define_native_property_accessor(JSContextRef ctx, JSObjectRef& target, jsc::String* name, JSObjectGetPropertyCallback getCallback);
    static  JSValueRef native_property_getter_callback(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception);
    static JSValueRef accessor_getter(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception);
    static JSValueRef accessor_setter(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception);
};

template<>
class ObjectWrap<void> {
public:
    using Internal = void;
    
    static JSClassRef get_class() {
        return nullptr;
    }
};
    
// The static class variable must be defined as well.
template<typename ClassType>
ClassType ObjectWrap<ClassType>::s_class;

template<typename ClassType>
std::unordered_map<std::string, std::unordered_map<std::string, SchemaObjectType*>*> ObjectWrap<ClassType>::s_schemaObjectTypes;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_getterAccessorClass = nullptr;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_setterAccessorClass = nullptr;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_NativePropertyGetterClass = nullptr;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_internalValueClass = nullptr;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_Class = nullptr;

template<typename ClassType>
JSClassRef ObjectWrap<ClassType>::m_constructorClass = nullptr;

template<typename ClassType>
inline JSClassRef ObjectWrap<ClassType>::create_class() {
    JSClassDefinition definition = kJSClassDefinitionEmpty;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> properties;

    definition.parentClass = ObjectWrap<ParentClassType>::get_class();
    definition.className = s_class.name.c_str();
    definition.finalize = finalize;

    if (!s_class.methods.empty()) {
        methods = get_methods(s_class.methods);
        definition.staticFunctions = methods.data();
    }
    if (!s_class.properties.empty()) {
        properties = get_properties(s_class.properties);
        definition.staticValues = properties.data();
    }

    if (s_class.index_accessor.getter || s_class.string_accessor.getter) {
        definition.getProperty = get_property;
        definition.setProperty = set_property;
    }
    else if (s_class.index_accessor.setter || s_class.string_accessor.setter) {
        definition.setProperty = set_property;
    }

    if (s_class.index_accessor.getter || s_class.string_accessor.enumerator) {
        definition.getPropertyNames = get_property_names;
    }

    return JSClassCreate(&definition);
}

template<typename ClassType>
inline JSClassRef ObjectWrap<ClassType>::create_constructor_class() {
    JSClassDefinition definition = kJSClassDefinitionEmpty;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> properties;

    definition.attributes = kJSClassAttributeNoAutomaticPrototype;
    definition.className = "Function";
    definition.initialize = initialize_constructor;
    definition.hasInstance = has_instance;

    // This must be set for `typeof constructor` to be 'function'.
    definition.callAsFunction = call;

    if (reinterpret_cast<void*>(s_class.constructor)) {
        definition.callAsConstructor = construct;
    }
    if (!s_class.static_methods.empty()) {
        methods = get_methods(s_class.static_methods);
        definition.staticFunctions = methods.data();
    }
    if (!s_class.static_properties.empty()) {
        properties = get_properties(s_class.static_properties);
        definition.staticValues = properties.data();
    }

    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    if (isRealmObjectClass) {
        if (m_internalValueClass == nullptr) {
            JSClassDefinition internalValueClassDefinition = kJSClassDefinitionEmpty;
            internalValueClassDefinition.className = "Internal";
            internalValueClassDefinition.finalize = finalize;
            m_internalValueClass = JSClassCreate(&internalValueClassDefinition);
            m_internalValueClass = JSClassRetain(m_internalValueClass);
        }

        if (m_getterAccessorClass == nullptr) {
            JSClassDefinition definition = kJSClassDefinitionEmpty;
            definition.callAsFunction = accessor_getter;
            m_getterAccessorClass = JSClassCreate(&definition);
            m_getterAccessorClass = JSClassRetain(m_getterAccessorClass);
        }

        if (m_setterAccessorClass == nullptr) {
            JSClassDefinition definition = kJSClassDefinitionEmpty;
            definition.callAsFunction = accessor_setter;
            m_setterAccessorClass = JSClassCreate(&definition);
            m_setterAccessorClass = JSClassRetain(m_setterAccessorClass);
        }

        if (m_NativePropertyGetterClass == nullptr) {
            JSClassDefinition definition = kJSClassDefinitionEmpty;
            definition.callAsFunction = native_property_getter_callback;
            m_NativePropertyGetterClass = JSClassCreate(&definition);
            m_NativePropertyGetterClass = JSClassRetain(m_NativePropertyGetterClass);
        }
    }

    return JSClassCreate(&definition);
}

template<typename ClassType>
inline std::vector<JSStaticFunction> ObjectWrap<ClassType>::get_methods(const MethodMap &methods) {
    std::vector<JSStaticFunction> functions;
    functions.reserve(methods.size() + 1);

    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    size_t index = 0;

    for (auto &pair : methods) {
        functions[index++] = {pair.first.c_str(), pair.second, attributes};
    }

    functions[index] = {0};
    return functions;
}

template<typename ClassType>
inline std::vector<JSStaticValue> ObjectWrap<ClassType>::get_properties(const PropertyMap &properties) {
    std::vector<JSStaticValue> values;
    values.reserve(properties.size() + 1);

    JSPropertyAttributes attributes = kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    size_t index = 0;

    for (auto &pair : properties) {
        auto &prop = pair.second;
        values[index++] = {pair.first.c_str(), prop.getter, prop.setter ?: set_readonly_property, attributes};
    }

    values[index] = {0};
    return values;
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::on_context_destroy(JSContextRef ctx, std::string realmPath) {
	std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
	if (!s_schemaObjectTypes.count(realmPath)) {
		return;
	}
	
	schemaObjects = s_schemaObjectTypes.at(realmPath);
	for (auto it = schemaObjects->begin(); it != schemaObjects->end(); ++it) {
        JSValueUnprotect(ctx, it->second->constructor);
        it->second->constructor = nullptr;
		SchemaObjectType* schemaObjecttype = it->second;
		delete schemaObjecttype;
	}
	s_schemaObjectTypes.erase(realmPath);

	delete schemaObjects;
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::accessor_getter(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    REALM_ASSERT(isRealmObjectClass);

    void* data = JSObjectGetPrivate(function);
    jsc::String* propertyName = (jsc::String*)data;
#ifdef DEBUG
    std::string debugName = *propertyName;
#endif

    return s_class.string_accessor.getter(ctx, this_object, *propertyName, exception);
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::accessor_setter(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    REALM_ASSERT(isRealmObjectClass);

    void* data = JSObjectGetPrivate(function);
    jsc::String* propertyName = (jsc::String*)data;
#ifdef DEBUG
    std::string debugName = *propertyName;
#endif

    bool result = s_class.string_accessor.setter(ctx, this_object, *propertyName, arguments[0], exception);
    return Value::from_boolean(ctx, result);
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::native_property_getter_callback(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception) {
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    REALM_ASSERT(isRealmObjectClass);

    JSValueRef error = nullptr;

    void* data = JSObjectGetPrivate(function);
    JSValueRef value = JSObjectGetProperty(ctx, function, JSStringCreateWithUTF8CString("propertyName"), &error);
    if (error) {
        *exception = error;
        return nullptr;
    }
    jsc::String propertyName = Value::to_string(ctx, value);
#ifdef DEBUG
    std::string debugName = propertyName;
#endif    

    JSObjectGetPropertyCallback getterCallback = (JSObjectGetPropertyCallback)data;

    JSValueRef result = getterCallback(ctx, thisObject, propertyName, &error);
    if (error) {
        *exception = error;
        return nullptr;
    }

    return result;
}

template<typename ClassType>
void ObjectWrap<ClassType>::define_accessor_for_schema_property(JSContextRef ctx, JSObjectRef& target, jsc::String* name) {
    JSObjectRef descriptor = Object::create_empty(ctx);
    JSValueRef exception = nullptr;

    //create an object with attached function callback. This is to be able to set private data on the function. 
    //Use this function as the 'get' function in the property descriptor
    //set the property name as private data. In the future this could be the realm::Property or the table index to speed up the get operation
    JSObjectRef getter = JSObjectMake(ctx, m_getterAccessorClass, name);
    JSObjectSetPrototype(ctx, getter, FunctionPrototype);

    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("get"), getter, kJSPropertyAttributeReadOnly, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    
    JSObjectRef setter = JSObjectMake(ctx, m_setterAccessorClass, name);
    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("set"), setter, kJSPropertyAttributeReadOnly, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("enumerable"), Value::from_boolean(ctx, true), kJSPropertyAttributeReadOnly, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    //call Object.defineProperty
    JSValueRef arguments[] = { target, Value::from_string(ctx, *name), descriptor };
    Function::call(ctx, ObjectDefineProperty, nullptr /*this*/, 3, arguments);
}

template<typename ClassType>
void ObjectWrap<ClassType>::define_native_property_accessor(JSContextRef ctx, 
        JSObjectRef& target, 
        jsc::String* name,
        JSObjectGetPropertyCallback getCallback) {

    JSObjectRef descriptor = Object::create_empty(ctx);
    JSValueRef exception = nullptr;

    JSObjectRef getter = JSObjectMake(ctx, m_NativePropertyGetterClass, (void*)getCallback);
    JSObjectSetPrototype(ctx, getter, FunctionPrototype);
    JSObjectSetProperty(ctx, getter, JSStringCreateWithUTF8CString("propertyName"), Value::from_string(ctx, *name), kJSPropertyAttributeReadOnly, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("get"), getter, kJSPropertyAttributeReadOnly, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    

    //call Object.defineProperty
    JSValueRef arguments[] = { target, Value::from_string(ctx, *name), descriptor };
    Function::call(ctx, ObjectDefineProperty, nullptr /*this*/, 3, arguments);
}

//A cache for property names. The pair is property name and a node::String* to the same string representation.
//The cache is persisted throughout the process life time to preseve property names between constructor cache invalidations (on_destory_context is called) 
//Since RealmObjectClass instances may be used after context is destroyed, their property names should be valid
static std::unordered_map<std::string, jsc::String*> propertyNamesCache;

static jsc::String* get_cached_property_name(const std::string& name) {
	if (propertyNamesCache.count(name)) {
		jsc::String* cachedName = propertyNamesCache.at(name);
		return cachedName;
	}

	jsc::String* result = new jsc::String(name);
	propertyNamesCache.emplace(name, result);
	return result;
}

static void define_function_property(JSContextRef ctx, JSObjectRef& target, const char* name, const JSObjectCallAsFunctionCallback& callback) {
    JSObjectRef descriptor = Object::create_empty(ctx);
    
    JSObjectRef functionValue = JSObjectMakeFunctionWithCallback(ctx, JSStringCreateWithUTF8CString(name), callback);

    JSValueRef exception = nullptr;
    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("value"), functionValue, kJSPropertyAttributeNone, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("writable"), Value::from_boolean(ctx, true), kJSPropertyAttributeNone, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    JSObjectSetProperty(ctx, descriptor, JSStringCreateWithUTF8CString("configurable"), Value::from_boolean(ctx, true), kJSPropertyAttributeNone, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }

    JSValueRef arguments[] = { target, Value::from_string(ctx, name), descriptor };
    Function::call(ctx, ObjectDefineProperty, nullptr /*this*/, 3, arguments);
}

static inline void remove_schema_object(JSContextRef ctx, std::unordered_map<std::string, SchemaObjectType*>* schemaObjects, const std::string& schemaName) {
	bool schemaExists = schemaObjects->count(schemaName);
	if (!schemaExists) {
		return;
	}

	SchemaObjectType* schemaObjectType = schemaObjects->at(schemaName);
	schemaObjects->erase(schemaName);
    JSValueUnprotect(ctx, schemaObjectType->constructor);
	delete schemaObjectType;
}

template<typename ClassType>
typename ClassType::Internal* ObjectWrap<ClassType>::get_internal(JSContextRef ctx, const JSObjectRef &object) {
        JSObjectRef instance = object;
        bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
        if (isRealmObjectClass) {
            const jsc::String* externalName = get_cached_property_name("_external");
            JSValueRef value = Object::get_property(ctx, object, *externalName);
            if (Value::is_undefined(ctx, value)) {
                return nullptr;
            }

            instance = Value::to_object(ctx, value);
        }

        ObjectWrap<ClassType>* realmObjectInstance = static_cast<ObjectWrap<ClassType>*>(JSObjectGetPrivate(instance));
        return realmObjectInstance->m_object.get();
}

template<typename ClassType>
void ObjectWrap<ClassType>::set_internal_property(JSContextRef ctx, JSObjectRef &instance, typename ClassType::Internal* internal) {
    //create a JS object that has a finializer to delete the internal reference
    JSObjectRef internalObject = JSObjectMake(ctx, m_internalValueClass, new ObjectWrap<ClassType>(internal));

    const jsc::String *externalName = get_cached_property_name("_external");
    auto attributes = realm::js::PropertyAttributes::ReadOnly | realm::js::PropertyAttributes::DontDelete | realm::js::PropertyAttributes::DontEnum;
    Object::set_property(ctx, instance, *externalName, internalObject, attributes);
}

static inline JSObjectRef try_get_prototype(JSContextRef ctx, JSObjectRef object) {
    JSValueRef exception = nullptr;
    JSValueRef protoValue = JSObjectGetPrototype(ctx, object);
    JSObjectRef proto = JSValueToObject(ctx, protoValue, &exception);
    if (exception) {
        return nullptr;
    }

    return proto;
}

//This is called from realm's abstraction layer and by JSValueIsInstanceOfConstructor
template<typename ClassType>
bool ObjectWrap<ClassType>::has_instance(JSContextRef ctx, JSValueRef value) {
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    if (isRealmObjectClass) {
        //Can't use JSValueIsObjectOfClass for RealmObjectClass instances created from a user defined constructor in the schema.
        //Can't use JSValueIsInstanceOfConstructor with the RealmObjectClass constructor since it will recursively call this method again
        //Check if the object has RealmObjectClassConstructorPrototype in its proto chain (the definition of JS 'instanceof')
        if (!JSValueIsObject(ctx, value)) {
            return false;
        }
         
        JSValueRef error = nullptr;
        JSObjectRef object = JSValueToObject(ctx, value, &error);
        if (error) {
            //do not throw exceptions in 'instanceof' calls
            return false;
        }

        JSObjectRef proto = try_get_prototype(ctx, object);
        while (proto != nullptr && !JSValueIsNull(ctx, proto)) {
            if (JSValueIsStrictEqual(ctx, proto, RealmObjectClassConstructorPrototype)) {
                return true;
            }

            proto = try_get_prototype(ctx, proto);
        }

        return false;
    }

    return JSValueIsObjectOfClass(ctx, value, get_class());
}

//JavaScriptCore calls this private method when doing 'instanceof' from JS
template<typename ClassType>
bool ObjectWrap<ClassType>::has_instance(JSContextRef ctx, JSObjectRef constructor, JSValueRef value, JSValueRef* exception) {
    return has_instance(ctx, value);
} 

template<typename ClassType>
inline void ObjectWrap<ClassType>::define_schema_properties(JSContextRef ctx, JSObjectRef constructorPrototype, const realm::ObjectSchema& schema, bool redefine) {
    //get all properties from the schema 
    for (auto& property : schema.persisted_properties) {
        std::string propName = property.public_name.empty() ? property.name : property.public_name;
        if (redefine || !JSObjectHasProperty(ctx, constructorPrototype, JSStringCreateWithUTF8CString(propName.c_str()))) {
            jsc::String* name = get_cached_property_name(propName);
            define_accessor_for_schema_property(ctx, constructorPrototype, name);
        }
    }

    for (auto& property : schema.computed_properties) {
        std::string propName = property.public_name.empty() ? property.name : property.public_name;
        if (redefine || !JSObjectHasProperty(ctx, constructorPrototype, JSStringCreateWithUTF8CString(propName.c_str()))) {
            jsc::String* name = get_cached_property_name(propName);
            define_accessor_for_schema_property(ctx, constructorPrototype, name);
        }
    }
}

template<typename ClassType>
inline JSObjectRef ObjectWrap<ClassType>::create_instance_by_schema(JSContextRef ctx, JSObjectRef& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal* internal) {
    bool isRealmObjectClass = std::is_same<ClassType, realm::js::RealmObjectClass<realm::jsc::Types>>::value;
    if (!isRealmObjectClass) {
        JSValueRef exception = jsc::Exception::value(ctx, "Creating instances by schema is supported for RealmObjectClass only");
        throw jsc::Exception(ctx, exception);
	}

	if (isRealmObjectClass && !internal) {
        JSValueRef exception = jsc::Exception::value(ctx, "RealmObjectClass requires an internal realm object when creating instances by schema");
        throw jsc::Exception(ctx, exception);
	}

    JSObjectRef instance;
    JSValueRef value;

    auto config = internal->realm()->config();
	std::string path = config.path;
	auto version = internal->realm()->schema_version();
	std::string schemaName = schema.name + ":" + util::to_string(version); 

	std::unordered_map<std::string, SchemaObjectType*>* schemaObjects = nullptr;
	if (!s_schemaObjectTypes.count(path)) {
		schemaObjects = new std::unordered_map<std::string, SchemaObjectType*>();
		s_schemaObjectTypes.emplace(path, schemaObjects);
	}
	else {
		schemaObjects = s_schemaObjectTypes.at(path);
	}
    
    JSObjectRef schemaObjectConstructor;
    SchemaObjectType* schemaObjectType;
    JSObjectRef constructorPrototype;

    //if we are creating a RealmObject from schema with no user defined constructor
	if (constructor == nullptr) {
        if (!schemaObjects->count(schemaName)) {
            
            JSClassDefinition definition = kJSClassDefinitionEmpty;
            definition.className = schema.name.c_str();
            JSClassRef schemaClass = JSClassCreate(&definition);
            schemaObjectConstructor = JSObjectMakeConstructor(ctx, schemaClass, nullptr);
            value = Object::get_property(ctx, schemaObjectConstructor, "prototype");
            constructorPrototype = Value::to_object(ctx, value);

            JSObjectSetPrototype(ctx, constructorPrototype, RealmObjectClassConstructorPrototype);
            JSObjectSetPrototype(ctx, schemaObjectConstructor, RealmObjectClassConstructor);

            define_schema_properties(ctx, constructorPrototype, schema, true);

            schemaObjectType = new SchemaObjectType();
            schemaObjects->emplace(schemaName, schemaObjectType);
            JSValueProtect(ctx, schemaObjectConstructor);
            schemaObjectType->constructor = schemaObjectConstructor;
        }
        else {
            //hot path. The constructor for this schema object is already cached.
            schemaObjectType = schemaObjects->at(schemaName);
            schemaObjectConstructor = schemaObjectType->constructor;
        }

        instance = Function::construct(ctx, schemaObjectConstructor, 0, {});

        //save the internal object on the instance
        set_internal_property(ctx, instance, internal);

        return instance; 
    }
    else {
        //creating a RealmObject with user defined constructor
        bool schemaExists = schemaObjects->count(schemaName);
		if (schemaExists) {
			schemaObjectType = schemaObjects->at(schemaName);
			schemaObjectConstructor = schemaObjectType->constructor;
			
			//check if constructors have changed for the same schema object and name
			if (!JSValueIsStrictEqual(ctx, schemaObjectConstructor, constructor)) {
				schemaExists = false;
				remove_schema_object(ctx, schemaObjects, schemaName);
			}
		}

		//hot path. The constructor for this schema object is already cached. use it and return a new instance
		if (schemaExists) {
			schemaObjectType = schemaObjects->at(schemaName);
			schemaObjectConstructor = schemaObjectType->constructor;

            instance = Function::construct(ctx, schemaObjectConstructor, 0, {});
            set_internal_property(ctx, instance, internal);
			return instance;
		}

        schemaObjectConstructor = constructor;
        value = Object::get_property(ctx, constructor, "prototype");
        constructorPrototype = Value::to_object(ctx, value);

        define_schema_properties(ctx, constructorPrototype, schema, false);

        JSValueRef exception = nullptr;
        bool isInstanceOfRealmObjectClass = JSValueIsInstanceOfConstructor(ctx, constructorPrototype, RealmObjectClassConstructor, &exception);
        if (exception) {
            throw jsc::Exception(ctx, exception);
        }
        
        //Skip if the user defined constructor inherited the RealmObjectClass. All RealmObjectClass members are available already.
        if (!isInstanceOfRealmObjectClass) {
			//setup all RealmObjectClass<T> methods to the prototype of the object
			for (auto& pair : s_class.methods) {
				//don't redefine if exists
                if (!JSObjectHasProperty(ctx, constructorPrototype, JSStringCreateWithUTF8CString(pair.first.c_str()))) {
                    define_function_property(ctx, constructorPrototype, pair.first.c_str(), pair.second);
				}
			}

			for (auto& pair : s_class.properties) {
				//don't redefine if exists
				if (!JSObjectHasProperty(ctx, constructorPrototype, JSStringCreateWithUTF8CString(pair.first.c_str()))) {
                    jsc::String* name = get_cached_property_name(pair.first);
                    JSObjectGetPropertyCallback getterCallback = pair.second.getter;
                    define_native_property_accessor(ctx, constructorPrototype, name, getterCallback);
				}
			}
		}

        //create the instance
        instance = Function::construct(ctx, schemaObjectConstructor, 0, {});
        bool instanceOfSchemaConstructor = JSValueIsInstanceOfConstructor(ctx, instance, schemaObjectConstructor, &exception);
        if (exception) {
            throw jsc::Exception(ctx, exception);
        }

        if (!instanceOfSchemaConstructor) {
            throw jsc::Exception(ctx, "Realm object constructor must not return another value");
        }

        //save the internal object on the instance
        set_internal_property(ctx, instance, internal);

        schemaObjectType = new SchemaObjectType();
        schemaObjects->emplace(schemaName, schemaObjectType);
        JSValueProtect(ctx, schemaObjectConstructor);
        schemaObjectType->constructor = schemaObjectConstructor;
        
        return instance; 
    }
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::call(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    // This should only be called as a super() call in the constructor of a subclass.
    if (!has_instance(ctx, this_object)) {
        *exception = jsc::Exception::value(ctx, s_class.name + " cannot be called as a function");
        return nullptr;
    }

    // Classes without a constructor should still be subclassable.
    if (reinterpret_cast<void*>(s_class.constructor)) {
        jsc::Arguments args{ctx, argc, arguments};
        try {
            s_class.constructor(ctx, this_object, args);
        }
        catch (std::exception &e) {
            *exception = jsc::Exception::value(ctx, e);
            return nullptr;
        }
    }

    return JSValueMakeUndefined(ctx);
}

template<typename ClassType>
inline JSObjectRef ObjectWrap<ClassType>::construct(JSContextRef ctx, JSObjectRef constructor, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    if (!reinterpret_cast<void*>(s_class.constructor)) {
        *exception = jsc::Exception::value(ctx, s_class.name + " is not a constructor");
        return nullptr;
    }

    JSObjectRef this_object = create_instance(ctx);
    jsc::Arguments args{ctx, argc, arguments};
    try {
        s_class.constructor(ctx, this_object, args);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
    return this_object;
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::initialize_constructor(JSContextRef ctx, JSObjectRef constructor) {
    static const String prototype_string = "prototype";

    // Set the prototype of the constructor to be Function.prototype.
    Object::set_prototype(ctx, constructor, Object::get_prototype(ctx, JSObjectMakeFunctionWithCallback(ctx, nullptr, call)));

    // Set the constructor prototype to be the prototype generated from the instance JSClassRef.
    JSObjectRef prototype = Object::validated_get_object(ctx, JSObjectMakeConstructor(ctx, get_class(), construct), prototype_string);
    Object::set_property(ctx, constructor, prototype_string, prototype, js::ReadOnly | js::DontEnum | js::DontDelete);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::finalize(JSObjectRef object) {
    // This is called for the most derived class before superclasses.
    if (auto wrap = static_cast<ObjectWrap<ClassType> *>(JSObjectGetPrivate(object))) {
        delete wrap;
        JSObjectSetPrivate(object, nullptr);
    }
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::get_property_names(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
    if (s_class.index_accessor.getter) {
        try {
            uint32_t length = Object::validated_get_length(ctx, object);
            char string[32];
            for (uint32_t i = 0; i < length; i++) {
                sprintf(string, "%u", i);
                JSPropertyNameAccumulatorAddName(accumulator, jsc::String(string));
            }
        }
        catch (std::exception &) {
            // Enumerating properties should never throw an exception into JS.
        }
    }
    if (auto string_enumerator = s_class.string_accessor.enumerator) {
        string_enumerator(ctx, object, accumulator);
    }
}

static inline bool try_get_int(JSStringRef property, int64_t& value) {
    value = 0;
    auto str = JSStringGetCharactersPtr(property);
    auto end = str + JSStringGetLength(property);
    while (str != end && iswspace(*str)) {
        ++str;
    }
    bool negative = false;
    if (str != end && *str == '-') {
        negative = true;
        ++str;
    }
    while (str != end && *str >= '0' && *str <= '9') {
        if (int_multiply_with_overflow_detect(value, 10)) {
            return false;
        }
        value += *str - '0';
        ++str;
    }
    if (negative) {
        value *= -1;
    }
    return str == end;
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::get_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    if (JSStringGetLength(property) == 0) {
        return Value::from_undefined(ctx);
    }

    if (auto index_getter = s_class.index_accessor.getter) {
        int64_t num;
        if (try_get_int(property, num)) {
            uint32_t index;
            if (num < 0 || util::int_cast_with_overflow_detect(num, index)) {
                // Out-of-bounds index getters should just return undefined in JS.
                return Value::from_undefined(ctx);
            }

            return index_getter(ctx, object, index, exception);
        }
    }

    if (auto string_getter = s_class.string_accessor.getter) {
        return string_getter(ctx, object, property, exception);
    }

    return nullptr;
}

template<typename ClassType>
inline bool ObjectWrap<ClassType>::set_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    if (JSStringGetLength(property) == 0) {
        return false;
    }

    auto index_setter = s_class.index_accessor.setter;

    if (index_setter || s_class.index_accessor.getter) {
        int64_t num;
        if (try_get_int(property, num)) {
            if (num < 0) {
                *exception = Exception::value(ctx, util::format("Index %1 cannot be less than zero.", num));
                return false;
            }

            int32_t index;
            if (util::int_cast_with_overflow_detect(num, index)) {
                *exception = Exception::value(ctx, util::format("Index %1 cannot be greater than %2.",
                                                                num, std::numeric_limits<uint32_t>::max()));
                return false;
            }

            if (index_setter) {
                return index_setter(ctx, object, index, value, exception);
            }

            *exception = Exception::value(ctx, util::format("Cannot assign to read only index %1", index));
            return false;
        }
    }

    if (auto string_setter = s_class.string_accessor.setter) {
        return string_setter(ctx, object, property, value, exception);
    }

    return false;
}

} // jsc

namespace js {

template<typename ClassType>
class ObjectWrap<jsc::Types, ClassType> : public jsc::ObjectWrap<ClassType> {};

template<jsc::ArgumentsMethodType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    jsc::Arguments args{ctx, argc, arguments};
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, this_object, args, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::PropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::PropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        F(ctx, object, value);
        return true;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::IndexPropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, index, return_value);
        return return_value;
    }
    catch (std::out_of_range &) {
        // Out-of-bounds index getters should just return undefined in JS.
        return jsc::Value::from_undefined(ctx);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::IndexPropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, index, value);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::StringPropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, property, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::StringPropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, property, value);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::StringPropertyType::EnumeratorType F>
void wrap(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
    auto names = F(ctx, object);
    for (auto &name : names) {
        JSPropertyNameAccumulatorAddName(accumulator, name);
    }
}

} // js
} // realm

