////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

#include "sync/generic_network_transport.hpp"
#include "sync/sync_user.hpp"
#include "sync/app.hpp"
#include "sync/app_credentials.hpp"

#include "util/event_loop_dispatcher.hpp"

#include "js_user.hpp"
#include "js_app_credentials.hpp"
#include "js_network_transport.hpp"
#include "js_email_password_auth.hpp"

using SharedApp = std::shared_ptr<realm::app::App>;
using SharedUser = std::shared_ptr<realm::SyncUser>;

namespace realm {
namespace js {

template<typename T>
class AppClass : public ClassDefinition<T, SharedApp> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Context = js::Context<T>;
    using String = js::String<T>;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;
    using NetworkTransport = JavaScriptNetworkTransport<T>;
    using NetworkTransportFactory = typename NetworkTransport::NetworkTransportFactory;

public:
    const std::string name = "App";
    
    /**
     * Generates instances of GenericNetworkTransport, eventually allowing Realm Object Store to perform network requests.
     * Exposed to allow other components (ex the RPCServer) to override the underlying implementation.
     */
    static inline NetworkTransportFactory transport_generator = [] (ContextType ctx, typename NetworkTransport::Dispatcher eld) {
        return std::make_unique<NetworkTransport>(ctx, std::move(eld));
    };

    // These values are overridden at runtime
    static inline std::string package_version = "?.?.?";
    static inline std::string platform_context = "unknown-context";
    static inline std::string platform_os = "unknown-os";
    static inline std::string platform_version = "?.?.?";

    static void constructor(ContextType, ObjectType, Arguments &);
    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp);

    /**
     * Build a user agent string.
     */
    static std::string get_user_agent();

    static void get_app_id(ContextType, ObjectType, ReturnValue &);
    static void get_email_password_auth(ContextType, ObjectType, ReturnValue &);
    static void get_current_user(ContextType, ObjectType, ReturnValue &);
    static void get_all_users(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"id", {wrap<get_app_id>, nullptr}},
        {"emailPasswordAuth", {wrap<get_email_password_auth>, nullptr}},
        {"currentUser", {wrap<get_current_user>, nullptr}},
        {"allUsers", {wrap<get_all_users>, nullptr}}
    };

    static void log_in(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void switch_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_user(ContextType, ObjectType, Arguments&, ReturnValue&);

    // static methods
    static void clear_app_cache(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void get_app(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set_versions(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"_logIn", wrap<log_in>},
        {"switchUser", wrap<switch_user>},
        {"_removeUser", wrap<remove_user>},
    };

    MethodMap<T> const static_methods = {
        {"_clearAppCache", wrap<clear_app_cache>},
        {"_getApp", wrap<get_app>},
        {"_setVersions", wrap<set_versions>}
    };
};

template<typename T>
inline typename T::Function AppClass<T>::create_constructor(ContextType ctx) {
    return ObjectWrap<T, AppClass<T>>::create_constructor(ctx);
}

template<typename T>
inline typename T::Object AppClass<T>::create_instance(ContextType ctx, SharedApp app) {
    return create_object<T, AppClass<T>>(ctx, new SharedApp(app));
}

template<typename T>
void AppClass<T>::constructor(ContextType ctx, ObjectType this_object, Arguments& args) {
    static const String config_id = "id";
    static const String config_url = "url";
    static const String config_timeout = "timeout";
    static const String config_app = "app";
    static const String config_app_name = "name";
    static const String config_app_version = "version";

    args.validate_count(1);

    set_internal<T, AppClass<T>>(ctx, this_object, nullptr);

    std::string id;
    realm::app::App::Config config;

    if (Value::is_object(ctx, args[0])) {
        ObjectType config_object = Value::validated_to_object(ctx, args[0]);

        ValueType config_id_value = Object::get_property(ctx, config_object, config_id);
        if (!Value::is_undefined(ctx, config_id_value)) {
            config.app_id = Value::validated_to_string(ctx, config_id_value, "id");
        }
        else {
            throw std::runtime_error("App configuration must have an id.");
        }

        ValueType config_url_value = Object::get_property(ctx, config_object, config_url);
        if (!Value::is_undefined(ctx, config_url_value)) {
            config.base_url = util::Optional<std::string>(Value::validated_to_string(ctx, config_url_value, "url"));
        }

        ValueType config_timeout_value = Object::get_property(ctx, config_object, config_timeout);
        if (!Value::is_undefined(ctx, config_timeout_value)) {
            config.default_request_timeout_ms = util::Optional<uint64_t>(Value::validated_to_number(ctx, config_timeout_value, "timeout"));
        }

        ValueType config_app_value = Object::get_property(ctx, config_object, config_app);
        if (!Value::is_undefined(ctx, config_app_value)) {
            ObjectType config_app_object = Value::validated_to_object(ctx, config_app_value, "app");

            ValueType config_app_name_value = Object::get_property(ctx, config_app_object, config_app_name);
            if (!Value::is_undefined(ctx, config_app_name_value)) {
                config.local_app_name = util::Optional<std::string>(Value::validated_to_string(ctx, config_app_name_value, "name"));
            }

            ValueType config_app_version_value = Object::get_property(ctx, config_app_object, config_app_version);
            if (!Value::is_undefined(ctx, config_app_version_value)) {
                config.local_app_version = util::Optional<std::string>(Value::validated_to_string(ctx, config_app_version_value, "version"));
            }
        }
    }
    else if (Value::is_string(ctx, args[0])) {
        config.app_id = Value::validated_to_string(ctx, args[0]);
    }
    else {
        throw std::runtime_error("Expected either a configuration object or an app id string.");
    }
    
    config.transport_generator = [ctx = Protected(Context::get_global_context(ctx)), eld=NetworkTransport::make_dispatcher()] {
        return AppClass<T>::transport_generator(ctx, eld);
    };

    config.platform = platform_os;
    config.platform_version = platform_version;
    config.sdk_version = "RealmJS/" + package_version;
    
    auto realm_file_directory = default_realm_file_directory();
    ensure_directory_exists_for_file(realm_file_directory);

    SyncClientConfig client_config;
    client_config.base_file_path = realm_file_directory;
    client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
    client_config.user_agent_binding_info = get_user_agent();

    SharedApp app = app::App::get_shared_app(config, client_config);

    set_internal<T, AppClass<T>>(ctx, this_object, new SharedApp(app));
}

template<typename T>
std::string AppClass<T>::get_user_agent() {
    return "RealmJS/" + package_version + " (" + platform_context + ", " + platform_os + ", v" + platform_version + ")";
}

template<typename T>
void AppClass<T>::get_app_id(ContextType ctx, ObjectType this_object, ReturnValue &return_value) {
    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    return_value.set(Value::from_string(ctx, app->config().app_id));
}

template<typename T>
void AppClass<T>::log_in(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);

    auto credentials_object = Value::validated_to_object(ctx, args[0]);
    auto callback_function = Value::validated_to_function(ctx, args[1]);

    app::AppCredentials app_credentials = *get_internal<T, CredentialsClass<T>>(ctx, credentials_object);
    
    app->log_in_with_credentials(app_credentials, Function::wrap_callback_result_first(ctx, this_object, callback_function,
        [app] (ContextType ctx, SharedUser user) {
            REALM_ASSERT_RELEASE(user);
            return UserClass<T>::create_instance(ctx, std::move(user), std::move(app));
        }));

}

template<typename T>
void AppClass<T>::get_all_users(ContextType ctx, ObjectType this_object, ReturnValue& return_value) {
    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);

    auto users = Object::create_empty(ctx);
    for (auto user : app->all_users()) {
        auto&& identity = user->identity();
        Object::set_property(ctx, users, identity, create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), app)), ReadOnly | DontDelete);
    }
    return_value.set(users);
}

template<typename T>
void AppClass<T>::get_current_user(ContextType ctx, ObjectType this_object, ReturnValue& return_value) {
    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    auto user = app->current_user();
    if (user) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), std::move(app))));
    }
    else {
        return_value.set_null();
    }
}

template<typename T>
void AppClass<T>::switch_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);

    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    auto user = get_internal<T, UserClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "user"));

    app->switch_user(*user);
    return_value.set(Value::from_undefined(ctx));
}

template<typename T>
void AppClass<T>::remove_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    auto user = get_internal<T, UserClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "user"));
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    app->remove_user(*user, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void AppClass<T>::get_email_password_auth(ContextType ctx, ObjectType this_object, ReturnValue &return_value) {
    auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    return_value.set(EmailPasswordAuthClass<T>::create_instance(ctx, app));
}

template<typename T>
void AppClass<T>::clear_app_cache(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(0);
    realm::app::App::clear_cached_apps();
}

template<typename T>
void AppClass<T>::get_app(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    auto app_id = Value::validated_to_string(ctx, args[0]);
    if (auto app = app::App::get_cached_app(app_id)) {
        return_value.set(AppClass<T>::create_instance(ctx, app));
    }
    else {
        return_value.set(Value::from_null(ctx));
    }
}

template<typename T>
void AppClass<T>::set_versions(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);
    auto versions = Value::validated_to_object(ctx, args[0]);
    AppClass<T>::package_version = Object::validated_get_string(ctx, versions, "packageVersion");
    AppClass<T>::platform_context = Object::validated_get_string(ctx, versions, "platformContext");
    AppClass<T>::platform_os = Object::validated_get_string(ctx, versions, "platformOs");
    AppClass<T>::platform_version = Object::validated_get_string(ctx, versions, "platformVersion");
}

}
}
