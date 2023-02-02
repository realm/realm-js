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

#include <optional>

#include <realm/object-store/sync/generic_network_transport.hpp>
#include <realm/object-store/sync/sync_user.hpp>
#include <realm/object-store/sync/app.hpp>
#include <realm/object-store/sync/app_credentials.hpp>

#include <realm/object-store/util/event_loop_dispatcher.hpp>

#include "platform.hpp"
#include "js_notifications.hpp"
#include "js_user.hpp"
#include "js_app_credentials.hpp"
#include "js_network_transport.hpp"
#include "js_email_password_auth.hpp"
#include "realm/object-store/sync/subscribable.hpp"


using SharedApp = std::shared_ptr<realm::app::App>;
using SharedUser = std::shared_ptr<realm::SyncUser>;
using AppToken = realm::Subscribable<realm::app::App>::Token;

namespace realm {
namespace js {

template <typename T>
class App {
public:
    App(const SharedApp& l)
        : m_app(l)
    {
    }

    // Remove copy constructors to avoid destroying the listener Token
    App(const App&) = delete;
    App& operator=(const App&) = delete;

    notifications::NotificationHandle<T, AppToken> m_notification_handle;

    SharedApp m_app;
};

template <typename T>
class AppClass : public ClassDefinition<T, realm::js::App<T>> {
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
    using NotificationBucket = notifications::NotificationBucket<T, AppToken>;
    using NetworkTransport = JavaScriptNetworkTransport<T>;
    using NetworkTransportFactory = typename NetworkTransport::NetworkTransportFactory;

public:
    const std::string name = "App";


    /**
     * Generates instances of GenericNetworkTransport, eventually allowing Realm Object Store to perform network
     * requests. Exposed to allow other components (ex the RPCServer) to override the underlying implementation.
     */
    static inline NetworkTransportFactory transport_generator =
        +[](ContextType ctx,
            typename NetworkTransport::Dispatcher eld) -> std::unique_ptr<app::GenericNetworkTransport> {
        return std::make_unique<NetworkTransport>(ctx, std::move(eld));
    };

    // These values are overridden at runtime - from app.hpp
    static inline std::string platform = "unknown";
    static inline std::string platform_version = "?.?.?";
    static inline std::string sdk_version = "?.?.?";
    static inline std::string sdk = "unknown";
    static inline std::string cpu_arch = "unknown";
    static inline std::string device_name = "unknown";
    static inline std::string device_version = "?.?.?";
    static inline std::string framework_name = "unknown";
    static inline std::string framework_version = "?.?.?";

    static void constructor(ContextType, ObjectType, Arguments&);
    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp);

    /**
     * Build a user agent string.
     */
    static std::string get_user_agent();

    static void get_app_id(ContextType, ObjectType, ReturnValue&);
    static void get_email_password_auth(ContextType, ObjectType, ReturnValue&);
    static void get_current_user(ContextType, ObjectType, ReturnValue&);
    static void get_all_users(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {{"id", {wrap<get_app_id>, nullptr}},
                                       {"emailPasswordAuth", {wrap<get_email_password_auth>, nullptr}},
                                       {"currentUser", {wrap<get_current_user>, nullptr}},
                                       {"allUsers", {wrap<get_all_users>, nullptr}}};

    static void log_in(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void switch_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void delete_user(ContextType, ObjectType, Arguments&, ReturnValue&);

    // static methods
    static void clear_app_cache(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void get_app(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set_versions(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void add_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_all_listeners(ContextType, ObjectType, Arguments&, ReturnValue&);


    MethodMap<T> const methods = {
        {"_logIn", wrap<log_in>},
        {"switchUser", wrap<switch_user>},
        {"_removeUser", wrap<remove_user>},
        {"_deleteUser", wrap<delete_user>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };

    MethodMap<T> const static_methods = {
        {"_clearAppCache", wrap<clear_app_cache>}, {"_getApp", wrap<get_app>}, {"_setVersions", wrap<set_versions>}};
};

template <typename T>
inline typename T::Function AppClass<T>::create_constructor(ContextType ctx)
{
    return ObjectWrap<T, AppClass<T>>::create_constructor(ctx);
}

template <typename T>
inline typename T::Object AppClass<T>::create_instance(ContextType ctx, SharedApp app)
{
    return create_object<T, AppClass<T>>(ctx, new realm::js::App<T>(app));
}

template <typename T>
void AppClass<T>::constructor(ContextType ctx, ObjectType this_object, Arguments& args)
{
    static const String config_id = "id";
    static const String config_base_url = "baseUrl";
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

        ValueType config_base_url_value = Object::get_property(ctx, config_object, config_base_url);
        if (!Value::is_undefined(ctx, config_base_url_value)) {
            config.base_url =
                std::optional<std::string>(Value::validated_to_string(ctx, config_base_url_value, "baseUrl"));
        }

        ValueType config_timeout_value = Object::get_property(ctx, config_object, config_timeout);
        if (!Value::is_undefined(ctx, config_timeout_value)) {
            config.default_request_timeout_ms =
                std::optional<uint64_t>(Value::validated_to_number(ctx, config_timeout_value, "timeout"));
        }

        ValueType config_app_value = Object::get_property(ctx, config_object, config_app);
        if (!Value::is_undefined(ctx, config_app_value)) {
            ObjectType config_app_object = Value::validated_to_object(ctx, config_app_value, "app");

            ValueType config_app_name_value = Object::get_property(ctx, config_app_object, config_app_name);
            if (!Value::is_undefined(ctx, config_app_name_value)) {
                config.local_app_name =
                    std::optional<std::string>(Value::validated_to_string(ctx, config_app_name_value, "name"));
            }

            ValueType config_app_version_value = Object::get_property(ctx, config_app_object, config_app_version);
            if (!Value::is_undefined(ctx, config_app_version_value)) {
                config.local_app_version =
                    std::optional<std::string>(Value::validated_to_string(ctx, config_app_version_value, "version"));
            }
        }
    }
    else if (Value::is_string(ctx, args[0])) {
        config.app_id = Value::validated_to_string(ctx, args[0]);
    }
    else {
        throw std::runtime_error("Expected either a configuration object or an app id string.");
    }

    config.transport = AppClass<T>::transport_generator(Protected(Context::get_global_context(ctx)),
                                                        NetworkTransport::make_dispatcher());

    config.device_info.platform = platform;
    config.device_info.platform_version = platform_version;
    config.device_info.sdk = sdk;
    config.device_info.sdk_version = sdk_version;
    config.device_info.cpu_arch = cpu_arch;
    config.device_info.device_name = device_name;
    config.device_info.device_version = device_version;
    config.device_info.framework_name = framework_name;
    config.device_info.framework_version = framework_version;

    auto realm_file_directory = default_realm_file_directory();
    ensure_directory_exists_for_file(realm_file_directory);

    SyncClientConfig client_config;
    client_config.base_file_path = realm_file_directory;
    client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
    client_config.user_agent_binding_info = get_user_agent();

    SharedApp app = app::App::get_shared_app(config, client_config);

    set_internal<T, AppClass<T>>(ctx, this_object, new realm::js::App<T>(app));
}

template <typename T>
std::string AppClass<T>::get_user_agent()
{
    return "RealmJS/" + sdk_version + " (" + platform + ", v" + platform_version + ")";
}

template <typename T>
void AppClass<T>::get_app_id(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    return_value.set(Value::from_string(ctx, app->config().app_id));
}

template <typename T>
void AppClass<T>::log_in(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(2);

    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;

    auto credentials_object = Value::validated_to_object(ctx, args[0]);
    auto callback_function = Value::validated_to_function(ctx, args[1]);

    app::AppCredentials app_credentials = *get_internal<T, CredentialsClass<T>>(ctx, credentials_object);

    app->log_in_with_credentials(app_credentials,
                                 Function::wrap_callback_result_first(
                                     ctx, this_object, callback_function, [app](ContextType ctx, SharedUser user) {
                                         REALM_ASSERT_RELEASE(user);
                                         return UserClass<T>::create_instance(ctx, std::move(user), std::move(app));
                                     }));
}

template <typename T>
void AppClass<T>::get_all_users(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;

    auto users = Object::create_empty(ctx);
    for (auto user : app->all_users()) {
        auto&& identity = user->identity();
        Object::set_property(ctx, users, identity,
                             create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), app)),
                             ReadOnly | DontDelete);
    }
    return_value.set(users);
}

template <typename T>
void AppClass<T>::get_current_user(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    auto user = app->current_user();
    if (user) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), std::move(app))));
    }
    else {
        return_value.set_null();
    }
}

template <typename T>
void AppClass<T>::switch_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);

    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    auto user = get_internal<T, UserClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "user"));

    app->switch_user(user->m_user);
    return_value.set(Value::from_undefined(ctx));
}

template <typename T>
void AppClass<T>::remove_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(2);

    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    auto user = get_internal<T, UserClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "user"));
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    app->remove_user(user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

/**
 * @brief Permanently delete the user server-side. Moreover, the user will be logged out
 *        locally, and the current user will be changed. The function is asynchronous
 *        and the callback function will be called when the operation is completed (either successfully
 *        or with an error).
 *
 * @tparam T - The JavaScript engine
 * @param ctx - The JavaScript context/environment
 * @param this_object - The `this` object in JavaScript
 * @param args - An array of arguments: 1) user 2) callback function
 */
template <typename T>
void AppClass<T>::delete_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue&)
{
    args.validate_count(2);

    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    auto user = get_internal<T, UserClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "user"));
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    app->delete_user(user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}


template <typename T>
void AppClass<T>::get_email_password_auth(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto app = get_internal<T, AppClass<T>>(ctx, this_object)->m_app;
    return_value.set(EmailPasswordAuthClass<T>::create_instance(ctx, app));
}

template <typename T>
void AppClass<T>::clear_app_cache(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(0);
    realm::app::App::clear_cached_apps();
}

template <typename T>
void AppClass<T>::get_app(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    auto app_id = Value::validated_to_string(ctx, args[0]);
    if (auto app = app::App::get_cached_app(app_id)) {
        return_value.set(AppClass<T>::create_instance(ctx, app));
    }
    else {
        return_value.set(Value::from_null(ctx));
    }
}

template <typename T>
void AppClass<T>::set_versions(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    auto versions = Value::validated_to_object(ctx, args[0]);

    AppClass<T>::platform = Object::validated_get_string(ctx, versions, "platform");
    AppClass<T>::platform_version = Object::validated_get_string(ctx, versions, "platformVersion");
    AppClass<T>::sdk = Object::validated_get_string(ctx, versions, "sdk");
    AppClass<T>::sdk_version = Object::validated_get_string(ctx, versions, "sdkVersion");
    AppClass<T>::cpu_arch = Object::validated_get_string(ctx, versions, "cpuArch");
    AppClass<T>::device_name = Object::validated_get_string(ctx, versions, "deviceName");
    AppClass<T>::device_version = Object::validated_get_string(ctx, versions, "deviceVersion");
    AppClass<T>::framework_name = Object::validated_get_string(ctx, versions, "frameworkName");
    AppClass<T>::framework_version = Object::validated_get_string(ctx, versions, "frameworkVersion");

    // we are likely on iOS or Android
    if (AppClass<T>::cpu_arch == "unknown") {
        AppClass<T>::cpu_arch = get_cpu_arch();
    }
}

/**
 * @brief Registers an event listener on the SharedApp that fires on various app events.
 * This includes login, logout, switching users, linking users and refreshing custom data.
 *
 * @param ctx JS context
 * @param this_object JS's object holding the `AppClass`
 * @param args Contains a callback that will be called on an event
 * @param return_value \ref void
 */
template <typename T>
void AppClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");
    auto app = get_internal<T, AppClass<T>>(ctx, this_object);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context::get_global_context(ctx));

    auto token = std::move(app->m_app->subscribe([=](const realm::app::App&) {
        Function::callback(protected_ctx, protected_callback, 0, {});
    }));

    NotificationBucket::emplace(app->m_notification_handle, std::move(protected_callback), std::move(token));
}

/**
 * @brief Removes the event listener for the provided callback.
 *
 * @param ctx JS context
 * @param this_object JS's object holding the `AppClass`
 * @param args Contains a callback function that was given to `addListener`
 * @param return_value \ref void
 */
template <typename T>
void AppClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");
    auto app = get_internal<T, AppClass<T>>(ctx, this_object);
    Protected<FunctionType> protected_callback(ctx, callback);

    NotificationBucket::erase(app->m_notification_handle, std::move(protected_callback));
}

/**
 * @brief Removes all registered event listeners.
 *
 * @param ctx JS context
 * @param this_object JS's object holding the `AppClass`
 * @param args No arguments
 * @param return_value \ref void
 */
template <typename T>
void AppClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_count(0);
    auto app = get_internal<T, AppClass<T>>(ctx, this_object);
    NotificationBucket::erase(app->m_notification_handle);
}

} // namespace js
} // namespace realm
