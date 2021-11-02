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

#include <realm/object-store/sync/app.hpp>

#include "js_class.hpp"

namespace realm {
namespace js {

template<typename T>
class EmailPasswordAuthClass : public ClassDefinition<T, app::App::UsernamePasswordProviderClient> {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using StringType = typename T::String;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    std::string const name = "EmailPasswordAuth";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp);

    PropertyMap<T> const properties = {
    };

    static void register_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void confirm_user(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void resend_confirmation_email(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void retry_custom_confirmation(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void send_reset_password_email(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void reset_password(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void call_reset_password_function(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"_registerUser", wrap<register_user>},
        {"_confirmUser", wrap<confirm_user>},
        {"_resendConfirmationEmail", wrap<resend_confirmation_email>},
        {"_retryCustomConfirmation", wrap<retry_custom_confirmation>},
        {"_sendResetPasswordEmail", wrap<send_reset_password_email>},
        {"_resetPassword", wrap<reset_password>},
        {"_callResetPasswordFunction", wrap<call_reset_password_function>},

    };
};

template<typename T>
inline typename T::Function EmailPasswordAuthClass<T>::create_constructor(ContextType ctx) {
    FunctionType constructor = ObjectWrap<T, EmailPasswordAuthClass<T>>::create_constructor(ctx);
    return constructor;
}

template<typename T>
typename T::Object EmailPasswordAuthClass<T>::create_instance(ContextType ctx, SharedApp app) {
    return create_object<T, EmailPasswordAuthClass<T>>(ctx, new app::App::UsernamePasswordProviderClient(app->provider_client<realm::app::App::UsernamePasswordProviderClient>()));
}

template<typename T>
void EmailPasswordAuthClass<T>::register_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "userDetails");
    auto email = Object::validated_get_string(ctx, details, "email", "email");
    auto password = Object::validated_get_string(ctx, details, "password", "password");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.register_email(email, password, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void EmailPasswordAuthClass<T>::confirm_user(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "tokenDetails");
    auto token = Object::validated_get_string(ctx, details, "token", "token");
    auto token_id = Object::validated_get_string(ctx, details, "tokenId", "tokenId");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.confirm_user(token, token_id, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void EmailPasswordAuthClass<T>::resend_confirmation_email(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "emailDetails");
    auto email = Object::validated_get_string(ctx, details, "email", "email");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.resend_confirmation_email(email, Function::wrap_void_callback(ctx, this_object, callback));
}

/**
 * @brief Retry registering a user with custom confirmation logic
 *
 * @param args Two arguments;  [0]:  email address of the user;  [1]:  callback to invoke upon completion
 * @param return_value void
 */
template<typename T>
void EmailPasswordAuthClass<T>::retry_custom_confirmation(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(2);

    auto &client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "emailDetails");
    auto email = Object::validated_get_string(ctx, details, "email", "email");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.retry_custom_confirmation(email, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void EmailPasswordAuthClass<T>::send_reset_password_email(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "emailDetails");
    auto email = Object::validated_get_string(ctx, details, "email", "email");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.send_reset_password_email(email, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void EmailPasswordAuthClass<T>::reset_password(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(2);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "resetDetails");
    auto password = Object::validated_get_string(ctx, details, "password", "password");
    auto token = Object::validated_get_string(ctx, details, "token", "token");
    auto token_id = Object::validated_get_string(ctx, details, "tokenId", "tokenId");
    auto callback = Value::validated_to_function(ctx, args[1], "callback");

    client.reset_password(password, token, token_id, Function::wrap_void_callback(ctx, this_object, callback));
}

template<typename T>
void EmailPasswordAuthClass<T>::call_reset_password_function(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(3);

    auto& client = *get_internal<T, EmailPasswordAuthClass<T>>(ctx, this_object);

    auto details = Value::validated_to_object(ctx, args[0], "resetDetails");
    auto email = Object::validated_get_string(ctx, details, "email", "email");
    auto password = Object::validated_get_string(ctx, details, "password", "password");
    auto stringified_ejson_args = Value::validated_to_string(ctx, args[2], "args");
    auto callback = Value::validated_to_function(ctx, args[3], "callback");

    auto bson_args = String::to_bson(stringified_ejson_args);

    client.call_reset_password_function(email, password, bson_args.operator const bson::BsonArray &(), Function::wrap_void_callback(ctx, this_object, callback));
}

}
}
