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
#include <regex>

#include "event_loop_dispatcher.hpp"
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

using SharedUser = std::shared_ptr<realm::SyncUser>;
using WeakSession = std::weak_ptr<realm::SyncSession>;

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

    static void create_user(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    MethodMap<T> const static_methods = {
        {"createUser", wrap<create_user>}
    };

    /*static void current_user(ContextType ctx, ObjectType object, ReturnValue &return_value);*/
    static void all_users(ContextType ctx, ObjectType object, ReturnValue &return_value);

    PropertyMap<T> const static_properties = {
        /*{"current", {wrap<current_user>, nullptr}},*/
        {"all", {wrap<all_users>, nullptr}},
    };

    static void logout(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void session_for_on_disk_path(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    MethodMap<T> const methods = {
        {"logout", wrap<logout>},
        {"_sessionForOnDiskPath", wrap<session_for_on_disk_path>}
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
void UserClass<T>::create_user(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 3, 5);
    SharedUser *user = new SharedUser(SyncManager::shared().get_user(
        Value::validated_to_string(ctx, arguments[1], "identity"),
        Value::validated_to_string(ctx, arguments[2], "refreshToken"),
        (std::string)Value::validated_to_string(ctx, arguments[0], "authServerUrl"),
        Value::validated_to_boolean(ctx, arguments[3], "isAdminToken") ? SyncUser::TokenType::Admin : SyncUser::TokenType::Normal));

    if (argc == 5) {
        (*user)->set_is_admin(Value::validated_to_boolean(ctx, arguments[4], "isAdmin"));
    }
    return_value.set(create_object<T, UserClass<T>>(ctx, user));
}

template<typename T>
void UserClass<T>::all_users(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto users = Object::create_empty(ctx);
    for (auto user : SyncManager::shared().all_logged_in_users()) {
        if (user->token_type() == SyncUser::TokenType::Normal) {
            Object::set_property(ctx, users, user->identity(), create_object<T, UserClass<T>>(ctx, new SharedUser(user)), ReadOnly | DontDelete);
        }
    }
    return_value.set(users);
}

template<typename T>
void UserClass<T>::logout(ContextType ctx, FunctionType, ObjectType this_object, size_t, const ValueType[], ReturnValue &) {
    get_internal<T, UserClass<T>>(this_object)->get()->log_out();
}

template<typename T>
class SessionClass : public ClassDefinition<T, WeakSession> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;

public:
    std::string const name = "Session";

    static FunctionType create_constructor(ContextType);

    static void get_config(ContextType, ObjectType, ReturnValue &);
    static void get_user(ContextType, ObjectType, ReturnValue &);
    static void get_url(ContextType, ObjectType, ReturnValue &);
    static void get_state(ContextType, ObjectType, ReturnValue &);

    static void simulate_error(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void refresh_access_token(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    PropertyMap<T> const properties = {
        {"config", {wrap<get_config>, nullptr}},
        {"user", {wrap<get_user>, nullptr}},
        {"url", {wrap<get_url>, nullptr}},
        {"state", {wrap<get_state>, nullptr}}
    };

    MethodMap<T> const methods = {
        {"_simulateError", wrap<simulate_error>},
        {"_refreshAccessToken", wrap<refresh_access_token>}
    };
};

template<typename T>
class SyncSessionErrorHandlerFunctor {
public:
    SyncSessionErrorHandlerFunctor(typename T::Context ctx, typename T::Function error_func)
    : m_ctx(Context<T>::get_global_context(ctx))
    , m_func(ctx, error_func)
    { }

    typename T::Function func() const { return m_func; }

    void operator()(std::shared_ptr<SyncSession> session, SyncError error) {
        HANDLESCOPE

        auto error_object = Object<T>::create_empty(m_ctx);
        Object<T>::set_property(m_ctx, error_object, "message", Value<T>::from_string(m_ctx, error.message));
        Object<T>::set_property(m_ctx, error_object, "isFatal", Value<T>::from_boolean(m_ctx, error.is_fatal));
        Object<T>::set_property(m_ctx, error_object, "category", Value<T>::from_string(m_ctx, error.error_code.category().name()));
        Object<T>::set_property(m_ctx, error_object, "code", Value<T>::from_number(m_ctx, error.error_code.value()));

        auto user_info = Object<T>::create_empty(m_ctx);
        for (auto& kvp : error.user_info) {
            Object<T>::set_property(m_ctx, user_info, kvp.first, Value<T>::from_string(m_ctx, kvp.second));
        }
        Object<T>::set_property(m_ctx, error_object, "userInfo", user_info);

        typename T::Value arguments[2];
        arguments[0] = create_object<T, SessionClass<T>>(m_ctx, new WeakSession(session));
        arguments[1] = error_object;

        Function<T>::callback(m_ctx, m_func, typename T::Object(), 2, arguments);
    }
private:
    const Protected<typename T::GlobalContext> m_ctx;
    const Protected<typename T::Function> m_func;
};

template<typename T>
void UserClass<T>::session_for_on_disk_path(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    auto user = *get_internal<T, UserClass<T>>(this_object);
    if (auto session = user->session_for_on_disk_path(Value::validated_to_string(ctx, arguments[0]))) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_config(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(object)->lock()) {
        ObjectType config = Object::create_empty(ctx);
        Object::set_property(ctx, config, "user", create_object<T, UserClass<T>>(ctx, new SharedUser(session->config().user)));
        Object::set_property(ctx, config, "url", Value::from_string(ctx, session->config().realm_url));
        if (auto* dispatcher = session->config().error_handler.template target<EventLoopDispatcher<SyncSessionErrorHandler>>()) {
            auto& handler = *dispatcher->func().template target<SyncSessionErrorHandlerFunctor<T>>();
            Object::set_property(ctx, config, "error", handler.func());
        }
        return_value.set(config);
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_user(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(object)->lock()) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new SharedUser(session->config().user)));
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_url(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(object)->lock()) {
        if (util::Optional<std::string> url = session->full_realm_url()) {
            return_value.set(*url);
            return;
        }
    }

    return_value.set_undefined();
}

template<typename T>
void SessionClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    static const std::string invalid("invalid");
    static const std::string inactive("inactive");
    static const std::string active("active");

    return_value.set(invalid);

    if (auto session = get_internal<T, SessionClass<T>>(object)->lock()) {
        if (session->state() == SyncSession::PublicState::Inactive) {
            return_value.set(inactive);
        } else if (session->state() != SyncSession::PublicState::Error) {
            return_value.set(active);
        }
    }
}

template<typename T>
void SessionClass<T>::simulate_error(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &) {
    validate_argument_count(argc, 2);

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {
        SyncError error;
        error.error_code = std::error_code(Value::validated_to_number(ctx, arguments[0]), realm::sync::protocol_error_category());
        error.message = Value::validated_to_string(ctx, arguments[1]);
        SyncSession::OnlyForTesting::handle_error(*session, std::move(error));
    }
}

template<typename T>
void SessionClass<T>::refresh_access_token(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &) {
    validate_argument_count(argc, 2);

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {
        std::string access_token = Value::validated_to_string(ctx, arguments[0], "accessToken");
        std::string realm_url = Value::validated_to_string(ctx, arguments[1], "realmUrl");
        session->refresh_access_token(std::move(access_token), std::move(realm_url));
    }
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

public:
    std::string const name = "Sync";

    static FunctionType create_constructor(ContextType);

    static void set_sync_log_level(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // private
    static void populate_sync_config(ContextType, ObjectType realm_constructor, ObjectType config_object, Realm::Config&);

    // static properties
    static void get_is_developer_edition(ContextType, ObjectType, ReturnValue &);

    MethodMap<T> const static_methods = {
        {"setLogLevel", wrap<set_sync_log_level>},
    };
};

template<typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx) {
    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx), attributes);
    Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T, SessionClass<T>>::create_constructor(ctx), attributes);

    // setup synced realmFile paths
    ensure_directory_exists_for_file(default_realm_file_directory());
    SyncManager::shared().configure_file_system(default_realm_file_directory(), SyncManager::MetadataMode::NoEncryption);

    return sync_constructor;
}

template<typename T>
void SyncClass<T>::set_sync_log_level(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void SyncClass<T>::populate_sync_config(ContextType ctx, ObjectType realm_constructor, ObjectType config_object, Realm::Config& config)
{
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (Value::is_boolean(ctx, sync_config_value)) {
        config.force_sync_history = Value::to_boolean(ctx, sync_config_value);
    } else if (!Value::is_undefined(ctx, sync_config_value)) {
        auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

        ObjectType sync_constructor = Object::validated_get_object(ctx, realm_constructor, std::string("Sync"));
        Protected<ObjectType> protected_sync(ctx, sync_constructor);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

        EventLoopDispatcher<SyncBindSessionHandler> bind([protected_ctx, protected_sync](const std::string& path, const realm::SyncConfig& config, std::shared_ptr<SyncSession>) {
            HANDLESCOPE
            ObjectType user_constructor = Object::validated_get_object(protected_ctx, protected_sync, std::string("User"));
            FunctionType refreshAccessToken = Object::validated_get_function(protected_ctx, user_constructor, std::string("_refreshAccessToken"));

            ValueType arguments[3];
            arguments[0] = create_object<T, UserClass<T>>(protected_ctx, new SharedUser(config.user));
            arguments[1] = Value::from_string(protected_ctx, path.c_str());
            arguments[2] = Value::from_string(protected_ctx, config.realm_url.c_str());
            Function::call(protected_ctx, refreshAccessToken, 3, arguments);
        });

        std::function<SyncSessionErrorHandler> error_handler;
        ValueType error_func = Object::get_property(ctx, sync_config_object, "error");
        if (!Value::is_undefined(ctx, error_func)) {
            error_handler = EventLoopDispatcher<SyncSessionErrorHandler>(SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
        }

        ObjectType user = Object::validated_get_object(ctx, sync_config_object, "user");
        SharedUser shared_user = *get_internal<T, UserClass<T>>(user);
        if (shared_user->state() != SyncUser::State::Active) {
            throw std::runtime_error("User is no longer valid.");
        }

        std::string raw_realm_url = Object::validated_get_string(ctx, sync_config_object, "url");
        if (shared_user->token_type() == SyncUser::TokenType::Admin) {
            static std::regex tilde("/~/");
            raw_realm_url = std::regex_replace(raw_realm_url, tilde, "/__auth/");
        }
        
        bool client_validate_ssl = true;
        ValueType validate_ssl_temp = Object::get_property(ctx, sync_config_object, "validate_ssl");
        if (!Value::is_undefined(ctx, validate_ssl_temp)) {
            client_validate_ssl = Value::validated_to_boolean(ctx, validate_ssl_temp, "validate_ssl");
        }

        util::Optional<std::string> ssl_trust_certificate_path;
        ValueType trust_certificate_path_temp = Object::get_property(ctx, sync_config_object, "ssl_trust_certificate_path");
         if (!Value::is_undefined(ctx, trust_certificate_path_temp)) {
            ssl_trust_certificate_path = std::string(Value::validated_to_string(ctx, trust_certificate_path_temp, "ssl_trust_certificate_path"));
        }
        else {
            ssl_trust_certificate_path = util::none;
        }

        // FIXME - use make_shared
        config.sync_config = std::shared_ptr<SyncConfig>(new SyncConfig{shared_user, raw_realm_url,
                                                                        SyncSessionStopPolicy::AfterChangesUploaded,
                                                                        std::move(bind), std::move(error_handler),
                                                                        nullptr, util::none,
                                                                        client_validate_ssl, ssl_trust_certificate_path});
        config.schema_mode = SchemaMode::Additive;
        config.path = realm::SyncManager::shared().path_for_realm(shared_user->identity(), raw_realm_url);

        if (!config.encryption_key.empty()) {
            config.sync_config->realm_encryption_key = std::array<char, 64>();
            std::copy_n(config.encryption_key.begin(), config.sync_config->realm_encryption_key->size(), config.sync_config->realm_encryption_key->begin());
        }
    }
}

} // js
} // realm
