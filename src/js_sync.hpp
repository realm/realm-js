////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include <list>
#include <map>
#include <set>

#include "platform.hpp"
#include "js_class.hpp"
#include "js_collection.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_session.hpp"
#include "sync/sync_user.hpp"
#include "realm/util/logger.hpp"
#include "realm/util/uri.hpp"

namespace realm {
namespace js {

using SharedUser =  std::shared_ptr<realm::SyncUser>;

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
    using NativeAccessor = realm::NativeAccessor<ValueType, ContextType>;

public:
    std::string const name = "User";

    static FunctionType create_constructor(ContextType);

    static void get_server(ContextType, ObjectType, ReturnValue &);
    static void get_identity(ContextType, ObjectType, ReturnValue &);
    static void get_token(ContextType, ObjectType, ReturnValue &);
    static void is_admin(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"server", {wrap<get_server>, nullptr}},
        {"identity", {wrap<get_identity>, nullptr}},
        {"token", {wrap<get_token>, nullptr}},
        {"isAdmin", {wrap<is_admin>, nullptr}},
    };

    static void create_user(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    MethodMap<T> const static_methods = {
        {"createUser", wrap<create_user>}
    };

    static void current_user(ContextType ctx, ObjectType object, ReturnValue &return_value);
    static void all_users(ContextType ctx, ObjectType object, ReturnValue &return_value);

    PropertyMap<T> const static_properties = {
        {"current", {wrap<current_user>, nullptr}},
        {"all", {wrap<all_users>, nullptr}},
    };

    static void logout(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    MethodMap<T> const methods = {
        {"logout", wrap<logout>}
    };
};

template<typename T>
void UserClass<T>::get_server(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string server = get_internal<T, UserClass<T>>(object)->get()->server_url();
    return_value.set(server);
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
void UserClass<T>::is_admin(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, UserClass<T>>(object)->get()->is_admin());
}

template<typename T>
void UserClass<T>::create_user(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 3, 4);

    SharedUser *user = new SharedUser(SyncManager::shared().get_user(
        Value::validated_to_string(ctx, arguments[1]),
        Value::validated_to_string(ctx, arguments[2]),
        (std::string)Value::validated_to_string(ctx, arguments[0]),
        Value::validated_to_boolean(ctx, arguments[3])));
    return_value.set(create_object<T, UserClass<T>>(ctx, user));
}

template<typename T>
void UserClass<T>::all_users(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto users = Object::create_empty(ctx);
    for (auto user : SyncManager::shared().all_users()) {
        if (user->state() == SyncUser::State::Active) {
            Object::set_property(ctx, users, user->identity(), create_object<T, UserClass<T>>(ctx, new SharedUser(user)), ReadOnly | DontDelete);
        }
    }
    return_value.set(users);
}

template<typename T>
void UserClass<T>::current_user(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    SharedUser *current = nullptr;
    for (auto user : SyncManager::shared().all_users()) {
        if (user->state() == SyncUser::State::Active) {
            if (current != nullptr) {
                throw std::runtime_error("More than one user logged in currently.");
            }
            current = new SharedUser(user);
        }
    }

    if (current != nullptr) {
        return_value.set(create_object<T, UserClass<T>>(ctx, current));
    }
    else {
        return_value.set_undefined();
    }
}

template<typename T>
void UserClass<T>::logout(ContextType ctx, ObjectType object, size_t, const ValueType[], ReturnValue &) {
    get_internal<T, UserClass<T>>(object)->get()->log_out();
}

template<typename T>
class SyncClass : public ClassDefinition<T, void *> {
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
    using NativeAccessor = realm::NativeAccessor<ValueType, ContextType>;

public:
    std::string const name = "Sync";

    static FunctionType create_constructor(ContextType);

    static void set_sync_log_level(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void set_verify_servers_ssl_certificate(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // private
    static void refresh_access_token(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void populate_sync_config(ContextType, ObjectType realm_constructor, ObjectType config_object, Realm::Config&);

    // static properties
    static void get_is_developer_edition(ContextType, ObjectType, ReturnValue &);

    MethodMap<T> const static_methods = {
        {"refreshAccessToken", wrap<refresh_access_token>},
        {"setLogLevel", wrap<set_sync_log_level>},
        {"setVerifyServersSslCertificate", wrap<set_verify_servers_ssl_certificate>}
    };
};

template<typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx) {
    // setup synced realmFile paths
    ensure_directory_exists_for_file(default_realm_file_directory());
    SyncManager::shared().configure_file_system(default_realm_file_directory(), SyncManager::MetadataMode::NoEncryption);

    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx), attributes);

    realm::SyncManager::shared().set_error_handler([=](int error_code, std::string message) {
        std::cout << error_code << " " << message << std::endl;
    });

    return sync_constructor;
}

template<typename T>
void SyncClass<T>::set_sync_log_level(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);
    std::string log_level = Value::validated_to_string(ctx, arguments[0]);
    std::istringstream in(log_level); // Throws
    in.imbue(std::locale::classic()); // Throws
    in.unsetf(std::ios_base::skipws);
    util::Logger::Level log_level_2 = util::Logger::Level();
    in >> log_level_2; // Throws
    if (!in || !in.eof())
        throw std::runtime_error("Bad log level");
    realm::SyncManager::shared().set_log_level(log_level_2);
}

template<typename T>
void SyncClass<T>::set_verify_servers_ssl_certificate(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);
    bool verify_servers_ssl_certificate = Value::validated_to_boolean(ctx, arguments[0]);
    realm::SyncManager::shared().set_client_should_validate_ssl(verify_servers_ssl_certificate);
}

template<typename T>
void SyncClass<T>::refresh_access_token(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    static const String token_string = "token";
    static const String file_url_string = "file_url";
    static const String realm_url_string = "resolved_realm_url";

    ObjectType json_arguments = Value::validated_to_object(ctx, arguments[1]);
    std::string token = Object::validated_get_string(ctx, json_arguments, token_string);
    std::string file_url = Object::validated_get_string(ctx, json_arguments, file_url_string);
    std::string realm_url = Object::validated_get_string(ctx, json_arguments, realm_url_string);

    if (auto session = SyncManager::shared().get_existing_active_session(file_url)) {
        session->refresh_access_token(token, realm_url);
        return_value.set(true);
    }
    else {
        return_value.set(false);
    }
}

template<typename T>
void SyncClass<T>::populate_sync_config(ContextType ctx, ObjectType realm_constructor, ObjectType config_object, Realm::Config& config) {
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (!Value::is_undefined(ctx, sync_config_value)) {
        auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

        ObjectType sync_constructor = Object::validated_get_object(ctx, realm_constructor, std::string("Sync"));
        Protected<ValueType> refresh(ctx, Object::validated_get_function(ctx, sync_constructor, std::string("refreshAccessToken")));
        Protected<ObjectType> protected_sync(ctx, sync_constructor);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

        auto handler = [=](const std::string& path, const realm::SyncConfig& config, std::shared_ptr<SyncSession>) {
            HANDLESCOPE
            if (config.user->is_admin()) {
                // FIXME: This log-in callback is called while the object store still holds some sync-related locks.
                // Notify the object store of the access token asynchronously to avoid the deadlock that would result
                // from reentering the object store here.
                auto thread = std::thread([path, config]{
                    auto session = SyncManager::shared().get_existing_active_session(path);
                    session->refresh_access_token(config.user->refresh_token(), config.realm_url);
                });
                thread.detach();
            }
            else {
                ObjectType user_constructor = Object::validated_get_object(ctx, protected_sync, std::string("User"));
                FunctionType authenticate = Object::validated_get_function(ctx, user_constructor, std::string("_authenticateRealm"));

                ValueType arguments[3];
                arguments[0] = Value::from_string(protected_ctx, path.c_str());
                arguments[1] = Value::from_string(protected_ctx, config.realm_url.c_str());
                arguments[2] = refresh;
                ObjectType user = create_object<T, UserClass<T>>(ctx, new SharedUser(config.user));
                Function::call(protected_ctx, authenticate, user, 3, arguments);
            }
        };

        ObjectType user = Object::validated_get_object(ctx, sync_config_object, "user");
        SharedUser shared_user = *get_internal<T, UserClass<T>>(user);
        if (shared_user->state() != SyncUser::State::Active) {
            throw std::runtime_error("User is no longer valid.");
        }

        std::string raw_realm_url = Object::validated_get_string(ctx, sync_config_object, "url");

        // FIXME - use make_shared
        config.sync_config = std::shared_ptr<SyncConfig>(
            new SyncConfig(shared_user, raw_realm_url, SyncSessionStopPolicy::AfterChangesUploaded, handler)
        );
        config.schema_mode = SchemaMode::Additive;
        config.path = realm::SyncManager::shared().path_for_realm(shared_user->identity(), raw_realm_url);
    }
}

} // js
} // realm
