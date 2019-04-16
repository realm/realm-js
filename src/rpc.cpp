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

#include <cassert>
#include <dlfcn.h>
#include <map>
#include <string>

#include "rpc.hpp"
#include "jsc_init.hpp"

#include "base64.hpp"
#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"

using namespace realm;
using namespace realm::rpc;

using Accessor = realm::js::NativeAccessor<jsc::Types>;

namespace {
static const char * const RealmObjectTypesData = "data";
static const char * const RealmObjectTypesDate = "date";
static const char * const RealmObjectTypesDictionary = "dict";
static const char * const RealmObjectTypesFunction = "function";
static const char * const RealmObjectTypesList = "list";
static const char * const RealmObjectTypesObject = "object";
static const char * const RealmObjectTypesResults = "results";
static const char * const RealmObjectTypesRealm = "realm";
static const char * const RealmObjectTypesUser = "user";
static const char * const RealmObjectTypesSession = "session";
static const char * const RealmObjectTypeSubscription = "subscription";
static const char * const RealmObjectTypesUndefined = "undefined";

json serialize_object_schema(const realm::ObjectSchema &object_schema) {
    std::vector<std::string> properties;

    for (auto &prop : object_schema.persisted_properties) {
        properties.push_back(prop.public_name.empty() ? prop.name : prop.public_name);
    }

    for (auto &prop : object_schema.computed_properties) {
        properties.push_back(prop.public_name.empty() ? prop.name : prop.public_name);
    }

    return {
        {"name", object_schema.name},
        {"properties", properties},
    };
}

template<typename Container>
json get_type(Container const& c) {
    auto type = c.get_type();
    if (type == realm::PropertyType::Object) {
        return serialize_object_schema(c.get_object_schema());
    }
    return {
        {"type", string_for_property_type(type)},
        {"optional", is_nullable(type)}
    };
}

RPCServer*& get_rpc_server(JSGlobalContextRef ctx) {
    static std::map<JSGlobalContextRef, RPCServer*> s_map;
    return s_map[ctx];
}
}

#ifdef __APPLE__
void runLoopFunc(CFRunLoopRef loop, RPCWorker* rpcWorker) {
    CFRunLoopPerformBlock(loop, kCFRunLoopDefaultMode, ^{
        rpcWorker->try_run_task();
        if (rpcWorker->should_stop()) {
            CFRunLoopStop(CFRunLoopGetCurrent());
        } else {
            runLoopFunc(loop, rpcWorker);
        }
    });
    CFRunLoopWakeUp(loop);
}
#endif

RPCWorker::RPCWorker() {
    #ifdef __APPLE__
        m_thread = std::thread([this]() {
            m_loop = CFRunLoopGetCurrent();
            runLoopFunc(m_loop, this);
            CFRunLoopRun();
        });
    #endif
}

RPCWorker::~RPCWorker() {
    stop();
}

template<typename Fn>
json RPCWorker::add_task(Fn&& fn) {
    std::promise<json> p;
    auto future = p.get_future();
    m_promises.push_back(std::move(p));
    m_tasks.push_back([&] {
        auto result = fn();
        m_promises.pop_back().set_value(std::move(result));
    });
    return future.get();
}

void RPCWorker::invoke_callback(json callback) {
    m_tasks.push_back([=, callback = std::move(callback)]() mutable {
        if (auto promise = m_promises.try_pop_back(0)) {
            promise->set_value(std::move(callback));
        }
        else {
            m_callbacks.push_back(std::move(callback));
        }
    });
}

std::future<json> RPCWorker::add_promise() {
    std::promise<json> p;
    auto future = p.get_future();
    m_promises.push_back(std::move(p));
    return future;
}

json RPCWorker::try_pop_callback() {
    auto cb = m_callbacks.try_pop_back(0);
    return cb ? *cb : json::object();
}

bool RPCWorker::try_run_task() {
    if (m_stop) {
        return true;
    }

    // Use a 10 millisecond timeout to keep this thread unblocked.
    if (auto task = m_tasks.try_pop_back(10)) {
        (*task)();
        return m_stop;
    }
    return false;
}

bool RPCWorker::should_stop() {
    return m_stop;
}

void RPCWorker::stop() {
    if (!m_stop) {
        m_stop = true;
#if __APPLE__
        m_thread.join();
        m_loop = nullptr;
#endif
    }
}

RPCServer::RPCServer() {
    m_context = JSGlobalContextCreate(NULL);
    get_rpc_server(m_context) = this;
    m_callback_call_counter = 1;

    // JavaScriptCore crashes when trying to walk up the native stack to print the stacktrace.
    // FIXME: Avoid having to do this!
    static void (*setIncludesNativeCallStack)(JSGlobalContextRef, bool) = (void (*)(JSGlobalContextRef, bool))dlsym(RTLD_DEFAULT, "JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions");
    if (setIncludesNativeCallStack) {
        setIncludesNativeCallStack(m_context, false);
    }

    m_requests["/create_session"] = [this](const json dict) {
        RJSInitializeInContext(m_context);

        jsc::String realm_string = "Realm";
        JSObjectRef realm_constructor = jsc::Object::validated_get_constructor(m_context, JSContextGetGlobalObject(m_context), realm_string);
        JSValueRef refreshAccessTokenCallback = deserialize_json_value(dict["refreshAccessToken"]);

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef user_constructor = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "User");
        jsc::Object::set_property(m_context, user_constructor, "_refreshAccessToken", refreshAccessTokenCallback);

        m_session_id = store_object(realm_constructor);
        return (json){{"result", m_session_id}};
    };
    m_requests["/create_realm"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSObjectRef realm_object = jsc::Function::construct(m_context, realm_constructor, arg_count, arg_values);
        RPCObjectID realm_id = store_object(realm_object);
        return (json){{"result", realm_id}};
    };
    m_requests["/create_user"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef user_constructor = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "User");
        JSObjectRef create_user_method = (JSObjectRef)jsc::Object::get_property(m_context, user_constructor, "createUser");

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSObjectRef user_object = (JSObjectRef)jsc::Function::call(m_context, create_user_method, arg_count, arg_values);
        return (json){{"result", serialize_json_value(user_object)}};
    };
    m_requests["/_adminUser"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef user_constructor = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "User");
        JSObjectRef create_user_method = (JSObjectRef)jsc::Object::get_property(m_context, user_constructor, "_adminUser");

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSObjectRef user_object = (JSObjectRef)jsc::Function::call(m_context, create_user_method, arg_count, arg_values);
        return (json){{"result", serialize_json_value(user_object)}};
    };
    m_requests["/_getExistingUser"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef user_constructor = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "User");
        JSObjectRef create_user_method = (JSObjectRef)jsc::Object::get_property(m_context, user_constructor, "_getExistingUser");

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSObjectRef user_object = (JSObjectRef)jsc::Function::call(m_context, create_user_method, arg_count, arg_values);
        return (json){{"result", serialize_json_value(user_object)}};

    };
    m_requests["/reconnect"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef reconnect_method = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "reconnect");

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        jsc::Function::call(m_context, reconnect_method, arg_count, arg_values);
        return json::object();
    };
    m_requests["/_hasExistingSessions"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();
        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef method = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "_hasExistingSessions");

        auto result = jsc::Function::call(m_context, method, 0, nullptr);
        return (json){{"result", serialize_json_value(result)}};
    };
    m_requests["/_initializeSyncManager"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef initialize_sync_manager_method = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "_initializeSyncManager");

        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        jsc::Function::call(m_context, initialize_sync_manager_method, arg_count, arg_values);
        return json::object();
    };
    m_requests["/_asyncOpen"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef _asyncOpen_method = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "_asyncOpen");
        json::array_t args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];

        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        jsc::Function::call(m_context, _asyncOpen_method, arg_count, arg_values);
        return json::object();
    };
    m_requests["/call_method"] = [this](const json dict) {
        JSObjectRef object = get_object(dict["id"].get<RPCObjectID>());
        std::string method_string = dict["name"].get<std::string>();
        JSObjectRef function = jsc::Object::validated_get_function(m_context, object, method_string);

        json args = dict["arguments"];
        size_t arg_count = args.size();
        JSValueRef arg_values[arg_count];
        for (size_t i = 0; i < arg_count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSValueRef result = jsc::Function::call(m_context, function, object, arg_count, arg_values);
        return (json){{"result", serialize_json_value(result)}};
    };
    m_requests["/get_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];

        JSValueRef value;
        if (JSValueRef object = get_object(oid)) {
            if (name.is_number()) {
                value = jsc::Object::get_property(m_context, get_object(oid), name.get<unsigned int>());
            }
            else {
                value = jsc::Object::get_property(m_context, get_object(oid), name.get<std::string>());
            }
        }
        else {
            value = jsc::Value::from_null(m_context);
        }

        return (json){{"result", serialize_json_value(value)}};
    };
    m_requests["/set_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = deserialize_json_value(dict["value"]);

        if (name.is_number()) {
            jsc::Object::set_property(m_context, get_object(oid), name.get<unsigned int>(), value);
        }
        else {
            jsc::Object::set_property(m_context, get_object(oid), name.get<std::string>(), value);
        }

        return json::object();
    };
    m_requests["/dispose_object"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        m_objects.erase(oid);
        return json::object();
    };
    m_requests["/get_all_users"] = [this](const json dict) {
        JSObjectRef realm_constructor = get_realm_constructor();

        JSObjectRef sync_constructor = (JSObjectRef)jsc::Object::get_property(m_context, realm_constructor, "Sync");
        JSObjectRef user_constructor = (JSObjectRef)jsc::Object::get_property(m_context, sync_constructor, "User");
        JSValueRef value = jsc::Object::get_property(m_context, user_constructor, "all");

        return (json){{"result", serialize_json_value(value)}};
    };
    m_requests["/clear_test_state"] = [this](const json dict) {
        // The session ID points to the Realm constructor object, which should remain.
        auto realm_constructor = m_objects[m_session_id];
        m_objects.clear();

        if (realm_constructor) {
            m_objects.emplace(m_session_id, realm_constructor);
        }

        m_callbacks.clear();
        m_callback_ids.clear();
        JSGarbageCollect(m_context);
        js::clear_test_state();

        return json::object();
    };
}

RPCServer::~RPCServer() {
    m_worker.stop();

    // The protected values should be unprotected before releasing the context.
    m_objects.clear();
    m_callbacks.clear();

    get_rpc_server(m_context) = nullptr;
    JSGlobalContextRelease(m_context);
}

JSValueRef RPCServer::run_callback(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object,
                                   size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    RPCServer* server = get_rpc_server(JSContextGetGlobalContext(ctx));
    if (!server) {
        return JSValueMakeUndefined(ctx);
    }

    u_int64_t counter = server->m_callback_call_counter++;
    // The first argument was curried to be the callback id.
    RPCObjectID callback_id = server->m_callback_ids[function];
    JSObjectRef arguments_array = jsc::Object::create_array(ctx, uint32_t(argc), arguments);
    json arguments_json = server->serialize_json_value(arguments_array);
    json this_json = server->serialize_json_value(this_object);

    std::future<json> future;
    {
        std::lock_guard<std::mutex> lock(server->m_pending_callbacks_mutex);
        future = server->m_pending_callbacks[{callback_id, counter}].get_future();
    }

    // The next task on the stack will instruct the JS to run this callback.
    // This captures references since it will be executed before exiting this function.
    server->m_worker.invoke_callback({
        {"callback", callback_id},
        {"this", this_json},
        {"arguments", arguments_json},
        {"callback_call_counter", counter}
    });

    while (!server->try_run_task() && future.wait_for(std::chrono::milliseconds(10)) != std::future_status::ready);

    json results = future.get();
    // The callback id should be identical!
    assert(callback_id == results["callback"].get<RPCObjectID>());

    json error = results["error"];
    if (!error.is_null()) {
        JSStringRef message = JSStringCreateWithUTF8CString(error.get<std::string>().c_str());
        JSValueRef arguments[] { JSValueMakeString(ctx, message) };
        JSStringRelease(message);
        *exception = JSObjectMakeError(ctx, 1, arguments, nullptr);
        return nullptr;
    }

    return server->deserialize_json_value(results["result"]);
}

json RPCServer::perform_request(std::string const& name, json&& args) {
    std::lock_guard<std::mutex> lock(m_request_mutex);

    // Only create_session is allowed without the correct session id (since it creates the session id).
    if (name != "/create_session" && m_session_id != args["sessionId"].get<RPCObjectID>()) {
        return {{"error", "Invalid session ID"}};
    }

    auto resolve_callback = [&] {
        auto callback_id = args["callback"].get<uint64_t>();
        auto callback_counter = args["callback_call_counter"].get<uint64_t>();
        std::lock_guard<std::mutex> lock(m_pending_callbacks_mutex);
        auto cb = m_pending_callbacks.find({callback_id, callback_counter});
        if (cb != m_pending_callbacks.end()) {
            cb->second.set_value(args);
            m_pending_callbacks.erase(cb);
        }
    };

    // The callback_result message contains the return value (or exception) of a callback ran by run_callback().
    if (name == "/callback_result") {
        std::future<json> result = m_worker.add_promise();
        resolve_callback();
        return result.get();
    }
    if (name == "/callback_poll_result") {
        resolve_callback();
        return json::object();
    }
    if (name == "/callbacks_poll") {
        return m_worker.try_pop_callback();
    }

    RPCRequest *action = &m_requests[name];
    REALM_ASSERT_RELEASE(action && *action);

    return m_worker.add_task([=] {
        try {
            return (*action)(args);
        }
        catch (jsc::Exception const& ex) {
            json exceptionAsJson = nullptr;
            try {
                exceptionAsJson = serialize_json_value(ex);
            }
            catch (...) {
                exceptionAsJson = {{"error", "An exception occured while processing the request. Could not serialize the exception as JSON"}};
            }
            return (json){{"error", exceptionAsJson}, {"message", ex.what()}};
        }
        catch (std::exception const& exception) {
            return (json){{"error", exception.what()}};
        }
    });
}

bool RPCServer::try_run_task() {
    return m_worker.try_run_task();
}

RPCObjectID RPCServer::store_object(JSObjectRef object) {
    static RPCObjectID s_next_id = 1;

    RPCObjectID next_id = s_next_id++;
    m_objects.emplace(next_id, js::Protected<JSObjectRef>(m_context, object));
    return next_id;
}

JSObjectRef RPCServer::get_object(RPCObjectID oid) const {
    auto it = m_objects.find(oid);
    return it == m_objects.end() ? nullptr : static_cast<JSObjectRef>(it->second);
}

JSObjectRef RPCServer::get_realm_constructor() const {
    JSObjectRef realm_constructor = m_session_id ? JSObjectRef(get_object(m_session_id)) : NULL;
    if (!realm_constructor) {
        throw std::runtime_error("Realm constructor not found!");
    }
    return realm_constructor;
}

json RPCServer::serialize_json_value(JSValueRef js_value) {
    switch (JSValueGetType(m_context, js_value)) {
        case kJSTypeUndefined:
            return json::object();
        case kJSTypeNull:
            return {{"value", json(nullptr)}};
        case kJSTypeBoolean:
            return {{"value", jsc::Value::to_boolean(m_context, js_value)}};
        case kJSTypeNumber:
            return {{"value", jsc::Value::to_number(m_context, js_value)}};
        case kJSTypeString:
            return {{"value", jsc::Value::to_string(m_context, js_value)}};
        case kJSTypeObject:
            break;
#if defined __IPHONE_12_2 || defined __MAC_10_14_4
        case kJSTypeSymbol:
            break;
#endif

    }

    JSObjectRef js_object = jsc::Value::validated_to_object(m_context, js_value);

    if (jsc::Object::is_instance<js::RealmObjectClass<jsc::Types>>(m_context, js_object)) {
        auto object = jsc::Object::get_internal<js::RealmObjectClass<jsc::Types>>(js_object);
        return {
            {"type", RealmObjectTypesObject},
            {"id", store_object(js_object)},
            {"schema", serialize_object_schema(object->get_object_schema())}
        };
    }
    else if (jsc::Object::is_instance<js::ListClass<jsc::Types>>(m_context, js_object)) {
        auto list = jsc::Object::get_internal<js::ListClass<jsc::Types>>(js_object);
        return {
            {"type", RealmObjectTypesList},
            {"id", store_object(js_object)},
            {"size", list->size()},
            {"schema", get_type(*list)},
         };
    }
    else if (jsc::Object::is_instance<js::ResultsClass<jsc::Types>>(m_context, js_object)) {
        auto results = jsc::Object::get_internal<js::ResultsClass<jsc::Types>>(js_object);
        return {
            {"type", RealmObjectTypesResults},
            {"id", store_object(js_object)},
            {"size", results->size()},
            {"schema", get_type(*results)},
        };
    }
    else if (jsc::Object::is_instance<js::RealmClass<jsc::Types>>(m_context, js_object)) {
        return {
            {"type", RealmObjectTypesRealm},
            {"id", store_object(js_object)},
        };
    }
    else if (jsc::Object::is_instance<js::UserClass<jsc::Types>>(m_context, js_object)) {
        auto user = *jsc::Object::get_internal<js::UserClass<jsc::Types>>(js_object);
        json user_dict {
            {"isAdmin", user->is_admin()}
        };
        return {
            {"type", RealmObjectTypesUser},
            {"id", store_object(js_object)},
            {"data", user_dict}
        };
    }
    else if (jsc::Object::is_instance<js::SessionClass<jsc::Types>>(m_context, js_object)) {
        json session_dict {
            {"user", serialize_json_value(jsc::Object::get_property(m_context, js_object, "user"))},
            {"config", serialize_json_value(jsc::Object::get_property(m_context, js_object, "config"))}
        };
        return {
            {"type", RealmObjectTypesSession},
            {"id", store_object(js_object)},
            {"data", session_dict}
        };
    }
    else if (jsc::Object::is_instance<js::SubscriptionClass<jsc::Types>>(m_context, js_object)) {
        json subscription_dict {
            {"state", serialize_json_value(jsc::Object::get_property(m_context, js_object, "state"))},
            {"error", serialize_json_value(jsc::Object::get_property(m_context, js_object, "error"))}
        };
        return {
            {"type", RealmObjectTypeSubscription},
            {"id", store_object(js_object)},
            {"data", subscription_dict}
        };
    }
    else if (jsc::Value::is_array(m_context, js_object)) {
        uint32_t length = jsc::Object::validated_get_length(m_context, js_object);
        std::vector<json> array;
        for (uint32_t i = 0; i < length; i++) {
            array.push_back(serialize_json_value(jsc::Object::get_property(m_context, js_object, i)));
        }
        return {{"value", array}};
    }
    else if (jsc::Value::is_binary(m_context, js_object)) {
        auto data = jsc::Value::to_binary(m_context, js_object);
        return {
            {"type", RealmObjectTypesData},
            {"value", base64_encode((unsigned char *)data.data(), data.size())},
        };
    }
    else if (jsc::Value::is_date(m_context, js_object)) {
        return {
            {"type", RealmObjectTypesDate},
            {"value", jsc::Value::to_number(m_context, js_object)},
        };
    }
    else if (jsc::Value::is_function(m_context, js_object)) {
        auto it = m_callback_ids.find(js_object);
        if (it != m_callback_ids.end()) {
            return {
                {"type", RealmObjectTypesFunction},
                {"value", it->second}
            };
        }
    }
    else {
        // Serialize this JS object as a plain object since it doesn't match any known types above.
        std::vector<jsc::String> js_keys = jsc::Object::get_property_names(m_context, js_object);
        std::vector<std::string> keys;
        std::vector<json> values;

        for (auto &js_key : js_keys) {
            JSValueRef js_value = jsc::Object::get_property(m_context, js_object, js_key);

            keys.push_back(js_key);
            values.push_back(serialize_json_value(js_value));
        }

        return {
            {"type", RealmObjectTypesDictionary},
            {"keys", keys},
            {"values", values},
        };
    }
    assert(0);
}

JSValueRef RPCServer::deserialize_json_value(const json dict) {
    json oid = dict.value("id", json());
    if (oid.is_number()) {
        return m_objects[oid.get<RPCObjectID>()];
    }

    json value = dict.value("value", json());
    json type = dict.value("type", json());

    if (type.is_string()) {
        std::string type_string = type.get<std::string>();

        if (type_string == RealmObjectTypesFunction) {
            RPCObjectID callback_id = value.get<RPCObjectID>();

            if (!m_callbacks.count(callback_id)) {
                JSObjectRef callback = JSObjectMakeFunctionWithCallback(m_context, nullptr, run_callback);
                m_callbacks.emplace(callback_id, js::Protected<JSObjectRef>(m_context, callback));
                m_callback_ids.emplace(callback, callback_id);
            }

            return m_callbacks.at(callback_id);
        }
        else if (type_string == RealmObjectTypesDictionary) {
            JSObjectRef js_object = jsc::Object::create_empty(m_context);
            json keys = dict["keys"];
            json values = dict["values"];
            size_t count = keys.size();

            for (size_t i = 0; i < count; i++) {
                std::string js_key = keys.at(i);
                JSValueRef js_value = deserialize_json_value(values.at(i));
                jsc::Object::set_property(m_context, js_object, js_key, js_value);
            }

            return js_object;
        }
        else if (type_string == RealmObjectTypesData) {
            std::string bytes;
            if (!base64_decode(value.get<std::string>(), &bytes)) {
                throw std::runtime_error("Failed to decode base64 encoded data");
            }
            return jsc::Value::from_binary(m_context, realm::BinaryData(bytes.data(), bytes.size()));
        }
        else if (type_string == RealmObjectTypesDate) {
            return jsc::Object::create_date(m_context, value.get<double>());
        }
        else if (type_string == RealmObjectTypesUndefined) {
            return jsc::Value::from_undefined(m_context);
        }
        assert(0);
    }

    if (value.is_null()) {
        return jsc::Value::from_null(m_context);
    }
    else if (value.is_boolean()) {
        return jsc::Value::from_boolean(m_context, value.get<bool>());
    }
    else if (value.is_number()) {
        return jsc::Value::from_number(m_context, value.get<double>());
    }
    else if (value.is_string()) {
        return jsc::Value::from_string(m_context, value.get<std::string>());
    }
    else if (value.is_array()) {
        size_t count = value.size();
        JSValueRef js_values[count];

        for (size_t i = 0; i < count; i++) {
            js_values[i] = deserialize_json_value(value.at(i));
        }

        return jsc::Object::create_array(m_context, (uint32_t)count, js_values);
    }
    assert(0);
}
