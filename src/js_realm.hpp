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
struct RealmClass;

template<typename T>
class RealmDelegate : public BindingContext {
  public:
    using TGlobalContext = typename T::GlobalContext;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;
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

    RealmDelegate(std::weak_ptr<Realm> realm, TGlobalContext ctx) : m_context(ctx), m_realm(realm) {}

    ~RealmDelegate() {
        remove_all_notifications();
    }

    void add_notification(TFunction notification) {
        for (auto &handler : m_notifications) {
            if (handler == notification) {
                return;
            }
        }
        m_notifications.emplace_back(m_context, notification);
    }
    void remove_notification(TFunction notification) {
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
    Protected<TGlobalContext> m_context;
    std::list<Protected<TFunction>> m_notifications;
    std::weak_ptr<Realm> m_realm;
    
    void notify(const char *notification_name) {
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }

        TObject realm_object = create_object<T, RealmClass<T>>(m_context, new SharedRealm(realm));
        TValue arguments[2];
        arguments[0] = realm_object;
        arguments[1] = Value::from_string(m_context, notification_name);

        for (auto callback : m_notifications) {
            Function<T>::call(m_context, callback, realm_object, 2, arguments);
        }
    }
};

std::string default_path();
void set_default_path(std::string path);
void delete_all_realms();

template<typename T>
class Realm {
    using TContext = typename T::Context;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;
    using String = String<T>;
    using Object = Object<T>;
    using Value = Value<T>;
    using ReturnValue = ReturnValue<T>;
    using NativeAccessor = realm::NativeAccessor<TValue, TContext>;

  public:
    static TFunction create_constructor(TContext);

    // methods
    static void objects(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void create(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void delete_one(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void delete_all(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void write(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void add_listener(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void remove_listener(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void remove_all_listeners(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void close(TContext, TObject, size_t, const TValue[], ReturnValue &);

    // properties
    static void get_path(TContext, TObject, ReturnValue &);
    static void get_schema_version(TContext, TObject, ReturnValue &);

    // static methods
    static void constructor(TContext, TObject, size_t, const TValue[]);
    static void schema_version(TContext, TObject, size_t, const TValue[], ReturnValue &);
    static void clear_test_state(TContext, TObject, size_t, const TValue[], ReturnValue &);

    // static properties
    static void get_default_path(TContext, TObject, ReturnValue &);
    static void set_default_path(TContext, TObject, TValue value);

  private:
    static std::string validated_notification_name(TContext ctx, const TValue &value) {
        std::string name = Value::validated_to_string(ctx, value, "notification name");
        if (name != "change") {
            throw std::runtime_error("Only the 'change' notification name is supported.");
        }
        return name;
    }
    
    // converts constructor object or type name to type name
    static std::string validated_object_type_for_value(SharedRealm &realm, TContext ctx, const TValue &value) {
        if (Value::is_constructor(ctx, value)) {
            TFunction constructor = Value::to_constructor(ctx, value);
            
            auto delegate = get_delegate<T>(realm.get());
            for (auto &pair : delegate->m_constructors) {
                if (TFunction(pair.second) == constructor) {
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
struct RealmClass : ClassDefinition<T, SharedRealm> {
    using Realm = Realm<T>;

    std::string const name = "Realm";

    ConstructorType<T>* const constructor = Realm::constructor;

    MethodMap<T> const static_methods = {
        {"schemaVersion", wrap<Realm::schema_version>},
        {"clearTestState", wrap<Realm::clear_test_state>},
    };

    PropertyMap<T> const static_properties = {
        {"defaultPath", {wrap<Realm::get_default_path>, wrap<Realm::set_default_path>}},
    };

    MethodMap<T> const methods = {
        {"objects", wrap<Realm::objects>},
        {"create", wrap<Realm::create>},
        {"delete", wrap<Realm::delete_one>},
        {"deleteAll", wrap<Realm::delete_all>},
        {"write", wrap<Realm::write>},
        {"addListener", wrap<Realm::add_listener>},
        {"removeListener", wrap<Realm::remove_listener>},
        {"removeAllListeners", wrap<Realm::remove_all_listeners>},
        {"close", wrap<Realm::close>},
    };

    PropertyMap<T> const properties = {
        {"path", {wrap<Realm::get_path>, nullptr}},
        {"schemaVersion", {wrap<Realm::get_schema_version>, nullptr}},
    };
};

template<typename T>
inline typename T::Function Realm<T>::create_constructor(TContext ctx) {
    TFunction realm_constructor = ObjectWrap<T, RealmClass<T>>::create_constructor(ctx);
    TFunction collection_constructor = ObjectWrap<T, CollectionClass<T>>::create_constructor(ctx);
    TFunction list_constructor = ObjectWrap<T, ListClass<T>>::create_constructor(ctx);
    TFunction results_constructor = ObjectWrap<T, ResultsClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = PropertyAttributes(ReadOnly | DontEnum | DontDelete);
    Object::set_property(ctx, realm_constructor, "Collection", collection_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "List", list_constructor, attributes);
    Object::set_property(ctx, realm_constructor, "Results", results_constructor, attributes);

    return realm_constructor;
}

template<typename T>
void Realm<T>::constructor(TContext ctx, TObject this_object, size_t argc, const TValue arguments[]) {
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
        TValue value = arguments[0];
        if (Value::is_string(ctx, value)) {
            config.path = Value::validated_to_string(ctx, value, "path");
        }
        else if (Value::is_object(ctx, value)) {
            TObject object = Value::validated_to_object(ctx, value);

            TValue path_value = Object::get_property(ctx, object, path_string);
            if (!Value::is_undefined(ctx, path_value)) {
                config.path = Value::validated_to_string(ctx, path_value, "path");
            }
            else {
                config.path = js::default_path();
            }

            TValue schema_value = Object::get_property(ctx, object, schema_string);
            if (!Value::is_undefined(ctx, schema_value)) {
                TObject schema_object = Value::validated_to_object(ctx, schema_value, "schema");
                config.schema.reset(new realm::Schema(Schema<T>::parse_schema(ctx, schema_object, defaults, constructors)));
            }

            TValue version_value = Object::get_property(ctx, object, schema_version_string);
            if (!Value::is_undefined(ctx, version_value)) {
                config.schema_version = Value::validated_to_number(ctx, version_value, "schemaVersion");
            }
            else {
                config.schema_version = 0;
            }
            
            TValue encryption_key_value = Object::get_property(ctx, object, encryption_key_string);
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
    auto delegate = new RealmDelegate<T>(realm, Context<T>::get_global_context(ctx));

    if (!realm->m_binding_context) {
        realm->m_binding_context.reset(delegate);
    }

    delegate->m_defaults = std::move(defaults);
    delegate->m_constructors = std::move(constructors);

    set_internal<T, RealmClass<T>>(this_object, new SharedRealm(realm));
}

template<typename T>
void Realm<T>::schema_version(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
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
void Realm<T>::clear_test_state(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);
    delete_all_realms();
}

template<typename T>
void Realm<T>::get_default_path(TContext ctx, TObject object, ReturnValue &return_value) {
    return_value.set(realm::js::default_path());
}

template<typename T>
void Realm<T>::set_default_path(TContext ctx, TObject object, TValue value) {
    js::set_default_path(Value::validated_to_string(ctx, value, "defaultPath"));
}

template<typename T>
void Realm<T>::get_path(TContext ctx, TObject object, ReturnValue &return_value) {
    std::string path = get_internal<T, RealmClass<T>>(object)->get()->config().path;
    return_value.set(path);
}

template<typename T>
void Realm<T>::get_schema_version(TContext ctx, TObject object, ReturnValue &return_value) {
    double version = get_internal<T, RealmClass<T>>(object)->get()->config().schema_version;
    return_value.set(version);
}

template<typename T>
void Realm<T>::objects(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string type = validated_object_type_for_value(realm, ctx, arguments[0]);

    return_value.set(Results<T>::create_instance(ctx, realm, type));
}

template<typename T>
void Realm<T>::create(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2, 3);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    std::string className = validated_object_type_for_value(realm, ctx, arguments[0]);
    auto &schema = realm->config().schema;
    auto object_schema = schema->find(className);

    if (object_schema == schema->end()) {
        throw std::runtime_error("Object type '" + className + "' not found in schema.");
    }

    TObject object = Value::validated_to_object(ctx, arguments[1], "properties");
    if (Value::is_array(ctx, arguments[1])) {
        object = Schema<T>::dict_for_property_array(ctx, *object_schema, object);
    }

    bool update = false;
    if (argc == 3) {
        update = Value::validated_to_boolean(ctx, arguments[2], "update");
    }

    auto realm_object = realm::Object::create<TValue>(ctx, realm, *object_schema, object, update);
    return_value.set(RealmObject<T>::create_instance(ctx, realm_object));
}

template<typename T>
void Realm<T>::delete_one(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    TObject arg = Value::validated_to_object(ctx, arguments[0]);

    if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
        auto object = get_internal<T, RealmObjectClass<T>>(arg);
        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->get_object_schema().name);
        table->move_last_over(object->row().get_index());
    }
    else if (Value::is_array(ctx, arg)) {
        uint32_t length = Object::validated_get_length(ctx, arg);
        for (uint32_t i = length; i--;) {
            TObject object = Object::validated_get_object(ctx, arg, i);

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
void Realm<T>::delete_all(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);

    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only delete objects within a transaction.");
    }

    for (auto objectSchema : *realm->config().schema) {
        ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
    }
}

template<typename T>
void Realm<T>::write(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    TFunction callback = Value::validated_to_function(ctx, arguments[0]);

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
void Realm<T>::add_listener(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->add_notification(callback);
}

template<typename T>
void Realm<T>::remove_listener(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    __unused std::string name = validated_notification_name(ctx, arguments[0]);
    auto callback = Value::validated_to_function(ctx, arguments[1]);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->remove_notification(callback);
}

template<typename T>
void Realm<T>::remove_all_listeners(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0, 1);
    if (argc) {
        validated_notification_name(ctx, arguments[0]);
    }

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    get_delegate<T>(realm.get())->remove_all_notifications();
}

template<typename T>
void Realm<T>::close(TContext ctx, TObject this_object, size_t argc, const TValue arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object);
    realm->close();
}

} // js
} // realm
