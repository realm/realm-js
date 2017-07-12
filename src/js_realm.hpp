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
#include "js_observable.hpp"

#if REALM_ENABLE_SYNC
#include "js_sync.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#endif

#include "shared_realm.hpp"
#include "binding_context.hpp"
#include "object_accessor.hpp"
#include "platform.hpp"

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
        ValueType arguments[2];
        arguments[0] = realm_object;
        arguments[1] = Value::from_string(m_context, notification_name);

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
    static void objects(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void object_for_primary_key(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void create(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void delete_one(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void delete_all(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void write(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void add_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void wait_for_download_completion(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_all_listeners(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void close(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // properties
    static void get_empty(ContextType, ObjectType, ReturnValue &);
    static void get_path(ContextType, ObjectType, ReturnValue &);
    static void get_schema_version(ContextType, ObjectType, ReturnValue &);
    static void get_schema(ContextType, ObjectType, ReturnValue &);
    static void get_read_only(ContextType, ObjectType, ReturnValue &);
#if REALM_ENABLE_SYNC
    static void get_sync_session(ContextType, ObjectType, ReturnValue &);
#endif

    // static methods
    static void constructor(ContextType, ObjectType, size_t, const ValueType[]);
    static SharedRealm create_shared_realm(ContextType, realm::Realm::Config, bool, ObjectDefaultsMap &&, ConstructorMap &&);

    static void schema_version(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void clear_test_state(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void copy_bundled_realm_files(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // static properties
    static void get_default_path(ContextType, ObjectType, ReturnValue &);
    static void set_default_path(ContextType, ObjectType, ValueType value);

    std::string const name = "Realm";

    MethodMap<T> const static_methods = {
        {"schemaVersion", wrap<schema_version>},
        {"clearTestState", wrap<clear_test_state>},
        {"copyBundledRealmFiles", wrap<copy_bundled_realm_files>},
        {"_waitForDownload", wrap<wait_for_download_completion>},
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
        {"empty", {wrap<get_empty>, nullptr}},
        {"path", {wrap<get_path>, nullptr}},
        {"schemaVersion", {wrap<get_schema_version>, nullptr}},
        {"schema", {wrap<get_schema>, nullptr}},
        {"readOnly", {wrap<get_read_only>, nullptr}},
#if REALM_ENABLE_SYNC
        {"syncSession", {wrap<get_sync_session>, nullptr}},
#endif
    };

  private:
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
            else if (schema_updated) {
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

    SharedRealm realm = realm::Realm::get_shared_realm(config);

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
void RealmClass<T>::schema_version(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);

    realm::Realm::Config config;
    config.path = normalize_realm_path(Value::validated_to_string(ctx, arguments[0]));
    if (argc == 2) {
        auto encryption_key = Value::validated_to_binary(ctx, arguments[1], "encryptionKey");
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
void RealmClass<T>::clear_test_state(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    js::clear_test_state();
}

template<typename T>
void RealmClass<T>::copy_bundled_realm_files(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void RealmClass<T>::get_read_only(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmClass<T>>(object)->get()->config().read_only());
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

template<typename T>
void RealmClass<T>::wait_for_download_completion(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);
    auto config_object = Value::validated_to_object(ctx, arguments[0]);
    auto callback_function = Value::validated_to_function(ctx, arguments[1]);

#if REALM_ENABLE_SYNC
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (!Value::is_undefined(ctx, sync_config_value)) {
        realm::Realm::Config config;
        config.cache = false;
        static const String encryption_key_string = "encryptionKey";
        ValueType encryption_key_value = Object::get_property(ctx, config_object, encryption_key_string);
        if (!Value::is_undefined(ctx, encryption_key_value)) {
            auto encryption_key = Value::validated_to_binary(ctx, encryption_key_value, "encryptionKey");
            config.encryption_key.assign(encryption_key.data(), encryption_key.data() + encryption_key.size());
        }
        
        Protected<ObjectType> thiz(ctx, this_object);
        SyncClass<T>::populate_sync_config(ctx, thiz, config_object, config);

        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
        
        EventLoopDispatcher<WaitHandler> wait_handler([=](std::error_code error_code) {
            HANDLESCOPE
            if (!error_code) {
                //success
                Function<T>::callback(protected_ctx, protected_callback, protected_this, 0, nullptr);
            }
            else {
                //fail
                ObjectType object = Object::create_empty(protected_ctx);
                Object::set_property(protected_ctx, object, "message", Value::from_string(protected_ctx, error_code.message()));
                Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, error_code.value()));

                ValueType callback_arguments[1];
                callback_arguments[0] = object;
                Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, callback_arguments);
            }
        });
        std::function<WaitHandler> waitFunc = std::move(wait_handler);

        std::function<ProgressHandler> progressFunc; 

        auto realm = realm::Realm::get_shared_realm(config);
        if (auto sync_config = config.sync_config)
        {
            static const String progressFuncName = "_onDownloadProgress";
            bool progressFuncDefined = false;
            if (!Value::is_boolean(ctx, sync_config_value) && !Value::is_undefined(ctx, sync_config_value))
            {
                auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

                ValueType progressFuncValue = Object::get_property(ctx, sync_config_object, progressFuncName);
                progressFuncDefined = !Value::is_undefined(ctx, progressFuncValue);

                if (progressFuncDefined)
                {
                    Protected<FunctionType> protected_progressCallback(protected_ctx, Value::validated_to_function(protected_ctx, progressFuncValue));
                    EventLoopDispatcher<ProgressHandler> progress_handler([=](uint64_t transferred_bytes, uint64_t transferrable_bytes) {
                        HANDLESCOPE
                        ValueType callback_arguments[2];
                        callback_arguments[0] = Value::from_number(protected_ctx, transferred_bytes);
                        callback_arguments[1] = Value::from_number(protected_ctx, transferrable_bytes);

                        Function<T>::callback(protected_ctx, protected_progressCallback, protected_this, 2, callback_arguments);
                    });

                    progressFunc = std::move(progress_handler);
                }
            }

            std::shared_ptr<SyncUser> user = sync_config->user;
            if (user && user->state() != SyncUser::State::Error) {
                if (auto session = user->session_for_on_disk_path(config.path)) {
                    if (progressFuncDefined) {
                        session->register_progress_notifier(std::move(progressFunc), SyncSession::NotifierType::download, false);
                    } 
                    
                    session->wait_for_download_completion([=](std::error_code error_code) {
                        realm->close(); //capture and keep realm instance for until here
                        waitFunc(error_code);
                    });
                    return;
                }
            }

            ObjectType object = Object::create_empty(protected_ctx);
            Object::set_property(protected_ctx, object, "message", Value::from_string(protected_ctx, "Cannot asynchronously open synced Realm, because the associated session previously experienced a fatal error"));
            Object::set_property(protected_ctx, object, "errorCode", Value::from_number(protected_ctx, 1));

            ValueType callback_arguments[1];
            callback_arguments[0] = object;
            Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, callback_arguments);
            return;
        }
    }
#endif

    ValueType callback_arguments[1];
    callback_arguments[0] = Value::from_null(ctx);
    Function<T>::callback(ctx, callback_function, this_object, 1, callback_arguments);
}

template<typename T>
void RealmClass<T>::objects(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type;
    validated_object_schema_for_value(ctx, realm, arguments[0], object_type);

    return_value.set(ResultsClass<T>::create_instance(ctx, realm, object_type));
}

template<typename T>
void RealmClass<T>::object_for_primary_key(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type;
    auto &object_schema = validated_object_schema_for_value(ctx, realm, arguments[0], object_type);
    NativeAccessor accessor(ctx, realm, object_schema);
    auto realm_object = realm::Object::get_for_primary_key(accessor, realm, object_schema, arguments[1]);

    if (realm_object.is_valid()) {
        return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
    }
    else {
        return_value.set_undefined();
    }
}

template<typename T>
void RealmClass<T>::create(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2, 3);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string object_type;
    auto &object_schema = validated_object_schema_for_value(ctx, realm, arguments[0], object_type);

    ObjectType object = Value::validated_to_object(ctx, arguments[1], "properties");
    if (Value::is_array(ctx, arguments[1])) {
        object = Schema<T>::dict_for_property_array(ctx, object_schema, object);
    }

    bool update = false;
    if (argc == 3) {
        update = Value::validated_to_boolean(ctx, arguments[2], "update");
    }

    NativeAccessor accessor(ctx, realm, object_schema);
    auto realm_object = realm::Object::create<ValueType>(accessor, realm, object_schema, object, update);
    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
void RealmClass<T>::delete_one(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    ObjectType arg = Value::validated_to_object(ctx, arguments[0]);

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
void RealmClass<T>::delete_all(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void RealmClass<T>::write(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void RealmClass<T>::add_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (realm->is_closed()) {
        throw ClosedRealmException();
    }
    get_delegate<T>(realm.get())->add_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (realm->is_closed()) {
        throw ClosedRealmException();
    }
    get_delegate<T>(realm.get())->remove_notification(callback);
}

template<typename T>
void RealmClass<T>::remove_all_listeners(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0, 1);
    if (argc) {
        validated_notification_name(ctx, arguments[0]);
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (realm->is_closed()) {
        throw ClosedRealmException();
    }
    get_delegate<T>(realm.get())->remove_all_notifications();
}

template<typename T>
void RealmClass<T>::close(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->close();
}

} // js
} // realm
