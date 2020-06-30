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

#include "js_class.hpp"
#include "js_collection.hpp"
#include "js_sync_util.hpp"
#include "js_app_credentials.hpp"
#include "js_user_apikey_provider.hpp"

#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_session.hpp"
#include "sync/sync_user.hpp"
#include "sync/app.hpp"
#include "platform.hpp"

namespace realm {
namespace js {

using SharedUser = std::shared_ptr<realm::SyncUser>;
using SharedApp = std::shared_ptr<realm::app::App>;

template<typename T>
class User : public SharedUser {
public:
    User(SharedUser user, SharedApp app) : SharedUser(std::move(user)), m_app(std::move(app)) {}
    User(SharedUser user) : SharedUser(std::move(user)), m_app(nullptr) {}
    User(User &&) = default;

    User& operator=(User &&) = default;
    User& operator=(User const&) = default;

    SharedApp m_app;
};

template<typename T>
class UserClass : public ClassDefinition<T, User<T>> {
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

public:
    std::string const name = "User";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedUser, SharedApp);

    static void get_identity(ContextType, ObjectType, ReturnValue &);
    static void get_token(ContextType, ObjectType, ReturnValue &);
    static void get_profile(ContextType, ObjectType, ReturnValue &);
    static void is_logged_in(ContextType, ObjectType, ReturnValue &);
    static void get_state(ContextType, ObjectType, ReturnValue &);
    static void get_custom_data(ContextType, ObjectType, ReturnValue &);
    static void get_auth_api_keys(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"identity", {wrap<get_identity>, nullptr}},
        {"token", {wrap<get_token>, nullptr}},
        {"profile", {wrap<get_profile>, nullptr}},
        {"isLoggedIn", {wrap<is_logged_in>, nullptr}},
        {"state", {wrap<get_state>, nullptr}},
        {"customData", {wrap<get_custom_data>, nullptr}},
        {"_authApiKeys", {wrap<get_auth_api_keys>, nullptr}},
    };

    MethodMap<T> const static_methods = {
    };

    static void logout(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void session_for_on_disk_path(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void link_credentials(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void call_function(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void refresh_custom_data(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void push_register(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void push_deregister(ContextType, ObjectType, Arguments&, ReturnValue&);


    MethodMap<T> const methods = {
        {"logOut", wrap<logout>},
        {"_sessionForOnDiskPath", wrap<session_for_on_disk_path>},
        {"_linkCredentials", wrap<link_credentials>},
        {"_callFunction", wrap<call_function>},
        {"_refreshCustomData", wrap<refresh_custom_data>},
        {"_pushRegister", wrap<push_register>},
        {"_pushDeregister", wrap<push_deregister>},
    };
};

template<typename T>
inline typename T::Function UserClass<T>::create_constructor(ContextType ctx) {
    FunctionType user_constructor = ObjectWrap<T, UserClass<T>>::create_constructor(ctx);
    return user_constructor;
}

template<typename T>
typename T::Object UserClass<T>::create_instance(ContextType ctx, SharedUser user, SharedApp app) {
    return create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), std::move(app)));
}

template<typename T>
void UserClass<T>::get_identity(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string identity = get_internal<T, UserClass<T>>(ctx, object)->get()->identity();
    return_value.set(identity);
}

template<typename T>
void UserClass<T>::get_token(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string token = get_internal<T, UserClass<T>>(ctx, object)->get()->refresh_token();
    return_value.set(token);
}

template<typename T>
void UserClass<T>::is_logged_in(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto logged_in = get_internal<T, UserClass<T>>(ctx, object)->get()->is_logged_in();
    return_value.set(logged_in);
}

template<typename T>
void UserClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto state = get_internal<T, UserClass<T>>(ctx, object)->get()->state();

    switch (state) {
    case SyncUser::State::LoggedOut:
        return_value.set("LoggedOut");
        break;
    case SyncUser::State::LoggedIn:
        return_value.set("LoggedIn");
        break;
    case SyncUser::State::Removed:
        return_value.set("Removed");
        break;
    }
}

template<typename T>
void UserClass<T>::get_custom_data(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto custom_data = get_internal<T, UserClass<T>>(ctx, object)->get()->custom_data();
    if (!custom_data)
        return return_value.set_null();

    return_value.set(js::Value<T>::from_bson(ctx, *custom_data));
}

template<typename T>
void UserClass<T>::get_profile(ContextType ctx, ObjectType object, ReturnValue& return_value) {
    static const String string_name        = "name";
    static const String string_email       = "email";
    static const String string_picture_url = "pictureUrl";
    static const String string_first_name  = "firstName";
    static const String string_last_name   = "lastName";
    static const String string_gender      = "gender";
    static const String string_birthday    = "birthday";
    static const String string_min_age     = "minAge";
    static const String string_max_age     = "maxAge";

    auto user_profile = get_internal<T, UserClass<T>>(ctx, object)->get()->user_profile();

    auto profile_object = Object::create_empty(ctx);
#define STRING_TO_PROP(propname) \
    util::Optional<std::string> optional_##propname = user_profile.propname; \
    if (optional_##propname ) { \
        Object::set_property(ctx, profile_object, string_##propname, Value::from_string(ctx, *optional_##propname)); \
    }

    STRING_TO_PROP(name)
    STRING_TO_PROP(email)
    STRING_TO_PROP(picture_url)
    STRING_TO_PROP(first_name)
    STRING_TO_PROP(last_name)
    STRING_TO_PROP(gender)
    STRING_TO_PROP(birthday)
    STRING_TO_PROP(min_age)
    STRING_TO_PROP(max_age)
#undef STRING_TO_PROP

    return_value.set(profile_object);
}

template<typename T>
void UserClass<T>::logout(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &) {
    args.validate_count(0);
    get_internal<T, UserClass<T>>(ctx, this_object)->get()->log_out();
}

template<typename T>
void UserClass<T>::link_credentials(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &) {
    args.validate_count(2);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto credentials = *get_internal<T, CredentialsClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "credentials"));
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);

    auto callback_handler([=](SharedUser shared_user, util::Optional<app::AppError> error) {
        HANDLESCOPE(protected_ctx)

        if (error) {
            ObjectType error_object = Object::create_empty(protected_ctx);
            Object::set_property(protected_ctx, error_object, "message", Value::from_string(protected_ctx, error->message));
            Object::set_property(protected_ctx, error_object, "code", Value::from_number(protected_ctx, error->error_code.value()));

            ValueType callback_arguments[2];
            callback_arguments[0] = Value::from_undefined(protected_ctx);
            callback_arguments[1] = error_object;
            Function::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
            return;
        }

        ValueType callback_arguments[2];
        callback_arguments[0] = create_object<T, UserClass<T>>(protected_ctx, new User<T>(std::move(shared_user),
                                                                                          user->m_app));
        callback_arguments[1] = Value::from_undefined(protected_ctx);
        Function::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
    });

    user->m_app->link_user(*user, credentials, callback_handler);
}

template<typename T>
void UserClass<T>::call_function(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &) {
    args.validate_count(4);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto name = Value::validated_to_string(ctx, args[0], "name");
    auto call_args_js = Value::validated_to_array(ctx, args[1], "args");
    auto service = Value::is_undefined(ctx, args[2])
            ? util::none
            : util::Optional<std::string>(Value::validated_to_string(ctx, args[2], "service"));
    auto callback = Value::validated_to_function(ctx, args[3], "callback");

    auto call_args_bson = Value::to_bson(ctx, call_args_js);

    user->m_app->call_function(
        *user,
        name,
        call_args_bson.operator const bson::BsonArray&(),
        service,
        realm::util::EventLoopDispatcher([ctx = Protected(Context<T>::get_global_context(ctx)),
                             callback = Protected(ctx, callback),
                             this_object = Protected(ctx, this_object)]
                            (util::Optional<app::AppError> error, util::Optional<bson::Bson> result) {
            HANDLESCOPE(ctx);
            // Note: reversing argument order.
            Function::callback(ctx, callback, this_object, {
                !result ? Value::from_undefined(ctx) : Value::from_bson(ctx, *result),
                !error ? Value::from_undefined(ctx) : Object::create_obj(ctx, {
                    {"message", Value::from_string(ctx, error->message)},
                    {"code", Value::from_number(ctx, error->error_code.value())},
                }),
            });
        }));
}

template<typename T>
void UserClass<T>::get_auth_api_keys(ContextType ctx, ObjectType this_object, ReturnValue &return_value) {
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    return_value.set(UserAPIKeyProviderClientClass<T>::create_instance(ctx, user->m_app, *user));
}

template<typename T>
void UserClass<T>::refresh_custom_data(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(1);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");

    user->m_app->refresh_custom_data(
        *user,
        realm::util::EventLoopDispatcher([ctx = Protected(Context<T>::get_global_context(ctx)),
                            callback = Protected(ctx, callback),
                            this_object = Protected(ctx, this_object)]
                           (util::Optional<app::AppError> error) {
            HANDLESCOPE(ctx)
            Function::callback(ctx, callback, this_object, {
                !error ? Value::from_undefined(ctx) : Object::create_obj(ctx, {
                    {"message", Value::from_string(ctx, error->message)},
                    {"code", Value::from_number(ctx, error->error_code.value())},
                }),
            });
        }));
}

template<typename T>
void UserClass<T>::push_register(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(3);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto service = Value::validated_to_string(ctx, args[0], "service");
    auto token = Value::validated_to_string(ctx, args[1], "token");
    auto callback = Value::validated_to_function(ctx, args[2], "callback");

    user->m_app->push_notification_client(service).register_device(
        token,
        *user,
        realm::util::EventLoopDispatcher([ctx = Protected(Context<T>::get_global_context(ctx)),
                            callback = Protected(ctx, callback),
                            this_object = Protected(ctx, this_object)]
                           (util::Optional<app::AppError> error) {
            HANDLESCOPE(ctx);
            Function::callback(ctx, callback, this_object, {
                !error ? Value::from_undefined(ctx) : Object::create_obj(ctx, {
                    {"message", Value::from_string(ctx, error->message)},
                    {"code", Value::from_number(ctx, error->error_code.value())},
                }),
            });
        }));
}

template<typename T>
void UserClass<T>::push_deregister(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(2);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto service = Value::validated_to_string(ctx, args[0], "service");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    user->m_app->push_notification_client(service).deregister_device(
        *user,
        realm::util::EventLoopDispatcher([ctx = Protected(Context<T>::get_global_context(ctx)),
                            callback = Protected(ctx, callback),
                            this_object = Protected(ctx, this_object)]
                           (util::Optional<app::AppError> error) {
            HANDLESCOPE(ctx);
            Function::callback(ctx, callback, this_object, {
                !error ? Value::from_undefined(ctx) : Object::create_obj(ctx, {
                    {"message", Value::from_string(ctx, error->message)},
                    {"code", Value::from_number(ctx, error->error_code.value())},
                }),
            });
        }));
}
}
}
