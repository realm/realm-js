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

#include <mutex>
#include <condition_variable>

#include "event_loop_dispatcher.hpp"
#include "platform.hpp"
#include "js_class.hpp"
#include "js_collection.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_session.hpp"
#include "sync/sync_user.hpp"
#include "sync/partial_sync.hpp"
#include "realm/util/logger.hpp"
#include "realm/util/uri.hpp"

#if REALM_ANDROID
#include <jni.h>
#include "./android/io_realm_react_RealmReactModule.h"
#include "./android/jni_utils.hpp"

extern jclass ssl_helper_class;
#endif

namespace realm {
namespace js {

inline realm::SyncManager& syncManagerShared() {
    static std::once_flag flag;
    std::call_once(flag, [] {
        ensure_directory_exists_for_file(default_realm_file_directory());
        SyncManager::shared().configure_file_system(default_realm_file_directory(), SyncManager::MetadataMode::NoEncryption);
    });
    return SyncManager::shared();
}

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

    /*static void current_user(ContextType ctx, ObjectType object, ReturnValue &return_value);*/
    static void all_users(ContextType ctx, ObjectType object, ReturnValue &);

    PropertyMap<T> const static_properties = {
        /*{"current", {wrap<current_user>, nullptr}},*/
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
void UserClass<T>::is_admin_token(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(get_internal<T, UserClass<T>>(object)->get()->token_type() == SyncUser::TokenType::Admin);
}

template<typename T>
void UserClass<T>::create_user(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_between(3, 5);
    SyncUserIdentifier userIdentifier {
        Value::validated_to_string(ctx, args[1], "identity"),
        Value::validated_to_string(ctx, args[0], "authServerUrl")
     };
    SharedUser *user = new SharedUser(syncManagerShared().get_user(
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
    SharedUser *user = new SharedUser(syncManagerShared().get_admin_token_user(
        Value::validated_to_string(ctx, args[0], "authServerUrl"),
        Value::validated_to_string(ctx, args[1], "refreshToken")
    ));
    return_value.set(create_object<T, UserClass<T>>(ctx, user));
}

template<typename T>
void UserClass<T>::get_existing_user(ContextType ctx, ObjectType, Arguments &args, ReturnValue &return_value) {
    args.validate_count(2);
    if (auto user = syncManagerShared().get_existing_logged_in_user(SyncUserIdentifier{
            Value::validated_to_string(ctx, args[1], "identity"),
            Value::validated_to_string(ctx, args[0], "authServerUrl")})) {
        return_value.set(create_object<T, UserClass<T>>(ctx, new SharedUser(std::move(user))));
    }
}

template<typename T>
void UserClass<T>::all_users(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto users = Object::create_empty(ctx);
    for (auto user : syncManagerShared().all_logged_in_users()) {
        if (user->token_type() == SyncUser::TokenType::Normal) {
            Object::set_property(ctx, users, user->identity(), create_object<T, UserClass<T>>(ctx, new SharedUser(user)), ReadOnly | DontDelete);
        }
    }
    return_value.set(users);
}

template<typename T>
void UserClass<T>::logout(ContextType, ObjectType this_object, Arguments &, ReturnValue &) {
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
    using Arguments = js::Arguments<T>;

public:
    std::string const name = "Session";
    using ProgressHandler = void(uint64_t transferred_bytes, uint64_t transferrable_bytes);

    static FunctionType create_constructor(ContextType);

    static void get_config(ContextType, ObjectType, ReturnValue &);
    static void get_user(ContextType, ObjectType, ReturnValue &);
    static void get_url(ContextType, ObjectType, ReturnValue &);
    static void get_state(ContextType, ObjectType, ReturnValue &);

    static void simulate_error(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void refresh_access_token(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void add_progress_notification(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_progress_notification(ContextType, ObjectType, Arguments &, ReturnValue &);

    static void override_server(ContextType, ObjectType, Arguments &, ReturnValue &);

    PropertyMap<T> const properties = {
        {"config", {wrap<get_config>, nullptr}},
        {"user", {wrap<get_user>, nullptr}},
        {"url", {wrap<get_url>, nullptr}},
        {"state", {wrap<get_state>, nullptr}}
    };

    MethodMap<T> const methods = {
        {"_simulateError", wrap<simulate_error>},
        {"_refreshAccessToken", wrap<refresh_access_token>},
        {"_overrideServer", wrap<override_server>},
        {"addProgressNotification", wrap<add_progress_notification>},
        {"removeProgressNotification", wrap<remove_progress_notification>},
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
        HANDLESCOPE

        const Protected<typename T::GlobalContext>& ctx = this_object->m_ctx;

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
    EventLoopDispatcher<void(SSLVerifyCallbackSyncThreadFunctor<T>* this_object,
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
    auto user = *get_internal<T, UserClass<T>>(this_object);
    if (auto session = user->session_for_on_disk_path(Value::validated_to_string(ctx, args[0]))) {
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
        Object::set_property(ctx, config, "url", Value::from_string(ctx, session->config().realm_url()));
        if (auto dispatcher = session->config().error_handler.template target<EventLoopDispatcher<SyncSessionErrorHandler>>()) {
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
void SessionClass<T>::simulate_error(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &) {
    args.validate_count(2);

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {
        std::error_code error_code(Value::validated_to_number(ctx, args[0]), realm::sync::protocol_error_category());
        std::string message = Value::validated_to_string(ctx, args[1]);
        SyncSession::OnlyForTesting::handle_error(*session, SyncError(error_code, message, false));
    }
}

template<typename T>
void SessionClass<T>::refresh_access_token(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &) {
    args.validate_count(3);

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {
        std::string sync_label = Value::validated_to_string(ctx, args[2], "syncLabel");
        session->set_multiplex_identifier(std::move(sync_label));

        std::string access_token = Value::validated_to_string(ctx, args[0], "accessToken");
        std::string realm_url = Value::validated_to_string(ctx, args[1], "realmUrl");
        session->refresh_access_token(std::move(access_token), std::move(realm_url));
    }
}

template<typename T>
void SessionClass<T>::add_progress_notification(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_count(3);

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {

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

        EventLoopDispatcher<ProgressHandler> progress_handler([=](uint64_t transferred_bytes, uint64_t transferrable_bytes) {
            HANDLESCOPE
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

    if (auto session = get_internal<T, SessionClass<T>>(syncSession)->lock()) {
        auto reg = Value::validated_to_number(ctx, registrationToken);
        session->unregister_progress_notifier(reg);
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

    if (auto session = get_internal<T, SessionClass<T>>(this_object)->lock()) {
        session->override_server(std::move(address), uint16_t(port));
    }
}

template<typename T>
class Subscription : public partial_sync::Subscription {
public:
    Subscription(partial_sync::Subscription s) : partial_sync::Subscription(std::move(s)) {}
    Subscription(Subscription &&) = default;

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
    static ObjectType create_instance(ContextType, partial_sync::Subscription);

    static void get_state(ContextType, ObjectType, ReturnValue &);
    static void get_error(ContextType, ObjectType, ReturnValue &);

    static void unsubscribe(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);

    PropertyMap<T> const properties = {
        {"state", {wrap<get_state>, nullptr}},
        {"error", {wrap<get_error>, nullptr}}
    };

    MethodMap<T> const methods = {
        {"unsubscribe", wrap<unsubscribe>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };
};

template<typename T>
typename T::Object SubscriptionClass<T>::create_instance(ContextType ctx, partial_sync::Subscription subscription) {
    return create_object<T, SubscriptionClass<T>>(ctx, new Subscription<T>(std::move(subscription)));
}

template<typename T>
void SubscriptionClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto subscription = get_internal<T, SubscriptionClass<T>>(object);
    return_value.set(static_cast<int8_t>(subscription->state()));
}

template<typename T>
void SubscriptionClass<T>::get_error(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto subscription = get_internal<T, SubscriptionClass<T>>(object);
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
void SubscriptionClass<T>::unsubscribe(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto subscription = get_internal<T, SubscriptionClass<T>>(this_object);
    partial_sync::unsubscribe(*subscription);
    return_value.set_undefined();
}

template<typename T>
void SubscriptionClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    auto subscription = get_internal<T, SubscriptionClass<T>>(this_object);

    auto callback = Value::validated_to_function(ctx, args[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto token = subscription->add_notification_callback([=]() {
        HANDLESCOPE

        ValueType arguments[2];
        arguments[0] = static_cast<ObjectType>(protected_this),
        arguments[1] = Value::from_number(ctx, static_cast<double>(subscription->state()));
        Function::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
    });

    subscription->m_notification_tokens.emplace_back(protected_callback, std::move(token));
}

template<typename T>
void SubscriptionClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    auto subscription = get_internal<T, SubscriptionClass<T>>(this_object);

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
    auto subscription = get_internal<T, SubscriptionClass<T>>(this_object);
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

    static void set_sync_log_level(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void initiate_client_reset(ContextType, ObjectType, Arguments &, ReturnValue &);

    // private
    static std::function<SyncBindSessionHandler> session_bind_callback(ContextType ctx, ObjectType sync_constructor);
    static void populate_sync_config(ContextType, ObjectType realm_constructor, ObjectType config_object, Realm::Config&);
    static void populate_sync_config_for_ssl(ContextType, ObjectType config_object, SyncConfig&);

    // static properties
    static void get_is_developer_edition(ContextType, ObjectType, ReturnValue &);

    MethodMap<T> const static_methods = {
        {"setLogLevel", wrap<set_sync_log_level>},
        {"initiateClientReset", wrap<initiate_client_reset>},
    };
};

template<typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx) {
    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx), attributes);
    Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T, SessionClass<T>>::create_constructor(ctx), attributes);

    return sync_constructor;
}

template<typename T>
void SyncClass<T>::initiate_client_reset(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue & return_value) {
    args.validate_count(1);
    std::string path = Value::validated_to_string(ctx, args[0]);
    if (!SyncManager::shared().immediately_run_file_actions(std::string(path))) {
        throw std::runtime_error(util::format("Realm was not configured correctly. Client Reset could not be run for Realm at: %1", path));
    }
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
    syncManagerShared().set_log_level(log_level_2);
}

template<typename T>
std::function<SyncBindSessionHandler> SyncClass<T>::session_bind_callback(ContextType ctx, ObjectType sync_constructor)
{
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<ObjectType> protected_sync_constructor(ctx, sync_constructor);
    return EventLoopDispatcher<SyncBindSessionHandler>([protected_ctx, protected_sync_constructor](const std::string& path, const realm::SyncConfig& config, std::shared_ptr<SyncSession>) {
        HANDLESCOPE
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
            error_handler = EventLoopDispatcher<SyncSessionErrorHandler>(SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
        }

        ObjectType user = Object::validated_get_object(ctx, sync_config_object, "user");
        SharedUser shared_user = *get_internal<T, UserClass<T>>(user);
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
        config.path = syncManagerShared().path_for_realm(*shared_user, config.sync_config->realm_url());

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

} // js
} // realm
