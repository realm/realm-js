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

#include "js_realm.hpp"
#include "js_object.hpp"
#include "js_results.hpp"
#include "jsc_list.hpp"
#include "js_schema.hpp"
#include "platform.hpp"

#include "shared_realm.hpp"
#include "impl/realm_coordinator.hpp"
#include "object_accessor.hpp"
#include "binding_context.hpp"
#include "results.hpp"

#include <cassert>


using namespace realm;
using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;

// static std::string s_defaultPath = realm::default_realm_file_directory() + "/default.realm";
static std::string s_defaultPath = "";
std::string RJSDefaultPath() {
    if (s_defaultPath.size() == 0) {
        s_defaultPath = realm::default_realm_file_directory() + "/default.realm";
    }
    return s_defaultPath;
}
void RJSSetDefaultPath(std::string path) {
    s_defaultPath = path;
}

static JSValueRef GetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    return RJSValueForString(ctx, s_defaultPath);
}

static bool SetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef* jsException) {
    try {
        s_defaultPath = RJSValidatedStringForValue(ctx, value, "defaultPath");
    }
    catch (std::exception &ex) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, ex);
        }
    }
    return true;
}

inline std::string RJSNormalizePath(std::string path) {
    if (path.size() && path[0] != '/') {
        return default_realm_file_directory() + "/" + path;
    }
    return path;
}

JSObjectRef RealmConstructor(JSContextRef ctx, JSObjectRef constructor, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Realm::Config config;
        std::map<std::string, realm::ObjectDefaults> defaults;
        std::map<std::string, JSObjectRef> constructors;
        if (argumentCount == 0) {
            config.path = RJSDefaultPath();
        }
        else if (argumentCount == 1) {
            JSValueRef value = arguments[0];
            if (JSValueIsString(ctx, value)) {
                config.path = RJSValidatedStringForValue(ctx, value, "path");
            }
            else if (JSValueIsObject(ctx, value)) {
                JSObjectRef object = RJSValidatedValueToObject(ctx, value);

                static JSStringRef pathString = JSStringCreateWithUTF8CString("path");
                JSValueRef pathValue = RJSValidatedPropertyValue(ctx, object, pathString);
                if (!JSValueIsUndefined(ctx, pathValue)) {
                    config.path = RJSValidatedStringForValue(ctx, pathValue, "path");
                }
                else {
                    config.path = RJSDefaultPath();
                }

                static JSStringRef schemaString = JSStringCreateWithUTF8CString("schema");
                JSValueRef schemaValue = RJSValidatedPropertyValue(ctx, object, schemaString);
                if (!JSValueIsUndefined(ctx, schemaValue)) {
                    config.schema.reset(new Schema(RJSParseSchema(ctx, RJSValidatedValueToObject(ctx, schemaValue), defaults, constructors)));
                }

                static JSStringRef schemaVersionString = JSStringCreateWithUTF8CString("schemaVersion");
                JSValueRef versionValue = RJSValidatedPropertyValue(ctx, object, schemaVersionString);
                if (JSValueIsNumber(ctx, versionValue)) {
                    config.schema_version = RJSValidatedValueToNumber(ctx, versionValue);
                }
                else {
                    config.schema_version = 0;
                }
                
                static JSStringRef encryptionKeyString = JSStringCreateWithUTF8CString("encryptionKey");
                JSValueRef encryptionKeyValue = RJSValidatedPropertyValue(ctx, object, encryptionKeyString);
                if (!JSValueIsUndefined(ctx, encryptionKeyValue)) {
                    std::string encryptionKey = RJSAccessor::to_binary(ctx, encryptionKeyValue);
                    config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());;
                }
            }
        }
        else {
            *jsException = RJSMakeError(ctx, "Invalid arguments when constructing 'Realm'");
            return NULL;
        }
        
        config.path = RJSNormalizePath(config.path);
        
        ensure_directory_exists_for_file(config.path);
        SharedRealm realm = Realm::get_shared_realm(config);
        auto delegate = new js::RealmDelegate<jsc::Types>(realm, JSContextGetGlobalContext(ctx));
        if (!realm->m_binding_context) {
            realm->m_binding_context.reset(delegate);
        }
        delegate->m_defaults = defaults;
        delegate->m_constructors = constructors;
        return js::WrapObject(ctx, RJSRealmClass(), new SharedRealm(realm));
    }
    catch (std::exception &ex) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, ex);
        }
        return NULL;
    }
}

bool RealmHasInstance(JSContextRef ctx, JSObjectRef constructor, JSValueRef value, JSValueRef* exception) {
    return JSValueIsObjectOfClass(ctx, value, RJSRealmClass());
}

static const JSStaticValue RealmStaticProperties[] = {
    {"defaultPath", GetDefaultPath, SetDefaultPath, kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL}
};

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmSchemaVersion(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {
    try {
        RJSValidateArgumentRange(argumentCount, 1, 2);
        
        Realm::Config config;
        config.path = RJSNormalizePath(RJSValidatedStringForValue(ctx, arguments[0]));
        if (argumentCount == 2) {
            auto encryptionKeyValue = arguments[1];
            std::string encryptionKey = RJSAccessor::to_binary(ctx, encryptionKeyValue);
            config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());
        }

        auto version = Realm::get_schema_version(config);
        if (version == ObjectStore::NotVersioned) {
            RJSSetReturnNumber(ctx, returnObject, -1);
        }
        else {
            RJSSetReturnNumber(ctx, returnObject, version);
        }
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

WRAP_METHOD(RealmSchemaVersion)

static const JSStaticFunction RealmConstructorFuncs[] = {
    {"schemaVersion", RealmSchemaVersion, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmConstructorClass() {
    JSClassDefinition realmConstructorDefinition = kJSClassDefinitionEmpty;
    realmConstructorDefinition.attributes = kJSClassAttributeNoAutomaticPrototype;
    realmConstructorDefinition.className = "RealmConstructor";
    realmConstructorDefinition.callAsConstructor = RealmConstructor;
    realmConstructorDefinition.hasInstance = RealmHasInstance;
    realmConstructorDefinition.staticValues = RealmStaticProperties;
    realmConstructorDefinition.staticFunctions = RealmConstructorFuncs;
    return JSClassCreate(&realmConstructorDefinition);
}

JSValueRef RealmGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    static JSStringRef s_pathString = JSStringCreateWithUTF8CString("path");
    if (JSStringIsEqual(propertyName, s_pathString)) {
        return RJSValueForString(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().path);
    }

    static JSStringRef s_schemaVersion = JSStringCreateWithUTF8CString("schemaVersion");
    if (JSStringIsEqual(propertyName, s_schemaVersion)) {
        return JSValueMakeNumber(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().schema_version);
    }
    return NULL;
}

std::string RJSValidatedObjectTypeForValue(SharedRealm &realm, JSContextRef ctx, JSValueRef value) {
    if (JSValueIsObject(ctx, value) && JSObjectIsConstructor(ctx, (JSObjectRef)value)) {
        JSObjectRef constructor = (JSObjectRef)value;

        auto delegate = js::get_delegate<jsc::Types>(realm.get());
        for (auto pair : delegate->m_constructors) {
            if (pair.second == constructor) {
                return pair.first;
            }
        }

        throw std::runtime_error("Constructor was not registered in the schema for this Realm");
    }

    return RJSValidatedStringForValue(ctx, value, "objectType");
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmObjects(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 1);

        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
        std::string className = RJSValidatedObjectTypeForValue(sharedRealm, ctx, arguments[0]);
        returnObject = RJSResultsCreate(ctx, sharedRealm, className);
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmCreateObject(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {
    try {
        RJSValidateArgumentRange(argumentCount, 2, 3);

        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
        std::string className = RJSValidatedObjectTypeForValue(sharedRealm, ctx, arguments[0]);
        auto &schema = sharedRealm->config().schema;
        auto object_schema = schema->find(className);

        if (object_schema == schema->end()) {
            throw std::runtime_error("Object type '" + className + "' not found in schema.");
        }

        auto object = RJSValidatedValueToObject(ctx, arguments[1]);
        if (RJSIsValueArray(ctx, arguments[1])) {
            object = RJSDictForPropertyArray(ctx, *object_schema, object);
        }

        bool update = false;
        if (argumentCount == 3) {
            update = RJSValidatedValueToBoolean(ctx, arguments[2]);
        }

        returnObject = RJSObjectCreate(ctx, Object::create<ValueType>(ctx, sharedRealm, *object_schema, object, update));
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmDelete(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 1);
    
        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        if (!realm->is_in_transaction()) {
            throw std::runtime_error("Can only delete objects within a transaction.");
        }
    
        auto arg = RJSValidatedValueToObject(ctx, arguments[0]);
        if (RJSValueIsObjectOfClass(ctx, arg, RJSObjectClass())) {
            Object *object = RJSGetInternal<Object *>(arg);
            realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
            table->move_last_over(object->row().get_index());
        }
        else if (RJSIsValueArray(ctx, arg)) {
            size_t length = RJSValidatedListLength(ctx, arg);
            for (long i = length-1; i >= 0; i--) {
                JSObjectRef jsObject = RJSValidatedValueToObject(ctx, RJSValidatedObjectAtIndex(ctx, arg, (unsigned int)i));
                if (!RJSValueIsObjectOfClass(ctx, jsObject, RJSObjectClass())) {
                    throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
                }
                
                Object *object = RJSGetInternal<Object *>(jsObject);
                realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
                table->move_last_over(object->row().get_index());
            }
        }
        else if(RJSValueIsObjectOfClass(ctx, arg, RJSResultsClass())) {
            Results *results = RJSGetInternal<Results *>(arg);
            results->clear();
        }
        else if(RJSValueIsObjectOfClass(ctx, arg, RJSListClass())) {
            List *list = RJSGetInternal<List *>(arg);
            list->delete_all();
        }
        else {
            throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
        }
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmDeleteAll(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 0);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);

        if (!realm->is_in_transaction()) {
            throw std::runtime_error("Can only delete objects within a transaction.");
        }

        for (auto objectSchema : *realm->config().schema) {
            ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
        }
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmWrite(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {
    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    try {
        RJSValidateArgumentCount(argumentCount, 1);

        auto object = RJSValidatedValueToFunction(ctx, arguments[0]);
        realm->begin_transaction();
        RJSCallFunction(ctx, object, thisObject, 0, NULL);
        realm->commit_transaction();
    }
    catch (std::exception &exp) {
        if (realm->is_in_transaction()) {
            realm->cancel_transaction();
        }
        RJSSetException(ctx, exceptionObject, exp);
    }
}

std::string RJSValidatedNotificationName(JSContextRef ctx, JSValueRef value) {
    std::string name = RJSValidatedStringForValue(ctx, value);
    if (name != "change") {
        throw std::runtime_error("Only the 'change' notification name is supported.");
    }
    return name;
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmAddListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 2);
        __unused std::string name = RJSValidatedNotificationName(ctx, arguments[0]);
        auto callback = RJSValidatedValueToFunction(ctx, arguments[1]);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->add_notification(callback);
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmRemoveListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 2);
        __unused std::string name = RJSValidatedNotificationName(ctx, arguments[0]);
        auto callback = RJSValidatedValueToFunction(ctx, arguments[1]);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->remove_notification(callback);
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmRemoveAllListeners(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentRange(argumentCount, 0, 1);
        if (argumentCount) {
            RJSValidatedNotificationName(ctx, arguments[0]);
        }

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->remove_all_notifications();
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

template<typename ContextType, typename ObjectType, typename ValueType, typename ReturnType, typename ExceptionType>
void RealmClose(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject, ExceptionType &exceptionObject) {    try {
        RJSValidateArgumentCount(argumentCount, 0);
        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        realm->close();
    }
    catch (std::exception &exp) {
        RJSSetException(ctx, exceptionObject, exp);
    }
}

WRAP_METHOD(RealmObjects)
WRAP_METHOD(RealmCreateObject)
WRAP_METHOD(RealmDelete)
WRAP_METHOD(RealmDeleteAll)
WRAP_METHOD(RealmWrite)
WRAP_METHOD(RealmAddListener)
WRAP_METHOD(RealmRemoveListener)
WRAP_METHOD(RealmRemoveAllListeners)
WRAP_METHOD(RealmClose)

static const JSStaticFunction RJSRealmFuncs[] = {
    {"objects", RealmObjects, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"create", RealmCreateObject, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"delete", RealmDelete, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"deleteAll", RealmDeleteAll, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"write", RealmWrite, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"addListener", RealmAddListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeListener", RealmRemoveListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeAllListeners", RealmRemoveAllListeners, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"close", RealmClose, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmClass() {
    static JSClassRef s_realmClass = RJSCreateWrapperClass<SharedRealm *>("Realm", RealmGetProperty, NULL, RJSRealmFuncs);
    return s_realmClass;
}


namespace realm {
namespace js {
JSClassRef RealmClass() { return RJSRealmClass(); };
}
}
