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

#include <stdexcept>
#include "js_class.hpp"
#include "js_util.hpp"
#include <realm/object-store/sync/app_credentials.hpp>

namespace realm {
namespace js {

template <typename T>
class CredentialsClass : public ClassDefinition<T, realm::app::AppCredentials> {
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

public:
    const std::string name = "Credentials";

    static FunctionType create_constructor(ContextType);

    static void facebook(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void anonymous(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void apple(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void email_password(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void function(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void api_key(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void google(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void jwt(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const static_methods = {
        {"facebook", wrap<facebook>},
        {"anonymous", wrap<anonymous>},
        {"apple", wrap<apple>},
        {"google", wrap<google>},
        {"emailPassword", wrap<email_password>},
        {"_function", wrap<function>},
        {"apiKey", wrap<api_key>},
        {"jwt", wrap<jwt>},
    };

    static void get_payload(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"payload", {wrap<get_payload>, nullptr}},
    };

    static void provider(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"provider", wrap<provider>},
    };
};

template <typename T>
typename T::Function CredentialsClass<T>::create_constructor(ContextType ctx)
{
    FunctionType credentials_constructor = ObjectWrap<T, CredentialsClass<T>>::create_constructor(ctx);
    return credentials_constructor;
}

template <typename T>
void CredentialsClass<T>::facebook(ContextType ctx, ObjectType, Arguments& arguments, ReturnValue& return_value)
{
    arguments.validate_maximum(1);

    realm::app::AppCredentialsToken token = Value::validated_to_string(ctx, arguments[0]);

    auto credentials = realm::app::AppCredentials::facebook(token);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::anonymous(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                    ReturnValue& return_value)
{
    arguments.validate_maximum(0);

    auto credentials = realm::app::AppCredentials::anonymous();
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::apple(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                ReturnValue& return_value)
{
    arguments.validate_maximum(1);

    realm::app::AppCredentialsToken token = Value::validated_to_string(ctx, arguments[0]);

    auto credentials = realm::app::AppCredentials::apple(token);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::google(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                 ReturnValue& return_value)
{
    arguments.validate_maximum(1);

    auto decode_arg = [&](ValueType arg) {
        // the bare string is deprecated but we keep it until next major version
        // auth_code begins with "4/" while we assume all other cases are id_tokens
        if (Value::is_string(ctx, arguments[0])) {
            log_to_console<T>(ctx,
                              "`google(<tokenString>)` has been deprecated.  Please use `google(<authCodeObject>).",
                              JSLogFunction::Warning);
        }

        if (Value::is_object(ctx, arguments[0])) {
            auto object = Value::validated_to_object(ctx, arguments[0]);

            static const String auth_code_string = "authCode";
            ValueType auth_code = Object::get_property(ctx, object, auth_code_string);
            if (!Value::is_undefined(ctx, auth_code)) {
                return app::AppCredentials::google(
                    app::AuthCode(std::string(Value::validated_to_string(ctx, auth_code))));
            }

            static const String id_token_string = "idToken";
            ValueType id_token = Object::get_property(ctx, object, id_token_string);
            if (!Value::is_undefined(ctx, id_token)) {
                return app::AppCredentials::google(
                    app::IdToken(std::string(Value::validated_to_string(ctx, id_token))));
            }
        }
        throw std::runtime_error("Invalid arguments for Realm.App.Credentials.google()");
    };

    app::AppCredentials credentials = decode_arg(arguments[0]);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::jwt(ContextType ctx, ObjectType this_object, Arguments& arguments,
                              ReturnValue& return_value)
{
    arguments.validate_maximum(1);

    realm::app::AppCredentialsToken token = Value::validated_to_string(ctx, arguments[0]);

    auto credentials = realm::app::AppCredentials::custom(token);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::email_password(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                         ReturnValue& return_value)
{
    arguments.validate_maximum(2);

    const std::string email = Value::validated_to_string(ctx, arguments[0], "email");
    const std::string password = Value::validated_to_string(ctx, arguments[1], "password");

    auto credentials = realm::app::AppCredentials::username_password(email, password);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::function(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                   ReturnValue& return_value)
{
    arguments.validate_count(1);
    const std::string payload_json = Value::validated_to_string(ctx, arguments[0], "payload");
    const auto payload_bson = bson::parse(payload_json);
    if (payload_bson.type() != bson::Bson::Type::Document)
        throw std::invalid_argument("payload must be a json object");

    auto credentials = realm::app::AppCredentials::function(payload_bson.operator const bson::BsonDocument&());
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::api_key(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                  ReturnValue& return_value)
{
    arguments.validate_count(1);
    const std::string api_key = Value::validated_to_string(ctx, arguments[0], "user API key");

    auto credentials = realm::app::AppCredentials::api_key(api_key);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new app::AppCredentials(credentials)));
}

template <typename T>
void CredentialsClass<T>::provider(ContextType ctx, ObjectType this_object, Arguments& arguments,
                                   ReturnValue& return_value)
{
    arguments.validate_count(0);

    auto credentials = get_internal<T, CredentialsClass<T>>(ctx, this_object);
    return_value.set(Value::from_string(ctx, credentials->provider_as_string()));
}

template <typename T>
void CredentialsClass<T>::get_payload(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto credentials = get_internal<T, CredentialsClass<T>>(ctx, this_object);
    return_value.set(Value::from_string(ctx, credentials->serialize_as_json()));
}

} // namespace js
} // namespace realm
