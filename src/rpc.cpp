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
#include "jsc_types.hpp"
#include "js_object.hpp"
#include "js_results.hpp"
#include "js_realm.hpp"

#include "base64.hpp"
#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"

using namespace realm;
using namespace realm::rpc;

using Accessor = NativeAccessor<JSValueRef, JSContextRef>;

static const char * const RealmObjectTypesData = "data";
static const char * const RealmObjectTypesDate = "date";
static const char * const RealmObjectTypesDictionary = "dict";
static const char * const RealmObjectTypesFunction = "function";
static const char * const RealmObjectTypesList = "list";
static const char * const RealmObjectTypesObject = "object";
static const char * const RealmObjectTypesResults = "results";
static const char * const RealmObjectTypesUndefined = "undefined";

RPCServer::RPCServer() {
    m_context = JSGlobalContextCreate(NULL);

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

        m_session_id = store_object(realm_constructor);
        return (json){{"result", m_session_id}};
    };
    m_requests["/create_realm"] = [this](const json dict) {
        JSObjectRef realm_constructor = m_session_id ? m_objects[m_session_id] : NULL;
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
    m_requests["/begin_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        SharedRealm realm = *jsc::Object::get_internal<js::RealmClass<jsc::Types>>(m_objects[realm_id]);

        realm->begin_transaction();
        return json::object();
    };
    m_requests["/cancel_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        SharedRealm realm = *jsc::Object::get_internal<js::RealmClass<jsc::Types>>(m_objects[realm_id]);

        realm->cancel_transaction();
        return json::object();
    };
    m_requests["/commit_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        SharedRealm realm = *jsc::Object::get_internal<js::RealmClass<jsc::Types>>(m_objects[realm_id]);

        realm->commit_transaction();
        return json::object();
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
        JSValueUnprotect(m_context, m_objects[oid]);
        m_objects.erase(oid);
        return json::object();
    };
    m_requests["/clear_test_state"] = [this](const json dict) {
        for (auto object : m_objects) {
            // The session ID points to the Realm constructor object, which should remain.
            if (object.first == m_session_id) {
                continue;
            }

            JSValueUnprotect(m_context, object.second);
            m_objects.erase(object.first);
        }
        JSGarbageCollect(m_context);
        js::clear_test_state();
        return json::object();
    };
}

RPCServer::~RPCServer() {
    for (auto item : m_objects) {
        JSValueUnprotect(m_context, item.second);
    }

    JSGlobalContextRelease(m_context);
}

json RPCServer::perform_request(std::string name, json &args) {
    try {
        RPCRequest action = m_requests[name];
        assert(action);

        if (name == "/create_session" || m_session_id == args["sessionId"].get<RPCObjectID>()) {
            return action(args);
        }
        else {
            return {{"error", "Invalid session ID"}};
        }
    } catch (std::exception &exception) {
        return {{"error", exception.what()}};
    }
}

RPCObjectID RPCServer::store_object(JSObjectRef object) {
    static RPCObjectID s_next_id = 1;
    RPCObjectID next_id = s_next_id++;
    JSValueProtect(m_context, object);
    m_objects[next_id] = object;
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
    else if (jsc::Value::is_array(m_context, js_object)) {
        uint32_t length = jsc::Object::validated_get_length(m_context, js_object);
        std::vector<json> array;
        for (uint32_t i = 0; i < length; i++) {
            array.push_back(serialize_json_value(jsc::Object::get_property(m_context, js_object, i)));
        }
        return {{"value", array}};
    }
    else if (jsc::Value::is_array_buffer(m_context, js_object)) {
        std::string data = Accessor::to_binary(m_context, js_value);
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
    else {
        // Serialize this JS object as a plain object since it doesn't match any known types above.
        std::vector<jsc::String> js_keys = jsc::Object::get_property_names(m_context, js_object);
        std::vector<std::string> keys;
        std::vector<json> values;

        for (auto &js_key : js_keys) {
            JSValueRef js_value = jsc::Object::get_property(m_context, js_object, js_key);

            keys.push_back(js_key);
            values.push_back(js_value);
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

    for (auto &prop : object_schema.properties) {
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
            // FIXME: Make this actually call the function by its id once we need it to.
            return JSObjectMakeFunction(m_context, NULL, 0, NULL, jsc::String(""), NULL, 1, NULL);
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
            return Accessor::from_binary(m_context, realm::BinaryData(bytes));
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
