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
class ApiKeyAuth : public app::App::UserAPIKeyProviderClient {
public:
    ApiKeyAuth(app::App::UserAPIKeyProviderClient client, SharedUser user) : app::App::UserAPIKeyProviderClient(client), m_user(std::move(user)) {}
    ApiKeyAuth(ApiKeyAuth &&) = default;

    ApiKeyAuth& operator=(ApiKeyAuth &&) = default;
    ApiKeyAuth& operator=(ApiKeyAuth const&) = default;

    SharedUser m_user;
};

template<typename T>
class ApiKeyAuthClass : public ClassDefinition<T, ApiKeyAuth<T>> {
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
    std::string const name = "ApiKeyAuth";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp, SharedUser);

    PropertyMap<T> const properties = {
    };

    static void create_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void fetch_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void fetch_all_api_keys(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void delete_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void enable_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void disable_api_key(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"_create", wrap<create_api_key>},
        {"_fetch", wrap<fetch_api_key>},
        {"_fetchAll", wrap<fetch_all_api_keys>},
        {"_delete", wrap<delete_api_key>},
        {"_enable", wrap<enable_api_key>},
        {"_disable", wrap<disable_api_key>},
    };
};

template<typename T>
inline typename T::Function ApiKeyAuthClass<T>::create_constructor(ContextType ctx) {
    FunctionType constructor = ObjectWrap<T, ApiKeyAuthClass<T>>::create_constructor(ctx);
    return constructor;
}

template<typename T>
typename T::Object ApiKeyAuthClass<T>::create_instance(ContextType ctx, SharedApp app, SharedUser user) {
    return create_object<T, ApiKeyAuthClass<T>>(ctx, new ApiKeyAuth<T>(app->provider_client<realm::app::App::UserAPIKeyProviderClient>(), user));
}

template<typename T>
typename T::Object make_api_key(typename T::Context ctx, util::Optional<app::App::UserAPIKey> api_key) {
    using ObjectType = typename T::Object;

    ObjectType api_key_object = Object<T>::create_empty(ctx);
    if (api_key) {
        Object<T>::set_property(ctx, api_key_object, "id", Value<T>::from_object_id(ctx, api_key->id));
        Object<T>::set_property(ctx, api_key_object, "key", api_key->key ? Value<T>::from_string(ctx, *(api_key->key)) : Value<T>::from_undefined(ctx));
        Object<T>::set_property(ctx, api_key_object, "name", Value<T>::from_string(ctx, api_key->name));
        Object<T>::set_property(ctx, api_key_object, "disabled", Value<T>::from_boolean(ctx, api_key->disabled));
    }

    return api_key_object;
}

template<typename T>
void ApiKeyAuthClass<T>::create_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);

    auto name = Value::validated_to_string(ctx, args[0], "name");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.create_api_key(name,
                          client.m_user,
                          Function::wrap_callback_result_first(ctx, this_object, callback, make_api_key<T>));
}

template<typename T>
void ApiKeyAuthClass<T>::fetch_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);

    auto id = Value::validated_to_object_id(ctx, args[0], "id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.fetch_api_key(id,
                         client.m_user,
                         Function::wrap_callback_result_first(ctx, this_object, callback, make_api_key<T>));
}

template<typename T>
void ApiKeyAuthClass<T>::fetch_all_api_keys(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");

    client.fetch_api_keys(client.m_user, Function::wrap_callback_result_first(ctx, this_object, callback,
        [] (ContextType ctx, const std::vector<app::App::UserAPIKey>& api_keys) {
            std::vector<ValueType> api_key_vector;
            api_key_vector.reserve(api_keys.size());
            for (auto api_key : api_keys) {
                api_key_vector.push_back(make_api_key<T>(ctx, api_key));
            }
            return Object::create_array(ctx, api_key_vector);
        }
    ));
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
void ApiKeyAuthClass<T>::delete_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.delete_api_key(api_key_id, client.m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void ApiKeyAuthClass<T>::enable_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.enable_api_key(api_key_id, client.m_user, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void ApiKeyAuthClass<T>::disable_api_key(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, ApiKeyAuthClass<T>>(ctx, this_object);

    auto api_key_id = Value::validated_to_object_id(ctx, args[0], "API key id");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.disable_api_key(api_key_id, client.m_user, Function::wrap_void_callback(ctx, this_object, callback));
}


}
}
