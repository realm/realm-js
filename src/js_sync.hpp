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

#include "js_class.hpp"
#include "js_collection.hpp"
#include "platform.hpp"
#include "sync/partial_sync.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_session.hpp"
#include "sync/sync_user.hpp"
#include "util/event_loop_dispatcher.hpp"

#include <realm/util/logger.hpp>
#include <realm/util/uri.hpp>

#if REALM_PLATFORM_NODE
#include "impl/realm_coordinator.hpp"
#include "node/js_global_notifier.hpp"
#include "node/sync_logger.hpp"
#endif

#if REALM_ANDROID
#include <jni.h>
#include "./android/io_realm_react_RealmReactModule.h"
#include "./android/jni_utils.hpp"

extern jclass ssl_helper_class;
#endif

#include <mutex>
#include <condition_variable>

namespace realm {
class Adapter;

namespace js {
template<typename T>
inline realm::SyncManager& syncManagerShared(typename T::Context &ctx) {
    static std::once_flag flag;
    std::call_once(flag, [ctx] {
        auto realm_constructor = js::Value<T>::validated_to_object(ctx, js::Object<T>::get_global(ctx, "Realm"));
        std::string user_agent_binding_info;
        auto user_agent_function = js::Object<T>::get_property(ctx, realm_constructor, "_createUserAgentDescription");
        if (js::Value<T>::is_function(ctx, user_agent_function)) {
            auto result = js::Function<T>::call(ctx, js::Value<T>::to_function(ctx, user_agent_function), realm_constructor, 0, nullptr);
            user_agent_binding_info = js::Value<T>::validated_to_string(ctx, result);
        }
        ensure_directory_exists_for_file(default_realm_file_directory());

        SyncClientConfig client_config;
        client_config.base_file_path = default_realm_file_directory();
        client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
        client_config.user_agent_binding_info = user_agent_binding_info;
        SyncManager::shared().configure(client_config);
    });
    return SyncManager::shared();
}

template<typename T>
class AdapterClass : public ClassDefinition<T, Adapter> {
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
    std::string const name = "Adapter";

    static void constructor(ContextType, ObjectType, Arguments &);

    static void current(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void advance(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void realm_at_path(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void close(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const methods = {
        {"current", wrap<current>},
        {"advance", wrap<advance>},
        {"realmAtPath", wrap<realm_at_path>},
        {"close", wrap<close>},
    };
};

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
    using Arguments = js::Arguments<T>;

public:
    std::string const name = "User";

    static FunctionType create_constructor(ContextType);

    static void get_server(ContextType, ObjectType, ReturnValue &);
    static void get_identity(ContextType, ObjectType, ReturnValue &);
    static void get_token(ContextType, ObjectType, ReturnValue &);
    static void is_admin(ContextType, ObjectType, ReturnValue &);
    static void is_admin_token(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"server", {wrap<get_server>, nullptr}},
        {"identity", {wrap<get_identity>, nullptr}},
        {"token", {wrap<get_token>, nullptr}},
        {"isAdmin", {wrap<is_admin>, nullptr}},
        {"isAdminToken", {wrap<is_admin_token>, nullptr}},
    };

    static void create_user(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void admin_user(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void get_existing_user(ContextType, ObjectType, Arguments &, ReturnValue&);

    MethodMap<T> const static_methods = {
        {"createUser", wrap<create_user>},
        {"_adminUser", wrap<admin_user>},
        {"_getExistingUser", wrap<get_existing_user>},
    };

    static void all_users(ContextType ctx, ObjectType object, ReturnValue &);

    PropertyMap<T> const static_properties = {
        {"all", {wrap<all_users>, nullptr}},
    };

    static void logout(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void session_for_on_disk_path(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const methods = {
        {"_logout", wrap<logout>},
        {"_sessionForOnDiskPath", wrap<session_for_on_disk_path>}
    };
};

template<typename T>
void UserClass<T>::get_server(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string server = get_internal<T, UserClass<T>>(ctx, object)->get()->server_url();
    return_value.set(server);
}

template<typename T>
void UserClass<T>::get_identity(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string identity = get_internal<T, UserClass<T>>(ctx, object)->get()->identity();
    return_value.set(identity);
}

template<typename T>
void UserClass<T>::get_token(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    std::string token = get_internal<T, UserClass<T>>(ctx, object)->get()->refresh_token();
    return_value.set(token);
}

template<typename T>
void UserClass<T>::is_admin(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, UserClass<T>>(ctx, object)->get()->is_admin());
}

template<typename T>
void UserClass<T>::is_admin_token(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, UserClass<T>>(ctx, object)->get()->token_type() == SyncUser::TokenType::Admin);
}

template<typename T>
void UserClass<T>::create_user(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_between(3, 5);
    SyncUserIdentifier userIdentifier {
        Value::validated_to_string(ctx, args[1], "identity"),
        Value::validated_to_string(ctx, args[0], "authServerUrl")
     };
    SharedUser *user = new SharedUser(syncManagerShared<T>(ctx).get_user(
        userIdentifier,
        Value::validated_to_string(ctx, args[2], "refreshToken")
    ));

    if (args.count == 5) {
        (*user)->set_is_admin(Value::validated_to_boolean(ctx, args[4], "isAdmin"));
    }
    return_value.set(create_object<T, UserClass<T>>(ctx, user));
}

template<typename T>
void UserClass<T>::admin_user(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(2);
    SharedUser *user = new SharedUser(syncManagerShared<T>(ctx).get_admin_token_user(
        Value::validated_to_string(ctx, args[0], "authServerUrl"),
        Value::validated_to_string(ctx, args[1], "refreshToken")
    ));
    return_value.set(create_object<T, UserClass<T>>(ctx, user));
}

template<typename T>
void UserClass<T>::get_existing_user(ContextType ctx, ObjectType, Arguments &args, ReturnValue &return_value) {
    args.validate_count(2);
    if (auto user = syncManagerShared<T>(ctx).get_existing_logged_in_user(SyncUserIdentifier{
            Value::validated_to_string(ctx, args[1], "identity"),
            Value::validated_to_string(ctx, args[0], "authServerUrl")})) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new SharedUser(std::move(user))));
    }
}

template<typename T>
void UserClass<T>::all_users(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto users = Object::create_empty(ctx);
    for (auto user : syncManagerShared<T>(ctx).all_logged_in_users()) {
        if (user->token_type() == SyncUser::TokenType::Normal) {
            Object::set_property(ctx, users, user->identity(), create_object<T, UserClass<T>>(ctx, new SharedUser(user)), ReadOnly | DontDelete);
        }
    }
    return_value.set(users);
}

template<typename T>
void UserClass<T>::logout(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &) {
    get_internal<T, UserClass<T>>(ctx, this_object)->get()->log_out();
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
    using Arguments = js::Arguments<T>;

public:
    std::string const name = "Session";
    using ProgressHandler = void(uint64_t transferred_bytes, uint64_t transferrable_bytes);
    using StateHandler = void(SyncSession::PublicState old_state, SyncSession::PublicState new_state);
    using ConnectionHandler = void(SyncSession::ConnectionState new_state, SyncSession::ConnectionState old_state);
    using DownloadUploadCompletionHandler = void(std::error_code error);

    static FunctionType create_constructor(ContextType);

    static void get_config(ContextType, ObjectType, ReturnValue &);
    static void get_user(ContextType, ObjectType, ReturnValue &);
    static void get_url(ContextType, ObjectType, ReturnValue &);
    static void get_state(ContextType, ObjectType, ReturnValue &);
    static void get_connection_state(ContextType, ObjectType, ReturnValue &);

    static void simulate_error(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void refresh_access_token(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void add_progress_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void remove_progress_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void add_state_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void remove_state_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void add_connection_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void remove_connection_notification(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void is_connected(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void resume(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void pause(ContextType ctx, ObjectType this_object, Arguments &, ReturnValue &);
    static void override_server(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void wait_for_download_completion(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void wait_for_upload_completion(ContextType, ObjectType, Arguments &, ReturnValue &);


    PropertyMap<T> const properties = {
        {"config", {wrap<get_config>, nullptr}},
        {"user", {wrap<get_user>, nullptr}},
        {"url", {wrap<get_url>, nullptr}},
        {"state", {wrap<get_state>, nullptr}},
        {"connectionState", {wrap<get_connection_state>, nullptr}},
    };

    MethodMap<T> const methods = {
        {"_simulateError", wrap<simulate_error>},
        {"_refreshAccessToken", wrap<refresh_access_token>},
        {"_overrideServer", wrap<override_server>},
        {"_waitForDownloadCompletion", wrap<wait_for_download_completion>},
        {"_waitForUploadCompletion", wrap<wait_for_upload_completion>},
        {"addProgressNotification", wrap<add_progress_notification>},
        {"removeProgressNotification", wrap<remove_progress_notification>},
        {"addConnectionNotification", wrap<add_connection_notification>},
        {"removeConnectionNotification", wrap<remove_connection_notification>},
        {"isConnected", wrap<is_connected>},
        {"resume", wrap<resume>},
        {"pause", wrap<pause>},
    };

private:
    enum Direction { Upload, Download };
    static std::string get_connection_state_value(SyncSession::ConnectionState state);
    static void wait_for_completion(Direction direction, ContextType ctx, ObjectType this_object, Arguments& args);
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
        HANDLESCOPE(m_ctx)

        std::string name = "Error";
        auto error_object = Object<T>::create_empty(m_ctx);

        if (error.is_client_reset_requested()) {
            auto config_object = Object<T>::create_empty(m_ctx);
            Object<T>::set_property(m_ctx, config_object, "path", Value<T>::from_string(m_ctx, error.user_info[SyncError::c_recovery_file_path_key]));
            Object<T>::set_property(m_ctx, config_object, "readOnly", Value<T>::from_boolean(m_ctx, true));
            Object<T>::set_property(m_ctx, error_object, "config", config_object);
            name = "ClientReset";
        }

        Object<T>::set_property(m_ctx, error_object, "name", Value<T>::from_string(m_ctx, name));
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


// An object of type SSLVerifyCallbackSyncThreadFunctor is registered with the sync client in order
// to verify SSL certificates. The SSLVerifyCallbackSyncThreadFunctor object's operator() is called
// on the sync client's event loop thread.
template <typename T>
class SSLVerifyCallbackSyncThreadFunctor {
public:
    SSLVerifyCallbackSyncThreadFunctor(typename T::Context ctx, typename T::Function ssl_verify_func)
    : m_ctx(Context<T>::get_global_context(ctx))
    , m_func(ctx, ssl_verify_func)
    , m_event_loop_dispatcher {SSLVerifyCallbackSyncThreadFunctor<T>::main_loop_handler}
    , m_mutex{new std::mutex}
    , m_cond_var{new std::condition_variable}
    {
    }

    // This function is called on the sync client's event loop thread.
    bool operator ()(const std::string& server_address, sync::Session::port_type server_port, const char* pem_data, size_t pem_size, int preverify_ok, int depth)
    {
        const std::string pem_certificate {pem_data, pem_size};
        {
            std::lock_guard<std::mutex> lock {*m_mutex};
            m_ssl_certificate_callback_done = false;
        }

        // Dispatch the call to the main_loop_handler on the node.js thread.
        m_event_loop_dispatcher(this, server_address, server_port, pem_certificate, preverify_ok, depth);

        bool ssl_certificate_accepted = false;
        {
            // Wait for the return value of the callback function on the node.js main thread.
            // The sync client blocks during this wait.
            std::unique_lock<std::mutex> lock(*m_mutex);
            m_cond_var->wait(lock, [this] { return this->m_ssl_certificate_callback_done; });
            ssl_certificate_accepted = m_ssl_certificate_accepted;
        }

        return ssl_certificate_accepted;
    }

    // main_loop_handler is called on the node.js main thread.
    // main_loop_handler calls the user callback (m_func) and sends the return value
    // back to the sync client's event loop thread through a condition variable.
    static void main_loop_handler(SSLVerifyCallbackSyncThreadFunctor<T>* this_object,
                                  const std::string& server_address,
                                  sync::Session::port_type server_port,
                                  const std::string& pem_certificate,
                                  int preverify_ok,
                                  int depth)
    {
        const Protected<typename T::GlobalContext>& ctx = this_object->m_ctx;
		HANDLESCOPE(ctx)


        typename T::Object ssl_certificate_object = Object<T>::create_empty(ctx);
        Object<T>::set_property(ctx, ssl_certificate_object, "serverAddress", Value<T>::from_string(ctx, server_address));
        Object<T>::set_property(ctx, ssl_certificate_object, "serverPort", Value<T>::from_number(ctx, double(server_port)));
        Object<T>::set_property(ctx, ssl_certificate_object, "pemCertificate", Value<T>::from_string(ctx, pem_certificate));
        Object<T>::set_property(ctx, ssl_certificate_object, "acceptedByOpenSSL", Value<T>::from_boolean(ctx, preverify_ok != 0));
        Object<T>::set_property(ctx, ssl_certificate_object, "depth", Value<T>::from_number(ctx, double(depth)));

        const int argc = 1;
        typename T::Value arguments[argc] = { ssl_certificate_object };
        typename T::Value ret_val = Function<T>::callback(ctx, this_object->m_func, typename T::Object(), 1, arguments);
        bool ret_val_bool = Value<T>::to_boolean(ctx, ret_val);

        {
            std::lock_guard<std::mutex> lock {*this_object->m_mutex};
            this_object->m_ssl_certificate_callback_done = true;
            this_object->m_ssl_certificate_accepted = ret_val_bool;
        }

        this_object->m_cond_var->notify_one();
    };


private:
    const Protected<typename T::GlobalContext> m_ctx;
    const Protected<typename T::Function> m_func;
    util::EventLoopDispatcher<void(SSLVerifyCallbackSyncThreadFunctor<T>* this_object,
                                   const std::string& server_address,
                                   sync::Session::port_type server_port,
                                   const std::string& pem_certificate,
                                   int preverify_ok,
                                   int depth)> m_event_loop_dispatcher;
    bool m_ssl_certificate_callback_done = false;
    bool m_ssl_certificate_accepted = false;
    std::shared_ptr<std::mutex> m_mutex;
    std::shared_ptr<std::condition_variable> m_cond_var;
};

template<typename T>
void UserClass<T>::session_for_on_disk_path(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    auto user = *get_internal<T, UserClass<T>>(ctx, this_object);
    if (auto session = user->session_for_on_disk_path(Value::validated_to_string(ctx, args[0]))) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_config(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        ObjectType config = Object::create_empty(ctx);
        Object::set_property(ctx, config, "user", create_object<T, UserClass<T>>(ctx, new SharedUser(session->config().user)));
        Object::set_property(ctx, config, "url", Value::from_string(ctx, session->config().realm_url()));
        Object::set_property(ctx, config, "fullSynchronization", Value::from_boolean(ctx, session->config().is_partial));

        std::string clientResyncMode;
        switch (session->config().client_resync_mode) {
        case realm::ClientResyncMode::Recover:
            clientResyncMode = "recover";
            break;
        case realm::ClientResyncMode::DiscardLocal:
            clientResyncMode = "discard";
            break;
        case realm::ClientResyncMode::Manual:
            clientResyncMode = "manual";
            break;
        }
        Object::set_property(ctx, config, "clientResyncMode", Value::from_string(ctx, clientResyncMode));

        if (auto dispatcher = session->config().error_handler.template target<util::EventLoopDispatcher<SyncSessionErrorHandler>>()) {
            if (auto handler = dispatcher->func().template target<SyncSessionErrorHandlerFunctor<T>>()) {
                Object::set_property(ctx, config, "error", handler->func());
            }
        }
        if (!session->config().custom_http_headers.empty()) {
            ObjectType custom_http_headers_object = Object::create_empty(ctx);
            for (auto it = session->config().custom_http_headers.begin(); it != session->config().custom_http_headers.end(); ++it) {
                Object::set_property(ctx, custom_http_headers_object, it->first, Value::from_string(ctx, it->second));
            }
            Object::set_property(ctx, config, "custom_http_headers", custom_http_headers_object);
        }
        return_value.set(config);
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_user(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new SharedUser(session->config().user)));
    } else {
        return_value.set_undefined();
    }
}

template<typename T>
void SessionClass<T>::get_url(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
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

    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        if (session->state() == SyncSession::PublicState::Inactive) {
            return_value.set(inactive);
        } else {
            return_value.set(active);
        }
    }
}

template<typename T>
std::string SessionClass<T>::get_connection_state_value(SyncSession::ConnectionState state) {
    switch(state) {
        case SyncSession::ConnectionState::Disconnected: return "disconnected";
        case SyncSession::ConnectionState::Connecting: return "connecting";
        case SyncSession::ConnectionState::Connected: return "connected";
		default:
			REALM_UNREACHABLE();
    }
}

template<typename T>
void SessionClass<T>::get_connection_state(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_connection_state_value(SyncSession::ConnectionState::Disconnected));
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        return_value.set(get_connection_state_value(session->connection_state()));
    }
}

template<typename T>
void SessionClass<T>::simulate_error(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &) {
    args.validate_count(2);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        std::error_code error_code(Value::validated_to_number(ctx, args[0]), realm::sync::protocol_error_category());
        std::string message = Value::validated_to_string(ctx, args[1]);
        SyncSession::OnlyForTesting::handle_error(*session, SyncError(error_code, message, false));
    }
}

template<typename T>
void SessionClass<T>::refresh_access_token(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &) {
    args.validate_between(3, 4);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        std::string sync_label = Value::validated_to_string(ctx, args[2], "syncLabel");
        session->set_multiplex_identifier(std::move(sync_label));

        if (args.count == 4 && !Value::is_undefined(ctx, args[3])) {
            std::string url_prefix = Value::validated_to_string(ctx, args[3], "urlPrefix");
            session->set_url_prefix(std::move(url_prefix));
        }

        std::string access_token = Value::validated_to_string(ctx, args[0], "accessToken");
        std::string realm_url = Value::validated_to_string(ctx, args[1], "realmUrl");
        session->refresh_access_token(std::move(access_token), std::move(realm_url));
    }
}

template<typename T>
void SessionClass<T>::add_progress_notification(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(3);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {

        std::string direction = Value::validated_to_string(ctx, args[0], "direction");
        std::string mode = Value::validated_to_string(ctx, args[1], "mode");
        SyncSession::NotifierType notifierType;
        if (direction == "download") {
            notifierType = SyncSession::NotifierType::download;
        }
        else if (direction == "upload") {
            notifierType = SyncSession::NotifierType::upload;
        }
        else {
            throw std::invalid_argument("Invalid argument 'direction'. Only 'download' and 'upload' progress notification directions are supported");
        }

        bool is_streaming = false;
        if (mode == "reportIndefinitely") {
            is_streaming = true;
        }
        else if (mode == "forCurrentlyOutstandingWork") {
            is_streaming = false;
        }
        else {
            throw std::invalid_argument("Invalid argument 'mode'. Only 'reportIndefinitely' and 'forCurrentlyOutstandingWork' progress notification modes are supported");
        }

        auto callback_function = Value::validated_to_function(ctx, args[2], "callback");

        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
        std::function<ProgressHandler> progressFunc;

        util::EventLoopDispatcher<ProgressHandler> progress_handler([=](uint64_t transferred_bytes, uint64_t transferrable_bytes) {
            HANDLESCOPE(protected_ctx)
            ValueType callback_arguments[2];
            callback_arguments[0] = Value::from_number(protected_ctx, transferred_bytes);
            callback_arguments[1] = Value::from_number(protected_ctx, transferrable_bytes);

            Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
        });

        progressFunc = std::move(progress_handler);

        auto registrationToken = session->register_progress_notifier(std::move(progressFunc), notifierType, is_streaming);
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback_function, "_syncSession", syncSession, attributes);
        Object::set_property(ctx, callback_function, "_registrationToken", Value::from_number(protected_ctx, registrationToken), attributes);
    }
}

template<typename T>
void SessionClass<T>::remove_progress_notification(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    auto callback_function = Value::validated_to_function(ctx, args[0], "callback");
    auto syncSessionProp = Object::get_property(ctx, callback_function, "_syncSession");
    if (Value::is_undefined(ctx, syncSessionProp) || Value::is_null(ctx, syncSessionProp)) {
        return;
    }

    auto syncSession = Value::validated_to_object(ctx, syncSessionProp);
    auto registrationToken = Object::get_property(ctx, callback_function, "_registrationToken");

    if (auto session = get_internal<T, SessionClass<T>>(ctx, syncSession)->lock()) {
        auto reg = Value::validated_to_number(ctx, registrationToken);
        session->unregister_progress_notifier(reg);
    }
}

template<typename T>
void SessionClass<T>::add_connection_notification(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(1);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto callback_function = Value::validated_to_function(ctx, args[0], "callback");
        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

        std::function<ConnectionHandler> connectionFunc;

        util::EventLoopDispatcher<ConnectionHandler> connection_handler([=](SyncSession::ConnectionState old_state, SyncSession::ConnectionState new_state) {
            HANDLESCOPE(protected_ctx)
            ValueType callback_arguments[2];
            callback_arguments[0] = Value::from_string(protected_ctx, get_connection_state_value(new_state));
            callback_arguments[1] = Value::from_string(protected_ctx, get_connection_state_value(old_state));
            Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 2, callback_arguments);
        });

        connectionFunc = std::move(connection_handler);

        auto notificationToken = session->register_connection_change_callback(std::move(connectionFunc));
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback_function, "_syncSession", syncSession, attributes);
        Object::set_property(ctx, callback_function, "_connectionNotificationToken", Value::from_number(protected_ctx, notificationToken), attributes);
    }
}

template<typename T>
void SessionClass<T>::remove_connection_notification(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(1);
    auto callback_function = Value::validated_to_function(ctx, args[0], "callback");
    auto syncSessionProp = Object::get_property(ctx, callback_function, "_syncSession");
    if (Value::is_undefined(ctx, syncSessionProp) || Value::is_null(ctx, syncSessionProp)) {
        return;
    }
    auto syncSession = Value::validated_to_object(ctx, syncSessionProp);
    auto registrationToken = Object::get_property(ctx, callback_function, "_connectionNotificationToken");

    if (auto session = get_internal<T, SessionClass<T>>(ctx, syncSession)->lock()) {
        auto reg = Value::validated_to_number(ctx, registrationToken);
        session->unregister_connection_change_callback(reg);
    }
}

template<typename T>
void SessionClass<T>::is_connected(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto state = session->state();
        auto connection_state = session->connection_state();
        if (connection_state == SyncSession::ConnectionState::Connected
            && (state == SyncSession::PublicState::Active || state == SyncSession::PublicState::Dying)) {
            return_value.set(true);
        }
    }
}

template<typename T>
void SessionClass<T>::resume(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        session->revive_if_needed();
    }
}

template<typename T>
void SessionClass<T>::pause(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        session->log_out();
    }
}

template<typename T>
void SessionClass<T>::override_server(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue&) {
    args.validate_count(2);

    std::string address = Value::validated_to_string(ctx, args[0], "address");
    double port = Value::validated_to_number(ctx, args[1], "port");
    if (port < 1 || port > 65535 || uint16_t(port) != port) {
        std::ostringstream message;
        message << "Invalid port number. Expected an integer in the range 1-65,535, got '" << port << "'";
        throw std::invalid_argument(message.str());
    }

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        session->override_server(std::move(address), uint16_t(port));
    }
}

template<typename T>
void SessionClass<T>::wait_for_completion(Direction direction, ContextType ctx, ObjectType this_object, Arguments &args) {
    args.validate_count(1);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto callback_function = Value::validated_to_function(ctx, args[0]);
        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

        util::EventLoopDispatcher<DownloadUploadCompletionHandler> completion_handler([=](std::error_code error) {
            HANDLESCOPE(protected_ctx)
            ValueType callback_arguments[1];
            if (error) {
                ObjectType error_object = Object::create_empty(protected_ctx);
                Object::set_property(protected_ctx, error_object, "message", Value::from_string(protected_ctx, error.message()));
                Object::set_property(protected_ctx, error_object, "errorCode", Value::from_number(protected_ctx, error.value()));
                callback_arguments[0] = error_object;
            } else {
                callback_arguments[0] = Value::from_undefined(protected_ctx);
            }
            Function<T>::callback(protected_ctx, protected_callback, typename T::Object(), 1, callback_arguments);
        });

        switch(direction) {
            case Upload:
                session->wait_for_upload_completion(std::move(completion_handler));
                break;
            case Download:
                session->wait_for_download_completion(std::move(completion_handler));
                break;
        }
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback_function, "_syncSession", syncSession, attributes);
    }
}

template<typename T>
void SessionClass<T>::wait_for_upload_completion(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue&) {
    wait_for_completion(Direction::Upload, ctx, this_object, args);
}

template<typename T>
void SessionClass<T>::wait_for_download_completion(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue&) {
    wait_for_completion(Direction::Download, ctx, this_object, args);
}

template<typename T>
class Subscription : public partial_sync::Subscription {
public:
    Subscription(partial_sync::Subscription s, util::Optional<std::string> name) : partial_sync::Subscription(std::move(s)), m_name(name) {}
    Subscription(Subscription &&) = default;

    util::Optional<std::string> m_name;
    std::vector<std::pair<Protected<typename T::Function>, partial_sync::SubscriptionNotificationToken>> m_notification_tokens;
};

template<typename T>
class SubscriptionClass : public ClassDefinition<T, Subscription<T>> {
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
    std::string const name = "Subscription";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, partial_sync::Subscription, util::Optional<std::string>);

    static void get_state(ContextType, ObjectType, ReturnValue &);
    static void get_error(ContextType, ObjectType, ReturnValue &);
    static void get_name(ContextType, ObjectType, ReturnValue &);

    static void unsubscribe(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);

    PropertyMap<T> const properties = {
        {"state", {wrap<get_state>, nullptr}},
        {"error", {wrap<get_error>, nullptr}},
        {"name",  {wrap<get_name>, nullptr}},
    };

    MethodMap<T> const methods = {
        {"unsubscribe", wrap<unsubscribe>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };
};

template<typename T>
typename T::Function SubscriptionClass<T>::create_constructor(ContextType ctx) {
	return ObjectWrap<T, SubscriptionClass<T>>::create_constructor(ctx);
}

template<typename T>
typename T::Object SubscriptionClass<T>::create_instance(ContextType ctx, partial_sync::Subscription subscription, util::Optional<std::string> name) {
    return create_object<T, SubscriptionClass<T>>(ctx, new Subscription<T>(std::move(subscription), name));
}

template<typename T>
void SubscriptionClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(static_cast<int8_t>(subscription->state()));
}

template<typename T>
void SubscriptionClass<T>::get_error(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, object);
    if (auto error = subscription->error()) {
        try {
            std::rethrow_exception(error);
        }
        catch (const std::exception& e) {
            return_value.set(e.what());
        }
    }
    else {
        return_value.set_undefined();
    }
}

template<typename T>
void SubscriptionClass<T>::get_name(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, object);
    if (subscription->m_name == util::none) {
        // FIXME: should we reconstruct the name to match the one stored in __ResultSets?
        return_value.set_undefined();
    }
    else {
        return_value.set(subscription->m_name);
    }
}

template<typename T>
void SubscriptionClass<T>::unsubscribe(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    partial_sync::unsubscribe(*subscription);
    return_value.set_undefined();
}

template<typename T>
void SubscriptionClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, this_object);

    auto callback = Value::validated_to_function(ctx, args[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto token = subscription->add_notification_callback([=]() {
        HANDLESCOPE(protected_ctx)

        ValueType arguments[2];
        arguments[0] = static_cast<ObjectType>(protected_this),
        arguments[1] = Value::from_number(protected_ctx, static_cast<double>(subscription->state()));
        Function::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
    });

    subscription->m_notification_tokens.emplace_back(protected_callback, std::move(token));
}

template<typename T>
void SubscriptionClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, this_object);

    auto callback = Value::validated_to_function(ctx, args[0]);
    auto protected_function = Protected<FunctionType>(ctx, callback);

    auto& tokens = subscription->m_notification_tokens;
    auto compare = [&](auto&& token) {
        return typename Protected<FunctionType>::Comparator()(token.first, protected_function);
    };
    tokens.erase(std::remove_if(tokens.begin(), tokens.end(), compare), tokens.end());
}

template<typename T>
void SubscriptionClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto subscription = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    subscription->m_notification_tokens.clear();
}

template<typename T>
class SyncClass : public ClassDefinition<T, void*> {
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
    std::string const name = "Sync";

    static FunctionType create_constructor(ContextType);

    static void initialize_sync_manager(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void set_sync_log_level(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void set_sync_logger(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void set_sync_user_agent(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void initiate_client_reset(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void reconnect(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void has_existing_sessions(ContextType, ObjectType, Arguments &, ReturnValue &);

    static void create_global_notifier(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void local_listener_realms(ContextType, ObjectType, Arguments&, ReturnValue &);
    static void enable_multiplexing(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void deserialize_change_set(ContextType, ObjectType, Arguments &, ReturnValue &);

    // private
    static std::function<SyncBindSessionHandler> session_bind_callback(ContextType ctx, ObjectType sync_constructor);
    static void populate_sync_config(ContextType, ObjectType realm_constructor, ObjectType config_object, Realm::Config&);
    static void populate_sync_config_for_ssl(ContextType, ObjectType config_object, SyncConfig&);

    MethodMap<T> const static_methods = {
        {"_hasExistingSessions", {wrap<has_existing_sessions>}},
        {"initiateClientReset", wrap<initiate_client_reset>},
        {"reconnect", wrap<reconnect>},
        {"setLogLevel", wrap<set_sync_log_level>},
        {"enableSessionMultiplexing", wrap<enable_multiplexing>},
        {"setUserAgent", wrap<set_sync_user_agent>},
        {"_initializeSyncManager", wrap<initialize_sync_manager>},

#if REALM_PLATFORM_NODE
        {"setLogger", wrap<set_sync_logger>},
        {"setSyncLogger", wrap<set_sync_logger>},
        {"_createNotifier", wrap<create_global_notifier>},
        {"_localListenerRealms", wrap<local_listener_realms>},
        {"_deserializeChangeSet", wrap<deserialize_change_set>},
#endif
    };
};

template<typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx) {
    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx), attributes);
    Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T, SessionClass<T>>::create_constructor(ctx), attributes);
#if REALM_PLATFORM_NODE
    Object::set_property(ctx, sync_constructor, "Adapter", ObjectWrap<T, AdapterClass<T>>::create_constructor(ctx), attributes);

	GlobalNotifierClass<T>::create_constructor(ctx);
	ChangeObject<T>::create_constructor(ctx);
#endif

    return sync_constructor;
}

template<typename T>
void SyncClass<T>::initialize_sync_manager(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    args.validate_count(1);
    std::string user_agent_binding_info = Value::validated_to_string(ctx, args[0]);
    ensure_directory_exists_for_file(default_realm_file_directory());

    SyncClientConfig config;
    config.base_file_path = default_realm_file_directory();
    config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
    config.user_agent_binding_info = user_agent_binding_info;
    SyncManager::shared().configure(config);
}

template<typename T>
void SyncClass<T>::initiate_client_reset(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    args.validate_count(1);
    std::string path = Value::validated_to_string(ctx, args[0]);
    if (!SyncManager::shared().immediately_run_file_actions(std::string(path))) {
        throw std::runtime_error(util::format("Realm was not configured correctly. Client Reset could not be run for Realm at: %1", path));
    }

    SyncClientConfig client_config;
    client_config.base_file_path = default_realm_file_directory();
    client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
    SyncManager::shared().configure(client_config);
}

template<typename T>
void SyncClass<T>::set_sync_log_level(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    std::string log_level = Value::validated_to_string(ctx, args[0]);
    std::istringstream in(log_level); // Throws
    in.imbue(std::locale::classic()); // Throws
    in.unsetf(std::ios_base::skipws);
    util::Logger::Level log_level_2 = util::Logger::Level();
    in >> log_level_2; // Throws
    if (!in || !in.eof())
        throw std::runtime_error("Bad log level");
    syncManagerShared<T>(ctx).set_log_level(log_level_2);
}

#if REALM_PLATFORM_NODE
template<typename T>
void SyncClass<T>::set_sync_logger(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    auto callback_fn = Value::validated_to_function(ctx, args[0], "logger_callback");

    syncManagerShared<T>(ctx).set_logger_factory(*new realm::node::SyncLoggerFactory(ctx, callback_fn));
}
#endif

template<typename T>
void SyncClass<T>::set_sync_user_agent(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(1);
    std::string application_user_agent = Value::validated_to_string(ctx, args[0]);
    syncManagerShared<T>(ctx).set_user_agent(application_user_agent);
}

template<typename T>
void SyncClass<T>::reconnect(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(0);
    syncManagerShared<T>(ctx).reconnect();
}

template<typename T>
void SyncClass<T>::has_existing_sessions(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    args.validate_count(0);
    return_value.set(syncManagerShared<T>(ctx).has_existing_sessions());
}

template<typename T>
std::function<SyncBindSessionHandler> SyncClass<T>::session_bind_callback(ContextType ctx, ObjectType sync_constructor)
{
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<ObjectType> protected_sync_constructor(ctx, sync_constructor);
    return util::EventLoopDispatcher<SyncBindSessionHandler>([protected_ctx, protected_sync_constructor](const std::string& path, const realm::SyncConfig& config, std::shared_ptr<SyncSession>) {
        HANDLESCOPE(protected_ctx)
        ObjectType user_constructor = Object::validated_get_object(protected_ctx, protected_sync_constructor, "User");
        FunctionType refreshAccessToken = Object::validated_get_function(protected_ctx, user_constructor, "_refreshAccessToken");

        ValueType arguments[3];
        arguments[0] = create_object<T, UserClass<T>>(protected_ctx, new SharedUser(config.user));
        arguments[1] = Value::from_string(protected_ctx, path);
        arguments[2] = Value::from_string(protected_ctx, config.realm_url());
        Function::call(protected_ctx, refreshAccessToken, 3, arguments);
    });
}

template<typename T>
void SyncClass<T>::populate_sync_config(ContextType ctx, ObjectType realm_constructor, ObjectType config_object, Realm::Config& config)
{
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (Value::is_boolean(ctx, sync_config_value)) {
        config.force_sync_history = Value::to_boolean(ctx, sync_config_value);
        if (config.force_sync_history) {
            config.schema_mode = SchemaMode::Additive;
        }
    } else if (!Value::is_undefined(ctx, sync_config_value)) {
        auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

        ObjectType sync_constructor = Object::validated_get_object(ctx, realm_constructor, "Sync");
        auto bind = session_bind_callback(ctx, sync_constructor);

        std::function<SyncSessionErrorHandler> error_handler;
        ValueType error_func = Object::get_property(ctx, sync_config_object, "error");
        if (!Value::is_undefined(ctx, error_func)) {
            error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
        }

        ObjectType user = Object::validated_get_object(ctx, sync_config_object, "user");
        SharedUser shared_user = *get_internal<T, UserClass<T>>(ctx, user);
        if (shared_user->state() != SyncUser::State::Active) {
            throw std::runtime_error("User is no longer valid.");
        }

        std::string raw_realm_url = Object::validated_get_string(ctx, sync_config_object, "url");
        if (shared_user->token_type() == SyncUser::TokenType::Admin) {
            size_t pos = raw_realm_url.find("/~/");
            if (pos != std::string::npos) {
                raw_realm_url.replace(pos + 1, 1, "__auth");
            }
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

        std::function<sync::Session::SSLVerifyCallback> ssl_verify_callback;
        ValueType ssl_verify_func = Object::get_property(ctx, sync_config_object, "open_ssl_verify_callback");
        if (!Value::is_undefined(ctx, ssl_verify_func)) {
            SSLVerifyCallbackSyncThreadFunctor<T> ssl_verify_functor {ctx, Value::validated_to_function(ctx, ssl_verify_func)};
            ssl_verify_callback = std::move(ssl_verify_functor);
        }

        bool is_partial = false; // Change to `true` when `partial` is removed
        ValueType full_synchronization_value = Object::get_property(ctx, sync_config_object, "fullSynchronization");
        ValueType partial_value = Object::get_property(ctx, sync_config_object, "partial");

        // Disallow setting `partial` and `fullSynchronization` at the same time
        if (!Value::is_undefined(ctx, full_synchronization_value) && !Value::is_undefined(ctx, partial_value)) {
            throw std::invalid_argument("'partial' and 'fullSynchronization' were both set. 'partial' has been deprecated, use only 'fullSynchronization'");
        }

        if (!Value::is_undefined(ctx, partial_value)) {
            is_partial = Value::validated_to_boolean(ctx, partial_value);
        } else if (!Value::is_undefined(ctx, full_synchronization_value)) {
            is_partial = !Value::validated_to_boolean(ctx, full_synchronization_value);
        }

        bool disable_query_based_sync_url_checks = false;
        ValueType disable_query_based_sync_url_checks_value = Object::get_property(ctx, sync_config_object, "_disableQueryBasedSyncUrlChecks");
        if (!Value::is_undefined(ctx, disable_query_based_sync_url_checks_value)) {
            disable_query_based_sync_url_checks = Value::validated_to_boolean(ctx, disable_query_based_sync_url_checks_value);
        }

        if (disable_query_based_sync_url_checks) {
            config.sync_config = std::make_shared<SyncConfig>(shared_user, std::move(""));
            config.sync_config->reference_realm_url = std::move(raw_realm_url);
        }
        else {
            config.sync_config = std::make_shared<SyncConfig>(shared_user, std::move(raw_realm_url));
        }
        config.sync_config->bind_session_handler = std::move(bind);
        config.sync_config->error_handler = std::move(error_handler);
        config.sync_config->is_partial = is_partial;

        SyncSessionStopPolicy session_stop_policy = SyncSessionStopPolicy::AfterChangesUploaded;
        ValueType session_stop_policy_value = Object::get_property(ctx, sync_config_object, "_sessionStopPolicy");
        if (!Value::is_undefined(ctx, session_stop_policy_value)) {
            std::string stop_session = Value::validated_to_string(ctx, session_stop_policy_value, "_sessionStopPolicy");
            if (stop_session == std::string("immediately")) {
                session_stop_policy = SyncSessionStopPolicy::Immediately;
            } else if (stop_session == std::string("never")) {
                session_stop_policy = SyncSessionStopPolicy::LiveIndefinitely;
            } else if (stop_session == std::string("after-upload")) {
                session_stop_policy = SyncSessionStopPolicy::AfterChangesUploaded;
            } else {
                throw std::invalid_argument("Unknown argument for _sessionStopPolicy: " + stop_session);
            }
        }
        config.sync_config->stop_policy = session_stop_policy;

        ValueType custom_partial_sync_identifier_value = Object::get_property(ctx, sync_config_object, "customQueryBasedSyncIdentifier");
        if (!Value::is_undefined(ctx, custom_partial_sync_identifier_value)) {
            config.sync_config->custom_partial_sync_identifier = std::string(Value::validated_to_string(ctx, custom_partial_sync_identifier_value, "customQueryBasedSyncIdentifier"));
        }

        // Custom HTTP headers
        ValueType sync_custom_http_headers_value = Object::get_property(ctx, sync_config_object, "custom_http_headers");
        if (!Value::is_undefined(ctx, sync_custom_http_headers_value)) {
            auto sync_custom_http_headers = Value::validated_to_object(ctx, sync_custom_http_headers_value);
            auto property_names = Object::get_property_names(ctx, sync_custom_http_headers);
            std::map<std::string, std::string> http_headers;
            for (auto it = property_names.begin(); it != property_names.end(); ++it) {
                auto name = *it;
                ValueType prop_value = Object::get_property(ctx, sync_custom_http_headers, name);
                auto value = Value::validated_to_string(ctx, prop_value);
                http_headers[name] = value;
            }
            config.sync_config->custom_http_headers = std::move(http_headers);
        }

        // TODO: remove
        config.sync_config->client_validate_ssl = client_validate_ssl;
        config.sync_config->ssl_trust_certificate_path = ssl_trust_certificate_path;
        config.sync_config->ssl_verify_callback = std::move(ssl_verify_callback);

        ValueType ssl_config_value = Object::get_property(ctx, sync_config_object, "ssl");
        if (Value::is_object(ctx, ssl_config_value)) {
            auto ssl_config_object = Value::to_object(ctx, ssl_config_value);
            populate_sync_config_for_ssl(ctx, ssl_config_object, *config.sync_config);
        }

        config.schema_mode = SchemaMode::Additive;
        config.path = syncManagerShared<T>(ctx).path_for_realm(*shared_user, config.sync_config->realm_url());

        if (!config.encryption_key.empty()) {
            config.sync_config->realm_encryption_key = std::array<char, 64>();
            std::copy_n(config.encryption_key.begin(), config.sync_config->realm_encryption_key->size(), config.sync_config->realm_encryption_key->begin());
        }

#if REALM_ANDROID
        // For React Native Android, if the user didn't define the ssl_verify_callback, we provide a default
        // implementation for him, otherwise all SSL validation will fail, since the Sync client doesn't have
        // access to the Android Keystore.
        // This default implementation will perform a JNI call to invoke a Java method defined at the `SSLHelper`
        // to perform the certificate verification.
        if (!config.sync_config->ssl_verify_callback) {
            auto ssl_verify_functor =
            [](const std::string server_address, realm::sync::Session::port_type server_port,
               const char* pem_data, size_t pem_size, int preverify_ok, int depth) {
                JNIEnv* env = realm::jni_util::JniUtils::get_env(true);
                static jmethodID java_certificate_verifier = env->GetStaticMethodID(ssl_helper_class, "certificateVerifier", "(Ljava/lang/String;Ljava/lang/String;I)Z");
                jstring jserver_address = env->NewStringUTF(server_address.c_str());
                // deep copy the pem_data into a string so DeleteLocalRef delete the local reference not the original const char
                std::string pem(pem_data, pem_size);
                jstring jpem = env->NewStringUTF(pem.c_str());

                bool isValid = env->CallStaticBooleanMethod(ssl_helper_class, java_certificate_verifier,
                                                            jserver_address,
                                                            jpem, depth) == JNI_TRUE;
                env->DeleteLocalRef(jserver_address);
                env->DeleteLocalRef(jpem);
                return isValid;
            };
            config.sync_config->ssl_verify_callback = std::move(ssl_verify_functor);
        }
#endif

        // default for query-based sync is manual and recover for full sync
        ClientResyncMode clientResyncMode = (config.sync_config->is_partial) ? realm::ClientResyncMode::Manual : realm::ClientResyncMode::Recover;
        ValueType client_resync_mode_temp = Object::get_property(ctx, sync_config_object, "clientResyncMode");
        if (!Value::is_undefined(ctx, client_resync_mode_temp)) {
            std::string client_resync_mode = std::string(Value::validated_to_string(ctx, client_resync_mode_temp, "client_resync_mode"));
            if (client_resync_mode == std::string("recover")) {
                clientResyncMode = realm::ClientResyncMode::Recover;
            } else if (client_resync_mode == std::string("manual")) {
                clientResyncMode = realm::ClientResyncMode::Manual;
            } else if (client_resync_mode == std::string("discard")) {
                clientResyncMode = realm::ClientResyncMode::DiscardLocal;
            } else {
                throw std::invalid_argument("Unknown argument for clientResyncMode: " + client_resync_mode);
            }
        }
        if (config.sync_config->is_partial && clientResyncMode != realm::ClientResyncMode::Manual) {
            throw std::invalid_argument("Only 'manual' resync mode is supported for query-based sync.");
        }
        config.sync_config->client_resync_mode = clientResyncMode;
    }
}

template<typename T>
void SyncClass<T>::populate_sync_config_for_ssl(ContextType ctx, ObjectType config_object, SyncConfig& config)
{
    ValueType validate_ssl = Object::get_property(ctx, config_object, "validate");
    if (Value::is_boolean(ctx, validate_ssl)) {
        config.client_validate_ssl = Value::to_boolean(ctx, validate_ssl);
    }

    ValueType certificate_path = Object::get_property(ctx, config_object, "certificatePath");
    if (Value::is_string(ctx, certificate_path)) {
        config.ssl_trust_certificate_path = std::string(Value::to_string(ctx, certificate_path));
    }

    ValueType validate_callback = Object::get_property(ctx, config_object, "validateCallback");
    if (Value::is_function(ctx, validate_callback)) {
        config.ssl_verify_callback = SSLVerifyCallbackSyncThreadFunctor<T> { ctx, Value::to_function(ctx, validate_callback) };
    }
}

template<typename T>
void SyncClass<T>::enable_multiplexing(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue &return_value) {
    arguments.validate_count(0);
    syncManagerShared<T>(ctx).enable_session_multiplexing();
}

#if REALM_PLATFORM_NODE
template<typename T>
void SyncClass<T>::create_global_notifier(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    args.validate_maximum(5);
    std::string local_root_dir = normalize_realm_path(Value::validated_to_string(ctx, args[4], "listenerDirectory"));
    util::try_make_dir(local_root_dir);

    std::string server_base_url = Value::validated_to_string(ctx, args[0], "serverUrl");

    Uri uri(server_base_url);
    if (uri.get_scheme() != "realm:" && uri.get_scheme() != "realms:") {
        throw std::runtime_error("Server URL must be of the realm-scheme");
    }

    if (!uri.get_path().empty() || !uri.get_query().empty() || !uri.get_frag().empty()) {
        throw std::runtime_error("Server URL must only contain a host and port");
    }

    ObjectType user = Value::validated_to_object(ctx, args[1], "adminUser");
    if (!Object::template is_instance<UserClass<T>>(ctx, user)) {
        throw std::runtime_error("object must be of type Sync.User");
    }
    SharedUser shared_user = *get_internal<T, UserClass<T>>(ctx, user);
    if (shared_user->state() != SyncUser::State::Active) {
        throw std::runtime_error("User is no longer valid.");
    }
    if (!shared_user->is_admin()) {
        throw std::runtime_error("User needs to be an admin.");
    }

    auto user_callback = Value::validated_to_function(ctx, args[2], "callback");

    SyncConfig sync_config_template(shared_user, server_base_url);
    if (!Value::is_undefined(ctx, args[3])) {
        ObjectType ssl_config_object = Value::validated_to_object(ctx, args[3], "sslConfiguration");
        SyncClass<T>::populate_sync_config_for_ssl(ctx, ssl_config_object, sync_config_template);
    }

    sync_config_template.bind_session_handler = SyncClass<T>::session_bind_callback(ctx, this_object);

    auto notifier = std::make_unique<GlobalNotifier>(std::make_unique<GlobalNotifierCallback<T>>(ctx, Protected<FunctionType>{ctx, std::move(user_callback)}),
                                                     std::move(local_root_dir),
                                                     std::move(sync_config_template)); // Throws
    return_value.set(create_object<T, GlobalNotifierClass<T>>(ctx, notifier.get()));
    notifier.release();
}

template <typename T>
void SyncClass<T>::local_listener_realms(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    args.validate_count(1);

    std::string local_root_dir = normalize_realm_path(Value::validated_to_string(ctx, args[0], "listenerDirectory"));
    std::string admin_realm_path = util::File::resolve("realms.realm", local_root_dir);
    // if the admin Realm doesn't exists, then there is no local Realm files to
    // return (notifier didn't run yet here).
    if (!util::File::exists(admin_realm_path)) {
        return_value.set_undefined();
        return;
    }

    // If the admin Realm is already open we need to get it from the
    // coordinator to get the matching sync configuration, but if it's not
    // already open we want to open it without creating a sync session.
    std::shared_ptr<Realm> realm;
    if (auto coordinator = realm::_impl::RealmCoordinator::get_existing_coordinator(admin_realm_path)) {
        realm = coordinator->get_realm();
    }
    else {
        Realm::Config config;
        config.path = admin_realm_path;
        config.force_sync_history = true;
        config.schema_mode = SchemaMode::Additive;
        realm = Realm::get_shared_realm(config);
    }

    auto& group = realm->read_group();
    auto& table = *ObjectStore::table_for_object_type(group, "RealmFile");
    auto path_col_key = table.get_column_key("path");

    std::vector<std::string> local_realms;
    for (auto& obj : table) {
        auto virtual_path = obj.get<StringData>(path_col_key);
        auto id = obj.get_object_id();
        std::string file_path = util::format("%1/realms%2/%3.realm", local_root_dir, virtual_path, id.to_string());

        // filter out Realms not present locally
        if (util::File::exists(file_path)) {
            local_realms.push_back(virtual_path);
            local_realms.push_back(file_path);
        }
    }

    if (local_realms.empty()) {
        return_value.set_undefined();
        return;
    }

	Napi::Array arr = Napi::Array::New(ctx, local_realms.size());
	for (size_t i = 0; i < local_realms.size(); i++) {
		arr.Set(i, Napi::String::New(ctx, local_realms[i]));
	}
	return_value.set(arr);
}

template<typename T>
void SyncClass<T>::deserialize_change_set(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue &return_value) {
    std::string serialized = Value::validated_to_string(ctx, args[0], "serialized");
    return_value.set(create_object<T, ChangeObject<T>>(ctx, new GlobalNotifier::ChangeNotification(serialized)));
}
#endif



} // js
} // realm
