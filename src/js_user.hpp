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
#include "js_app_credentials.hpp"
#include "js_api_key_auth.hpp"
#include "js_network_transport.hpp"

#include <forward_list>
#include <realm/sync/config.hpp>
#include <realm/object-store/sync/mongo_collection.hpp>
#include <realm/object-store/sync/sync_manager.hpp>
#include <realm/object-store/sync/sync_session.hpp>
#include <realm/object-store/sync/sync_user.hpp>
#include <realm/object-store/sync/app.hpp>
#include "js_types.hpp"
#include "platform.hpp"

namespace realm {
namespace js {

using SharedUser = std::shared_ptr<realm::SyncUser>;
using SharedApp = std::shared_ptr<realm::app::App>;
using Token = realm::Subscribable<realm::SyncUser>::Token;
using WatchStream = realm::app::WatchStream;

template <typename T>
class WatchStreamClass : public ClassDefinition<T, WatchStream> {
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
    std::string const name = "WatchStream";

    static void get_state(ContextType, ObjectType, ReturnValue&);
    static void get_error(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"state", {wrap<get_state>, nullptr}},
        {"error", {wrap<get_error>, nullptr}},
    };

    MethodMap<T> const static_methods = {};

    static void feed_buffer(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void next_event(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"feedBuffer", wrap<feed_buffer>},
        {"nextEvent", wrap<next_event>},
    };
};

template <typename T>
void WatchStreamClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    WatchStream* ws = get_internal<T, WatchStreamClass<T>>(ctx, object);
    switch (ws->state()) {
        case WatchStream::HAVE_ERROR:
            return return_value.set(Value::from_string(ctx, "HAVE_ERROR"));
        case WatchStream::HAVE_EVENT:
            return return_value.set(Value::from_string(ctx, "HAVE_EVENT"));
        case WatchStream::NEED_DATA:
            return return_value.set(Value::from_string(ctx, "NEED_DATA"));
    }
    REALM_UNREACHABLE();
}

template <typename T>
void WatchStreamClass<T>::get_error(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    WatchStream* ws = get_internal<T, WatchStreamClass<T>>(ctx, object);
    return return_value.set(Object::create_from_app_error(ctx, ws->error()));
}

template <typename T>
void WatchStreamClass<T>::feed_buffer(ContextType ctx, ObjectType object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    WatchStream* ws = get_internal<T, WatchStreamClass<T>>(ctx, object);
    auto buffer = Value::validated_to_binary(ctx, args[0], "buffer");
    ws->feed_buffer({buffer.data(), buffer.size()});
}

template <typename T>
void WatchStreamClass<T>::next_event(ContextType ctx, ObjectType object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(0);
    WatchStream* ws = get_internal<T, WatchStreamClass<T>>(ctx, object);
    return return_value.set(Value::from_string(ctx, String::from_bson(ws->next_event())));
}

template <typename T>
class User : public SharedUser {
public:
    User(SharedUser user, SharedApp app)
        : m_user(std::move(user))
        , m_app(std::move(app))
    {
    }
    User(SharedUser user)
        : m_user(std::move(user))
        , m_app(nullptr)
    {
    }

    // Remove copy constructors to avoid destroying the listener Token
    User(const User&) = delete;
    User& operator=(const User&) = delete;

    User(User&&) = default;
    User& operator=(User&&) = default;

    using CallbackTokenPair = std::pair<Protected<typename T::Function>, Token>;
    std::forward_list<CallbackTokenPair> m_notification_tokens;

    SharedApp m_app;
    SharedUser m_user;
};

template <typename T>
class UserClass : public ClassDefinition<T, User<T>> {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using StringType = typename T::String;
    using Context = js::Context<T>;
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

    static void get_id(ContextType, ObjectType, ReturnValue&);
    static void get_identities(ContextType, ObjectType, ReturnValue&);
    static void get_access_token(ContextType, ObjectType, ReturnValue&);
    static void get_refresh_token(ContextType, ObjectType, ReturnValue&);
    static void get_profile(ContextType, ObjectType, ReturnValue&);
    static void is_logged_in(ContextType, ObjectType, ReturnValue&);
    static void get_state(ContextType, ObjectType, ReturnValue&);
    static void get_custom_data(ContextType, ObjectType, ReturnValue&);
    static void get_api_keys(ContextType, ObjectType, ReturnValue&);
    static void get_device_id(ContextType, ObjectType, ReturnValue&);
    static void get_provider_type(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"id", {wrap<get_id>, nullptr}},
        {"identities", {wrap<get_identities>, nullptr}},
        {"accessToken", {wrap<get_access_token>, nullptr}},
        {"refreshToken", {wrap<get_refresh_token>, nullptr}},
        {"profile", {wrap<get_profile>, nullptr}},
        {"isLoggedIn", {wrap<is_logged_in>, nullptr}},
        {"state", {wrap<get_state>, nullptr}},
        {"_customData", {wrap<get_custom_data>, nullptr}},
        {"apiKeys", {wrap<get_api_keys>, nullptr}},
        {"deviceId", {wrap<get_device_id>, nullptr}},
        {"providerType", {wrap<get_provider_type>, nullptr}},
    };

    MethodMap<T> const static_methods = {};

    static void logout(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void session_for_on_disk_path(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void link_credentials(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void call_function(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void refresh_custom_data(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void push_register(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void push_deregister(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void make_streaming_request(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void new_watch_stream(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void add_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_listener(ContextType, ObjectType, Arguments&, ReturnValue&);


    MethodMap<T> const methods = {
        {"_logOut", wrap<logout>},
        {"_sessionForOnDiskPath", wrap<session_for_on_disk_path>},
        {"_linkCredentials", wrap<link_credentials>},
        {"_callFunction", wrap<call_function>},
        {"_refreshCustomData", wrap<refresh_custom_data>},
        {"_pushRegister", wrap<push_register>},
        {"_pushDeregister", wrap<push_deregister>},
        {"_makeStreamingRequest", wrap<make_streaming_request>},
        {"_newWatchStream", wrap<new_watch_stream>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
    };
};

template <typename T>
inline typename T::Function UserClass<T>::create_constructor(ContextType ctx)
{
    // WatchStream isn't directly nameable from JS, so we don't need to do anything with the returned function object,
    // but we still need to initialize it here.
    ObjectWrap<T, WatchStreamClass<T>>::create_constructor(ctx);

    return ObjectWrap<T, UserClass<T>>::create_constructor(ctx);
}

template <typename T>
typename T::Object UserClass<T>::create_instance(ContextType ctx, SharedUser user, SharedApp app)
{
    return create_object<T, UserClass<T>>(ctx, new User<T>(std::move(user), std::move(app)));
}

template <typename T>
void UserClass<T>::get_id(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    std::string id = get_internal<T, UserClass<T>>(ctx, object)->m_user->identity();
    return_value.set(id);
}

template <typename T>
void UserClass<T>::get_identities(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    std::vector<SyncUserIdentity> identities = get_internal<T, UserClass<T>>(ctx, object)->m_user->identities();

    std::vector<ValueType> identity_objects;
    for (auto identity : identities) {
        auto identity_object = Object::create_empty(ctx);
        Object::set_property(ctx, identity_object, "id", Value::from_string(ctx, identity.id));
        Object::set_property(ctx, identity_object, "providerType", Value::from_string(ctx, identity.provider_type));
        identity_objects.push_back(identity_object);
    }
    return_value.set(Object::create_array(ctx, identity_objects));
}

template <typename T>
void UserClass<T>::get_device_id(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto user = get_internal<T, UserClass<T>>(ctx, object)->m_user;
    if (user->has_device_id()) {
        return_value.set(user->device_id());
        return;
    }
    return_value.set_null();
}

template <typename T>
void UserClass<T>::get_provider_type(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    std::string provider_type = get_internal<T, UserClass<T>>(ctx, object)->m_user->provider_type();
    return_value.set(provider_type);
}

template <typename T>
void UserClass<T>::get_access_token(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    std::string token = get_internal<T, UserClass<T>>(ctx, object)->m_user->access_token();
    return_value.set(token);
}

template <typename T>
void UserClass<T>::get_refresh_token(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    std::string token = get_internal<T, UserClass<T>>(ctx, object)->m_user->refresh_token();
    return_value.set(token);
}


template <typename T>
void UserClass<T>::is_logged_in(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto logged_in = get_internal<T, UserClass<T>>(ctx, object)->m_user->is_logged_in();
    return_value.set(logged_in);
}

template <typename T>
void UserClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto state = get_internal<T, UserClass<T>>(ctx, object)->m_user->state();

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

template <typename T>
void UserClass<T>::get_custom_data(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto custom_data = get_internal<T, UserClass<T>>(ctx, object)->m_user->custom_data();
    if (!custom_data)
        return return_value.set_null();

    return_value.set(Value::from_string(ctx, String::from_bson(*custom_data)));
}

template <typename T>
void UserClass<T>::get_profile(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    static const String string_name = "name";
    static const String string_email = "email";
    static const String string_picture_url = "pictureUrl";
    static const String string_first_name = "firstName";
    static const String string_last_name = "lastName";
    static const String string_gender = "gender";
    static const String string_birthday = "birthday";
    static const String string_min_age = "minAge";
    static const String string_max_age = "maxAge";

    auto user_profile = get_internal<T, UserClass<T>>(ctx, object)->m_user->user_profile();

    auto profile_object = Object::create_empty(ctx);
#define STRING_TO_PROP(propname)                                                                                     \
    util::Optional<std::string> optional_##propname = user_profile.propname();                                       \
    if (optional_##propname) {                                                                                       \
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

    // copy over metadata
    auto metadata = Value::from_bson(ctx, user_profile.data());
    auto metadata_object = Value::to_object(ctx, metadata);
    auto metadata_keys = Object::get_property_names(ctx, metadata_object);
    for (auto& metadata_key : metadata_keys) {
        ValueType metadata_value = Object::get_property(ctx, metadata_object, metadata_key);
        Object::set_property(ctx, profile_object, metadata_key, metadata_value);
    }
    return_value.set(profile_object);
}

template <typename T>
void UserClass<T>::logout(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue&)
{
    args.validate_count(1);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto callback = Value::validated_to_function(ctx, args[0], "callback");
    user->m_app->log_out(user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template <typename T>
void UserClass<T>::link_credentials(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue&)
{
    args.validate_count(2);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto credentials =
        *get_internal<T, CredentialsClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "credentials"));
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    user->m_app->link_user(user->m_user, credentials,
                           Function::wrap_callback_result_first(
                               ctx, this_object, callback, [user](ContextType ctx, SharedUser shared_user) {
                                   REALM_ASSERT_RELEASE(shared_user);
                                   return create_object<T, UserClass<T>>(
                                       ctx, new User<T>(std::move(shared_user), user->m_app));
                               }));
}

template <typename T>
void UserClass<T>::call_function(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue&)
{
    args.validate_count(4);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto name = Value::validated_to_string(ctx, args[0], "name");
    auto stringified_ejson_args = Value::validated_to_string(ctx, args[1], "args");
    auto service = Value::is_undefined(ctx, args[2])
                       ? util::none
                       : util::Optional<std::string>(Value::validated_to_string(ctx, args[2], "service"));
    auto callback = Value::validated_to_function(ctx, args[3], "callback");

    auto bson_args = String::to_bson(stringified_ejson_args);

    user->m_app->call_function(
        user->m_user, name, static_cast<const bson::BsonArray&>(bson_args), service,
        Function::wrap_callback_result_first(ctx, this_object, callback,
                                             [](ContextType ctx, const util::Optional<bson::Bson>& result) {
                                                 REALM_ASSERT_RELEASE(result);
                                                 return Value::from_string(ctx, String::from_bson(*result));
                                             }));
}

template <typename T>
void UserClass<T>::get_api_keys(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    return_value.set(ApiKeyAuthClass<T>::create_instance(ctx, user->m_app, user->m_user));
}

template <typename T>
void UserClass<T>::refresh_custom_data(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_count(1);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");

    user->m_app->refresh_custom_data(user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template <typename T>
void UserClass<T>::push_register(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(3);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto service = Value::validated_to_string(ctx, args[0], "service");
    auto token = Value::validated_to_string(ctx, args[1], "token");
    auto callback = Value::validated_to_function(ctx, args[2], "callback");

    user->m_app->push_notification_client(service).register_device(
        token, user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template <typename T>
void UserClass<T>::push_deregister(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    args.validate_count(2);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    auto service = Value::validated_to_string(ctx, args[0], "service");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    user->m_app->push_notification_client(service).deregister_device(
        user->m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template <typename T>
void UserClass<T>::make_streaming_request(ContextType ctx, ObjectType this_object, Arguments& args,
                                          ReturnValue& return_value)
{
    args.validate_between(2, 3);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);

    auto name = Value::validated_to_string(ctx, args[0], "name");
    auto service = Value::validated_to_string(ctx, args[1], "service");
    auto stringified_ejson_args = Value::validated_to_string(ctx, args[2], "args");
    auto bson_args = String::to_bson(stringified_ejson_args);

    auto req = user->m_app->make_streaming_request(user->m_user, name, bson_args.operator const bson::BsonArray&(),
                                                   std::string(service));
    return return_value.set(JavaScriptNetworkTransport<T>::makeRequest(ctx, req));
}

template <typename T>
void UserClass<T>::new_watch_stream(ContextType ctx, ObjectType this_object, Arguments& args,
                                    ReturnValue& return_value)
{
    args.validate_count(0);
    return return_value.set(create_object<T, WatchStreamClass<T>>(ctx, new WatchStream()));
}

template <typename T>
void UserClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    auto callback = Value::validated_to_function(ctx, args[0]);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context::get_global_context(ctx));

    {
        auto token = std::move(user->m_user->subscribe([=](const realm::SyncUser&) {
            Function::callback(protected_ctx, protected_callback, 0, {});
        }));

        // Save token in a member vector of a function to token pair
        user->m_notification_tokens.emplace_front(std::move(protected_callback), std::move(token));
    }
}

template <typename T>
void UserClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    auto callback = Value::validated_to_function(ctx, args[0]);
    auto user = get_internal<T, UserClass<T>>(ctx, this_object);
    Protected<FunctionType> protected_callback(ctx, callback);

    auto& tokens = user->m_notification_tokens;
    auto compare = [&](auto&& callback_token_pair) {
        return typename Protected<FunctionType>::Comparator()(callback_token_pair.first, protected_callback);
    };

    // Retrieve the token with the given function and use to call unsubscribe
    auto callback_token_pair_iter = std::find_if(tokens.begin(), tokens.end(), compare);

    if (callback_token_pair_iter != tokens.end()) {
        user->m_user->unsubscribe(callback_token_pair_iter->second);
        tokens.remove_if(compare);
    }
}
} // namespace js
} // namespace realm
