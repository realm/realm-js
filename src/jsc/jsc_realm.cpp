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

#include "jsc_realm.hpp"
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


static JSValueRef GetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    return RJSValueForString(ctx, realm::js::default_path());
}

static bool SetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef* jsException) {
    try {
        realm::js::set_default_path(RJSValidatedStringForValue(ctx, value, "defaultPath"));
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
            config.path = js::default_path();
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
                    config.path = js::default_path();
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

using RJSRealm = realm::js::Realm<realm::jsc::Types>;
WRAP_CLASS_METHOD(RJSRealm, Objects)
WRAP_CLASS_METHOD(RJSRealm, Create)
WRAP_CLASS_METHOD(RJSRealm, Delete)
WRAP_CLASS_METHOD(RJSRealm, DeleteAll)
WRAP_CLASS_METHOD(RJSRealm, Write)
WRAP_CLASS_METHOD(RJSRealm, AddListener)
WRAP_CLASS_METHOD(RJSRealm, RemoveListener)
WRAP_CLASS_METHOD(RJSRealm, RemoveAllListeners)
WRAP_CLASS_METHOD(RJSRealm, Close)

static const JSStaticFunction RJSRealmFuncs[] = {
    {"objects", RJSRealmObjects, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"create", RJSRealmCreate, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"delete", RJSRealmDelete, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"deleteAll", RJSRealmDeleteAll, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"write", RJSRealmWrite, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"addListener", RJSRealmAddListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeListener", RJSRealmRemoveListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeAllListeners", RJSRealmRemoveAllListeners, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"close", RJSRealmClose, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmClass() {
    static JSClassRef s_realmClass = RJSCreateWrapperClass<SharedRealm *>("Realm", RealmGetProperty, NULL, RJSRealmFuncs);
    return s_realmClass;
}


namespace realm {
namespace js {
JSClassRef realm_class() { return RJSRealmClass(); };
}
}
