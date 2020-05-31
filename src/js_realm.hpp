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

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_realm_object.hpp"
#include "js_list.hpp"
#include "js_results.hpp"
#include "js_schema.hpp"
#include "js_observable.hpp"
#include "platform.hpp"

#if REALM_ENABLE_SYNC
#include "js_sync.hpp"
#include "sync/async_open_task.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#endif

#include "util/scheduler.hpp"

#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "results.hpp"
#include "shared_realm.hpp"
#include "thread_safe_reference.hpp"

#include <realm/disable_sync_to_disk.hpp>
#include <realm/global_key.hpp>
#include <realm/util/file.hpp>
#include <realm/util/scope_exit.hpp>

#include <cctype>
#include <list>
#include <map>

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

template<typename T> class RealmClass;
template<typename T> class AsyncOpenTaskClass;

template<typename T>
class RealmDelegate : public BindingContext {
private:
    void did_change(std::vector<ObserverState> const&, std::vector<void*> const&, bool) override {
        HANDLESCOPE(m_context)
        notify(m_notifications, "change");
    }

    void schema_did_change(realm::Schema const& schema) override {
        HANDLESCOPE(m_context)
        ObjectType schema_object = Schema<T>::object_for_schema(m_context, schema);
        notify(m_schema_notifications, "schema", schema_object);
    }

    void before_notify() override {
        HANDLESCOPE(m_context)
        notify(m_before_notify_notifications, "beforenotify");
    }

public:
    using GlobalContextType = typename T::GlobalContext;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = js::Value<T>;

    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;

    RealmDelegate(std::weak_ptr<realm::Realm> realm, GlobalContextType ctx)
        : m_context(ctx),
          m_realm(realm)
    {
        SharedRealm sharedRealm = realm.lock();
        m_realm_path = sharedRealm->config().path;
    }

    ~RealmDelegate() {
        on_context_destroy<RealmObjectClass<T>>(m_context, m_realm_path);
        // All protected values need to be unprotected while the context is retained.
        m_defaults.clear();
        m_constructors.clear();
        m_notifications.clear();
        m_schema_notifications.clear();
        m_before_notify_notifications.clear();
    }

    void add_notification(FunctionType notification) {
        add(m_notifications, notification);
    }

    void remove_notification(FunctionType notification) {
        remove(m_notifications, notification);
    }

    void remove_all_notifications() {
        m_notifications.clear();
    }

    void add_schema_notification(FunctionType notification) {
        SharedRealm realm = m_realm.lock();
        // schema change notifications only happen if the Realm has a read transaction active
        realm->read_group();
        add(m_schema_notifications, notification);
    }

    void remove_schema_notification(FunctionType notification) {
        remove(m_schema_notifications, notification);
    }

    void remove_all_schema_notifications() {
        m_schema_notifications.clear();
    }

    void add_before_notify_notification(FunctionType notification) {
        add(m_before_notify_notifications, notification);
    }

    void remove_before_notify_notification(FunctionType notification) {
        remove(m_before_notify_notifications, notification);
    }

    void remove_all_before_notify_notification() {
        m_before_notify_notifications.clear();
    }

    ObjectDefaultsMap m_defaults;
    ConstructorMap m_constructors;

  private:
    Protected<GlobalContextType> m_context;
    std::list<Protected<FunctionType>> m_notifications;
    std::list<Protected<FunctionType>> m_schema_notifications;
    std::list<Protected<FunctionType>> m_before_notify_notifications;
    std::weak_ptr<realm::Realm> m_realm;
    std::string m_realm_path;

    void add(std::list<Protected<FunctionType>>& notifications, FunctionType fn) {
        if (std::find(notifications.begin(), notifications.end(), fn) != notifications.end()) {
            return;
        }
        notifications.emplace_back(m_context, std::move(fn));
    }

    void remove(std::list<Protected<FunctionType>>& notifications, FunctionType fn) {
        // This doesn't just call remove() because that would create a new Protected<FunctionType>
        notifications.remove_if([&](auto& notification) { return notification == fn; });
    }

    // Note that this intentionally copies the `notifications` argument as we
    // want to iterate over a copy in case the user adds/removes notifications
    // from inside the handler
    template<typename... Args>
    void notify(std::list<Protected<FunctionType>> notifications, const char *name, Args&&... args) {
        if (notifications.empty()) {
            return;
        }

        auto realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }

        ObjectType realm_object = create_object<T, RealmClass<T>>(m_context, new SharedRealm(realm));
        ValueType arguments[] = {realm_object, Value::from_string(m_context, name), args...};
        auto argc = std::distance(std::begin(arguments), std::end(arguments));

        for (auto &callback : notifications) {
            Function<T>::callback(m_context, callback, realm_object, argc, arguments);
        }
    }

    friend class RealmClass<T>;
};

std::string default_path();
void set_default_path(std::string path);
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
#if REALM_ENABLE_SYNC
    using RealmCallbackHandler = void(ThreadSafeReference&& realm, std::exception_ptr error);
#endif

public:
    using ObjectDefaults = typename Schema<T>::ObjectDefaults;
    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;

    using WaitHandler = void(std::error_code);
    using ProgressHandler = void(uint64_t transferred_bytes, uint64_t transferrable_bytes);


    static FunctionType create_constructor(ContextType);

    // methods
    static void objects(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void object_for_primary_key(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void create(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void delete_one(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void delete_all(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void write(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void begin_transaction(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void commit_transaction(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void cancel_transaction(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void wait_for_download_completion(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void close(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void compact(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void writeCopyTo(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void delete_model(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void object_for_object_id(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void privileges(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void get_schema_name_from_object(ContextType, ObjectType, Arguments &, ReturnValue&);
    static void update_schema(ContextType, ObjectType, Arguments &, ReturnValue&);

#if REALM_ENABLE_SYNC
    static void async_open_realm(ContextType, ObjectType, Arguments &, ReturnValue&);
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
    static void get_is_partial_realm(ContextType, ObjectType, ReturnValue &);
#endif

    // static methods
    static void constructor(ContextType, ObjectType, Arguments &);
    static SharedRealm create_shared_realm(ContextType, realm::Realm::Config, bool, ObjectDefaultsMap &&, ConstructorMap &&);
    static bool get_realm_config(ContextType ctx, size_t argc, const ValueType arguments[], realm::Realm::Config &, ObjectDefaultsMap &, ConstructorMap &);
    static void set_binding_context(ContextType ctx, std::shared_ptr<Realm> const& realm, bool schema_updated, ObjectDefaultsMap&& defaults, ConstructorMap&& constructors);

    static void schema_version(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void clear_test_state(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void copy_bundled_realm_files(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void delete_file(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void realm_file_exists(ContextType, ObjectType, Arguments &, ReturnValue &);

    static void create_user_agent_description(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void extend_query_based_schema(ContextType, ObjectType, Arguments &, ReturnValue &);

    // static properties
    static void get_default_path(ContextType, ObjectType, ReturnValue &);
    static void set_default_path(ContextType, ObjectType, ValueType value);

    std::string const name = "Realm";

    MethodMap<T> const static_methods = {
        {"schemaVersion", wrap<schema_version>},
        {"clearTestState", wrap<clear_test_state>},
        {"copyBundledRealmFiles", wrap<copy_bundled_realm_files>},
        {"deleteFile", wrap<delete_file>},
        {"exists", wrap<realm_file_exists>},
        {"_createUserAgentDescription", wrap<create_user_agent_description>},
        {"_extendQueryBasedSchema", wrap<extend_query_based_schema>},
#if REALM_ENABLE_SYNC
        {"_asyncOpen", wrap<async_open_realm>},
#endif
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
        {"writeCopyTo", wrap<writeCopyTo>},
        {"deleteModel", wrap<delete_model>},
        {"privileges", wrap<privileges>},
        {"_updateSchema", wrap<update_schema>},
        {"_objectForObjectId", wrap<object_for_object_id>},
        {"_schemaName", wrap<get_schema_name_from_object>},
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
        {"_isPartialRealm", {wrap<get_is_partial_realm>, nullptr}},
#endif
    };

  private:
    static const ObjectSchema& validated_object_schema_for_value(ContextType ctx, const SharedRealm &realm, const ValueType &value) {
        std::string object_type;

        // If argument is a constructor function, expect that the same constructor was used when specifying the schema.
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
            // Any other argument is expected to be able to be converted to a String containg the name of the
            // internal class.
            object_type = Value::validated_to_string(ctx, value, "objectType");
            if (object_type.empty()) {
                throw std::runtime_error("objectType cannot be empty");
            }
        }

        // Beginning a read transaction may reread the schema, invalidating the
        // pointer that we're returning. Avoid this by ensuring that we're in a
        // read transaction before we search the schema.
        realm->read_group();

        auto &schema = realm->schema();
        auto object_schema = schema.find(object_type);

        if (object_schema == schema.end()) {
            throw std::runtime_error("Object type '" + object_type + "' not found in schema.");
        }
        return *object_schema;
    }

    static realm::Realm::Config validate_and_normalize_config(ContextType ctx, ValueType value) {
        if (!Value::is_object(ctx, value)) {
            throw std::runtime_error("Invalid argument, expected a Realm configuration object");
        }

        ObjectType config_object = Value::validated_to_object(ctx, value);
        realm::Realm::Config config;

        static const String path_string = "path";
        ValueType path_value = Object::get_property(ctx, config_object, path_string);
        if (!Value::is_undefined(ctx, path_value)) {
            config.path = Value::validated_to_string(ctx, path_value, "path");
        }
        else {
#if REALM_ENABLE_SYNC
            ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
            if (!Value::is_undefined(ctx, sync_config_value)) {
                SyncClass<T>::populate_sync_config(ctx, Value::validated_to_object(ctx, Object::get_global(ctx, "Realm")), config_object, config);
            }
#endif

            if (config.path.empty()) {
                config.path = js::default_path();
            }
        }

        config.path = normalize_realm_path(config.path);
        return config;
    }
};

template<typename T>
inline typename T::Function RealmClass<T>::create_constructor(ContextType ctx) {
    FunctionType realm_constructor = ObjectWrap<T, RealmClass<T>>::create_constructor(ctx);
    FunctionType collection_constructor = ObjectWrap<T, CollectionClass<T>>::create_constructor(ctx);
    FunctionType list_constructor = ObjectWrap<T, ListClass<T>>::create_constructor(ctx);
    FunctionType realm_object_constructor = ObjectWrap<T, RealmObjectClass<T>>::create_constructor(ctx);
    FunctionType results_constructor = ObjectWrap<T, ResultsClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, realm_constructor, "Collection", collection_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "List", list_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "Results", results_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "Object", realm_object_constructor, attributes);

#if REALM_ENABLE_SYNC
    FunctionType sync_constructor = SyncClass<T>::create_constructor(ctx);
    Object::set_property(ctx, realm_constructor, "Sync", sync_constructor, attributes);

	AsyncOpenTaskClass<T>::create_constructor(ctx);
	SubscriptionClass<T>::create_constructor(ctx);
#endif

    if (getenv("REALM_DISABLE_SYNC_TO_DISK")) {
        realm::disable_sync_to_disk();
    }

    Object::set_global(ctx, "Realm", realm_constructor);
    return realm_constructor;
}

template<typename T>
bool RealmClass<T>::get_realm_config(ContextType ctx, size_t argc, const ValueType arguments[], realm::Realm::Config& config, ObjectDefaultsMap& defaults, ConstructorMap& constructors) {
    bool schema_updated = false;

    if (argc > 1) {
        throw std::runtime_error("Invalid arguments when constructing 'Realm'");
    }

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
            static const String fifo_fallback_path_string = "fifoFilesFallbackPath";
            ValueType fallback_path_value = Object::get_property(ctx, object, fifo_fallback_path_string);
            if (!Value::is_undefined(ctx, fallback_path_value)) {
                config.fifo_files_fallback_path = Value::validated_to_string(ctx, fallback_path_value, "fifoFilesFallbackPath");
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
#if REALM_ENABLE_SYNC
                // Ensure that the permissions and ResultSets object definitions
                // are present in the schema for query-based sync
                if (config.sync_config && config.sync_config->is_partial) {
                    auto realm_constructor = Value::validated_to_object(ctx, Object::get_global(ctx, "Realm"));
                    Object::call_method(ctx, realm_constructor, "_extendQueryBasedSchema", 1, &schema_value);
                }
#endif
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

                FunctionType should_compact_on_launch_function = Value::validated_to_function(ctx, compact_value, "shouldCompactOnLaunch");
                config.should_compact_on_launch_function = [=](uint64_t total_bytes, uint64_t used_bytes) {
                    ValueType arguments[2] = {
                        Value::from_number(ctx, total_bytes),
                        Value::from_number(ctx, used_bytes)
                    };

                    ValueType should_compact = Function<T>::callback(ctx, should_compact_on_launch_function, {}, 2, arguments);
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
                    // the migration function called early so the binding context might not be set
                    if (!realm->m_binding_context) {
                        realm->m_binding_context.reset(new RealmDelegate<T>(realm, Context<T>::get_global_context(ctx)));
                    }

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

            static const String automatic_change_notifications_string = "_automaticChangeNotifications";
            ValueType automatic_change_notifications_value = Object::get_property(ctx, object, automatic_change_notifications_string);
            if (!Value::is_undefined(ctx, automatic_change_notifications_value)) {
                config.automatic_change_notifications = Value::validated_to_boolean(ctx, automatic_change_notifications_value, "_automaticChangeNotifications");
            }

            static const String disable_format_upgrade_string = "disableFormatUpgrade";
            ValueType disable_format_upgrade_value = Object::get_property(ctx, object, disable_format_upgrade_string);
            if (!Value::is_undefined(ctx, disable_format_upgrade_value)) {
                config.disable_format_upgrade = Value::validated_to_boolean(ctx, disable_format_upgrade_value, "disableFormatUpgrade");
            }
        }
    }

    config.path = normalize_realm_path(config.path);
    ensure_directory_exists_for_file(config.path);
    return schema_updated;
}

template<typename T>
void RealmClass<T>::constructor(ContextType ctx, ObjectType this_object, Arguments& args) {
    set_internal<T, RealmClass<T>>(ctx, this_object, nullptr);
    realm::Realm::Config config;
    ObjectDefaultsMap defaults;
    ConstructorMap constructors;
    bool schema_updated = get_realm_config(ctx, args.count, args.value, config, defaults, constructors);
    auto realm = create_shared_realm(ctx, config, schema_updated, std::move(defaults), std::move(constructors));

    set_internal<T, RealmClass<T>>(ctx, this_object, new SharedRealm(realm));
}

template<typename T>
SharedRealm RealmClass<T>::create_shared_realm(ContextType ctx, realm::Realm::Config config, bool schema_updated,
                                               ObjectDefaultsMap&& defaults, ConstructorMap&& constructors) {
    config.scheduler = realm::util::Scheduler::make_default();

    SharedRealm realm;
    realm = realm::Realm::get_shared_realm(config);
    set_binding_context(ctx, realm, schema_updated, std::move(defaults), std::move(constructors));

    return realm;
}

template<typename T>
void RealmClass<T>::set_binding_context(ContextType ctx, std::shared_ptr<Realm> const& realm, bool schema_updated,
                                        ObjectDefaultsMap&& defaults, ConstructorMap&& constructors) {
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
#if REALM_ENABLE_SYNC
    // For query-based Realms we need to register the constructors for the
    // permissions types even if a schema isn't specified
    else if (realm->is_partial() && js_binding_context->m_constructors.empty()) {
        ValueType schema_value = Object::create_array(ctx);
        auto realm_constructor = Value::validated_to_object(ctx, Object::get_global(ctx, "Realm"));
        Object::call_method(ctx, realm_constructor, "_extendQueryBasedSchema", 1, &schema_value);
        Schema<T>::parse_schema(ctx, Value::to_object(ctx, schema_value), defaults, constructors);
        js_binding_context->m_defaults = std::move(defaults);
        js_binding_context->m_constructors = std::move(constructors);
    }
#endif
}

template<typename T>
void RealmClass<T>::schema_version(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
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
void RealmClass<T>::clear_test_state(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    js::clear_test_state();
}

template<typename T>
void RealmClass<T>::copy_bundled_realm_files(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    realm::copy_bundled_realm_files();
}

template<typename T>
void RealmClass<T>::delete_file(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    ValueType value = args[0];
    std::string realm_file_path = validate_and_normalize_config(ctx, value).path;
    realm::remove_file(realm_file_path);
    realm::remove_file(realm_file_path + ".lock");
    realm::remove_file(realm_file_path + ".note");
    realm::remove_directory(realm_file_path + ".management");
}

template<typename T>
void RealmClass<T>::realm_file_exists(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    ValueType value = args[0];
    std::string realm_file_path = validate_and_normalize_config(ctx, value).path;
    return_value.set(File::exists(realm_file_path));
}

template<typename T>
void RealmClass<T>::delete_model(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    ValueType value = args[0];

    SharedRealm& realm = *get_internal<T, RealmClass<T>>(ctx, this_object);

    auto& config = realm->config();
    if (config.schema_mode == SchemaMode::Immutable || config.schema_mode == SchemaMode::Additive || config.schema_mode == SchemaMode::ReadOnlyAlternative) {
        throw std::runtime_error("Cannot delete model for a read-only or a synced Realm.");
    }

    realm->verify_open();
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }


    Group& group = realm->read_group();
    std::string model_name = Value::validated_to_string(ctx, value, "deleteModel");
    ObjectStore::delete_data_for_object(group, model_name);
    if (!realm->is_in_migration()) {
        realm::Schema new_schema = ObjectStore::schema_from_group(group);
        realm->update_schema(new_schema,
                             realm->schema_version() + 1,
                             nullptr,
                             nullptr,
                             true);
    }
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
    SharedRealm& realm = *get_internal<T, RealmClass<T>>(ctx, object);
    bool is_empty = ObjectStore::is_empty(realm->read_group());
    return_value.set(is_empty);
}

template<typename T>
void RealmClass<T>::get_path(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string path = get_internal<T, RealmClass<T>>(ctx, object)->get()->config().path;
    return_value.set(path);
}

template<typename T>
void RealmClass<T>::get_schema_version(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    double version = get_internal<T, RealmClass<T>>(ctx, object)->get()->schema_version();
    return_value.set(version);
}

template<typename T>
void RealmClass<T>::get_schema(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto& schema = get_internal<T, RealmClass<T>>(ctx, object)->get()->schema();
    ObjectType schema_object = Schema<T>::object_for_schema(ctx, schema);
    return_value.set(schema_object);
}

template<typename T>
void RealmClass<T>::get_in_memory(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(ctx, object)->get()->config().in_memory);
}

template<typename T>
void RealmClass<T>::get_read_only(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(ctx, object)->get()->config().immutable());
}

template<typename T>
void RealmClass<T>::get_is_in_transaction(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(ctx, object)->get()->is_in_transaction());
}

template<typename T>
void RealmClass<T>::get_is_closed(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(ctx, object)->get()->is_closed());
}

#if REALM_ENABLE_SYNC
template<typename T>
void RealmClass<T>::get_sync_session(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto realm = *get_internal<T, RealmClass<T>>(ctx, object);
    if (std::shared_ptr<SyncSession> session = SyncManager::shared().get_existing_active_session(realm->config().path)) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    } else {
        return_value.set_null();
    }

}

template<typename T>
void RealmClass<T>::get_is_partial_realm(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto realm = *get_internal<T, RealmClass<T>>(ctx, object);
    auto config = realm->config();
    return_value.set(config.sync_config && config.sync_config->is_partial);
}

#endif

#if REALM_ENABLE_SYNC
template<typename T>
void RealmClass<T>::async_open_realm(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);
    auto callback_function = Value::validated_to_function(ctx, args[0 + (args.count == 2)]);
    Realm::Config config;
    ObjectDefaultsMap defaults;
    ConstructorMap constructors;
    bool schema_updated = get_realm_config(ctx, args.count - 1, args.value, config, defaults, constructors);

    if (!config.sync_config) {
        throw std::logic_error("_asyncOpen can only be used on a synchronized Realm.");
    }

    Protected<FunctionType> protected_callback(ctx, callback_function);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto& user = config.sync_config->user;
    if (user && user->state() == SyncUser::State::Error) {
        ObjectType object = Object::create_empty(protected_ctx);
        Object::set_property(protected_ctx, object, "message",
                             Value::from_string(protected_ctx, "Cannot asynchronously open synced Realm because the associated session previously experienced a fatal error"));
        Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, 1));

        ValueType callback_arguments[1];
        callback_arguments[0] = object;
        Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, callback_arguments);
    }

    std::shared_ptr<AsyncOpenTask> task;
    task = Realm::get_synchronized_realm(config);

    EventLoopDispatcher<RealmCallbackHandler> callback_handler([=, defaults = std::move(defaults), constructors = std::move(constructors)]
                                                               (ThreadSafeReference&& realm_ref, std::exception_ptr error) {
        HANDLESCOPE(protected_ctx)

        if (error) {
            try {
                std::rethrow_exception(error);
            } catch (const std::system_error& e) {
                ObjectType object = Object::create_empty(protected_ctx);
                Object::set_property(protected_ctx, object, "message", Value::from_string(protected_ctx, e.what()));
                Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, 1));

                ValueType callback_arguments[2];
                callback_arguments[0] = Value::from_undefined(protected_ctx);
                callback_arguments[1] = object;
                Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
                return;
            }
        }

        auto def = std::move(defaults);
        auto ctor = std::move(constructors);
        const SharedRealm realm = Realm::get_shared_realm(std::move(realm_ref), util::Scheduler::make_default());
        set_binding_context(protected_ctx, realm, schema_updated, std::move(def), std::move(ctor));
        ObjectType object = create_object<T, RealmClass<T>>(protected_ctx, new SharedRealm(realm));

        ValueType callback_arguments[2];
        callback_arguments[0] = object;
        callback_arguments[1] = Value::from_null(protected_ctx);
        Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
    });

    task->start(callback_handler);
    return_value.set(create_object<T, AsyncOpenTaskClass<T>>(ctx, new std::shared_ptr<AsyncOpenTask>(task)));
}
#endif

template<typename T>
void RealmClass<T>::objects(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    auto& object_schema = validated_object_schema_for_value(ctx, realm, args[0]);
    return_value.set(ResultsClass<T>::create_instance(ctx, realm, object_schema.name));
}

template<typename T>
void RealmClass<T>::object_for_primary_key(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    std::string object_type;
    auto &object_schema = validated_object_schema_for_value(ctx, realm, args[0]);
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
void RealmClass<T>::create(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(3);
    realm::CreatePolicy policy = realm::CreatePolicy::ForceCreate;
    if (args.count == 3) {
        if (Value::is_boolean(ctx, args[2])) {
            // Deprecated API
            if (Value::validated_to_boolean(ctx, args[2])) {
                policy = realm::CreatePolicy::UpdateAll;
            }
            else {
                policy = realm::CreatePolicy::ForceCreate;
            }
        }
        else if (Value::is_string(ctx, args[2])) {
            // New API accepting an updateMode parameter
            std::string mode = Value::validated_to_string(ctx, args[2]);
            if (mode == "never") {
                policy = realm::CreatePolicy::ForceCreate;
            }
            else if (mode == "modified") {
                policy = realm::CreatePolicy::UpdateModified;
            }
            else if (mode == "all") {
                policy = realm::CreatePolicy::UpdateAll;
            } else {
                throw std::runtime_error("Unsupported 'updateMode'. Only 'never', 'modified' or 'all' is supported.");
            }
        }
        else {
            throw std::runtime_error("Unsupported 'updateMode'. Only the strings 'never', 'modified' or 'all' is supported.");
        }
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();
    auto &object_schema = validated_object_schema_for_value(ctx, realm, args[0]);

    ObjectType object = Value::validated_to_object(ctx, args[1], "properties");
    if (Value::is_array(ctx, args[1])) {
        object = Schema<T>::dict_for_property_array(ctx, object_schema, object);
    }

    NativeAccessor accessor(ctx, realm, object_schema);
    auto realm_object = realm::Object::create<ValueType>(accessor, realm, object_schema, object, policy);
    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
void RealmClass<T>::delete_one(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    ObjectType arg = Value::validated_to_object(ctx, args[0], "object");

    if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
        auto realm_object = get_internal<T, RealmObjectClass<T>>(ctx, arg);
        if (!realm_object) {
            throw std::runtime_error("Invalid argument at index 0");
        }

        if (!realm_object->is_valid()) {
            throw std::runtime_error("Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.");
        }

        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), realm_object->get_object_schema().name);
        table->remove_object(realm_object->obj().get_key());
    }
    else if (Value::is_array(ctx, arg)) {
        uint32_t length = Object::validated_get_length(ctx, arg);
        for (uint32_t i = length; i--;) {
            ObjectType object = Object::validated_get_object(ctx, arg, i);

            if (!Object::template is_instance<RealmObjectClass<T>>(ctx, object)) {
                throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
            }

            auto realm_object = get_internal<T, RealmObjectClass<T>>(ctx, object);
            if (!realm_object) {
               throw std::runtime_error(util::format("Invalid argument at index %1", i));
            }

            realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), realm_object->get_object_schema().name);
            table->remove_object(realm_object->obj().get_key());
        }
    }
    else if (Object::template is_instance<ResultsClass<T>>(ctx, arg)) {
        auto results = get_internal<T, ResultsClass<T>>(ctx, arg);
        results->clear();
    }
    else if (Object::template is_instance<ListClass<T>>(ctx, arg)) {
        auto list = get_internal<T, ListClass<T>>(ctx, arg);
        list->delete_all();
    }
    else {
        throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
    }
}

template<typename T>
void RealmClass<T>::delete_all(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : realm->schema()) {
        auto table = ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name);
        if (realm->is_partial()) {
            realm::Results(realm, table).clear();
        }
        else {
            table->clear();
        }
    }
}

template<typename T>
void RealmClass<T>::write(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
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
void RealmClass<T>::begin_transaction(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->begin_transaction();
}

template<typename T>
void RealmClass<T>::commit_transaction(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->commit_transaction();
}

template<typename T>
void RealmClass<T>::cancel_transaction(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->cancel_transaction();
}

template<typename T>
void RealmClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    std::string name = Value::validated_to_string(ctx, args[0], "notification name");
    auto callback = Value::validated_to_function(ctx, args[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();
    if (name == "change") {
        get_delegate<T>(realm.get())->add_notification(callback);
    }
    else if (name == "beforenotify") {
        get_delegate<T>(realm.get())->add_before_notify_notification(callback);
    }
    else if (name == "schema") {
        get_delegate<T>(realm.get())->add_schema_notification(callback);
    }
    else {
        throw std::runtime_error(util::format("Unknown event name '%1': only 'change', 'schema' and 'beforenotify' are supported.", name));
    }
}

template<typename T>
void RealmClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    std::string name = Value::validated_to_string(ctx, args[0], "notification name");
    auto callback = Value::validated_to_function(ctx, args[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();
    if (name == "change") {
        get_delegate<T>(realm.get())->remove_notification(callback);
    }
    else if (name == "beforenotify") {
        get_delegate<T>(realm.get())->remove_before_notify_notification(callback);
    }
    else if (name == "schema") {
        get_delegate<T>(realm.get())->remove_schema_notification(callback);
    }
    else {
        throw std::runtime_error(util::format("Unknown event name '%1': only 'change', 'schema' and 'beforenotify' are supported", name));
    }
}

template<typename T>
void RealmClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    std::string name = "change";
    if (args.count) {
        name = Value::validated_to_string(ctx, args[0], "notification name");
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->verify_open();
    if (name == "change") {
        get_delegate<T>(realm.get())->remove_all_notifications();
    }
    else if (name == "beforenotify") {
        get_delegate<T>(realm.get())->remove_all_before_notify_notification();
    }
    else if (name == "schema") {
        get_delegate<T>(realm.get())->remove_all_schema_notifications();
    }
    else {
        throw std::runtime_error(util::format("Unknown event name '%1': only 'change', 'schema' and 'beforenotify' are supported", name));
    }
}

template<typename T>
void RealmClass<T>::close(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    realm->close();
}

template<typename T>
void RealmClass<T>::compact(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    if (realm->is_in_transaction()) {
        throw std::runtime_error("Cannot compact a Realm within a transaction.");
    }

    return_value.set(realm->compact());
}

template<typename T>
void RealmClass<T>::writeCopyTo(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    if (args.count == 0) {
        throw std::runtime_error("At least path has to be provided for 'writeCopyTo'");
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);

    ValueType pathValue = args[0];
    if (!Value::is_string(ctx, pathValue)) {
        throw std::runtime_error("Argument to 'writeCopyTo' must be a String.");
    }

    std::string path = Value::validated_to_string(ctx, pathValue);

    if (args.count == 1) {
        BinaryData empty_encryption_key;
        realm->write_copy(path, empty_encryption_key);

        return;
    }

    // enryption key is specified
    ValueType encryption_key_arg = args[1];

    if (!Value::is_binary(ctx, encryption_key_arg)) {
        throw std::runtime_error("Encryption key for 'writeCopyTo' must be a Binary.");
    }

    auto encryption_key = Value::validated_to_binary(ctx, encryption_key_arg);

    realm->write_copy(path, encryption_key.get());
}

template<typename T>
void RealmClass<T>::object_for_object_id(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue& return_value) {
    args.validate_count(2);
    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);

    auto& object_schema = validated_object_schema_for_value(ctx, realm, args[0]);
    std::string object_id_string = Value::validated_to_string(ctx, args[1]);

    const Group& group = realm->read_group();
    auto table = ObjectStore::table_for_object_type(group, object_schema.name);
    auto object_id = GlobalKey::from_string(object_id_string);
    auto object_key = table->get_obj_key(object_id);
    if (object_key) {
        return_value.set(RealmObjectClass<T>::create_instance(ctx, realm::Object(realm, object_schema.name, object_key)));
    }
}

template<typename T>
void RealmClass<T>::get_schema_name_from_object(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue& return_value) {
    args.validate_count(1);

    // Try to map the input to the internal schema name for the given input. This should work for managed objects and
    // schema objects. Pure strings and functions are expected to return a correct value.
    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    auto &object_schema = validated_object_schema_for_value(ctx, realm, args[0]);
    return_value.set(object_schema.name);
}

template<typename T>
void RealmClass<T>::privileges(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

#if REALM_ENABLE_SYNC
    using Privilege = realm::ComputedPrivileges;
    auto has_privilege = [](Privilege actual, Privilege expected) {
        return (static_cast<int>(actual) & static_cast<int>(expected)) == static_cast<int>(expected);
    };

    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    auto config = realm->config();
    if (!(config.sync_config && config.sync_config->is_partial)) {
        throw std::runtime_error("Wrong Realm type. 'privileges()' is only available for Query-based Realms.");
    }
    if (args.count == 0) {
        auto p = realm->get_privileges();
        ObjectType object = Object::create_empty(ctx);
        Object::set_property(ctx, object, "read", Value::from_boolean(ctx, has_privilege(p, Privilege::Read)));
        Object::set_property(ctx, object, "update", Value::from_boolean(ctx,has_privilege(p, Privilege::Update)));
        Object::set_property(ctx, object, "modifySchema", Value::from_boolean(ctx, has_privilege(p, Privilege::ModifySchema)));
        Object::set_property(ctx, object, "setPermissions", Value::from_boolean(ctx, has_privilege(p, Privilege::SetPermissions)));
        return_value.set(object);
        return;
    }

    if (Value::is_object(ctx, args[0])) {
        auto arg = Value::to_object(ctx, args[0]);
        if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
            auto realm_object = get_internal<T, RealmObjectClass<T>>(ctx, arg);
            if (!realm_object) {
                throw std::runtime_error("Invalid argument at index 0");
            }

            auto p = realm->get_privileges(realm_object->obj());

            ObjectType object = Object::create_empty(ctx);
            Object::set_property(ctx, object, "read", Value::from_boolean(ctx, has_privilege(p, Privilege::Read)));
            Object::set_property(ctx, object, "update", Value::from_boolean(ctx,has_privilege(p, Privilege::Update)));
            Object::set_property(ctx, object, "delete", Value::from_boolean(ctx,has_privilege(p, Privilege::Delete)));
            Object::set_property(ctx, object, "setPermissions", Value::from_boolean(ctx, has_privilege(p, Privilege::SetPermissions)));
            return_value.set(object);
            return;
        }
    }

    auto& object_schema = validated_object_schema_for_value(ctx, realm, args[0]);
    auto p = realm->get_privileges(object_schema.name);
    ObjectType object = Object::create_empty(ctx);
    Object::set_property(ctx, object, "read", Value::from_boolean(ctx, has_privilege(p, Privilege::Read)));
    Object::set_property(ctx, object, "update", Value::from_boolean(ctx,has_privilege(p, Privilege::Update)));
    Object::set_property(ctx, object, "create", Value::from_boolean(ctx, has_privilege(p, Privilege::Create)));
    Object::set_property(ctx, object, "subscribe", Value::from_boolean(ctx, has_privilege(p, Privilege::Query)));
    Object::set_property(ctx, object, "setPermissions", Value::from_boolean(ctx, has_privilege(p, Privilege::SetPermissions)));
    return_value.set(object);
#else
    throw std::logic_error("Realm.privileges() can only be used with Query-based Realms.");
#endif
}

/**
 * Updates the schema.
 *
 * TODO: This is exposed as an internal `_updateSchema` API because this should eventually be published as
 * `Realm.schema.update`.
 */
template<typename T>
void RealmClass<T>::update_schema(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    ObjectType schema = Value::validated_to_array(ctx, args[0], "schema");

    // Parse the schema object provided by the user
    ObjectDefaultsMap defaults;
    ConstructorMap constructors;
    realm::Schema parsed_schema = Schema<T>::parse_schema(ctx, schema, defaults, constructors);

    // Get a handle to the Realms group
    SharedRealm realm = *get_internal<T, RealmClass<T>>(ctx, this_object);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only create object schema within a transaction.");
    }

    // Perform the schema update
    realm->update_schema(
        parsed_schema,
        realm->schema_version() + 1,
        nullptr,
        nullptr,
        true
    );
}

// These are replaced by the JS-defined functions when running outside of the RPC environment
template<typename T>
void RealmClass<T>::create_user_agent_description(ContextType, ObjectType, Arguments&, ReturnValue &return_value) {
    return_value.set("RealmJS/RPC");
}

template<typename T>
void RealmClass<T>::extend_query_based_schema(ContextType, ObjectType, Arguments&, ReturnValue &) {
    // don't need to do anything
}

#if REALM_ENABLE_SYNC
template<typename T>
class AsyncOpenTaskClass : public ClassDefinition<T, std::shared_ptr<AsyncOpenTask>> {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;
    using ObjectDefaultsMap = typename Schema<T>::ObjectDefaultsMap;
    using ConstructorMap = typename Schema<T>::ConstructorMap;
    using SyncProgressHandler = void(uint64_t transferred_bytes, uint64_t transferrable_bytes);

public:
    std::string const name = "AsyncOpenTask";

    static FunctionType create_constructor(ContextType);

    static void add_download_notification(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void cancel(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const methods = {
        {"addDownloadNotification", wrap<add_download_notification>},
        {"cancel", wrap<cancel>},
    };
};

template<typename T>
typename T::Function AsyncOpenTaskClass<T>::create_constructor(ContextType ctx) {
    return ObjectWrap<T, AsyncOpenTaskClass<T>>::create_constructor(ctx);
}

template<typename T>
void AsyncOpenTaskClass<T>::cancel(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    std::shared_ptr<AsyncOpenTask> task = *get_internal<T, AsyncOpenTaskClass<T>>(ctx, this_object);
    task->cancel();
}

template<typename T>
void AsyncOpenTaskClass<T>::add_download_notification(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    args.validate_maximum(1);
    auto callback_function = Value::validated_to_function(ctx, args[0]);

    Protected<FunctionType> protected_callback(ctx, callback_function);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    EventLoopDispatcher<SyncProgressHandler> callback_handler([=](uint64_t transferred_bytes, uint64_t transferrable_bytes) mutable {
        HANDLESCOPE(protected_ctx)
        ValueType callback_arguments[2];
        callback_arguments[0] = Value::from_number(protected_ctx, transferred_bytes);
        callback_arguments[1] = Value::from_number(protected_ctx, transferrable_bytes);
        Function::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
    });

    std::shared_ptr<AsyncOpenTask> task = *get_internal<T, AsyncOpenTaskClass<T>>(ctx, this_object);
    task->register_download_progress_notifier(callback_handler); // Ignore token as we don't want to unregister.
}
#endif

} // js
} // realm
