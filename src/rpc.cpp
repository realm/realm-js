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
static const char * const RealmObjectTypesUndefined = "undefined";

static RPCServer*& get_rpc_server(JSGlobalContextRef ctx) {
    static std::map<JSGlobalContextRef, RPCServer*> s_map;
    return s_map[ctx];
}

RPCWorker::RPCWorker() {
    m_thread = std::thread([this]() {
        // TODO: Create ALooper/CFRunLoop to support async calls.
        while (!m_stop) {
            try_run_task();
        }
    });
}

RPCWorker::~RPCWorker() {
    stop();
}

void RPCWorker::add_task(std::function<json()> task) {
    m_tasks.push_back(std::packaged_task<json()>(task));
}

json RPCWorker::pop_task_result() {
    // This might block until a future has been added.
    auto future = m_futures.pop_back();

    // This will block until a return value (or exception) is available.
    return future.get();
}

void RPCWorker::try_run_task() {
    try {
        // Use a 10 millisecond timeout to keep this thread unblocked.
        auto task = m_tasks.pop_back(10);
        task();

        // Since this can be called recursively, it must be pushed to the front of the queue *after* running the task.
        m_futures.push_front(task.get_future());
    }
    catch (ConcurrentDequeTimeout &) {
        // We tried.
    }
}

void RPCWorker::stop() {
    if (!m_stop) {
        m_stop = true;
        m_thread.join();
    }
}

RPCServer::RPCServer() {
    m_context = JSGlobalContextCreate(NULL);
    get_rpc_server(m_context) = this;

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
        JSObjectRef realm_constructor = m_session_id ? JSObjectRef(m_objects[m_session_id]) : NULL;
        if (!realm_constructor) {
            throw std::runtime_error("Realm constructor not found!");
        }

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
        JSObjectRef realm_constructor = m_session_id ? JSObjectRef(m_objects[m_session_id]) : NULL;
        if (!realm_constructor) {
            throw std::runtime_error("Realm constructor not found!");
        }
        
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
    m_requests["/call_method"] = [this](const json dict) {
        JSObjectRef object = m_objects[dict["id"].get<RPCObjectID>()];
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

        if (name.is_number()) {
            value = jsc::Object::get_property(m_context, m_objects[oid], name.get<unsigned int>());
        }
        else {
            value = jsc::Object::get_property(m_context, m_objects[oid], name.get<std::string>());
        }

        return (json){{"result", serialize_json_value(value)}};
    };
    m_requests["/set_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = deserialize_json_value(dict["value"]);

        if (name.is_number()) {
            jsc::Object::set_property(m_context, m_objects[oid], name.get<unsigned int>(), value);
        }
        else {
            jsc::Object::set_property(m_context, m_objects[oid], name.get<std::string>(), value);
        }

        return json::object();
    };
    m_requests["/dispose_object"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        m_objects.erase(oid);
        return json::object();
    };
    m_requests["/get_all_users"] = [this](const json dict) {
        JSObjectRef realm_constructor = m_session_id ? JSObjectRef(m_objects[m_session_id]) : NULL;
        if (!realm_constructor) {
            throw std::runtime_error("Realm constructor not found!");
        }
        
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

void RPCServer::run_callback(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], jsc::ReturnValue &return_value) {
    RPCServer* server = get_rpc_server(JSContextGetGlobalContext(ctx));
    if (!server) {
        return;
    }

    // The first argument was curried to be the callback id.
    RPCObjectID callback_id = server->m_callback_ids[function];
    JSObjectRef arguments_array = jsc::Object::create_array(ctx, uint32_t(argc), arguments);
    json arguments_json = server->serialize_json_value(arguments_array);
    json this_json = server->serialize_json_value(this_object);

    // The next task on the stack will instruct the JS to run this callback.
    // This captures references since it will be executed before exiting this function.
    server->m_worker.add_task([&]() -> json {
        return {
            {"callback", callback_id},
            {"this", this_json},
            {"arguments", arguments_json},
        };
    });

    // Wait for the next callback result to come off the result stack.
    while (server->m_callback_results.empty()) {
        // This may recursively bring us into another callback, hence the callback results being a stack.
        server->m_worker.try_run_task();
    }

    json results = server->m_callback_results.pop_back();
    json error = results["error"];

    // The callback id should be identical!
    assert(callback_id == results["callback"].get<RPCObjectID>());

    if (!error.is_null()) {
        throw jsc::Exception(ctx, error.get<std::string>());
    }

    return_value.set(server->deserialize_json_value(results["result"]));
}

json RPCServer::perform_request(std::string name, const json &args) {
    std::lock_guard<std::mutex> lock(m_request_mutex);

    // Only create_session is allowed without the correct session id (since it creates the session id).
    if (name != "/create_session" && m_session_id != args["sessionId"].get<RPCObjectID>()) {
        return {{"error", "Invalid session ID"}};
    }

    // The callback_result message contains the return value (or exception) of a callback ran by run_callback().
    if (name == "/callback_result") {
        json results(args);
        m_callback_results.push_back(std::move(results));
    }
    else {
        RPCRequest action = m_requests[name];
        assert(action);

        m_worker.add_task([=] {
            return action(args);
        });
    }

    try {
        // This will either be the return value (or exception) of the action perform, OR an instruction to run a callback.
        return m_worker.pop_task_result();
    } catch (std::exception &exception) {
        return {{"error", exception.what()}};
    }
}

RPCObjectID RPCServer::store_object(JSObjectRef object) {
    static RPCObjectID s_next_id = 1;

    RPCObjectID next_id = s_next_id++;
    m_objects.emplace(next_id, js::Protected<JSObjectRef>(m_context, object));
    return next_id;
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
            {"schema", serialize_object_schema(list->get_object_schema())}
         };
    }
    else if (jsc::Object::is_instance<js::ResultsClass<jsc::Types>>(m_context, js_object)) {
        auto results = jsc::Object::get_internal<js::ResultsClass<jsc::Types>>(js_object);
        return {
            {"type", RealmObjectTypesResults},
            {"id", store_object(js_object)},
            {"size", results->size()},
            {"schema", serialize_object_schema(results->get_object_schema())}
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
            {"identity", user->identity()},
            {"token", user->refresh_token()},
            {"server", user->server_url()},
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

json RPCServer::serialize_object_schema(const realm::ObjectSchema &object_schema) {
    std::vector<std::string> properties;

    for (auto &prop : object_schema.persisted_properties) {
        properties.push_back(prop.name);
    }
    
    for (auto &prop : object_schema.computed_properties) {
        properties.push_back(prop.name);
    }

    return {
        {"name", object_schema.name},
        {"properties", properties},
    };
}

JSValueRef RPCServer::deserialize_json_value(const json dict) {
    json oid = dict["id"];
    if (oid.is_number()) {
        return m_objects[oid.get<RPCObjectID>()];
    }

    json value = dict["value"];
    json type = dict["type"];

    if (type.is_string()) {
        std::string type_string = type.get<std::string>();

        if (type_string == RealmObjectTypesFunction) {
            RPCObjectID callback_id = value.get<RPCObjectID>();

            if (!m_callbacks.count(callback_id)) {
                JSObjectRef callback = JSObjectMakeFunctionWithCallback(m_context, nullptr, js::wrap<run_callback>);
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
