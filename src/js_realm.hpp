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

#include <map>
#include <set>

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_object.hpp"
#include "js_schema.hpp"

#include "shared_realm.hpp"
#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "results.hpp"
#include "platform.hpp"

namespace realm {
namespace js {

template<typename T>
class RealmDelegate : public BindingContext {
  public:
    using GlobalContextType = typename T::GlobalContext;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = Value<T>;

    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;

    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {
        notify("change");
    }
    virtual std::vector<ObserverState> get_observed_rows() {
        return std::vector<ObserverState>();
    }
    virtual void will_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {}

    RealmDelegate(std::weak_ptr<Realm> realm, GlobalContextType ctx) : m_context(ctx), m_realm(realm) {}

    ~RealmDelegate() {
        remove_all_notifications();
    }

    void add_notification(FunctionType notification) {
        m_notifications.insert(Protected<FunctionType>(m_context, notification));
    }
    void remove_notification(FunctionType notification) {
        m_notifications.erase(Protected<FunctionType>(m_context, notification));
    }
    void remove_all_notifications() {
        m_notifications.clear();
    }

    ObjectDefaultsMap m_defaults;
    ConstructorMap m_constructors;

  private:
    Protected<GlobalContextType> m_context;
    std::set<Protected<FunctionType>> m_notifications;
    std::weak_ptr<Realm> m_realm;
    
    void notify(const char *notification_name) {
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }

        ObjectType realm_object = create_object<T, SharedRealm>(m_context, new SharedRealm(realm));
        ValueType arguments[2];
        arguments[0] = realm_object;
        arguments[1] = Value::from_string(m_context, notification_name);

        for (auto callback : m_notifications) {
            Function<T>::call(m_context, callback, realm_object, 2, arguments);
        }
    }
};

std::string default_path();
void set_default_path(std::string path);

template<typename T>
class Realm : public BindingContext {
public:
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = String<T>;
    using Object = Object<T>;
    using Value = Value<T>;
    using ReturnValue = ReturnValue<T>;
    using NativeAccessor = realm::NativeAccessor<ValueType, ContextType>;

    // member methods
    static void Objects(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Create(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Delete(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void DeleteAll(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Write(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void AddListener(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void RemoveListener(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void RemoveAllListeners(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Close(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // properties
    static void GetPath(ContextType, ObjectType, ReturnValue &);
    static void GetSchemaVersion(ContextType, ObjectType, ReturnValue &);

    // constructor methods
    static void Constructor(ContextType, ObjectType, size_t, const ValueType[]);
    static void SchemaVersion(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // static properties
    static void GetDefaultPath(ContextType, ObjectType, ReturnValue &);
    static void SetDefaultPath(ContextType, ObjectType, ValueType value);

    static std::string validated_notification_name(ContextType ctx, const ValueType &value) {
        std::string name = Value::validated_to_string(ctx, value, "notification name");
        if (name != "change") {
            throw std::runtime_error("Only the 'change' notification name is supported.");
        }
        return name;
    }
    
    // converts constructor object or type name to type name
    static std::string validated_object_type_for_value(SharedRealm &realm, ContextType ctx, const ValueType &value) {
        if (Value::is_constructor(ctx, value)) {
            FunctionType constructor = Value::to_constructor(ctx, value);
            
            auto delegate = get_delegate<T>(realm.get());
            for (auto pair : delegate->m_constructors) {
                if (pair.second == constructor) {
                    return pair.first;
                }
            }
            throw std::runtime_error("Constructor was not registered in the schema for this Realm");
        }
        return Value::validated_to_string(ctx, value, "objectType");
    }
    
    static std::string normalize_path(std::string path) {
        if (path.size() && path[0] != '/') {
            return default_realm_file_directory() + "/" + path;
        }
        return path;
    }
};

template<typename T>
struct ObjectClass<T, SharedRealm> : BaseObjectClass<T> {
    using Realm = Realm<T>;

    std::string const name = "Realm";

    ConstructorType<T>* const constructor = Realm::Constructor;

    MethodMap<T> const methods = {
        {"objects", wrap<Realm::Objects>},
        {"create", wrap<Realm::Create>},
        {"delete", wrap<Realm::Delete>},
        {"deleteAll", wrap<Realm::DeleteAll>},
        {"write", wrap<Realm::Write>},
        {"addListener", wrap<Realm::AddListener>},
        {"removeListener", wrap<Realm::RemoveListener>},
        {"removeAllListeners", wrap<Realm::RemoveAllListeners>},
        {"close", wrap<Realm::Close>},
    };

    PropertyMap<T> const properties = {
        {"path", {wrap<Realm::GetPath>}},
        {"schemaVersion", {wrap<Realm::GetSchemaVersion>}},
    };
};

template<typename T>
void Realm<T>::Constructor(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[]) {
    static const String path_string = "path";
    static const String schema_string = "schema";
    static const String schema_version_string = "schemaVersion";
    static const String encryption_key_string = "encryptionKey";

    realm::Realm::Config config;
    typename Schema<T>::ObjectDefaultsMap defaults;
    typename Schema<T>::ConstructorMap constructors;

    if (argc == 0) {
        config.path = default_path();
    }
    else if (argc == 1) {
        ValueType value = arguments[0];
        if (Value::is_string(ctx, value)) {
            config.path = Value::validated_to_string(ctx, value, "path");
        }
        else if (Value::is_object(ctx, value)) {
            ObjectType object = Value::validated_to_object(ctx, value);

            ValueType pathValue = Object::get_property(ctx, object, path_string);
            if (!Value::is_undefined(ctx, pathValue)) {
                config.path = Value::validated_to_string(ctx, pathValue, "path");
            }
            else {
                config.path = js::default_path();
            }

            ValueType schemaValue = Object::get_property(ctx, object, schema_string);
            if (!Value::is_undefined(ctx, schemaValue)) {
                ObjectType schemaObject = Value::validated_to_object(ctx, schemaValue, "schema");
                config.schema.reset(new realm::Schema(Schema<T>::parse_schema(ctx, schemaObject, defaults, constructors)));
            }

            ValueType versionValue = Object::get_property(ctx, object, schema_version_string);
            if (!Value::is_undefined(ctx, versionValue)) {
                config.schema_version = Value::validated_to_number(ctx, versionValue, "schemaVersion");
            }
            else {
                config.schema_version = 0;
            }
            
            ValueType encryptionKeyValue = Object::get_property(ctx, object, encryption_key_string);
            if (!Value::is_undefined(ctx, encryptionKeyValue)) {
                std::string encryptionKey = NativeAccessor::to_binary(ctx, encryptionKeyValue);
                config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());
            }
        }
    }
    else {
        throw std::runtime_error("Invalid arguments when constructing 'Realm'");
    }
    
    config.path = normalize_path(config.path);
    ensure_directory_exists_for_file(config.path);

    SharedRealm realm = realm::Realm::get_shared_realm(config);
    auto delegate = new RealmDelegate<T>(realm, Context<T>::get_global_context(ctx));

    if (!realm->m_binding_context) {
        realm->m_binding_context.reset(delegate);
    }

    delegate->m_defaults = defaults;
    delegate->m_constructors = constructors;

    set_internal<T, SharedRealm>(this_object, new SharedRealm(realm));
}

template<typename T>
void Realm<T>::SchemaVersion(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);
    
    realm::Realm::Config config;
    config.path = normalize_path(Value::validated_to_string(ctx, arguments[0]));
    if (argc == 2) {
        auto encryptionKeyValue = arguments[1];
        std::string encryptionKey = NativeAccessor::to_binary(ctx, encryptionKeyValue);
        config.encryption_key = std::vector<char>(encryptionKey.begin(), encryptionKey.end());
    }
    
    auto version = realm::Realm::get_schema_version(config);
    if (version == ObjectStore::NotVersioned) {
        return_value.set(-1);
    }
    else {
        return_value.set(version);
    }
}

template<typename T>
void Realm<T>::GetDefaultPath(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(realm::js::default_path());
}

template<typename T>
void Realm<T>::SetDefaultPath(ContextType ctx, ObjectType object, ValueType value) {
    js::set_default_path(Value::validated_to_string(ctx, value, "defaultPath"));
}

template<typename T>
void Realm<T>::GetPath(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string path = get_internal<T, SharedRealm>(object)->get()->config().path;
    return_value.set(path);
}

template<typename T>
void Realm<T>::GetSchemaVersion(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    double version = get_internal<T, SharedRealm>(object)->get()->config().schema_version;
    return_value.set(version);
}

template<typename T>
void Realm<T>::Objects(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm sharedRealm = *get_internal<T, SharedRealm>(this_object);
    std::string className = validated_object_type_for_value(sharedRealm, ctx, arguments[0]);

    // TODO
//    return_value = RJSResultsCreate(ctx, sharedRealm, className);
}

template<typename T>
void Realm<T>::Create(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2, 3);

    SharedRealm sharedRealm = *get_internal<T, SharedRealm>(this_object);
    std::string className = validated_object_type_for_value(sharedRealm, ctx, arguments[0]);
    auto &schema = sharedRealm->config().schema;
    auto object_schema = schema->find(className);

    if (object_schema == schema->end()) {
        throw std::runtime_error("Object type '" + className + "' not found in schema.");
    }

    ObjectType object = Value::validated_to_object(ctx, arguments[1], "properties");
    if (Value::is_array(ctx, arguments[1])) {
        object = Schema<T>::dict_for_property_array(ctx, *object_schema, object);
    }

    bool update = false;
    if (argc == 3) {
        update = Value::validated_to_boolean(ctx, arguments[2], "update");
    }

    auto realm_object = realm::Object::create<ValueType>(ctx, sharedRealm, *object_schema, object, update);
    return_value.set(RealmObject<T>::create(ctx, realm_object));
}

template<typename T>
void Realm<T>::Delete(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    ObjectType arg = Value::validated_to_object(ctx, arguments[0]);

    // TODO: fix this template call
    if (Object::template is_instance<realm::Object>(ctx, arg)) {
        auto object = get_internal<T, realm::Object>(arg);
        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
        table->move_last_over(object->row().get_index());
    }
    else if (Value::is_array(ctx, arg)) {
        uint32_t length = Object::validated_get_length(ctx, arg);
        for (uint32_t i = length; i--;) {
            ObjectType object = Object::validated_get_object(ctx, arg, i);

            if (!Object::template is_instance<realm::Object>(ctx, object)) {
                throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
            }

            auto realm_object = get_internal<T, realm::Object>(object);
            realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), realm_object->get_object_schema().name);
            table->move_last_over(realm_object->row().get_index());
        }
    }
//    else if(RJSValueIsObjectOfClass(ctx, arg, realm::js::results_class())) {
//        auto results = get_internal<T, realm::Results>(arg);
//        results->clear();
//    }
    else if (Object::template is_instance<realm::List>(ctx, arg)) {
        auto list = get_internal<T, realm::List>(arg);
        list->delete_all();
    }
    else {
        throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
    }
}

template<typename T>
void Realm<T>::DeleteAll(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : *realm->config().schema) {
        ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
    }
}

template<typename T>
void Realm<T>::Write(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    FunctionType callback = Value::validated_to_function(ctx, arguments[0]);

    try {
        realm->begin_transaction();
        Function<T>::call(ctx, callback, this_object, 0, nullptr);
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
void Realm<T>::AddListener(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    get_delegate<T>(realm.get())->add_notification(callback);
}

template<typename T>
void Realm<T>::RemoveListener(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    get_delegate<T>(realm.get())->remove_notification(callback);
}

template<typename T>
void Realm<T>::RemoveAllListeners(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0, 1);
    if (argc) {
        validated_notification_name(ctx, arguments[0]);
    }

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    get_delegate<T>(realm.get())->remove_all_notifications();
}

template<typename T>
void Realm<T>::Close(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, SharedRealm>(this_object);
    realm->close();
}

} // js
} // realm
