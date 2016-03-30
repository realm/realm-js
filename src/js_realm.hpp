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

#include "js_util.hpp"
#include "js_schema.hpp"

#include "shared_realm.hpp"
#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "results.hpp"
#include "platform.hpp"

#include <map>
#include <set>

namespace realm {
namespace js {

template<typename T>
class RealmDelegate : public BindingContext {
  public:
    using GlobalContextType = typename T::GlobalContext;
    using ObjectClassType = typename T::ObjectClass;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using ObjectDefaults = std::map<std::string, ValueType>;

    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {
        notify("change");
    }
    virtual std::vector<ObserverState> get_observed_rows() {
        return std::vector<ObserverState>();
    }
    virtual void will_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {}

    RealmDelegate(std::weak_ptr<Realm> realm, GlobalContextType ctx) : m_context(ctx), m_realm(realm) {
        GlobalContextProtect(m_context);
    }
    ~RealmDelegate() {
        remove_all_notifications();

        for (auto constructor : m_constructors) {
            ValueUnprotect(m_context, constructor.second);
        }
        for (auto objectDefaults : m_defaults) {
            for (auto value : objectDefaults.second) {
                ValueUnprotect(m_context, value.second);
            }
        }
        GlobalContextUnprotect(m_context);
    }

    void add_notification(JSObjectRef notification) {
        if (!m_notifications.count(notification)) {
            ValueProtect(m_context, notification);
            m_notifications.insert(notification);
        }
    }
    void remove_notification(JSObjectRef notification) {
        if (m_notifications.count(notification)) {
            ValueUnprotect(m_context, notification);
            m_notifications.erase(notification);
        }
    }
    void remove_all_notifications() {
        for (auto notification : m_notifications) {
            ValueUnprotect(m_context, notification);
        }
        m_notifications.clear();
    }

    std::map<std::string, ObjectDefaults> m_defaults;
    std::map<std::string, ObjectType> m_constructors;

private:
    std::set<ObjectType> m_notifications;
    GlobalContextType m_context;
    std::weak_ptr<Realm> m_realm;
    
    void notify(const char *notification_name) {
        JSValueRef arguments[2];
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }
        ObjectType realm_object = WrapObject<SharedRealm *>(m_context, realm::js::realm_class(), new SharedRealm(realm));
        arguments[0] = realm_object;
        arguments[1] = RJSValueForString(m_context, notification_name);

        for (auto callback : m_notifications) {
            JSValueRef ex = NULL;
            ObjectCallAsFunction(m_context, callback, realm_object, 2, arguments, ex);
            if (ex) {
                throw RJSException(m_context, ex);
            }
        }
    }
};

template<typename T>
RealmDelegate<T> *get_delegate(Realm *realm) {
    return dynamic_cast<realm::js::RealmDelegate<T> *>(realm->m_binding_context.get());
}

std::string default_path();
void set_default_path(std::string path);

template<typename T>
class Realm : public BindingContext {
public:
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using ReturnType = typename T::Return;
    using ExceptionType = typename T::Exception;

    // member methods
    static void Objects(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void Create(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void Delete(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void DeleteAll(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void Write(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void AddListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void RemoveListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void RemoveAllListeners(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    static void Close(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    
    // properties
    static void GetPath(ContextType ctx, ObjectType object, ReturnType &returnObject);
    static void GetSchemaVersion(ContextType ctx, ObjectType object, ReturnType &returnObject);

    // constructor methods
    static void Constructor(ContextType ctx, ObjectType constructor, size_t argumentCount, const ValueType arguments[], ObjectType &returnObject);
    static void SchemaVersion(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject);
    
    // static properties
    static void GetDefaultPath(ContextType ctx, ObjectType object, ReturnType &returnObject);
    static void SetDefaultPath(ContextType ctx, ObjectType object, ValueType value);

    static std::string validated_notification_name(JSContextRef ctx, JSValueRef value) {
        std::string name = RJSValidatedStringForValue(ctx, value);
        if (name != "change") {
            throw std::runtime_error("Only the 'change' notification name is supported.");
        }
        return name;
    }
    
    // converts constructor object or type name to type name
    static std::string validated_object_type_for_value(SharedRealm &realm, JSContextRef ctx, JSValueRef value) {
        if (ValueIsObject(ctx, value) && ValueIsConstructor(ctx, value)) {
            ObjectType constructor = ValueToObject(ctx, value);
            
            auto delegate = get_delegate<T>(realm.get());
            for (auto pair : delegate->m_constructors) {
                if (pair.second == constructor) {
                    return pair.first;
                }
            }
            throw std::runtime_error("Constructor was not registered in the schema for this Realm");
        }
        return RJSValidatedStringForValue(ctx, value, "objectType");
    }
    
    static std::string RJSNormalizePath(std::string path) {
        if (path.size() && path[0] != '/') {
            return default_realm_file_directory() + "/" + path;
        }
        return path;
    }
};
    
    
template<typename T>
void Realm<T>::Constructor(ContextType ctx, ObjectType constructor, size_t argumentCount, const ValueType arguments[], ObjectType &returnObject) {
    using RJSAccessor = realm::NativeAccessor<ValueType, ContextType>;
    using StringType = typename T::String;
    
    realm::Realm::Config config;
    typename Schema<T>::ObjectDefaultsMap defaults;
    typename Schema<T>::ConstructorMap constructors;
    if (argumentCount == 0) {
        config.path = default_path();
    }
    else if (argumentCount == 1) {
        ValueType value = arguments[0];
        if (ValueIsString(ctx, value)) {
            config.path = RJSValidatedStringForValue(ctx, value, "path");
        }
        else if (ValueIsObject(ctx, value)) {
            ObjectType object = RJSValidatedValueToObject(ctx, value);
            
            StringType pathString("path");
            ValueType pathValue = RJSValidatedPropertyValue(ctx, object, pathString);
            if (!JSValueIsUndefined(ctx, pathValue)) {
                config.path = RJSValidatedStringForValue(ctx, pathValue, "path");
            }
            else {
                config.path = js::default_path();
            }
            
            StringType schemaString("schema");
            ValueType schemaValue = RJSValidatedPropertyValue(ctx, object, schemaString);
            if (!ValueIsUndefined(ctx, schemaValue)) {
                config.schema.reset(new realm::Schema(Schema<T>::parse_schema(ctx, RJSValidatedValueToObject(ctx, schemaValue), defaults, constructors)));
            }
            
            StringType schemaVersionString("schemaVersion");
            ValueType versionValue = RJSValidatedPropertyValue(ctx, object, schemaVersionString);
            if (JSValueIsNumber(ctx, versionValue)) {
                config.schema_version = RJSValidatedValueToNumber(ctx, versionValue);
            }
            else {
                config.schema_version = 0;
            }
            
            StringType encryptionKeyString("encryptionKey");
            ValueType encryptionKeyValue = RJSValidatedPropertyValue(ctx, object, encryptionKeyString);
            if (!JSValueIsUndefined(ctx, encryptionKeyValue)) {
                std::string encryptionKey = RJSAccessor::to_binary(ctx, encryptionKeyValue);
                config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());;
            }
        }
    }
    else {
        throw std::runtime_error("Invalid arguments when constructing 'Realm'");
    }
    
    config.path = RJSNormalizePath(config.path);
    
    ensure_directory_exists_for_file(config.path);
    SharedRealm realm = realm::Realm::get_shared_realm(config);
    auto delegate = new RealmDelegate<T>(realm, JSContextGetGlobalContext(ctx));
    if (!realm->m_binding_context) {
        realm->m_binding_context.reset(delegate);
    }
    delegate->m_defaults = defaults;
    delegate->m_constructors = constructors;
    returnObject = WrapObject(ctx, realm_class(), new SharedRealm(realm));
}

template<typename T>
void Realm<T>::SchemaVersion(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    using RJSAccessor = realm::NativeAccessor<ValueType, ContextType>;

    RJSValidateArgumentRange(argumentCount, 1, 2);
    
    realm::Realm::Config config;
    config.path = RJSNormalizePath(RJSValidatedStringForValue(ctx, arguments[0]));
    if (argumentCount == 2) {
        auto encryptionKeyValue = arguments[1];
        std::string encryptionKey = RJSAccessor::to_binary(ctx, encryptionKeyValue);
        config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());
    }
    
    auto version = realm::Realm::get_schema_version(config);
    if (version == ObjectStore::NotVersioned) {
        RJSSetReturnNumber(ctx, returnObject, -1);
    }
    else {
        RJSSetReturnNumber(ctx, returnObject, version);
    }
}

template<typename T>
void Realm<T>::GetDefaultPath(ContextType ctx, ObjectType object, ReturnType &returnObject) {
    returnObject = RJSValueForString(ctx, realm::js::default_path());
}

template<typename T>
void Realm<T>::SetDefaultPath(ContextType ctx, ObjectType object, ValueType value) {
    js::set_default_path(RJSValidatedStringForValue(ctx, value, "defaultPath"));
}

template<typename T>
void Realm<T>::GetPath(ContextType ctx, ObjectType object, ReturnType &returnObject) {
    returnObject = RJSValueForString(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().path);
}
    
template<typename T>
void Realm<T>::GetSchemaVersion(ContextType ctx, ObjectType object, ReturnType &returnObject) {
    returnObject = JSValueMakeNumber(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().schema_version);
}
    
template<typename T>
void Realm<T>::Objects(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 1);

    SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
    std::string className = validated_object_type_for_value(sharedRealm, ctx, arguments[0]);
    returnObject = RJSResultsCreate(ctx, sharedRealm, className);
}

template<typename T>
void Realm<T>::Create(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentRange(argumentCount, 2, 3);

    SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
    std::string className = validated_object_type_for_value(sharedRealm, ctx, arguments[0]);
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

template<typename T>
void Realm<T>::Delete(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 1);

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    auto arg = RJSValidatedValueToObject(ctx, arguments[0]);
    if (RJSValueIsObjectOfClass(ctx, arg, realm::js::object_class())) {
        Object *object = RJSGetInternal<Object *>(arg);
        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
        table->move_last_over(object->row().get_index());
    }
    else if (RJSIsValueArray(ctx, arg)) {
        size_t length = RJSValidatedListLength(ctx, arg);
        for (long i = length-1; i >= 0; i--) {
            JSObjectRef jsObject = RJSValidatedValueToObject(ctx, RJSValidatedObjectAtIndex(ctx, arg, (unsigned int)i));
            if (!RJSValueIsObjectOfClass(ctx, jsObject, object_class())) {
                throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
            }

            Object *object = RJSGetInternal<Object *>(jsObject);
            realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
            table->move_last_over(object->row().get_index());
        }
    }
    else if(RJSValueIsObjectOfClass(ctx, arg, realm::js::results_class())) {
        Results *results = RJSGetInternal<Results *>(arg);
        results->clear();
    }
    else if(RJSValueIsObjectOfClass(ctx, arg, realm::js::list_class())) {
        List *list = RJSGetInternal<List *>(arg);
        list->delete_all();
    }
    else {
        throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
    }
}

template<typename T>
void Realm<T>::DeleteAll(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 0);

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : *realm->config().schema) {
        ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
    }
}

template<typename T>
void Realm<T>::Write(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 1);

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    auto object = RJSValidatedValueToFunction(ctx, arguments[0]);
    try {
        realm->begin_transaction();
        RJSCallFunction(ctx, object, thisObject, 0, NULL);
        realm->commit_transaction();
    }
    catch (std::exception &exp) {
        if (realm->is_in_transaction()) {
            realm->cancel_transaction();
        }
        throw;
    }
}

template<typename T>
void Realm<T>::AddListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 2);
    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = RJSValidatedValueToFunction(ctx, arguments[1]);

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->add_notification(callback);
}

template<typename T>
void Realm<T>::RemoveListener(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 2);
    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = RJSValidatedValueToFunction(ctx, arguments[1]);

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->remove_notification(callback);
}

template<typename T>
void Realm<T>::RemoveAllListeners(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentRange(argumentCount, 0, 1);
    if (argumentCount) {
        validated_notification_name(ctx, arguments[0]);
    }

    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    static_cast<js::RealmDelegate<jsc::Types> *>(realm->m_binding_context.get())->remove_all_notifications();
}

template<typename T>
void Realm<T>::Close(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    RJSValidateArgumentCount(argumentCount, 0);
    SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
    realm->close();
}

}
}