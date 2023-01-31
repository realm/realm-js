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

#include <math.h>
#include <cstdlib>
#include <memory>
#include <optional>

#include "js_class.hpp"
#include "js_collection.hpp"
#include "js_app.hpp"
#include "js_types.hpp"
#include "js_user.hpp"
#include "js_subscriptions.hpp"
#include "logger.hpp"

#include "platform.hpp"
#include "realm/version_id.hpp"
#include <realm/object-store/shared_realm.hpp>
#include <realm/sync/config.hpp>
#include <realm/sync/protocol.hpp>
#include <realm/sync/client_base.hpp>
#include <realm/object-store/sync/sync_manager.hpp>
#include <realm/object-store/sync/sync_session.hpp>
#include <realm/object-store/sync/sync_user.hpp>
#include <realm/object-store/util/event_loop_dispatcher.hpp>
#include <realm/object-store/thread_safe_reference.hpp>

#include <realm/util/logger.hpp>
#include <realm/util/uri.hpp>
#include <realm/util/network.hpp>
#include <stdexcept>
#include <string>

#if REALM_PLATFORM_NODE
#include <realm/object-store/impl/realm_coordinator.hpp>
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
namespace js {

template <typename T>
class RealmClass;

// simple utility method
template <typename T>
static std::string partition_value_bson_to_string(typename T::Context ctx, typename T::Value partition_value_value)
{
    bson::Bson partition_bson;
    if (Value<T>::is_string(ctx, partition_value_value)) {
        std::string pv = Value<T>::validated_to_string(ctx, partition_value_value);
        partition_bson = bson::Bson(pv);
    }
    else if (Value<T>::is_number(ctx, partition_value_value)) {
        double pv = Value<T>::validated_to_number(ctx, partition_value_value);
        double integerPart;
        double fractionalPart = modf(pv, &integerPart);
        if (pv > JS_MAX_SAFE_INTEGER || pv < -JS_MAX_SAFE_INTEGER || fabs(fractionalPart) > 0.0) {
            throw std::runtime_error("partitionValue of type 'number' must be an integer in the range: "
                                     "Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER.");
        }
        partition_bson = bson::Bson(static_cast<int64_t>(integerPart));
    }
    else if (Value<T>::is_object_id(ctx, partition_value_value)) {
        auto pv = Value<T>::validated_to_object_id(ctx, partition_value_value);
        partition_bson = bson::Bson(pv);
    }
    else if (Value<T>::is_uuid(ctx, partition_value_value)) {
        auto pv = Value<T>::validated_to_uuid(ctx, partition_value_value);
        partition_bson = bson::Bson(pv);
    }
    else if (Value<T>::is_null(ctx, partition_value_value)) {
        partition_bson = bson::Bson();
    }
    else {
        throw std::runtime_error("partitionValue must be of type 'string', 'number', 'objectId', or 'null'.");
    }

    std::ostringstream s;
    s << partition_bson;
    std::string partition_value = s.str();
    return partition_value;
}


using WeakSession = std::weak_ptr<realm::SyncSession>;

template <typename T>
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
    using StateHandler = void(SyncSession::State old_state, SyncSession::State new_state);
    using ConnectionHandler = void(SyncSession::ConnectionState new_state, SyncSession::ConnectionState old_state);
    using DownloadUploadCompletionHandler = void(std::error_code error);

    static FunctionType create_constructor(ContextType);

    static void get_config(ContextType, ObjectType, ReturnValue&);
    static void get_user(ContextType, ObjectType, ReturnValue&);
    static void get_state(ContextType, ObjectType, ReturnValue&);
    static void get_connection_state(ContextType, ObjectType, ReturnValue&);

    static void simulate_error(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void add_progress_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void remove_progress_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void add_state_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void remove_state_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void add_connection_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void remove_connection_notification(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void is_connected(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void resume(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    static void pause(ContextType ctx, ObjectType this_object, Arguments&, ReturnValue&);
    //    static void override_server(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void wait_for_download_completion(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void wait_for_upload_completion(ContextType, ObjectType, Arguments&, ReturnValue&);

    // TODO: add app or appId property
    PropertyMap<T> const properties = {
        {"user", {wrap<get_user>, nullptr}},
        {"state", {wrap<get_state>, nullptr}},
        {"connectionState", {wrap<get_connection_state>, nullptr}},
        {"_config", {wrap<get_config>, nullptr}},
    };

    MethodMap<T> const methods = {
        {"_simulateError", wrap<simulate_error>},
        //{"_overrideServer", wrap<override_server>},
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

template <typename T>
class ClientResetAfterFunctor {
public:
    ClientResetAfterFunctor(typename T::Context ctx, typename T::Function after_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_func(ctx, after_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom client reset handler: https://github.com/realm/realm-js/issues/4150
        m_func.SuppressDestruct();
#endif
    }

    typename T::Function func() const
    {
        return m_func;
    }

    void operator()(SharedRealm before_realm, ThreadSafeReference after_realm_ref, bool did_recover)
    {
        HANDLESCOPE(m_ctx);

        SharedRealm after_realm =
            Realm::get_shared_realm(std::move(after_realm_ref), util::Scheduler::make_default());
        typename T::Value arguments[] = {
            create_object<T, RealmClass<T>>(m_ctx, new SharedRealm(before_realm)),
            create_object<T, RealmClass<T>>(m_ctx, new SharedRealm(after_realm)),
        };
        Function<T>::callback(m_ctx, m_func, 2, arguments);
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_func;
};


template <typename T>
class ClientResetAfterRecoveryOrDiscardFunctor {
public:
    ClientResetAfterRecoveryOrDiscardFunctor(typename T::Context ctx, typename T::Function after_func,
                                             typename T::Function discard_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_func(ctx, after_func)
        , m_discard_func(ctx, discard_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom client reset handlers: https://github.com/realm/realm-js/issues/4150
        m_func.SuppressDestruct();
        m_discard_func.SuppressDestruct();
#endif
    }

    typename T::Function func() const
    {
        return m_func;
    }

    void operator()(SharedRealm before_realm, ThreadSafeReference after_realm_ref, bool did_recover)
    {
        HANDLESCOPE(m_ctx);

        SharedRealm after_realm =
            Realm::get_shared_realm(std::move(after_realm_ref), util::Scheduler::make_default());


        if (did_recover) {
            typename T::Value arguments[] = {
                create_object<T, RealmClass<T>>(m_ctx, new SharedRealm(before_realm)),
                create_object<T, RealmClass<T>>(m_ctx, new SharedRealm(after_realm)),
            };
            Function<T>::callback(m_ctx, m_func, 2, arguments);
        }
        else {
            typename T::Value arguments[] = {
                create_object<T, SessionClass<T>>(m_ctx, new WeakSession(before_realm->sync_session())),
                Value<T>::from_string(m_ctx, before_realm->config().path),
            };
            Function<T>::callback(m_ctx, m_discard_func, 2, arguments);
        }
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_func;
    Protected<typename T::Function> m_discard_func;
};

template <typename T>
class ClientResetBeforeFunctor {
public:
    ClientResetBeforeFunctor(typename T::Context ctx, typename T::Function before_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_func(ctx, before_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom client reset handler: https://github.com/realm/realm-js/issues/4150
        m_func.SuppressDestruct();
#endif
    }

    typename T::Function func() const
    {
        return m_func;
    }

    void operator()(SharedRealm local_realm)
    {
        HANDLESCOPE(m_ctx);

        typename T::Value arguments[] = {
            create_object<T, RealmClass<T>>(m_ctx, new SharedRealm(local_realm)),
        };
        Function<T>::callback(m_ctx, m_func, 1, arguments);
        local_realm->close();
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_func;
};

template <typename T>
class SyncSessionErrorBase {
public:
    virtual typename T::Function func() = 0;
    virtual void operator()(std::shared_ptr<SyncSession>, SyncError){};
};

template <typename T>
class SyncSessionClientResetManualFunctor : public SyncSessionErrorBase<T> {
public:
    SyncSessionClientResetManualFunctor(typename T::Context ctx, typename T::Function client_reset_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_client_reset_func(ctx, client_reset_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom client reset handler handler: https://github.com/realm/realm-js/issues/4150
        m_client_reset_func.SuppressDestruct();
#endif
    }

    typename T::Function func() override
    {
        return m_client_reset_func;
    }

    void operator()(std::shared_ptr<SyncSession> session, SyncError error) override
    {
        HANDLESCOPE(m_ctx);

        if (error.is_client_reset_requested()) {
            typename T::Value arguments[] = {
                create_object<T, SessionClass<T>>(m_ctx, new WeakSession(session)),
                Value<T>::from_string(m_ctx, error.user_info[SyncError::c_recovery_file_path_key]),
            };
            Function<T>::callback(m_ctx, m_client_reset_func, 2, arguments);
        }
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_client_reset_func;
};

template <typename T>
class SyncSessionErrorAndClientResetManualFunctor : SyncSessionErrorBase<T> {
public:
    SyncSessionErrorAndClientResetManualFunctor(typename T::Context ctx, typename T::Function error_func,
                                                typename T::Function client_reset_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_func(ctx, error_func)
        , m_client_reset_func(ctx, client_reset_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom sync error handler: https://github.com/realm/realm-js/issues/4150
        m_func.SuppressDestruct();
        m_client_reset_func.SuppressDestruct();
#endif
    }

    typename T::Function func() override
    {
        return m_func;
    }

    void operator()(std::shared_ptr<SyncSession> session, SyncError error) override
    {
        HANDLESCOPE(m_ctx);

        if (error.is_client_reset_requested()) {
            typename T::Value arguments[] = {
                create_object<T, SessionClass<T>>(m_ctx, new WeakSession(session)),
                Value<T>::from_string(m_ctx, error.user_info[SyncError::c_recovery_file_path_key]),
            };
            Function<T>::callback(m_ctx, m_client_reset_func, 2, arguments);
        }
        else {
            std::string name = "Error";
            auto error_object = Object<T>::create_empty(m_ctx);

            Object<T>::set_property(m_ctx, error_object, "name", Value<T>::from_string(m_ctx, name));
            Object<T>::set_property(m_ctx, error_object, "message", Value<T>::from_string(m_ctx, error.message));
            Object<T>::set_property(m_ctx, error_object, "isFatal", Value<T>::from_boolean(m_ctx, error.is_fatal));
            Object<T>::set_property(m_ctx, error_object, "category",
                                    Value<T>::from_string(m_ctx, error.error_code.category().name()));
            Object<T>::set_property(m_ctx, error_object, "code",
                                    Value<T>::from_number(m_ctx, error.error_code.value()));

            auto user_info = Object<T>::create_empty(m_ctx);
            for (auto& kvp : error.user_info) {
                Object<T>::set_property(m_ctx, user_info, kvp.first, Value<T>::from_string(m_ctx, kvp.second));
            }
            Object<T>::set_property(m_ctx, error_object, "userInfo", user_info);

            typename T::Value arguments[] = {
                create_object<T, SessionClass<T>>(m_ctx, new WeakSession(session)),
                error_object,
            };

            Function<T>::callback(m_ctx, m_func, 2, arguments);
        }
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_func;
    Protected<typename T::Function> m_client_reset_func;
};


template <typename T>
class SyncSessionErrorHandlerFunctor : SyncSessionErrorBase<T> {
public:
    SyncSessionErrorHandlerFunctor(typename T::Context ctx, typename T::Function error_func)
        : m_ctx(Context<T>::get_global_context(ctx))
        , m_func(ctx, error_func)
    {
#if defined(REALM_PLATFORM_NODE)
        // Suppressing destruct prevents a crash when closing an Electron app with a
        // custom sync error handler: https://github.com/realm/realm-js/issues/4150
        m_func.SuppressDestruct();
#endif
    }

    typename T::Function func() override
    {
        return m_func;
    }

    void operator()(std::shared_ptr<SyncSession> session, SyncError error) override
    {
        HANDLESCOPE(m_ctx);

        std::string name = "Error";
        auto error_object = Object<T>::create_empty(m_ctx);

        if (error.is_client_reset_requested()) {
            auto config_object = Object<T>::create_empty(m_ctx);
            Object<T>::set_property(
                m_ctx, config_object, "path",
                Value<T>::from_string(m_ctx, error.user_info[SyncError::c_recovery_file_path_key]));
            Object<T>::set_property(m_ctx, config_object, "readOnly", Value<T>::from_boolean(m_ctx, true));
            Object<T>::set_property(m_ctx, error_object, "config", config_object);
            name = "ClientReset";
        }

        Object<T>::set_property(m_ctx, error_object, "name", Value<T>::from_string(m_ctx, name));
        Object<T>::set_property(m_ctx, error_object, "message", Value<T>::from_string(m_ctx, error.message));
        Object<T>::set_property(m_ctx, error_object, "isFatal", Value<T>::from_boolean(m_ctx, error.is_fatal));
        Object<T>::set_property(m_ctx, error_object, "category",
                                Value<T>::from_string(m_ctx, error.error_code.category().name()));
        Object<T>::set_property(m_ctx, error_object, "code", Value<T>::from_number(m_ctx, error.error_code.value()));

        auto user_info = Object<T>::create_empty(m_ctx);
        for (auto& kvp : error.user_info) {
            Object<T>::set_property(m_ctx, user_info, kvp.first, Value<T>::from_string(m_ctx, kvp.second));
        }
        Object<T>::set_property(m_ctx, error_object, "userInfo", user_info);

        typename T::Value arguments[] = {
            create_object<T, SessionClass<T>>(m_ctx, new WeakSession(session)),
            error_object,
        };

        Function<T>::callback(m_ctx, m_func, 2, arguments);
    }

private:
    const Protected<typename T::GlobalContext> m_ctx;
    Protected<typename T::Function> m_func; // general error callback
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
        , m_event_loop_dispatcher{SSLVerifyCallbackSyncThreadFunctor<T>::main_loop_handler}
        , m_mutex{new std::mutex}
        , m_cond_var{new std::condition_variable}
    {
    }

    // This function is called on the sync client's event loop thread.
    bool operator()(const std::string& server_address, util::network::Endpoint::port_type server_port,
                    const char* pem_data, size_t pem_size, int preverify_ok, int depth)
    {
        const std::string pem_certificate{pem_data, pem_size};
        {
            std::lock_guard<std::mutex> lock{*m_mutex};
            m_ssl_certificate_callback_done = false;
        }

        // Dispatch the call to the main_loop_handler on the node.js thread.
        m_event_loop_dispatcher(this, server_address, server_port, pem_certificate, preverify_ok, depth);

        bool ssl_certificate_accepted = false;
        {
            // Wait for the return value of the callback function on the node.js main thread.
            // The sync client blocks during this wait.
            std::unique_lock<std::mutex> lock(*m_mutex);
            m_cond_var->wait(lock, [this] {
                return this->m_ssl_certificate_callback_done;
            });
            ssl_certificate_accepted = m_ssl_certificate_accepted;
        }

        return ssl_certificate_accepted;
    }

    // main_loop_handler is called on the node.js main thread.
    // main_loop_handler calls the user callback (m_func) and sends the return value
    // back to the sync client's event loop thread through a condition variable.
    static void main_loop_handler(SSLVerifyCallbackSyncThreadFunctor<T>* this_object,
                                  const std::string& server_address, util::network::Endpoint::port_type server_port,
                                  const std::string& pem_certificate, int preverify_ok, int depth)
    {
        const Protected<typename T::GlobalContext>& ctx = this_object->m_ctx;
        HANDLESCOPE(ctx);


        typename T::Object ssl_certificate_object = Object<T>::create_empty(ctx);
        Object<T>::set_property(ctx, ssl_certificate_object, "serverAddress",
                                Value<T>::from_string(ctx, server_address));
        Object<T>::set_property(ctx, ssl_certificate_object, "serverPort",
                                Value<T>::from_number(ctx, double(server_port)));
        Object<T>::set_property(ctx, ssl_certificate_object, "pemCertificate",
                                Value<T>::from_string(ctx, pem_certificate));
        Object<T>::set_property(ctx, ssl_certificate_object, "acceptedByOpenSSL",
                                Value<T>::from_boolean(ctx, preverify_ok != 0));
        Object<T>::set_property(ctx, ssl_certificate_object, "depth", Value<T>::from_number(ctx, double(depth)));

        const int argc = 1;
        typename T::Value arguments[argc] = {ssl_certificate_object};
        typename T::Value ret_val = Function<T>::callback(ctx, this_object->m_func, 1, arguments);
        bool ret_val_bool = Value<T>::to_boolean(ctx, ret_val);

        {
            std::lock_guard<std::mutex> lock{*this_object->m_mutex};
            this_object->m_ssl_certificate_callback_done = true;
            this_object->m_ssl_certificate_accepted = ret_val_bool;
        }

        this_object->m_cond_var->notify_one();
    };


private:
    const Protected<typename T::GlobalContext> m_ctx;
    const Protected<typename T::Function> m_func;
    util::EventLoopDispatcher<void(SSLVerifyCallbackSyncThreadFunctor<T>* this_object,
                                   const std::string& server_address, util::network::Endpoint::port_type server_port,
                                   const std::string& pem_certificate, int preverify_ok, int depth)>
        m_event_loop_dispatcher;
    bool m_ssl_certificate_callback_done = false;
    bool m_ssl_certificate_accepted = false;
    std::shared_ptr<std::mutex> m_mutex;
    std::shared_ptr<std::condition_variable> m_cond_var;
};

// TODO: We should move this function to js_user.hpp but hard due to circular dependency
template <typename T>
void UserClass<T>::session_for_on_disk_path(ContextType ctx, ObjectType this_object, Arguments& args,
                                            ReturnValue& return_value)
{
    args.validate_count(1);

    User<T>* internal = get_internal<T, UserClass<T>>(ctx, this_object);
    if (internal == nullptr) {
        throw std::runtime_error("Invalid User instance. No internal instance is set");
    }

    auto user = internal->m_user;
    if (auto session = user->session_for_on_disk_path(Value::validated_to_string(ctx, args[0]))) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    }
    else {
        return_value.set_undefined();
    }
}

template <typename T>
void SessionClass<T>::get_config(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        ObjectType config = Object::create_empty(ctx);
        Object::set_property(
            ctx, config, "user",
            create_object<T, UserClass<T>>(
                ctx, new User<T>(session->config().user, nullptr))); // FIXME: nullptr is not an app object
        // TODO: add app id

        if (session->config().flx_sync_requested) {
            Object::set_property(ctx, config, "flexible", Value::from_boolean(ctx, true));
        }
        else {
            bson::Bson partition_value_bson = bson::parse(session->config().partition_value);
            Object::set_property(ctx, config, "partitionValue",
                                 Value::from_string(ctx, String::from_bson(partition_value_bson)));
        }

        if (!session->config().custom_http_headers.empty()) {
            ObjectType custom_http_headers_object = Object::create_empty(ctx);
            for (auto it = session->config().custom_http_headers.begin();
                 it != session->config().custom_http_headers.end(); ++it) {
                Object::set_property(ctx, custom_http_headers_object, it->first, Value::from_string(ctx, it->second));
            }
            Object::set_property(ctx, config, "custom_http_headers", custom_http_headers_object);
        }
        return_value.set(config);
    }
    else {
        return_value.set_undefined();
    }
}

template <typename T>
void SessionClass<T>::get_user(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        return_value.set(create_object<T, UserClass<T>>(
            ctx, new User<T>(session->config().user, nullptr))); // FIXME: nullptr is not an app object
    }
    else {
        return_value.set_undefined();
    }
}

template <typename T>
void SessionClass<T>::get_state(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    static const std::string invalid("invalid");
    static const std::string inactive("inactive");
    static const std::string active("active");

    return_value.set(invalid);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        if (session->state() == SyncSession::State::Inactive) {
            return_value.set(inactive);
        }
        else {
            return_value.set(active);
        }
    }
}

template <typename T>
std::string SessionClass<T>::get_connection_state_value(SyncSession::ConnectionState state)
{
    switch (state) {
        case SyncSession::ConnectionState::Disconnected:
            return "disconnected";
        case SyncSession::ConnectionState::Connecting:
            return "connecting";
        case SyncSession::ConnectionState::Connected:
            return "connected";
        default:
            REALM_UNREACHABLE();
    }
}

template <typename T>
void SessionClass<T>::get_connection_state(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    return_value.set(get_connection_state_value(SyncSession::ConnectionState::Disconnected));
    if (auto session = get_internal<T, SessionClass<T>>(ctx, object)->lock()) {
        return_value.set(get_connection_state_value(session->connection_state()));
    }
}

template <typename T>
void SessionClass<T>::simulate_error(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue&)
{
    args.validate_count(4);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        int err_code = Value::validated_to_number(ctx, args[0]);
        std::string message = Value::validated_to_string(ctx, args[1]);
        std::string type = Value::validated_to_string(ctx, args[2]);
        bool is_fatal = Value::validated_to_boolean(ctx, args[3]);

        std::error_code error_code(err_code, type == "realm::sync::ProtocolError"
                                                 ? realm::sync::protocol_error_category()
                                                 : realm::sync::client_error_category());
        SyncError sync_error(error_code, message, is_fatal);
        // the action depends on the error code (err_code); 211 is used for simulating client reset
        sync_error.server_requests_action =
            err_code == 211 ? sync::ProtocolErrorInfo::Action::ClientReset : sync::ProtocolErrorInfo::Action::Warning;
        SyncSession::OnlyForTesting::handle_error(*session, std::move(sync_error));
    }
}

template <typename T>
void SessionClass<T>::add_progress_notification(ContextType ctx, ObjectType this_object, Arguments& args,
                                                ReturnValue& return_value)
{
    args.validate_count(3);

    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {

        std::string direction_str = Value::validated_to_string(ctx, args[0], "direction");
        std::string mode = Value::validated_to_string(ctx, args[1], "mode");
        SyncSession::ProgressDirection direction;
        if (direction_str == "download") {
            direction = SyncSession::ProgressDirection::download;
        }
        else if (direction_str == "upload") {
            direction = SyncSession::ProgressDirection::upload;
        }
        else {
            throw std::invalid_argument("Invalid argument 'direction'. Only 'download' and 'upload' progress "
                                        "notification directions are supported");
        }

        bool is_streaming = false;
        if (mode == "reportIndefinitely") {
            is_streaming = true;
        }
        else if (mode == "forCurrentlyOutstandingWork") {
            is_streaming = false;
        }
        else {
            throw std::invalid_argument("Invalid argument 'mode'. Only 'reportIndefinitely' and "
                                        "'forCurrentlyOutstandingWork' progress notification modes are supported");
        }

        auto callback_function = Value::validated_to_function(ctx, args[2], "callback");

        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
        std::function<ProgressHandler> progressFunc;

        util::EventLoopDispatcher<ProgressHandler> progress_handler(
            [=](uint64_t transferred_bytes, uint64_t transferrable_bytes) {
                HANDLESCOPE(protected_ctx)
                ValueType callback_arguments[2] = {
                    Value::from_number(protected_ctx, transferred_bytes),
                    Value::from_number(protected_ctx, transferrable_bytes),
                };

                Function<T>::callback(protected_ctx, protected_callback, 2, callback_arguments);
            });

        progressFunc = std::move(progress_handler);

        auto registrationToken =
            session->register_progress_notifier(std::move(progressFunc), direction, is_streaming);
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback_function, "_syncSession", syncSession, attributes);
        Object::set_property(ctx, callback_function, "_registrationToken",
                             Value::from_number(protected_ctx, registrationToken), attributes);
    }
}

template <typename T>
void SessionClass<T>::remove_progress_notification(ContextType ctx, ObjectType this_object, Arguments& args,
                                                   ReturnValue& return_value)
{
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

template <typename T>
void SessionClass<T>::add_connection_notification(ContextType ctx, ObjectType this_object, Arguments& args,
                                                  ReturnValue& return_value)
{
    args.validate_count(1);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto callback_function = Value::validated_to_function(ctx, args[0], "callback");
        Protected<FunctionType> protected_callback(ctx, callback_function);
        Protected<ObjectType> protected_this(ctx, this_object);
        Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

        std::function<ConnectionHandler> connectionFunc;

        util::EventLoopDispatcher<ConnectionHandler> connection_handler(
            [=](SyncSession::ConnectionState old_state, SyncSession::ConnectionState new_state) {
                HANDLESCOPE(protected_ctx)
                ValueType callback_arguments[2] = {
                    Value::from_string(protected_ctx, get_connection_state_value(new_state)),
                    Value::from_string(protected_ctx, get_connection_state_value(old_state)),
                };
                Function<T>::callback(protected_ctx, protected_callback, 2, callback_arguments);
            });

        connectionFunc = std::move(connection_handler);

        auto notificationToken = session->register_connection_change_callback(std::move(connectionFunc));
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback_function, "_syncSession", syncSession, attributes);
        Object::set_property(ctx, callback_function, "_connectionNotificationToken",
                             Value::from_number(protected_ctx, notificationToken), attributes);
    }
}

template <typename T>
void SessionClass<T>::remove_connection_notification(ContextType ctx, ObjectType this_object, Arguments& args,
                                                     ReturnValue& return_value)
{
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

template <typename T>
void SessionClass<T>::is_connected(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto state = session->state();
        auto connection_state = session->connection_state();
        if (connection_state == SyncSession::ConnectionState::Connected &&
            (state == SyncSession::State::Active || state == SyncSession::State::Dying)) {
            return_value.set(true);
        }
    }
}

template <typename T>
void SessionClass<T>::resume(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        session->revive_if_needed();
    }
}

template <typename T>
void SessionClass<T>::pause(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(0);
    return_value.set(false);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        session->log_out();
    }
}

template <typename T>
void SessionClass<T>::wait_for_completion(Direction direction, ContextType ctx, ObjectType this_object,
                                          Arguments& args)
{
    args.validate_count(1);
    if (auto session = get_internal<T, SessionClass<T>>(ctx, this_object)->lock()) {
        auto callback = Value::validated_to_function(ctx, args[0]);

        util::EventLoopDispatcher<DownloadUploadCompletionHandler> completion_handler(
            [ctx = Protected(Context<T>::get_global_context(ctx)),
             callback = Protected(ctx, callback)](std::error_code error) {
                HANDLESCOPE(ctx);
                Function<T>::callback(
                    ctx, callback,
                    {!error ? Value::from_undefined(ctx)
                            : Object::create_obj(ctx, {
                                                          {"message", Value::from_string(ctx, error.message())},
                                                          {"errorCode", Value::from_number(ctx, error.value())},
                                                      })});
            });

        switch (direction) {
            case Upload:
                session->wait_for_upload_completion(std::move(completion_handler));
                break;
            case Download:
                session->wait_for_download_completion(std::move(completion_handler));
                break;
        }
        auto syncSession = create_object<T, SessionClass<T>>(ctx, new WeakSession(session));
        PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
        Object::set_property(ctx, callback, "_syncSession", syncSession, attributes);
    }
}

template <typename T>
void SessionClass<T>::wait_for_upload_completion(ContextType ctx, ObjectType this_object, Arguments& args,
                                                 ReturnValue&)
{
    wait_for_completion(Direction::Upload, ctx, this_object, args);
}

template <typename T>
void SessionClass<T>::wait_for_download_completion(ContextType ctx, ObjectType this_object, Arguments& args,
                                                   ReturnValue&)
{
    wait_for_completion(Direction::Download, ctx, this_object, args);
}

template <typename T>
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

    static void set_sync_log_level(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set_sync_logger(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set_sync_user_agent(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void initiate_client_reset(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void reconnect(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void has_existing_sessions(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void enable_multiplexing(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void deserialize_change_set(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void get_all_sync_sessions(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void get_sync_session(ContextType, ObjectType, Arguments&, ReturnValue&);

    // private
    static void populate_sync_config(ContextType, ObjectType realm_constructor, ObjectType config_object,
                                     Realm::Config&);
    static void populate_sync_config_for_ssl(ContextType, ObjectType, SyncConfig&);

    MethodMap<T> const static_methods = {
        {"_hasExistingSessions", {wrap<has_existing_sessions>}},
        {"initiateClientReset", wrap<initiate_client_reset>},
        {"reconnect", wrap<reconnect>},
        {"setLogLevel", wrap<set_sync_log_level>},
        {"enableSessionMultiplexing", wrap<enable_multiplexing>},
        {"setUserAgent", wrap<set_sync_user_agent>},
        {"getAllSyncSessions", wrap<get_all_sync_sessions>},
        {"getSyncSession", wrap<get_sync_session>},
        {"setLogger", wrap<set_sync_logger>},
        {"setSyncLogger", wrap<set_sync_logger>},
    };
};

template <typename T>
inline typename T::Function SyncClass<T>::create_constructor(ContextType ctx)
{
    FunctionType sync_constructor = ObjectWrap<T, SyncClass<T>>::create_constructor(ctx);

    PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx),
                         attributes);
    Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T, SessionClass<T>>::create_constructor(ctx),
                         attributes);
    Object::set_property(ctx, sync_constructor, "Subscription",
                         ObjectWrap<T, SubscriptionClass<T>>::create_constructor(ctx), attributes);
    Object::set_property(ctx, sync_constructor, "SubscriptionSet",
                         ObjectWrap<T, SubscriptionSetClass<T>>::create_constructor(ctx), attributes);
    Object::set_property(ctx, sync_constructor, "MutableSubscriptionSet",
                         ObjectWrap<T, MutableSubscriptionSetClass<T>>::create_constructor(ctx), attributes);

    return sync_constructor;
}

template <typename T>
void SyncClass<T>::get_sync_session(ContextType ctx, ObjectType this_object, Arguments& args,
                                    ReturnValue& return_value)
{
    args.validate_count(2);

    auto user_object = Value::validated_to_object(ctx, args[0], "user");
    auto user = get_internal<T, UserClass<T>>(ctx, user_object);

    auto partition_value_value = args[1];
    std::string partition_value = partition_value_bson_to_string<T>(ctx, partition_value_value);

    auto sync_config = SyncConfig(user->m_user, partition_value);
    auto path = user->m_app->sync_manager()->path_for_realm(sync_config);
    if (auto session = user->m_user->session_for_on_disk_path(path)) {
        return_value.set(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
        return;
    }
    return_value.set_null();
}

template <typename T>
void SyncClass<T>::get_all_sync_sessions(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    args.validate_count(1);

    auto user_object = Value::validated_to_object(ctx, args[0], "user");
    auto user = get_internal<T, UserClass<T>>(ctx, user_object);
    auto all_sessions = user->m_user->all_sessions();
    std::vector<ValueType> session_objects;
    for (auto session : all_sessions) {
        session_objects.push_back(create_object<T, SessionClass<T>>(ctx, new WeakSession(session)));
    }
    return_value.set(Object::create_array(ctx, session_objects));
}

template <typename T>
void SyncClass<T>::initiate_client_reset(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    args.validate_count(2);
    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    std::string path = Value::validated_to_string(ctx, args[1]);
    if (!app->sync_manager()->immediately_run_file_actions(std::string(path))) {
        throw std::runtime_error(
            util::format("Realm was not configured correctly. Client Reset could not be run for Realm at: %1", path));
    }
}

template <typename T>
void SyncClass<T>::set_sync_log_level(ContextType ctx, ObjectType this_object, Arguments& args,
                                      ReturnValue& return_value)
{
    args.validate_count(2);

    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    std::string log_level = Value::validated_to_string(ctx, args[1], "log level");

    auto level = common::logger::Logger::get_level(log_level);
    app->sync_manager()->set_log_level(level);
}

template <typename T>
void SyncClass<T>::set_sync_logger(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    args.validate_count(2);

    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    auto callback_fn = Value::validated_to_function(ctx, args[1], "logger_callback");

    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    Protected<FunctionType> protected_callback(ctx, callback_fn);

    common::logger::Delegated show_logs = [=](int level, std::string message) {
        HANDLESCOPE(protected_ctx)

        ValueType arguments[2] = {Value::from_number(protected_ctx, level),
                                  Value::from_string(protected_ctx, message)};

        Function::callback(protected_ctx, protected_callback, 2, arguments);
    };

    auto sync_logger = common::logger::Logger::build_sync_logger(std::move(show_logs));
    app->sync_manager()->set_logger_factory(sync_logger);
}

template <typename T>
void SyncClass<T>::set_sync_user_agent(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_count(2);
    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    std::string application_user_agent = Value::validated_to_string(ctx, args[1], "user agent");
    app->sync_manager()->set_user_agent(application_user_agent);
}

template <typename T>
void SyncClass<T>::reconnect(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);
    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    app->sync_manager()->reconnect();
}

template <typename T>
void SyncClass<T>::has_existing_sessions(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    args.validate_count(1);
    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    return_value.set(app->sync_manager()->has_existing_sessions());
}

template <typename T>
void SyncClass<T>::populate_sync_config(ContextType ctx, ObjectType realm_constructor, ObjectType config_object,
                                        Realm::Config& config)
{
    ValueType sync_config_value = Object::get_property(ctx, config_object, "sync");
    if (Value::is_boolean(ctx, sync_config_value)) {
        config.force_sync_history = Value::to_boolean(ctx, sync_config_value);
        if (config.force_sync_history) {
            config.schema_mode = SchemaMode::AdditiveExplicit;
        }
    }
    else if (!Value::is_undefined(ctx, sync_config_value)) {
        auto sync_config_object = Value::validated_to_object(ctx, sync_config_value);

        // how the error handler will actually look like depends on the client reset mode
        // see the parsing of the client reset subconfiguration below
        // if the mode is "manual"
        //   a) the error handler will be initialized with the callback if it exists
        //   b) if the error handler is not specified, the callback will be wrap as an error handler
        //   c) if no callback and no error handler, an exception is thrown
        // otherwise, the error handler is used as it is
        ValueType error_func = Object::get_property(ctx, sync_config_object, "onError");

        ObjectType user_object = Object::validated_get_object(ctx, sync_config_object, "user");
        if (!(Object::template is_instance<UserClass<T>>(ctx, user_object))) {
            throw std::invalid_argument("Option 'user' is not a Realm.User object.");
        }
        auto user = get_internal<T, UserClass<T>>(ctx, user_object);
        if (user->m_user->state() != SyncUser::State::LoggedIn) {
            throw std::runtime_error("User is no longer valid.");
        }

        ValueType flexible_value = Object::get_property(ctx, sync_config_object, "flexible");
        if (Value::is_boolean(ctx, flexible_value) && Value::to_boolean(ctx, flexible_value)) {
            if (!Value::is_undefined(ctx, Object::get_property(ctx, sync_config_object, "partitionValue"))) {
                throw std::runtime_error("'partitionValue' cannot be specified when flexible sync is enabled");
            }

            config.sync_config = std::make_shared<SyncConfig>(user->m_user, SyncConfig::FLXSyncEnabled{});
        }
        else {
            ValueType partition_value_value = Object::get_property(ctx, sync_config_object, "partitionValue");
            std::string partition_value = partition_value_bson_to_string<T>(ctx, partition_value_value);

            config.sync_config = std::make_shared<SyncConfig>(user->m_user, std::move(partition_value));
        }

        SyncSessionStopPolicy session_stop_policy = SyncSessionStopPolicy::AfterChangesUploaded;
        ValueType session_stop_policy_value = Object::get_property(ctx, sync_config_object, "_sessionStopPolicy");
        if (!Value::is_undefined(ctx, session_stop_policy_value)) {
            std::string stop_session =
                Value::validated_to_string(ctx, session_stop_policy_value, "_sessionStopPolicy");
            if (stop_session == std::string("immediately")) {
                session_stop_policy = SyncSessionStopPolicy::Immediately;
            }
            else if (stop_session == std::string("never")) {
                session_stop_policy = SyncSessionStopPolicy::LiveIndefinitely;
            }
            else if (stop_session == std::string("after-upload")) {
                session_stop_policy = SyncSessionStopPolicy::AfterChangesUploaded;
            }
            else {
                throw std::invalid_argument("Unknown argument for _sessionStopPolicy: " + stop_session);
            }
        }
        config.sync_config->stop_policy = session_stop_policy;

        // Client reset
        //
        // i)    manual:
        //       a) if a callback is registered, no error handler registred, the callback will wrapped and will be
        //       called b) if no callback is registered, the error handler is called with the proper error code and a
        //       client reset is initiated (old behavior) c) if callback and error handler error handler are
        //       registered, the callback will be called
        // ii)   discardUnsyncedChanges: the sync client handles it but notifications are send before and after
        // iii)  recoverUnsyncedChanges: as above
        // iv)   recoverOrDiscardUnsyncedChanges: as above
        //
        // The default setting is recoverOrDiscardUnsyncedChanges

        config.sync_config->client_resync_mode = realm::ClientResyncMode::RecoverOrDiscard;
        ValueType client_reset_value = Object::get_property(ctx, sync_config_object, "clientReset");
        if (!Value::is_undefined(ctx, client_reset_value)) {
            auto client_reset_object = Value::validated_to_object(ctx, client_reset_value);
            ValueType client_reset_mode_value = Object::get_property(ctx, client_reset_object, "mode");
            if (!Value::is_undefined(ctx, client_reset_mode_value)) {
                std::string client_reset_mode = Value::validated_to_string(ctx, client_reset_mode_value, "mode");
                static std::unordered_map<std::string, realm::ClientResyncMode> const client_reset_mode_map = {
                    {"manual", realm::ClientResyncMode::Manual},
                    {"discardLocal", realm::ClientResyncMode::DiscardLocal}, // for backward compatibility
                    {"discardUnsyncedChanges", realm::ClientResyncMode::DiscardLocal},
                    {"recoverUnsyncedChanges", realm::ClientResyncMode::Recover},
                    {"recoverOrDiscardUnsyncedChanges", realm::ClientResyncMode::RecoverOrDiscard}};
                auto it = client_reset_mode_map.find(client_reset_mode);
                if (it == client_reset_mode_map.end()) {
                    throw std::invalid_argument(
                        util::format("Unknown argument '%1' for clientReset.mode. Expected "
                                     "'manual', 'discardUnsyncedChanges', 'recoverUnsyncedChanges', or "
                                     "'recoverOrDiscardUnsyncedChanges'",
                                     client_reset_mode));
                }
                config.sync_config->client_resync_mode = it->second;
            }

            switch (config.sync_config->client_resync_mode) {
                case realm::ClientResyncMode::Manual: {
                    ValueType client_reset_after_value = Object::get_property(ctx, client_reset_object, "onManual");
                    if (!Value::is_undefined(ctx, client_reset_after_value)) {
                        auto client_reset_after_callback =
                            Value::validated_to_function(ctx, client_reset_after_value);
                        if (!Value::is_undefined(ctx, error_func)) {
                            auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                                SyncSessionErrorAndClientResetManualFunctor<T>(
                                    ctx, Value::validated_to_function(ctx, error_func), client_reset_after_callback));
                            config.sync_config->error_handler = std::move(error_handler);
                        }
                        else {
                            auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                                SyncSessionClientResetManualFunctor<T>(ctx, client_reset_after_callback));
                            config.sync_config->error_handler = std::move(error_handler);
                        }
                    }
                    else {
                        if (!Value::is_undefined(ctx, error_func)) {
                            auto error_handler =
                                util::EventLoopDispatcher<SyncSessionErrorHandler>(SyncSessionErrorHandlerFunctor<T>(
                                    ctx, Value::validated_to_function(ctx, error_func)));
                            config.sync_config->error_handler = std::move(error_handler);
                        }
                        else {
                            throw std::invalid_argument("For clientReset: 'manual', it is require to set either "
                                                        "'error', 'clientReset.onManual' or both");
                        }
                    }
                    break;
                }

                case realm::ClientResyncMode::DiscardLocal: {
                    ValueType client_reset_after_value = Object::get_property(ctx, client_reset_object, "onAfter");
                    if (!Value::is_undefined(ctx, client_reset_after_value)) {
                        auto client_reset_after_callback =
                            Value::validated_to_function(ctx, client_reset_after_value);
                        auto client_reset_after_handler =
                            util::EventLoopDispatcher<void(SharedRealm, ThreadSafeReference, bool)>(
                                ClientResetAfterFunctor<T>(ctx, client_reset_after_callback));
                        config.sync_config->notify_after_client_reset = std::move(client_reset_after_handler);
                    }

                    ValueType client_reset_before_value = Object::get_property(ctx, client_reset_object, "onBefore");
                    if (!Value::is_undefined(ctx, client_reset_before_value)) {
                        auto client_reset_before_callback =
                            Value::validated_to_function(ctx, client_reset_before_value);
                        auto client_reset_before_handler = util::EventLoopDispatcher<void(SharedRealm)>(
                            ClientResetBeforeFunctor<T>(ctx, client_reset_before_callback));
                        config.sync_config->notify_before_client_reset = std::move(client_reset_before_handler);
                    }

                    if (!Value::is_undefined(ctx, error_func)) {
                        auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                            SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
                        config.sync_config->error_handler = std::move(error_handler);
                    }
                    break;
                }

                case realm::ClientResyncMode::Recover: {
                    ValueType client_reset_after_value = Object::get_property(ctx, client_reset_object, "onAfter");
                    if (!Value::is_undefined(ctx, client_reset_after_value)) {
                        auto client_reset_after_callback =
                            Value::validated_to_function(ctx, client_reset_after_value);
                        auto client_reset_after_handler =
                            util::EventLoopDispatcher<void(SharedRealm, ThreadSafeReference, bool)>(
                                ClientResetAfterFunctor<T>(ctx, client_reset_after_callback));
                        config.sync_config->notify_after_client_reset = std::move(client_reset_after_handler);
                    }

                    ValueType client_reset_before_value = Object::get_property(ctx, client_reset_object, "onBefore");
                    if (!Value::is_undefined(ctx, client_reset_before_value)) {
                        auto client_reset_before_handler =
                            util::EventLoopDispatcher<void(SharedRealm)>(ClientResetBeforeFunctor<T>(
                                ctx, Value::validated_to_function(ctx, client_reset_before_value)));
                        config.sync_config->notify_before_client_reset = std::move(client_reset_before_handler);
                    }

                    if (!Value::is_undefined(ctx, error_func)) {
                        auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                            SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
                        config.sync_config->error_handler = std::move(error_handler);
                    }
                    break;
                }

                case realm::ClientResyncMode::RecoverOrDiscard: {
                    ValueType client_reset_after_value = Object::get_property(ctx, client_reset_object, "onDiscard");
                    if (Value::is_undefined(ctx, client_reset_after_value)) {
                        throw std::invalid_argument("'onDiscard' is required");
                    }

                    ValueType client_reset_recovery_value =
                        Object::get_property(ctx, client_reset_object, "onRecovery");
                    if (Value::is_undefined(ctx, client_reset_after_value)) {
                        throw std::invalid_argument("'onRecovery' is required");
                    }

                    FunctionType client_reset_discard_callback =
                        Value::validated_to_function(ctx, client_reset_after_value);
                    FunctionType client_reset_recovery_callback =
                        Value::validated_to_function(ctx, client_reset_recovery_value);

                    auto client_reset_after_handler =
                        util::EventLoopDispatcher<void(SharedRealm, ThreadSafeReference, bool)>(
                            ClientResetAfterRecoveryOrDiscardFunctor<T>(ctx, client_reset_recovery_callback,
                                                                        client_reset_discard_callback));
                    config.sync_config->notify_after_client_reset = std::move(client_reset_after_handler);

                    ValueType client_reset_before_value = Object::get_property(ctx, client_reset_object, "onBefore");
                    if (!Value::is_undefined(ctx, client_reset_before_value)) {
                        auto client_reset_before_handler =
                            util::EventLoopDispatcher<void(SharedRealm)>(ClientResetBeforeFunctor<T>(
                                ctx, Value::validated_to_function(ctx, client_reset_before_value)));
                        config.sync_config->notify_before_client_reset = std::move(client_reset_before_handler);
                    }

                    ValueType client_reset_fallback_value =
                        Object::get_property(ctx, client_reset_object, "onFallback");
                    if (!Value::is_undefined(ctx, client_reset_fallback_value)) {
                        auto client_reset_fallback_callback =
                            Value::validated_to_function(ctx, client_reset_fallback_value);
                        if (!Value::is_undefined(ctx, error_func)) {
                            auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                                SyncSessionErrorAndClientResetManualFunctor<T>(
                                    ctx, Value::validated_to_function(ctx, error_func),
                                    client_reset_fallback_callback));
                            config.sync_config->error_handler = std::move(error_handler);
                        }
                        else {
                            auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                                SyncSessionClientResetManualFunctor<T>(ctx, client_reset_fallback_callback));
                            config.sync_config->error_handler = std::move(error_handler);
                        }
                    }
                    break;
                }
            }
        }
        else {
            // if sync.clientReset is not defined, use the error function
            if (!Value::is_undefined(ctx, error_func)) {
                auto error_handler = util::EventLoopDispatcher<SyncSessionErrorHandler>(
                    SyncSessionErrorHandlerFunctor<T>(ctx, Value::validated_to_function(ctx, error_func)));
                config.sync_config->error_handler = std::move(error_handler);
            }
        }

        // Custom HTTP headers
        ValueType sync_custom_http_headers_value = Object::get_property(ctx, sync_config_object, "customHttpHeaders");
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

        // HTTP proxy: only node is supported
#ifdef REALM_PLATFORM_NODE
        SyncConfig::ProxyConfig proxy_config;
        std::vector<std::string> env_vars = {"https_proxy", "HTTPS_PROXY"};
        for (auto env_var : env_vars) {
            char* http_proxy = std::getenv(env_var.c_str());
            if (http_proxy != NULL) {
                // https://stackoverflow.com/questions/43906956/split-url-into-host-port-and-resource-c
                std::string url(http_proxy);

                std::size_t index1 = url.find_first_of(":");
                std::string protocol = url.substr(0, index1);

                std::string url_new = url.substr(index1 + 3); // skip http(s)
                std::size_t index2 = url_new.find_first_of(":");
                std::string host = url_new.substr(0, index2);

                std::size_t index3 = url_new.find_first_of("/");
                std::string port = url_new.substr(index2 + 1, index3 - index2 - 1);

                if (protocol == "http") {
                    proxy_config.type = SyncConfig::ProxyConfig::Type::HTTP;
                }
                else if (protocol == "https") {
                    proxy_config.type = SyncConfig::ProxyConfig::Type::HTTPS;
                }
                else {
                    throw std::runtime_error("Expected either 'http' or 'https' as protocol for " + env_var +
                                             " (got " + protocol + ")");
                }
                proxy_config.address = std::move(host);
                proxy_config.port = static_cast<std::uint_fast16_t>(atoi(port.c_str()));

                config.sync_config->proxy_config = std::optional<SyncConfig::ProxyConfig>(std::move(proxy_config));
                break;
            }
        }

#endif

        ValueType ssl_config_value = Object::get_property(ctx, sync_config_object, "ssl");
        if (Value::is_object(ctx, ssl_config_value)) {
            auto ssl_config_object = Value::to_object(ctx, ssl_config_value);
            populate_sync_config_for_ssl(ctx, ssl_config_object, *config.sync_config);
        }

        config.schema_mode = SchemaMode::AdditiveExplicit;
        if (config.path.empty()) {
            config.path = user->m_user->sync_manager()->path_for_realm(*(config.sync_config));
        }
        else {
            // remove .realm if it exists
            std::size_t found = config.path.rfind(".realm");
            if (found != std::string::npos) {
                config.path = config.path.erase(found, std::string::npos);
            }
            config.path = user->m_user->sync_manager()->path_for_realm(*(config.sync_config), config.path);
        }
    }
}

template <typename T>
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

    ValueType validate_callback = Object::get_property(ctx, config_object, "validateCertificates");
    if (Value::is_function(ctx, validate_callback)) {
        config.ssl_verify_callback =
            SSLVerifyCallbackSyncThreadFunctor<T>{ctx, Value::to_function(ctx, validate_callback)};
    }
}

template <typename T>
void SyncClass<T>::enable_multiplexing(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_count(1);
    auto app = get_internal<T, AppClass<T>>(ctx, Value::validated_to_object(ctx, args[0], "app"))->m_app;
    app->sync_manager()->enable_session_multiplexing();
}

} // namespace js
} // namespace realm
