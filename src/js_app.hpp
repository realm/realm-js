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

using SharedApp = std::shared_ptr<realm::app::App>;
using SharedUser = std::shared_ptr<realm::SyncUser>;

namespace realm {
namespace js {

// template<typename T>
// class App : public SharedApp {
// public:
//     App(App const& obj) : realm::app::App(obj) {};
//     App(realm::app::App const& obj) : realm::app::App(obj) {};
//     App(realm::app::App* obj) : realm::app::App(*obj) {};
// };

template<typename T>
class AppClass : public ClassDefinition<T, SharedApp> {
    using AppLoginHandler = std::function<void(SharedUser user, util::Optional<realm::app::AppError> error)>;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

    using NetworkTransport = JavaScriptNetworkTransport<T>;

public:
    const std::string name = "App";

    static void constructor(ContextType, ObjectType, Arguments &);
    static FunctionType create_constructor(ContextType);

    static void get_app_id(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"id", {wrap<get_app_id>, nullptr}},
    };

    static void login(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void all_users(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void current_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void switch_user(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"_login", wrap<login>},
        {"allUsers", wrap<all_users>},
        {"currentUser", wrap<current_user>},
        {"switchUser", wrap<switch_user>},
    };
};

template<typename T>
inline typename T::Function AppClass<T>::create_constructor(ContextType ctx) {
    FunctionType app_constructor = ObjectWrap<T, AppClass<T>>::create_constructor(ctx);
    return app_constructor;
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

    set_internal<T, AppClass<T>>(this_object, nullptr);

    std::string id;
    realm::app::App::Config config;

    if (Value::is_object(ctx, args[0])) {
        ObjectType config_object = Value::validated_to_object(ctx, args[0]);

        ValueType config_id_value = Object::get_property(ctx, config_object, config_id);
        if (!Value::is_undefined(ctx, config_id_value)) {
            config.app_id = Value::validated_to_string(ctx, config_id_value, "id");
        }
        else {
            throw runtime_error("App configuration must have an id.");
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

    // FIXME: should we use a protected ctx?
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    config.transport_generator = [=] {
        return std::make_unique<NetworkTransport>(protected_ctx);
    };

    auto app = std::make_shared<app::App>(realm::app::App(config));
    set_internal<T, AppClass<T>>(this_object, new SharedApp(app));
}

template<typename T>
void AppClass<T>::get_app_id(ContextType ctx, ObjectType this_object, ReturnValue &return_value) {
    auto app = *get_internal<T, AppClass<T>>(this_object);

    // TODO: object store doesn't have such a method

    return_value.set(Value::from_string(ctx, app->app_id()));
}

template<typename T>
void AppClass<T>::login(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    auto app = *get_internal<T, AppClass<T>>(this_object);

    auto credentials_object = Value::validated_to_object(ctx, args[0]);
    auto callback_function = Value::validated_to_function(ctx, args[1]);

    app::AppCredentials app_credentials = *get_internal<T, CredentialsClass<T>>(credentials_object);

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback_function);
    Protected<ObjectType> protected_this(ctx, this_object);

    auto callback_handler([=](SharedUser user, util::Optional<realm::app::AppError> error) {
        HANDLESCOPE
        if (error) {
            ObjectType object = Object::create_empty(protected_ctx);
            Object::set_property(protected_ctx, object, "message", Value::from_string(protected_ctx, error->message));
            Object::set_property(protected_ctx, object, "code", Value::from_number(protected_ctx, error->error_code.value()));

            ValueType callback_arguments[2];
            callback_arguments[0] = Value::from_undefined(protected_ctx);
            callback_arguments[1] = object;
            Function::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
            return;
        }

        ValueType callback_arguments[2];
        callback_arguments[0] = create_object<T, UserClass<T>>(protected_ctx, new User<T>(user, app));
        callback_arguments[1] = Value::from_undefined(protected_ctx);
        Function::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
    });

    app->log_in_with_credentials(app_credentials, std::move(callback_handler));
}

template<typename T>
void AppClass<T>::all_users(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(0);

    auto app = *get_internal<T, AppClass<T>>(this_object);

    auto users = Object::create_empty(ctx);
    for (auto user : app->all_users()) {
        Object::set_property(ctx, users, user->identity(), create_object<T, UserClass<T>>(ctx, new User<T>(user, app)), ReadOnly | DontDelete);
    }
    return_value.set(users);
}

template<typename T>
void AppClass<T>::current_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(0);

    auto app = *get_internal<T, AppClass<T>>(this_object);
    auto user = app->current_user();
    return_value.set(create_object<T, UserClass<T>>(ctx, new User<T>(user, app)));
}


template<typename T>
void AppClass<T>::switch_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);

    auto app = *get_internal<T, AppClass<T>>(this_object);
    auto user = get_internal<T, UserClass<T>>(Value::validated_to_object(ctx, args[0], "user"));

    app->switch_user(*user);
    return_value.set(Value::from_undefined(ctx));
}


}
}
