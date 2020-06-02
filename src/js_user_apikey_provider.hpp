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

#include "sync/app.hpp"

namespace realm {
namespace js {

using SharedUser = std::shared_ptr<realm::SyncUser>;
using SharedApp = std::shared_ptr<realm::app::App>;

template<typename T>
class UserAPIKeyProviderClient : public app::App::UserAPIKeyProviderClient {
public:
    UserAPIKeyProviderClient(app::App::UserAPIKeyProviderClient client, SharedUser user) : app::App::UserAPIKeyProviderClient(client), m_user(std::move(user)) {}
    UserAPIKeyProviderClient(UserAPIKeyProviderClient &&) = default;

    UserAPIKeyProviderClient& operator=(UserAPIKeyProviderClient &&) = default;
    UserAPIKeyProviderClient& operator=(UserAPIKeyProviderClient const&) = default;

    SharedUser m_user;
};

template<typename T>
class UserAPIKeyProviderClientClass : public ClassDefinition<T, UserAPIKeyProviderClient<T>> {
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
    std::string const name = "UserAPIKeyProviderClient";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp, SharedUser);

    PropertyMap<T> const properties = {
    };

    static void create_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void fetch_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void fetch_api_keys(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void delete_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void enable_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void disable_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"_createAPIKey", wrap<create_api_key>},
        {"_fetchAPIKey", wrap<fetch_api_key>},
        {"_fetchAPIKeys", wrap<fetch_api_keys>},
        {"_deleteAPIKey", wrap<delete_api_key>},
        {"_enableAPIKey", wrap<enable_api_key>},
        {"_disableAPIKey", wrap<disable_api_key>},
    };
};

template<typename T>
inline typename T::Function UserAPIKeyProviderClientClass<T>::create_constructor(ContextType ctx) {
    FunctionType constructor = ObjectWrap<T, UserAPIKeyProviderClientClass<T>>::create_constructor(ctx);
    return constructor;
}

template<typename T>
typename T::Object UserAPIKeyProviderClientClass<T>::create_instance(ContextType ctx, SharedApp app, SharedUser user) {
    return create_object<T, UserAPIKeyProviderClientClass<T>>(ctx, new UserAPIKeyProviderClient<T>(app->provider_client<realm::app::App::UserAPIKeyProviderClient>(), user));
}

template<typename T>
typename T::Object make_api_key(typename T::Context ctx, util::Optional<app::App::UserAPIKey> api_key) {
    using ObjectType = typename T::Object;

    ObjectType api_key_object = Object<T>::create_empty(ctx);
    if (api_key) {
        Object<T>::set_property(ctx, api_key_object, "id", Value<T>::from_object_id(ctx, api_key->id));
        Object<T>::set_property(ctx, api_key_object, "key", Value<T>::from_string(ctx, *(api_key->key)));
        Object<T>::set_property(ctx, api_key_object, "name", Value<T>::from_string(ctx, api_key->name));
        Object<T>::set_property(ctx, api_key_object, "disabled", Value<T>::from_boolean(ctx, api_key->disabled));
    }

    return api_key_object;
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::create_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);

    auto name = Value::validated_to_string(ctx, args[0], "name");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);

    auto callback_handler([=](util::Optional<app::App::UserAPIKey> api_key, util::Optional<app::AppError> error) {
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
        callback_arguments[0] = make_api_key<T>(protected_ctx, api_key);
        callback_arguments[1] = Value::from_undefined(protected_ctx);
        Function::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
    });

    client.create_api_key(name, client.m_user, callback_handler);
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::fetch_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);

    auto id = Value::validated_to_object_id(ctx, args[0], "id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);

    auto callback_handler([=](util::Optional<app::App::UserAPIKey> api_key, util::Optional<app::AppError> error) {
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
        callback_arguments[0] = make_api_key<T>(protected_ctx, api_key);
        callback_arguments[1] = Value::from_undefined(protected_ctx);
        Function::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
    });

    client.fetch_api_key(id, client.m_user, callback_handler);
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::fetch_api_keys(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);

    auto callback_handler([=](std::vector<app::App::UserAPIKey> api_keys, util::Optional<app::AppError> error) {
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

        std::vector<ValueType> api_key_vector;
        for (auto api_key : api_keys) {
            api_key_vector.push_back(make_api_key<T>(protected_ctx, api_key));
        }
        ValueType callback_arguments[2];
        callback_arguments[0] = Object::create_array(protected_ctx, api_key_vector);
        callback_arguments[1] = Value::from_undefined(protected_ctx);
        Function::callback(protected_ctx, protected_callback, protected_this, 2, callback_arguments);
    });

    client.fetch_api_keys(client.m_user, callback_handler);
}

template<typename T>
app::App::UserAPIKey to_api_key(typename T::Context ctx, typename T::Object api_key_object) {
    using ValueType = typename T::Value;
    using String = js::String<T>;

    static const String api_key_id = "id";
    static const String api_key_key = "key";
    static const String api_key_name = "name";
    static const String api_key_disabled = "disabled";

    ObjectId id;
    util::Optional<std::string> key;
    std::string name;
    bool disabled;

    ValueType api_key_id_value = Object<T>::get_property(ctx, api_key_object, api_key_id);
    if (!Value<T>::is_undefined(ctx, api_key_id_value)) {
        id = Value<T>::validated_to_object_id(ctx, api_key_id_value);
    }
    ValueType api_key_key_value = Object<T>::get_property(ctx, api_key_object, api_key_key);
    if (!Value<T>::is_undefined(ctx, api_key_key_value)) {
        key = util::Optional<std::string>(Value<T>::validated_to_string(ctx, api_key_key_value));
    }
    ValueType api_key_name_value = Object<T>::get_property(ctx, api_key_object, api_key_name);
    if (!Value<T>::is_undefined(ctx, api_key_name_value)) {
        name = Value<T>::validated_to_string(ctx, api_key_name_value);
    }
    ValueType api_key_disabled_value = Object<T>::get_property(ctx, api_key_object, api_key_disabled);
    if (!Value<T>::is_undefined(ctx, api_key_disabled_value)) {
        disabled = Value<T>::validated_to_boolean(ctx, api_key_disabled_value);
    }

    return app::App::UserAPIKey({id, key, name, disabled});
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::delete_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.delete_api_key(api_key_id, client.m_user, make_callback_handler<T>(ctx, this_object, callback));
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::enable_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.enable_api_key(api_key_id, client.m_user, make_callback_handler<T>(ctx, this_object, callback));
}

template<typename T>
void UserAPIKeyProviderClientClass<T>::disable_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, UserAPIKeyProviderClientClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.disable_api_key(api_key_id, client.m_user, make_callback_handler<T>(ctx, this_object, callback));
}


}
}