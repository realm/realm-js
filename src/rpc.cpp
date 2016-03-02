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

#include "rpc.hpp"

#include <dlfcn.h>
#include <map>
#include <string>
#include "js_init.h"
#include "js_object.hpp"
#include "js_results.hpp"
#include "js_list.hpp"
#include "js_realm.hpp"
#include "js_util.hpp"

#include "base64.hpp"
#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"
#include <cassert>
 
using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm_js;

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

        JSStringRef realm_string = RJSStringForString("Realm");
        JSObjectRef realm_constructor = RJSValidatedObjectProperty(m_context, JSContextGetGlobalObject(m_context), realm_string);
        JSStringRelease(realm_string);

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

        JSValueRef exception = NULL;
        JSObjectRef realm_object = JSObjectCallAsConstructor(m_context, realm_constructor, arg_count, arg_values, &exception);
        if (exception) {
            return (json){{"error", RJSStringForValue(m_context, exception)}};
        }

        RPCObjectID realm_id = store_object(realm_object);
        return (json){{"result", realm_id}};
    };
    m_requests["/begin_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(m_objects[realm_id])->get()->begin_transaction();
        return json::object();
    };
    m_requests["/cancel_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(m_objects[realm_id])->get()->cancel_transaction();
        return json::object();
    };
    m_requests["/commit_transaction"] = [this](const json dict) {
        RPCObjectID realm_id = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(m_objects[realm_id])->get()->commit_transaction();
        return json::object();
    };
    m_requests["/call_method"] = [this](const json dict) {
        JSObjectRef object = m_objects[dict["id"].get<RPCObjectID>()];
        JSStringRef method_string = RJSStringForString(dict["name"].get<std::string>());
        JSObjectRef function = RJSValidatedObjectProperty(m_context, object, method_string);
        JSStringRelease(method_string);

        json args = dict["arguments"];
        size_t count = args.size();
        JSValueRef arg_values[count];
        for (size_t i = 0; i < count; i++) {
            arg_values[i] = deserialize_json_value(args[i]);
        }

        JSValueRef exception = NULL;
        JSValueRef result = JSObjectCallAsFunction(m_context, function, object, count, arg_values, &exception);
        if (exception) {
            return (json){{"error", RJSStringForValue(m_context, exception)}};
        }
        return (json){{"result", serialize_json_value(result)}};
    };
    m_requests["/get_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = NULL;
        JSValueRef exception = NULL;

        if (name.is_number()) {
            value = JSObjectGetPropertyAtIndex(m_context, m_objects[oid], name.get<unsigned int>(), &exception);
        }
        else {
            JSStringRef prop_string = RJSStringForString(name.get<std::string>());
            value = JSObjectGetProperty(m_context, m_objects[oid], prop_string, &exception);
            JSStringRelease(prop_string);
        }

        if (exception) {
            return (json){{"error", RJSStringForValue(m_context, exception)}};
        }
        return (json){{"result", serialize_json_value(value)}};
    };
    m_requests["/set_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = deserialize_json_value(dict["value"]);
        JSValueRef exception = NULL;

        if (name.is_number()) {
            JSObjectSetPropertyAtIndex(m_context, m_objects[oid], name.get<unsigned int>(), value, &exception);
        }
        else {
            JSStringRef prop_string = RJSStringForString(name.get<std::string>());
            JSObjectSetProperty(m_context, m_objects[oid], prop_string, value, 0, &exception);
            JSStringRelease(prop_string);
        }

        if (exception) {
            return (json){{"error", RJSStringForValue(m_context, exception)}};
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
        RJSClearTestState();
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
        return {{"error", (std::string)"exception thrown: " + exception.what()}};
    }
}

RPCObjectID RPCServer::store_object(JSObjectRef object) {
    static RPCObjectID s_next_id = 1;
    RPCObjectID next_id = s_next_id++;
    JSValueProtect(m_context, object);
    m_objects[next_id] = object;
    return next_id;
}

json RPCServer::serialize_json_value(JSValueRef value) {
    switch (JSValueGetType(m_context, value)) {
        case kJSTypeUndefined:
            return json::object();
        case kJSTypeNull:
            return {{"value", json(nullptr)}};
        case kJSTypeBoolean:
            return {{"value", JSValueToBoolean(m_context, value)}};
        case kJSTypeNumber:
            return {{"value", JSValueToNumber(m_context, value, NULL)}};
        case kJSTypeString:
            return {{"value", RJSStringForValue(m_context, value)}};
        case kJSTypeObject:
            break;
    }

    JSObjectRef js_object = JSValueToObject(m_context, value, NULL);

    if (JSValueIsObjectOfClass(m_context, value, RJSObjectClass())) {
        realm::Object *object = RJSGetInternal<realm::Object *>(js_object);
        return {
            {"type", RealmObjectTypesObject},
            {"id", store_object(js_object)},
            {"schema", serialize_object_schema(object->get_object_schema())}
        };
    }
    else if (JSValueIsObjectOfClass(m_context, value, RJSListClass())) {
        realm::List *list = RJSGetInternal<realm::List *>(js_object);
        return {
            {"type", RealmObjectTypesList},
            {"id", store_object(js_object)},
            {"size", list->size()},
            {"schema", serialize_object_schema(list->get_object_schema())}
         };
    }
    else if (JSValueIsObjectOfClass(m_context, value, RJSResultsClass())) {
        realm::Results *results = RJSGetInternal<realm::Results *>(js_object);
        return {
            {"type", RealmObjectTypesResults},
            {"id", store_object(js_object)},
            {"size", results->size()},
            {"schema", serialize_object_schema(results->get_object_schema())}
        };
    }
    else if (RJSIsValueArray(m_context, value)) {
        size_t length = RJSValidatedListLength(m_context, js_object);
        std::vector<json> array;
        for (unsigned int i = 0; i < length; i++) {
            array.push_back(serialize_json_value(JSObjectGetPropertyAtIndex(m_context, js_object, i, NULL)));
        }
        return {{"value", array}};
    }
    else if (RJSIsValueArrayBuffer(m_context, value)) {
        std::string data = RJSAccessor::to_binary(m_context, value);
        return {
            {"type", RealmObjectTypesData},
            {"value", base64_encode((unsigned char *)data.data(), data.size())},
        };
    }
    else if (RJSIsValueDate(m_context, value)) {
        return {
            {"type", RealmObjectTypesDate},
            {"value", RJSValidatedValueToNumber(m_context, value)},
        };
    }
    else {
        // Serialize this JS object as a plain object since it doesn't match any known types above.
        JSPropertyNameArrayRef js_keys = JSObjectCopyPropertyNames(m_context, js_object);
        size_t count = JSPropertyNameArrayGetCount(js_keys);
        std::vector<std::string> keys;
        std::vector<json> values;

        for (size_t i = 0; i < count; i++) {
            JSStringRef js_key = JSPropertyNameArrayGetNameAtIndex(js_keys, i);
            JSValueRef js_value = RJSValidatedPropertyValue(m_context, js_object, js_key);

            keys.push_back(RJSStringForJSString(js_key));
            values.push_back(serialize_json_value(js_value));
        }

        JSPropertyNameArrayRelease(js_keys);

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

    for (realm::Property prop : object_schema.properties) {
        properties.push_back(prop.name);
    }

    return {
        {"name", object_schema.name},
        {"properties", properties},
    };
}

JSValueRef RPCServer::deserialize_json_value(const json dict)
{
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
            JSStringRef js_body = JSStringCreateWithUTF8CString("");
            JSObjectRef js_function = JSObjectMakeFunction(m_context, NULL, 0, NULL, js_body, NULL, 1, NULL);
            JSStringRelease(js_body);

            return js_function;
        }
        else if (type_string == RealmObjectTypesDictionary) {
            JSObjectRef js_object = JSObjectMake(m_context, NULL, NULL);
            json keys = dict["keys"];
            json values = dict["values"];
            size_t count = keys.size();

            for (size_t i = 0; i < count; i++) {
                JSStringRef js_key = RJSStringForString(keys.at(i));
                JSValueRef js_value = deserialize_json_value(values.at(i));

                JSObjectSetProperty(m_context, js_object, js_key, js_value, 0, NULL);
                JSStringRelease(js_key);
            }

            return js_object;
        }
        else if (type_string == RealmObjectTypesData) {
            std::string bytes;
            if (!base64_decode(value.get<std::string>(), &bytes)) {
                throw std::runtime_error("Failed to decode base64 encoded data");
            }
            return RJSAccessor::from_binary(m_context, realm::BinaryData(bytes));
        }
        else if (type_string == RealmObjectTypesDate) {
            JSValueRef exception = NULL;
            JSValueRef time = JSValueMakeNumber(m_context, value.get<double>());
            JSObjectRef date = JSObjectMakeDate(m_context, 1, &time, &exception);

            if (exception) {
                throw RJSException(m_context, exception);
            }
            return date;
        }
        else if (type_string == RealmObjectTypesUndefined) {
            return JSValueMakeUndefined(m_context);
        }
        assert(0);
    }

    if (value.is_null()) {
        return JSValueMakeNull(m_context);
    }
    else if (value.is_boolean()) {
        return JSValueMakeBoolean(m_context, value.get<bool>());
    }
    else if (value.is_number()) {
        return JSValueMakeNumber(m_context, value.get<double>());
    }
    else if (value.is_string()) {
        return RJSValueForString(m_context, value.get<std::string>());
    }
    else if (value.is_array()) {
        size_t count = value.size();
        JSValueRef js_values[count];

        for (size_t i = 0; i < count; i++) {
            js_values[i] = deserialize_json_value(value.at(i));
        }

        return JSObjectMakeArray(m_context, count, js_values, NULL);
    }
    assert(0);
}
