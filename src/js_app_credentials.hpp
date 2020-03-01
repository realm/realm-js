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
#include "sync/app_credentials.hpp"

namespace realm {
namespace js {

using SharedAppCredentials = std::shared_ptr<realm::app::AppCredentials>;

template<typename T>
class CredentialsClass : public ClassDefinition<T, SharedAppCredentials> {
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

    static void constructor(ContextType, ObjectType, Arguments &);
    static FunctionType create_constructor(ContextType);

    static void facebook(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void anonymous(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void apple(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void username_password(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const static_methods = {
        {"facebook",         wrap<facebook>},
        {"anonymous",        wrap<anonymous>},
        {"apple",            wrap<apple>},
        {"usernamePassword", wrap<username_password>},
    };

};

template<typename T>
typename T::Function CredentialsClass<T>::create_constructor(ContextType ctx) {
    FunctionType credentials_constructor = ObjectWrap<T, CredentialsClass<T>>::create_constructor(ctx);
    return credentials_constructor;
}

template<typename T>
void CredentialsClass<T>::facebook(ContextType ctx, ObjectType, Arguments& arguments, ReturnValue& return_value) {
    arguments.validate_maximum(1);

    realm::app::AppCredentialsToken token = Value::validated_to_string(ctx, arguments[0]);

    auto credentials = realm::app::AppCredentials::facebook(token);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new SharedAppCredentials(credentials)));
}

template<typename T>
void CredentialsClass<T>::anonymous(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue& return_value) {
    arguments.validate_maximum(0);

    auto credentials = realm::app::AppCredentials::anonymous();
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new SharedAppCredentials(credentials)));
}

template<typename T>
void CredentialsClass<T>::apple(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue& return_value) {
    arguments.validate_maximum(1);

    realm::app::AppCredentialsToken token = Value::validated_to_string(ctx, arguments[0]);

    auto credentials = realm::app::AppCredentials::apple(token);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new SharedAppCredentials(credentials)));
}

template<typename T>
void CredentialsClass<T>::username_password(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue& return_value) {
    arguments.validate_maximum(2);

    const std::string username = Value::validated_to_string(ctx, arguments[0], "username");
    const std::string password = Value::validated_to_string(ctx, arguments[1], "password");

    auto credentials = realm::app::AppCredentials::username_password(username, password);
    return_value.set(create_object<T, CredentialsClass<T>>(ctx, new SharedAppCredentials(credentials)));
}


}
}