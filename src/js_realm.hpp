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

#include <list>
#include <map>

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_realm_object.hpp"
#include "js_list.hpp"
#include "js_results.hpp"
#include "js_schema.hpp"

#include "shared_realm.hpp"
#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "platform.hpp"

namespace realm {
namespace js {

template<typename T>
class Realm;

template<typename T>
class RealmClass;

template<typename T>
class RealmDelegate : public BindingContext {
  public:
    using GlobalContextType = typename T::GlobalContext;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = js::Value<T>;

    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;

    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {
        notify("change");
    }
    virtual std::vector<ObserverState> get_observed_rows() {
        return std::vector<ObserverState>();
    }
    virtual void will_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {}

    RealmDelegate(std::weak_ptr<realm::Realm> realm, GlobalContextType ctx) : m_context(ctx), m_realm(realm) {}

    ~RealmDelegate() {
        // All protected values need to be unprotected while the context is retained.
        m_defaults.clear();
        m_constructors.clear();
        m_notifications.clear();
    }

    void add_notification(FunctionType notification) {
        for (auto &handler : m_notifications) {
            if (handler == notification) {
                return;
            }
        }
        m_notifications.emplace_back(m_context, notification);
    }
    void remove_notification(FunctionType notification) {
        for (auto iter = m_notifications.begin(); iter != m_notifications.end(); ++iter) {
            if (*iter == notification) {
                m_notifications.erase(iter);
                return;
            }
        }
    }
    void remove_all_notifications() {
        m_notifications.clear();
    }

    ObjectDefaultsMap m_defaults;
    ConstructorMap m_constructors;

  private:
    Protected<GlobalContextType> m_context;
    std::list<Protected<FunctionType>> m_notifications;
    std::weak_ptr<realm::Realm> m_realm;
    
    void notify(const char *notification_name) {
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }

        ObjectType realm_object = create_object<T, RealmClass<T>>(m_context, new SharedRealm(realm));
        ValueType arguments[2];
        arguments[0] = realm_object;
        arguments[1] = Value::from_string(m_context, notification_name);

        for (auto &callback : m_notifications) {
            Function<T>::call(m_context, callback, realm_object, 2, arguments);
        }
    }

    friend class RealmClass<T>;
};

std::string default_path();
void set_default_path(std::string path);
void delete_all_realms();

template<typename T>
class RealmClass : public ClassDefinition<T, SharedRealm> {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using NativeAccessor = realm::NativeAccessor<ValueType, ContextType>;

public:
    static FunctionType create_constructor(ContextType);

    // methods
    static void objects(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void object_for_primary_key(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void create(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void delete_one(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void delete_all(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void write(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void add_listener(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_listener(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void close(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // properties
    static void get_path(ContextType, ObjectType, ReturnValue &);
    static void get_schema_version(ContextType, ObjectType, ReturnValue &);
    static void get_schema(ContextType, ObjectType, ReturnValue &);
    static void get_read_only(ContextType, ObjectType, ReturnValue &);

    // static methods
    static void constructor(ContextType, ObjectType, size_t, const ValueType[]);
    static void schema_version(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void clear_test_state(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void copy_bundled_realm_files(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    
    // static properties
    static void get_default_path(ContextType, ObjectType, ReturnValue &);
    static void set_default_path(ContextType, ObjectType, ValueType value);

    std::string const name = "Realm";
    
    MethodMap<T> const static_methods = {
        {"schemaVersion", wrap<schema_version>},
        {"clearTestState", wrap<clear_test_state>},
        {"copyBundledRealmFiles", wrap<copy_bundled_realm_files>},
    };
    
    PropertyMap<T> const static_properties = {
        {"defaultPath", {wrap<get_default_path>, wrap<set_default_path>}},
    };
    
    MethodMap<T> const methods = {
        {"objects", wrap<objects>},
        {"objectForPrimaryKey", wrap<object_for_primary_key>},
        {"create", wrap<create>},
        {"delete", wrap<delete_one>},
        {"deleteAll", wrap<delete_all>},
        {"write", wrap<write>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
        {"close", wrap<close>},
    };
    
    PropertyMap<T> const properties = {
        {"path", {wrap<get_path>, nullptr}},
        {"schemaVersion", {wrap<get_schema_version>, nullptr}},
        {"schema", {wrap<get_schema>, nullptr}},
        {"readOnly", {wrap<get_read_only>, nullptr}},
    };
    
  private:
    static std::string validated_notification_name(ContextType ctx, const ValueType &value) {
        std::string name = Value::validated_to_string(ctx, value, "notification name");
        if (name != "change") {
            throw std::runtime_error("Only the 'change' notification name is supported.");
        }
        return name;
    }
    
    static const ObjectSchema& validated_object_schema_for_value(ContextType ctx, const SharedRealm &realm, const ValueType &value) {
        std::string object_type;

        if (Value::is_constructor(ctx, value)) {
            FunctionType constructor = Value::to_constructor(ctx, value);
            
            auto delegate = get_delegate<T>(realm.get());
            for (auto &pair : delegate->m_constructors) {
                if (FunctionType(pair.second) == constructor) {
                    object_type = pair.first;
                    break;
                }
            }

            if (object_type.empty()) {
                throw std::runtime_error("Constructor was not registered in the schema for this Realm");
            }
        }
        else {
            object_type = Value::validated_to_string(ctx, value, "objectType");
        }

        auto &schema = realm->schema();
        auto object_schema = schema.find(object_type);

        if (object_schema == schema.end()) {
            throw std::runtime_error("Object type '" + object_type + "' not found in schema.");
        }
        return *object_schema;
    }
    
    static std::string normalize_path(std::string path) {
        if (path.size() && path[0] != '/' && path[0] != '.') {
            return default_realm_file_directory() + "/" + path;
        }
        return path;
    }
};

template<typename T>
inline typename T::Function RealmClass<T>::create_constructor(ContextType ctx) {
    FunctionType realm_constructor = ObjectWrap<T, RealmClass<T>>::create_constructor(ctx);
    FunctionType collection_constructor = ObjectWrap<T, CollectionClass<T>>::create_constructor(ctx);
    FunctionType list_constructor = ObjectWrap<T, ListClass<T>>::create_constructor(ctx);
    FunctionType results_constructor = ObjectWrap<T, ResultsClass<T>>::create_constructor(ctx);
    FunctionType realm_object_constructor = ObjectWrap<T, RealmObjectClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, realm_constructor, "Collection", collection_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "List", list_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "Results", results_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "Object", realm_object_constructor, attributes);

    return realm_constructor;
}
    
static inline void convert_outdated_datetime_columns(const SharedRealm &realm) {
    realm::util::Optional<int> old_file_format_version = realm->file_format_upgraded_from_version();
    if (old_file_format_version && old_file_format_version < 5) {
        // any versions earlier than file format 5 are stored as milliseconds and need to be converted to the new format
        for (auto& object_schema : realm->schema()) {
            auto table = ObjectStore::table_for_object_type(realm->read_group(), object_schema.name);
            for (auto& property : object_schema.persisted_properties) {
                if (property.type == realm::PropertyType::Date) {
                    if (!realm->is_in_transaction()) {
                        realm->begin_transaction();
                    }
                    
                    for (size_t row_index = 0; row_index < table->size(); row_index++) {
                        if (table->is_null(property.table_column, row_index)) {
                            continue;
                        }
                        auto milliseconds = table->get_timestamp(property.table_column, row_index).get_seconds();
                        table->set_timestamp(property.table_column, row_index, Timestamp(milliseconds / 1000, (milliseconds % 1000) * 1000000));
                    }
                }
            }
            if (realm->is_in_transaction()) {
                realm->commit_transaction();
            }
        }
    }
}

template<typename T>
void RealmClass<T>::constructor(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[]) {
    realm::Realm::Config config;
    typename Schema<T>::ObjectDefaultsMap defaults;
    typename Schema<T>::ConstructorMap constructors;
    bool schema_updated = false;

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

            static const String path_string = "path";
            ValueType path_value = Object::get_property(ctx, object, path_string);
            if (!Value::is_undefined(ctx, path_value)) {
                config.path = Value::validated_to_string(ctx, path_value, "path");
            }
            else {
                config.path = js::default_path();
            }
            
            static const String read_only_string = "readOnly";
            ValueType read_only_value = Object::get_property(ctx, object, read_only_string);
            if (!Value::is_undefined(ctx, read_only_value) && Value::validated_to_boolean(ctx, read_only_value, "readOnly")) {
                config.schema_mode = SchemaMode::ReadOnly;
            }

            static const String schema_string = "schema";
            ValueType schema_value = Object::get_property(ctx, object, schema_string);
            if (!Value::is_undefined(ctx, schema_value)) {
                ObjectType schema_object = Value::validated_to_object(ctx, schema_value, "schema");
                config.schema.emplace(Schema<T>::parse_schema(ctx, schema_object, defaults, constructors));
                schema_updated = true;
            }

            static const String schema_version_string = "schemaVersion";
            ValueType version_value = Object::get_property(ctx, object, schema_version_string);
            if (!Value::is_undefined(ctx, version_value)) {
                config.schema_version = Value::validated_to_number(ctx, version_value, "schemaVersion");
            }
            else {
                config.schema_version = 0;
            }

            static const String migration_string = "migration";
            ValueType migration_value = Object::get_property(ctx, object, migration_string);
            if (!Value::is_undefined(ctx, migration_value)) {
                FunctionType migration_function = Value::validated_to_function(ctx, migration_value, "migration");
                config.migration_function = [=](SharedRealm old_realm, SharedRealm realm, realm::Schema&) {
                    auto old_realm_ptr = new SharedRealm(old_realm);
                    auto realm_ptr = new SharedRealm(realm);
                    ValueType arguments[2] = {
                        create_object<T, RealmClass<T>>(ctx, old_realm_ptr),
                        create_object<T, RealmClass<T>>(ctx, realm_ptr)
                    };
                    
                    try {
                        Function<T>::call(ctx, migration_function, 2, arguments);
                    }
                    catch (...) {
                        old_realm->close();
                        old_realm_ptr->reset();
                        realm_ptr->reset();
                        throw;
                    }
                    
                    old_realm->close();
                    old_realm_ptr->reset();
                    realm_ptr->reset();
                };
            }

            static const String encryption_key_string = "encryptionKey";
            ValueType encryption_key_value = Object::get_property(ctx, object, encryption_key_string);
            if (!Value::is_undefined(ctx, encryption_key_value)) {
                std::string encryption_key = NativeAccessor::to_binary(ctx, encryption_key_value);
                config.encryption_key = std::vector<char>(encryption_key.begin(), encryption_key.end());
            }
        }
    }
    else {
        throw std::runtime_error("Invalid arguments when constructing 'Realm'");
    }
    
    config.path = normalize_path(config.path);
    ensure_directory_exists_for_file(config.path);

    SharedRealm realm = realm::Realm::get_shared_realm(config);
    GlobalContextType global_context = Context<T>::get_global_context(ctx);
    BindingContext *binding_context = realm->m_binding_context.get();
    RealmDelegate<T> *js_binding_context = dynamic_cast<RealmDelegate<T> *>(binding_context);

    if (!binding_context) {
        js_binding_context = new RealmDelegate<T>(realm, global_context);
        realm->m_binding_context.reset(js_binding_context);
    }
    else if (!js_binding_context || js_binding_context->m_context != global_context) {
        throw std::runtime_error("Realm is already open in another context on this thread: " + config.path);
    }

    // If a new schema was provided, then use its defaults and constructors.
    if (schema_updated) {
        js_binding_context->m_defaults = std::move(defaults);
        js_binding_context->m_constructors = std::move(constructors);
    }
    
    // Fix for datetime -> timestamp conversion
    convert_outdated_datetime_columns(realm);

    set_internal<T, RealmClass<T>>(this_object, new SharedRealm(realm));
}

template<typename T>
void RealmClass<T>::schema_version(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
        return_value.set((double)version);
    }
}

template<typename T>
void RealmClass<T>::clear_test_state(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);
    delete_all_realms();
}
    
template<typename T>
void RealmClass<T>::copy_bundled_realm_files(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);
    realm::copy_bundled_realm_files();
}

template<typename T>
void RealmClass<T>::get_default_path(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(realm::js::default_path());
}

template<typename T>
void RealmClass<T>::set_default_path(ContextType ctx, ObjectType object, ValueType value) {
    js::set_default_path(Value::validated_to_string(ctx, value, "defaultPath"));
}

template<typename T>
void RealmClass<T>::get_path(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string path = get_internal<T, RealmClass<T>>(object)->get()->config().path;
    return_value.set(path);
}

template<typename T>
void RealmClass<T>::get_schema_version(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    double version = get_internal<T, RealmClass<T>>(object)->get()->schema_version();
    return_value.set(version);
}

template<typename T>
void RealmClass<T>::get_schema(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto& schema = get_internal<T, RealmClass<T>>(object)->get()->schema();
    return_value.set(Schema<T>::object_for_schema(ctx, schema));
}

template<typename T>
void RealmClass<T>::get_read_only(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->config().read_only());
}

template<typename T>
void RealmClass<T>::objects(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    auto &object_schema = validated_object_schema_for_value(ctx, realm, arguments[0]);

    return_value.set(ResultsClass<T>::create_instance(ctx, realm, object_schema));
}

template<typename T>
void RealmClass<T>::object_for_primary_key(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    auto &object_schema = validated_object_schema_for_value(ctx, realm, arguments[0]);
    auto realm_object = realm::Object::get_for_primary_key(ctx, realm, object_schema, arguments[1]);

    if (realm_object.is_valid()) {
        return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
    }
    else {
        return_value.set_undefined();
    }
}

template<typename T>
void RealmClass<T>::create(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2, 3);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    auto &object_schema = validated_object_schema_for_value(ctx, realm, arguments[0]);

    ObjectType object = Value::validated_to_object(ctx, arguments[1], "properties");
    if (Value::is_array(ctx, arguments[1])) {
        object = Schema<T>::dict_for_property_array(ctx, object_schema, object);
    }

    bool update = false;
    if (argc == 3) {
        update = Value::validated_to_boolean(ctx, arguments[2], "update");
    }

    auto realm_object = realm::Object::create<ValueType>(ctx, realm, object_schema, object, update);
    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
void RealmClass<T>::delete_one(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    ObjectType arg = Value::validated_to_object(ctx, arguments[0]);

    if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
        auto object = get_internal<T, RealmObjectClass<T>>(arg);
        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
        table->move_last_over(object->row().get_index());
    }
    else if (Value::is_array(ctx, arg)) {
        uint32_t length = Object::validated_get_length(ctx, arg);
        for (uint32_t i = length; i--;) {
            ObjectType object = Object::validated_get_object(ctx, arg, i);

            if (!Object::template is_instance<RealmObjectClass<T>>(ctx, object)) {
                throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
            }

            auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
            realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), realm_object->get_object_schema().name);
            table->move_last_over(realm_object->row().get_index());
        }
    }
    else if (Object::template is_instance<ResultsClass<T>>(ctx, arg)) {
        auto results = get_internal<T, ResultsClass<T>>(arg);
        results->clear();
    }
    else if (Object::template is_instance<ListClass<T>>(ctx, arg)) {
        auto list = get_internal<T, ListClass<T>>(arg);
        list->delete_all();
    }
    else {
        throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
    }
}

template<typename T>
void RealmClass<T>::delete_all(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : realm->schema()) {
        ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
    }
}

template<typename T>
void RealmClass<T>::write(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    FunctionType callback = Value::validated_to_function(ctx, arguments[0]);

    realm->begin_transaction();

    try {
        Function<T>::call(ctx, callback, this_object, 0, nullptr);
    }
    catch (std::exception &e) {
        realm->cancel_transaction();
        throw;
    }

    realm->commit_transaction();
}

template<typename T>
void RealmClass<T>::add_listener(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->add_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_listener(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->remove_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0, 1);
    if (argc) {
        validated_notification_name(ctx, arguments[0]);
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->remove_all_notifications();
}

template<typename T>
void RealmClass<T>::close(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->close();
}

} // js
} // realm
