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

#include <cctype>
#include <list>
#include <map>

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_realm_object.hpp"
#include "js_list.hpp"
#include "js_results.hpp"
#include "js_schema.hpp"
#include "js_observable.hpp"

#if REALM_ENABLE_SYNC
#include "js_sync.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#include "sync/partial_sync.hpp"
#endif

#include "shared_realm.hpp"
#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "platform.hpp"
#include "results.hpp"

#include <realm/disable_sync_to_disk.hpp>

namespace realm {
namespace js {

static std::string normalize_realm_path(std::string path) {
#if defined(WIN32) && WIN32
    if (path.size() > 1 && path[0] != '\\' && path[1] != ':') {
        path = default_realm_file_directory() + "\\" + path;
    }
    std::replace(path.begin(), path.end(), '/', '\\');
#else
    if (path.size() && path[0] != '/' && path[0] != '.') {
        path = default_realm_file_directory() + "/" + path;
    }
#endif
    return path;
}

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

    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated, bool version_changed) {
        notify("change");
    }

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
        HANDLESCOPE

        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }

        ObjectType realm_object = create_object<T, RealmClass<T>>(m_context, new SharedRealm(realm));
        ValueType arguments[] = {realm_object, Value::from_string(m_context, notification_name)};

        std::list<Protected<FunctionType>> notifications_copy(m_notifications);
        for (auto &callback : notifications_copy) {
            Function<T>::callback(m_context, callback, realm_object, 2, arguments);
        }
    }

    friend class RealmClass<T>;
};

std::string default_path();
void set_default_path(std::string path);
void delete_all_realms();
void clear_test_state();

template<typename T>
class RealmClass : public ClassDefinition<T, SharedRealm, ObservableClass<T>> {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Arguments = js::Arguments<T>;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using NativeAccessor = realm::js::NativeAccessor<T>;

public:
    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;

    using WaitHandler = void(std::error_code);
    using ProgressHandler = void(uint64_t transferred_bytes, uint64_t transferrable_bytes);


    static FunctionType create_constructor(ContextType);

    // methods
    static void objects(ContextType, ObjectType, Arguments, ReturnValue &);
    static void object_for_primary_key(ContextType, ObjectType, Arguments, ReturnValue &);
    static void create(ContextType, ObjectType, Arguments, ReturnValue &);
    static void delete_one(ContextType, ObjectType, Arguments, ReturnValue &);
    static void delete_all(ContextType, ObjectType, Arguments, ReturnValue &);
    static void write(ContextType, ObjectType, Arguments, ReturnValue &);
    static void begin_transaction(ContextType, ObjectType, Arguments, ReturnValue&);
    static void commit_transaction(ContextType, ObjectType, Arguments, ReturnValue&);
    static void cancel_transaction(ContextType, ObjectType, Arguments, ReturnValue&);
    static void add_listener(ContextType, ObjectType, Arguments, ReturnValue &);
    static void wait_for_download_completion(ContextType, ObjectType, Arguments, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments, ReturnValue &);
    static void close(ContextType, ObjectType, Arguments, ReturnValue &);
    static void compact(ContextType, ObjectType, Arguments, ReturnValue &);
    static void delete_model(ContextType, ObjectType, Arguments, ReturnValue &);
    static void object_for_object_id(ContextType, ObjectType, Arguments, ReturnValue&);
#if REALM_ENABLE_SYNC
    static void subscribe_to_objects(ContextType, ObjectType, Arguments, ReturnValue &);
#endif

    // properties
    static void get_empty(ContextType, ObjectType, ReturnValue &);
    static void get_path(ContextType, ObjectType, ReturnValue &);
    static void get_schema_version(ContextType, ObjectType, ReturnValue &);
    static void get_schema(ContextType, ObjectType, ReturnValue &);
    static void get_in_memory(ContextType, ObjectType, ReturnValue &);
    static void get_read_only(ContextType, ObjectType, ReturnValue &);
    static void get_is_in_transaction(ContextType, ObjectType, ReturnValue &);
    static void get_is_closed(ContextType, ObjectType, ReturnValue &);
#if REALM_ENABLE_SYNC
    static void get_sync_session(ContextType, ObjectType, ReturnValue &);
#endif

    // static methods
    static void constructor(ContextType, ObjectType, size_t, const ValueType[]);
    static SharedRealm create_shared_realm(ContextType, realm::Realm::Config, bool, ObjectDefaultsMap &&, ConstructorMap &&);

    static void schema_version(ContextType, ObjectType, Arguments, ReturnValue &);
    static void clear_test_state(ContextType, ObjectType, Arguments, ReturnValue &);
    static void copy_bundled_realm_files(ContextType, ObjectType, Arguments, ReturnValue &);
    static void delete_file(ContextType, ObjectType, Arguments, ReturnValue &);

    // static properties
    static void get_default_path(ContextType, ObjectType, ReturnValue &);
    static void set_default_path(ContextType, ObjectType, ValueType value);

    std::string const name = "Realm";

    MethodMap<T> const static_methods = {
        {"schemaVersion", wrap<schema_version>},
        {"clearTestState", wrap<clear_test_state>},
        {"copyBundledRealmFiles", wrap<copy_bundled_realm_files>},
        {"deleteFile", wrap<delete_file>},
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
        {"beginTransaction", wrap<begin_transaction>},
        {"commitTransaction", wrap<commit_transaction>},
        {"cancelTransaction", wrap<cancel_transaction>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
        {"close", wrap<close>},
        {"compact", wrap<compact>},
        {"deleteModel", wrap<delete_model>},
        {"_objectForObjectId", wrap<object_for_object_id>},
 #if REALM_ENABLE_SYNC
        {"_waitForDownload", wrap<wait_for_download_completion>},
        {"_subscribeToObjects", wrap<subscribe_to_objects>},
 #endif
    };

    PropertyMap<T> const properties = {
        {"empty", {wrap<get_empty>, nullptr}},
        {"path", {wrap<get_path>, nullptr}},
        {"schemaVersion", {wrap<get_schema_version>, nullptr}},
        {"schema", {wrap<get_schema>, nullptr}},
        {"inMemory", {wrap<get_in_memory>, nullptr}},
        {"readOnly", {wrap<get_read_only>, nullptr}},
        {"isInTransaction", {wrap<get_is_in_transaction>, nullptr}},
        {"isClosed", {wrap<get_is_closed>, nullptr}},
#if REALM_ENABLE_SYNC
        {"syncSession", {wrap<get_sync_session>, nullptr}},
#endif
    };

  private:
    static void handleRealmFileException(ContextType ctx, realm::Realm::Config config, const RealmFileException& ex) {
        switch (ex.kind()) {
            case RealmFileException::Kind::IncompatibleSyncedRealm: {
                ObjectType configuration = Object::create_empty(ctx);
                Object::set_property(ctx, configuration, "path", Value::from_string(ctx, ex.path()));
                Object::set_property(ctx, configuration, "readOnly", Value::from_boolean(ctx, true));
                if (!config.encryption_key.empty()) {
                    Object::set_property(ctx, configuration, "encryption_key", Value::from_binary(ctx, BinaryData(&config.encryption_key[0], 64)));
                }

                ObjectType object = Object::create_empty(ctx);
                Object::set_property(ctx, object, "name", Value::from_string(ctx, "IncompatibleSyncedRealmError"));
                Object::set_property(ctx, object, "configuration", configuration);
                throw Exception<T>(ctx, object);
            }
            default:
                throw;
        }
    }

    static std::string validated_notification_name(ContextType ctx, const ValueType &value) {
        std::string name = Value::validated_to_string(ctx, value, "notification name");
        if (name != "change") {
            throw std::runtime_error("Only the 'change' notification name is supported.");
        }
        return name;
    }

    static const ObjectSchema& validated_object_schema_for_value(ContextType ctx, const SharedRealm &realm, const ValueType &value, std::string& object_type) {
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
            if (object_type.empty()) {
                throw std::runtime_error("objectType cannot be empty");
            }
        }

        auto &schema = realm->schema();
        auto object_schema = schema.find(object_type);

        if (object_schema == schema.end()) {
            throw std::runtime_error("Object type '" + object_type + "' not found in schema.");
        }
        return *object_schema;
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

#if REALM_ENABLE_SYNC
    FunctionType sync_constructor = SyncClass<T>::create_constructor(ctx);
    Object::set_property(ctx, realm_constructor, "Sync", sync_constructor, attributes);
#endif

    if (getenv("REALM_DISABLE_SYNC_TO_DISK")) {
        realm::disable_sync_to_disk();
    }

    Object::set_global(ctx, "Realm", realm_constructor);
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
    ObjectDefaultsMap defaults;
    ConstructorMap constructors;
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

            static const String encryption_key_string = "encryptionKey";
            ValueType encryption_key_value = Object::get_property(ctx, object, encryption_key_string);
            if (!Value::is_undefined(ctx, encryption_key_value)) {
                auto encryption_key = Value::validated_to_binary(ctx, encryption_key_value, "encryptionKey");
                config.encryption_key.assign(encryption_key.data(), encryption_key.data() + encryption_key.size());
            }

#if REALM_ENABLE_SYNC
            SyncClass<T>::populate_sync_config(ctx, Value::validated_to_object(ctx, Object::get_global(ctx, "Realm")), object, config);
#endif

            static const String path_string = "path";
            ValueType path_value = Object::get_property(ctx, object, path_string);
            if (!Value::is_undefined(ctx, path_value)) {
                config.path = Value::validated_to_string(ctx, path_value, "path");
            }
            else if (config.path.empty()) {
                config.path = js::default_path();
            }

            static const String in_memory_string = "inMemory";
            ValueType in_memory_value = Object::get_property(ctx, object, in_memory_string);
            if (!Value::is_undefined(ctx, in_memory_value) && Value::validated_to_boolean(ctx, in_memory_value, "inMemory")) {
                config.in_memory = true;
            }

            static const String read_only_string = "readOnly";
            ValueType read_only_value = Object::get_property(ctx, object, read_only_string);
            if (!Value::is_undefined(ctx, read_only_value) && Value::validated_to_boolean(ctx, read_only_value, "readOnly")) {
                config.schema_mode = SchemaMode::Immutable;
            }

            static const String delete_realm_if_migration_needed_string = "deleteRealmIfMigrationNeeded";
            ValueType delete_realm_if_migration_needed_value = Object::get_property(ctx, object, delete_realm_if_migration_needed_string);
            if (!Value::is_undefined(ctx, delete_realm_if_migration_needed_value) && Value::validated_to_boolean(ctx, delete_realm_if_migration_needed_value, "deleteRealmIfMigrationNeeded")) {
                if (config.schema_mode == SchemaMode::Immutable) {
                    throw std::invalid_argument("Cannot set 'deleteRealmIfMigrationNeeded' when 'readOnly' is set.");
                }

                config.schema_mode = SchemaMode::ResetFile;
            }

            static const String schema_string = "schema";
            ValueType schema_value = Object::get_property(ctx, object, schema_string);
            if (!Value::is_undefined(ctx, schema_value)) {
                ObjectType schema_object = Value::validated_to_array(ctx, schema_value, "schema");
                config.schema.emplace(Schema<T>::parse_schema(ctx, schema_object, defaults, constructors));
                schema_updated = true;
            }

            static const String schema_version_string = "schemaVersion";
            ValueType version_value = Object::get_property(ctx, object, schema_version_string);
            if (!Value::is_undefined(ctx, version_value)) {
                config.schema_version = Value::validated_to_number(ctx, version_value, "schemaVersion");
            }
            else if (schema_updated) {
                config.schema_version = 0;
            }

            static const String compact_on_launch_string = "shouldCompactOnLaunch";
            ValueType compact_value = Object::get_property(ctx, object, compact_on_launch_string);
            if (!Value::is_undefined(ctx, compact_value)) {
                if (config.schema_mode == SchemaMode::Immutable) {
                    throw std::invalid_argument("Cannot set 'shouldCompactOnLaunch' when 'readOnly' is set.");
                }
                if (config.sync_config) {
                    throw std::invalid_argument("Cannot set 'shouldCompactOnLaunch' when 'sync' is set.");
                }

                FunctionType should_compact_on_launch_function = Value::validated_to_function(ctx, compact_value, "shouldCompactOnLaunch");
                config.should_compact_on_launch_function = [=](uint64_t total_bytes, uint64_t unused_bytes) {
                    ValueType arguments[2] = {
                        Value::from_number(ctx, total_bytes),
                        Value::from_number(ctx, unused_bytes)
                    };

                    ValueType should_compact = Function<T>::callback(ctx, should_compact_on_launch_function, this_object, 2, arguments);
                    return Value::to_boolean(ctx, should_compact);
                };
            }

            static const String migration_string = "migration";
            ValueType migration_value = Object::get_property(ctx, object, migration_string);
            if (!Value::is_undefined(ctx, migration_value)) {
                FunctionType migration_function = Value::validated_to_function(ctx, migration_value, "migration");

                if (config.schema_mode == SchemaMode::ResetFile) {
                    throw std::invalid_argument("Cannot include 'migration' when 'deleteRealmIfMigrationNeeded' is set.");
                }

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

            static const String cache_string = "_cache";
            ValueType cache_value = Object::get_property(ctx, object, cache_string);
            if (!Value::is_undefined(ctx, cache_value)) {
                config.cache = Value::validated_to_boolean(ctx, cache_value, "_cache");
            }

            static const String disable_format_upgrade_string = "disableFormatUpgrade";
            ValueType disable_format_upgrade_value = Object::get_property(ctx, object, disable_format_upgrade_string);
            if (!Value::is_undefined(ctx, disable_format_upgrade_value)) {
                config.disable_format_upgrade = Value::validated_to_boolean(ctx, disable_format_upgrade_value, "disableFormatUpgrade");
            }
        }
    }
    else {
        throw std::runtime_error("Invalid arguments when constructing 'Realm'");
    }

    config.path = normalize_realm_path(config.path);
    ensure_directory_exists_for_file(config.path);

    auto realm = create_shared_realm(ctx, config, schema_updated, std::move(defaults), std::move(constructors));

    // Fix for datetime -> timestamp conversion
    convert_outdated_datetime_columns(realm);

    set_internal<T, RealmClass<T>>(this_object, new SharedRealm(realm));
}

template<typename T>
SharedRealm RealmClass<T>::create_shared_realm(ContextType ctx, realm::Realm::Config config, bool schema_updated,
                                        ObjectDefaultsMap && defaults, ConstructorMap && constructors) {
    config.execution_context = Context<T>::get_execution_context_id(ctx);

    SharedRealm realm;
    try {
        realm = realm::Realm::get_shared_realm(config);
    }
    catch (const RealmFileException& ex) {
        handleRealmFileException(ctx, config, ex);
    }
    catch (...) {
        throw;
    }

    GlobalContextType global_context = Context<T>::get_global_context(ctx);
    if (!realm->m_binding_context) {
        realm->m_binding_context.reset(new RealmDelegate<T>(realm, global_context));
    }

    RealmDelegate<T> *js_binding_context = dynamic_cast<RealmDelegate<T> *>(realm->m_binding_context.get());
    REALM_ASSERT(js_binding_context);
    REALM_ASSERT(js_binding_context->m_context == global_context);

    // If a new schema was provided, then use its defaults and constructors.
    if (schema_updated) {
        js_binding_context->m_defaults = std::move(defaults);
        js_binding_context->m_constructors = std::move(constructors);
    }

    return realm;
}

template<typename T>
void RealmClass<T>::schema_version(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(2);

    realm::Realm::Config config;
    config.path = normalize_realm_path(Value::validated_to_string(ctx, args[0]));
    if (args.count == 2) {
        auto encryption_key = Value::validated_to_binary(ctx, args[1], "encryptionKey");
        config.encryption_key.assign(encryption_key.data(), encryption_key.data() + encryption_key.size());
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
void RealmClass<T>::clear_test_state(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);
    js::clear_test_state();
}

template<typename T>
void RealmClass<T>::copy_bundled_realm_files(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);
    realm::copy_bundled_realm_files();
}

template<typename T>
void RealmClass<T>::delete_file(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);

    ValueType value = args[0];
    if (!Value::is_object(ctx, value)) {
        throw std::runtime_error("Invalid argument, expected a Realm configuration object");
    }

    ObjectType object = Value::validated_to_object(ctx, value);
    realm::Realm::Config config;

    static const String path_string = "path";
    ValueType path_value = Object::get_property(ctx, object, path_string);
    if (!Value::is_undefined(ctx, path_value)) {
        config.path = Value::validated_to_string(ctx, path_value, "path");
    }
    else if (config.path.empty()) {
        config.path = js::default_path();
    }

    config.path = normalize_realm_path(config.path);

    std::string realm_file_path = config.path;
    realm::remove_file(realm_file_path);
    realm::remove_file(realm_file_path + ".lock");
    realm::remove_file(realm_file_path + ".note");
    realm::remove_directory(realm_file_path + ".management");

}

template<typename T>
void RealmClass<T>::delete_model(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);
    ValueType value = args[0];

    SharedRealm& realm = *get_internal<T, RealmClass<T>>(this_object);

    std::string model_name = Value::validated_to_string(ctx, value, "deleteModel");
    ObjectStore::delete_data_for_object(realm->read_group(), model_name);
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
void RealmClass<T>::get_empty(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    SharedRealm& realm = *get_internal<T, RealmClass<T>>(object);
    bool is_empty = ObjectStore::is_empty(realm->read_group());
    return_value.set(is_empty);
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
void RealmClass<T>::get_in_memory(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->config().in_memory);
}

template<typename T>
void RealmClass<T>::get_read_only(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->config().immutable());
}

template<typename T>
void RealmClass<T>::get_is_in_transaction(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->is_in_transaction());
}

template<typename T>
void RealmClass<T>::get_is_closed(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->is_closed());
}

#if REALM_ENABLE_SYNC
template<typename T>
void RealmClass<T>::get_sync_session(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto realm = *get_internal<T, RealmClass<T>>(object);
    if (std::shared_ptr<SyncSession> session = SyncManager::shared().get_existing_active_session(realm->config().path)) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    } else {
        return_value.set_null();
    }

}
#endif

#if REALM_ENABLE_SYNC
template<typename T>
void RealmClass<T>::wait_for_download_completion(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(2);
    auto callback_function = Value::validated_to_function(ctx, args[0 + (args.count == 2)]);

    ValueType session_callback = Value::from_null(ctx);
    if (args.count == 2) {
        session_callback = Value::validated_to_function(ctx, args[0]);
    }

    auto realm = *get_internal<T, RealmClass<T>>(this_object);
    auto* sync_config = realm->config().sync_config.get();
    if (!sync_config) {
        throw std::logic_error("_waitForDownload can only be used on a synchronized Realm.");
    }

    Protected<FunctionType> protected_callback(ctx, callback_function);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    std::shared_ptr<SyncUser> user = sync_config->user;
    if (user && user->state() != SyncUser::State::Error) {
        if (auto session = user->session_for_on_disk_path(realm->config().path)) {
            if (!Value::is_null(ctx, session_callback)) {
                FunctionType session_callback_func = Value::to_function(ctx, session_callback);
                auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
                ValueType callback_arguments[1];
                callback_arguments[0] = syncSession;
                Function<T>::callback(protected_ctx, session_callback_func, typename T::Object(), 1, callback_arguments);
            }

            EventLoopDispatcher<WaitHandler> wait_handler([=](std::error_code error_code) {
                HANDLESCOPE
                if (!error_code) {
                    //success
                    Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 0, nullptr);
                }
                else {
                    //fail
                    ObjectType object = Object::create_empty(protected_ctx);
                    Object::set_property(protected_ctx, object, "message", Value::from_string(protected_ctx, error_code.message()));
                    Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, error_code.value()));

                    ValueType callback_arguments[1];
                    callback_arguments[0] = object;

                    Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 1, callback_arguments);
                }
                // Ensure that the session remains alive until the callback has had an opportunity to reopen the Realm
                // with the appropriate schema.
                (void)session;
            });
            session->wait_for_download_completion(std::move(wait_handler));
            return;
        }
    }

    ObjectType object = Object::create_empty(protected_ctx);
    Object::set_property(protected_ctx, object, "message",
                         Value::from_string(protected_ctx, "Cannot asynchronously open synced Realm because the associated session previously experienced a fatal error"));
    Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, 1));

    ValueType callback_arguments[1];
    callback_arguments[0] = object;
    Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, callback_arguments);
}
#endif

template<typename T>
void RealmClass<T>::objects(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type;
    validated_object_schema_for_value(ctx, realm, args[0], object_type);

    return_value.set(ResultsClass<T>::create_instance(ctx, realm, object_type));
}

template<typename T>
void RealmClass<T>::object_for_primary_key(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(2);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type;
    auto &object_schema = validated_object_schema_for_value(ctx, realm, args[0], object_type);
    NativeAccessor accessor(ctx, realm, object_schema);
    auto realm_object = realm::Object::get_for_primary_key(accessor, realm, object_schema, args[1]);

    if (realm_object.is_valid()) {
        return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
    }
    else {
        return_value.set_undefined();
    }
}

template<typename T>
void RealmClass<T>::create(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(3);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();
    std::string object_type;
    auto &object_schema = validated_object_schema_for_value(ctx, realm, args[0], object_type);

    ObjectType object = Value::validated_to_object(ctx, args[1], "properties");
    if (Value::is_array(ctx, args[1])) {
        object = Schema<T>::dict_for_property_array(ctx, object_schema, object);
    }

    bool update = false;
    if (args.count == 3) {
        update = Value::validated_to_boolean(ctx, args[2], "update");
    }

    NativeAccessor accessor(ctx, realm, object_schema);
    auto realm_object = realm::Object::create<ValueType>(accessor, realm, object_schema, object, update);
    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
void RealmClass<T>::delete_one(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    ObjectType arg = Value::validated_to_object(ctx, args[0], "object");

    if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
        auto object = get_internal<T, RealmObjectClass<T>>(arg);
        if (!object->is_valid()) {
            throw std::runtime_error("Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.");
        }

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
void RealmClass<T>::delete_all(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : realm->schema()) {
        ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
    }
}

template<typename T>
void RealmClass<T>::write(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    FunctionType callback = Value::validated_to_function(ctx, args[0]);

    realm->begin_transaction();

    try {
        Function<T>::call(ctx, callback, this_object, 0, nullptr);
    }
    catch (...) {
        realm->cancel_transaction();
        throw;
    }

    realm->commit_transaction();
}

template<typename T>
void RealmClass<T>::begin_transaction(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->begin_transaction();
}

template<typename T>
void RealmClass<T>::commit_transaction(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->commit_transaction();
}

template<typename T>
void RealmClass<T>::cancel_transaction(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->cancel_transaction();
}

template<typename T>
void RealmClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(2);

    validated_notification_name(ctx, args[0]);
    auto callback = Value::validated_to_function(ctx, args[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();
    get_delegate<T>(realm.get())->add_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(2);

    validated_notification_name(ctx, args[0]);
    auto callback = Value::validated_to_function(ctx, args[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();
    get_delegate<T>(realm.get())->remove_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(1);
    if (args.count) {
        validated_notification_name(ctx, args[0]);
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->verify_open();
    get_delegate<T>(realm.get())->remove_all_notifications();
}

template<typename T>
void RealmClass<T>::close(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->close();
}

template<typename T>
void RealmClass<T>::compact(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (realm->is_in_transaction()) {
        throw std::runtime_error("Cannot compact a Realm within a transaction.");
    }

    return_value.set(realm->compact());
}

#if REALM_ENABLE_SYNC
namespace {

// FIXME: Sync should provide this: https://github.com/realm/realm-sync/issues/1796
inline sync::ObjectID object_id_from_string(std::string const& string)
{
    if (string.front() != '{' || string.back() != '}')
        throw std::invalid_argument("Invalid object ID.");

    size_t dash_index = string.find('-');
    if (dash_index == std::string::npos)
        throw std::invalid_argument("Invalid object ID.");

    std::string high_string = string.substr(1, dash_index - 1);
    std::string low_string = string.substr(dash_index + 1, string.size() - dash_index - 2);

    if (high_string.size() == 0 || high_string.size() > 16 || low_string.size() == 0 || low_string.size() > 16)
        throw std::invalid_argument("Invalid object ID.");

    auto isxdigit = static_cast<int(*)(int)>(std::isxdigit);
    if (!std::all_of(high_string.begin(), high_string.end(), isxdigit) ||
        !std::all_of(low_string.begin(), low_string.end(), isxdigit)) {
        throw std::invalid_argument("Invalid object ID.");
    }
    return sync::ObjectID(strtoull(high_string.c_str(), nullptr, 16), strtoull(low_string.c_str(), nullptr, 16));
}

} // unnamed namespace
#endif // REALM_ENABLE_SYNC

template<typename T>
void RealmClass<T>::object_for_object_id(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue& return_value) {
    args.validate_count(2);

#if REALM_ENABLE_SYNC
    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (!sync::has_object_ids(realm->read_group()))
        throw std::logic_error("Realm._objectForObjectId() can only be used with synced Realms.");

    std::string object_type = Value::validated_to_string(ctx, args[0]);
    validated_object_schema_for_value(ctx, realm, args[0], object_type);

    std::string object_id_string = Value::validated_to_string(ctx, args[1]);
    auto object_id = object_id_from_string(object_id_string);

    const Group& group = realm->read_group();
    size_t ndx = sync::row_for_object_id(group, *ObjectStore::table_for_object_type(group, object_type), object_id);
    if (ndx != realm::npos) {
        return_value.set(RealmObjectClass<T>::create_instance(ctx, realm::Object(realm, object_type, ndx)));
    }
#else
    throw std::logic_error("Realm._objectForObjectId() can only be used with synced Realms.");
#endif // REALM_ENABLE_SYNC
}

#if REALM_ENABLE_SYNC
template<typename T>
void RealmClass<T>::subscribe_to_objects(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_count(3);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type = Value::validated_to_string(ctx, args[0]);
    std::string query = Value::validated_to_string(ctx, args[1]);
    auto callback = Value::validated_to_function(ctx, args[2]);

    auto &schema = realm->schema();
    auto object_schema = schema.find(object_type);

    if (object_schema == schema.end()) {
        throw std::runtime_error("Object type '" + object_type + "' not found in schema.");
    }

    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback);
    auto cb = [=](realm::Results results, std::exception_ptr err) {
        HANDLESCOPE

        if (err) {
            try {
                std::rethrow_exception(err);
            }
            catch (const std::exception& e) {
                ValueType callback_arguments[2];
                callback_arguments[0] = Value::from_string(protected_ctx, e.what());
                callback_arguments[1] = Value::from_null(protected_ctx);
                Function<T>::callback(ctx, protected_callback, protected_this, 2, callback_arguments);
            }
            return;
        }

        ValueType callback_arguments[2];
        callback_arguments[0] = Value::from_null(protected_ctx);
        callback_arguments[1] = ResultsClass<T>::create_instance(protected_ctx, results);
        Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
    };

    partial_sync::register_query(realm, object_type, query, std::move(cb));
}
#endif

} // js
} // realm
