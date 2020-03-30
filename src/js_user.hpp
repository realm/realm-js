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
#include "platform.hpp"

#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_session.hpp"
#include "sync/sync_user.hpp"

namespace realm {
namespace js {

using SharedUser = std::shared_ptr<realm::SyncUser>;

template<typename T>
class UserClass : public ClassDefinition<T, SharedUser> {
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

    static void get_identity(ContextType, ObjectType, ReturnValue &);
    static void get_token(ContextType, ObjectType, ReturnValue &);
    static void get_profile(ContextType, ObjectType, ReturnValue &);
    static void set_profile(ContextType, ObjectType, ValueType);

    PropertyMap<T> const properties = {
        {"identity", {wrap<get_identity>, nullptr}},
        {"token", {wrap<get_token>, nullptr}},
        {"profile", {wrap<get_profile>, wrap<set_profile>}},
    };


    MethodMap<T> const static_methods = {
    };

    static void logout(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void session_for_on_disk_path(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"logOut", wrap<logout>},
        {"_sessionForOnDiskPath", wrap<session_for_on_disk_path>}
    };
};

template<typename T>
inline typename T::Function UserClass<T>::create_constructor(ContextType ctx) {
    FunctionType user_constructor = ObjectWrap<T, UserClass<T>>::create_constructor(ctx);
    return user_constructor;
}

template<typename T>
void UserClass<T>::get_identity(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string identity = get_internal<T, UserClass<T>>(object)->get()->identity();
    return_value.set(identity);
}

template<typename T>
void UserClass<T>::get_token(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string token = get_internal<T, UserClass<T>>(object)->get()->refresh_token();
    return_value.set(token);
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

    auto user_profile = get_internal<T, UserClass<T>>(object)->get()->user_profile();

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
void UserClass<T>::logout(ContextType, ObjectType this_object, Arguments& args, ReturnValue &) {
    args.validate_count(0);
    get_internal<T, UserClass<T>>(this_object)->get()->log_out();
}

}
}