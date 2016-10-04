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

#include "js_class.hpp"
#include "js_collection.hpp"
#include "sync_manager.hpp"
#include "sync_config.hpp"
#include "sync_session.hpp"
#include "realm/util/logger.hpp"
#include "realm/util/uri.hpp"

#if REALM_PLATFORM_NODE
#include "node/node_sync_logger.hpp"
#endif

#if !REALM_DEVELOPER_EDITION
#include "js_enterprise.hpp"
#endif

namespace realm {
namespace js {

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

#if REALM_PLATFORM_NODE
    static void set_sync_logger(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
#endif

    // private
    static void refresh_access_token(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void populate_sync_config(ContextType, ObjectType config_object, Realm::Config&);

    // static properties
    static void get_is_developer_edition(ContextType, ObjectType, ReturnValue &);

    MethodMap<T> const static_methods = {
        {"refreshAccessToken", wrap<refresh_access_token>},
        {"setLogLevel", wrap<set_sync_log_level>},
        {"setVerifyServersSslCertificate", wrap<set_verify_servers_ssl_certificate>},
#if REALM_PLATFORM_NODE
        {"setSyncLogger", wrap<set_sync_logger>},
#endif
    };

    PropertyMap<T> const static_properties {
        {"isDeveloperEdition", {wrap<get_is_developer_edition>, nullptr}}
    };
};

template<typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx) {
    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    Protected<ValueType> refresh(ctx, Object::validated_get_function(ctx, sync_constructor, std::string("refreshAccessToken")));
    Protected<ObjectType> protected_sync(ctx, sync_constructor);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    
    realm::SyncManager::shared().set_login_function([=](const std::string& path, const realm::SyncConfig& config) {
        typename T::HandleScope handle_scope;

        FunctionType user_constructor = Object::validated_get_function(protected_ctx, protected_sync, std::string("User"));
        FunctionType authenticate = Object::validated_get_function(protected_ctx, user_constructor, "authenticateRealm");
        ObjectType users = Object::validated_get_object(protected_ctx, user_constructor, std::string("activeUsers"));
        ObjectType user = Object::validated_get_object(protected_ctx, users, config.user_tag.c_str(), "Invalid user identity");

        if (Object::validated_get_boolean(protected_ctx, user, "isAdmin")) {
            std::string token = Object::validated_get_string(protected_ctx, user, "token");

            // FIXME: This log-in callback is called while the object store still holds some sync-related locks.
            // Notify the object store of the access token asynchronously to avoid the deadlock that would result
            // from reentering the object store here.
            auto thread = std::thread([path, config, token]{
                auto session = SyncManager::shared().get_existing_active_session(path);
                session->refresh_access_token(token, config.realm_url);
            });
            thread.detach();
        }
        else {
            ValueType arguments[3];
            arguments[0] = Value::from_string(protected_ctx, path.c_str());
            arguments[1] = Value::from_string(protected_ctx, config.realm_url.c_str());
            arguments[2] = refresh;
            Function::call(protected_ctx, authenticate, user, 3, arguments);
        }
    });

    realm::SyncManager::shared().set_error_handler([=](int error_code, std::string message) {
        std::cout << error_code << " " << message << std::endl;
    });

#if REALM_PLATFORM_NODE
    // AtExit is called before the V8 VM is disposed. We use it to clean the captured JS objects in the login function.
    // Should they be destructed after the VM is disposed, there will be a segmentation fault during node's shutdown.
    ::node::AtExit([](void*) {
        realm::SyncManager::shared().set_login_function(nullptr);
    });
#endif

#if !REALM_DEVELOPER_EDITION
    SyncEnterpriseClass<T>::add_methods(ctx, sync_constructor);
#endif

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

#if REALM_HAVE_NODE_SYNC_LOGGER
template<typename T>
void SyncClass<T>::set_sync_logger(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);
    auto callback = Value::validated_to_function(ctx, arguments[0]);
    node::SyncLoggerFactory *factory = new node::SyncLoggerFactory(ctx, this_object, callback); // Throws
    realm::SyncManager::shared().set_logger_factory(*factory);
}
#endif

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
void SyncClass<T>::populate_sync_config(ContextType ctx, ObjectType config_object, Realm::Config& config) {
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (!Value::is_undefined(ctx, sync_config_value)) {
        auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

        ObjectType user = Object::validated_get_object(ctx, sync_config_object, "user");
        config.sync_config = std::shared_ptr<SyncConfig>(
            new SyncConfig(Object::validated_get_string(ctx, user, "identity"),
                           Object::validated_get_string(ctx, sync_config_object, "url"),
                           {}, SyncSessionStopPolicy::AfterChangesUploaded)
        );
        config.schema_mode = SchemaMode::Additive;
    }
}

template<typename T>
void SyncClass<T>::get_is_developer_edition(ContextType ctx, ObjectType object, ReturnValue &return_value) {
#if REALM_DEVELOPER_EDITION
    return_value.set(true);
#else
    return_value.set(false);
#endif
}

} // js
} // realm
