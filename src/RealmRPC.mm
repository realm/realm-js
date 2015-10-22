////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#import "RealmRPC.hpp"

#include <dlfcn.h>
#include <map>
#include <string>
#include "RealmJS.h"
#include "RJSObject.hpp"
#include "RJSResults.hpp"
#include "RJSList.hpp"
#include "RJSRealm.hpp"
#include "RJSUtil.hpp"

#include "object_accessor.hpp"
#include "shared_realm.hpp"
#include "results.hpp"

using namespace realm_js;

static const char * const RealmObjectTypesFunction = "ObjectTypesFUNCTION";
static const char * const RealmObjectTypesNotification = "ObjectTypesNOTIFICATION";
static const char * const RealmObjectTypesResults = "ObjectTypesRESULTS";

RPCServer::RPCServer() {
    _context = JSGlobalContextCreate(NULL);

    // JavaScriptCore crashes when trying to walk up the native stack to print the stacktrace.
    // FIXME: Avoid having to do this!
    static void (*setIncludesNativeCallStack)(JSGlobalContextRef, bool) = (void (*)(JSGlobalContextRef, bool))dlsym(RTLD_DEFAULT, "JSGlobalContextSetIncludesNativeCallStackWhenReportingExceptions");
    if (setIncludesNativeCallStack) {
        setIncludesNativeCallStack(_context, false);
    }

    _requests["/create_session"] = [this](const json dict) {
        [RealmJS initializeContext:_context];

        JSStringRef realm_string = RJSStringForString("Realm");
        JSObjectRef realm_constructor = RJSValidatedObjectProperty(_context, JSContextGetGlobalObject(_context), realm_string);
        JSStringRelease(realm_string);

        _sessionID = store_object(realm_constructor);
        return (json){{"result", _sessionID}};
    };
    _requests["/create_realm"] = [this](const json dict) {
        JSObjectRef realm_constructor = _sessionID ? _objects[_sessionID] : NULL;
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
        JSObjectRef realmObject = JSObjectCallAsConstructor(_context, realm_constructor, arg_count, arg_values, &exception);

        if (exception) {
            return (json){{"error", RJSStringForValue(_context, exception)}};
        }

        RPCObjectID realmId = store_object(realmObject);
        return (json){{"result", realmId}};
    };
    _requests["/begin_transaction"] = [this](const json dict) {
        RPCObjectID realmId = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->begin_transaction();
        return json::object();
    };
    _requests["/cancel_transaction"] = [this](const json dict) {
        RPCObjectID realmId = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->cancel_transaction();
        return json::object();
    };
    _requests["/commit_transaction"] = [this](const json dict) {
        RPCObjectID realmId = dict["realmId"].get<RPCObjectID>();
        RJSGetInternal<realm::SharedRealm *>(_objects[realmId])->get()->commit_transaction();
        return json::object();
    };
    _requests["/call_method"] = [this](const json dict) {
        JSObjectRef object = _objects[dict["id"].get<RPCObjectID>()];
        JSStringRef methodString = RJSStringForString(dict["name"].get<std::string>());
        JSObjectRef function = RJSValidatedObjectProperty(_context, object, methodString);
        JSStringRelease(methodString);

        json args = dict["arguments"];
        size_t argCount = args.size();
        JSValueRef argValues[argCount];
        for (size_t i = 0; i < argCount; i++) {
            argValues[i] = deserialize_json_value(args[i]);
        }

        JSValueRef exception = NULL;
        JSValueRef result = JSObjectCallAsFunction(_context, function, object, argCount, argValues, &exception);

        if (exception) {
            return (json){{"error", RJSStringForValue(_context, exception)}};
        }
        return (json){{"result", serialize_json_value(result)}};
    };
    _requests["/get_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = NULL;
        JSValueRef exception = NULL;

        if (name.is_number()) {
            value = JSObjectGetPropertyAtIndex(_context, _objects[oid], name.get<unsigned int>(), &exception);
        }
        else {
            JSStringRef propString = RJSStringForString(name.get<std::string>());
            value = JSObjectGetProperty(_context, _objects[oid], propString, &exception);
            JSStringRelease(propString);
        }

        if (exception) {
            return (json){{"error", RJSStringForValue(_context, exception)}};
        }
        return (json){{"result", serialize_json_value(value)}};
    };
    _requests["/set_property"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        json name = dict["name"];
        JSValueRef value = deserialize_json_value(dict["value"]);
        JSValueRef exception = NULL;

        if (name.is_number()) {
            JSObjectSetPropertyAtIndex(_context, _objects[oid], name.get<unsigned int>(), value, &exception);
        }
        else {
            JSStringRef propString = RJSStringForString(name.get<std::string>());
            JSObjectSetProperty(_context, _objects[oid], propString, value, 0, &exception);
            JSStringRelease(propString);
        }

        if (exception) {
            return (json){{"error", RJSStringForValue(_context, exception)}};
        }
        return json::object();
    };
    _requests["/dispose_object"] = [this](const json dict) {
        RPCObjectID oid = dict["id"].get<RPCObjectID>();
        JSValueUnprotect(_context, _objects[oid]);
        _objects.erase(oid);
        return json::object();
    };
    _requests["/clear_test_state"] = [this](const json dict) {
        for (auto object : _objects) {
            // The session ID points to the Realm constructor object, which should remain.
            if (object.first == _sessionID) {
                continue;
            }

            JSValueUnprotect(_context, object.second);
            _objects.erase(object.first);
        }
        JSGarbageCollect(_context);
        [RealmJS clearTestState];
        return json::object();
    };
}

RPCServer::~RPCServer() {
    for (auto item : _objects) {
        JSValueUnprotect(_context, item.second);
    }

    JSGlobalContextRelease(_context);
}

json RPCServer::perform_request(std::string name, json &args) {
    // perform all realm ops on the main thread
    __block json response;
    dispatch_sync(dispatch_get_main_queue(), ^{
        try {
            RPCRequest action = _requests[name];
            assert(action);

            if (name == "/create_session" || _sessionID == args["sessionId"].get<RPCObjectID>()) {
                response = action(args);
                assert(response.is_object());
            }
            else {
                response = {{"error", "Invalid session ID"}};
            }
        } catch (std::exception &exception) {
            response = {{"error", (std::string)"exception thrown: " + exception.what()}};
        }
    });
    return response;
}

RPCObjectID RPCServer::store_object(JSObjectRef object) {
    static RPCObjectID s_next_id = 1;
    RPCObjectID next_id = s_next_id++;
    JSValueProtect(_context, object);
    _objects[next_id] = object;
    return next_id;
}

json RPCServer::serialize_json_value(JSValueRef value) {
    switch (JSValueGetType(_context, value)) {
        case kJSTypeUndefined:
            return json::object();
        case kJSTypeNull:
            return {{"value", json(nullptr)}};
        case kJSTypeBoolean:
            return {{"value", JSValueToBoolean(_context, value)}};
        case kJSTypeNumber:
            return {{"value", JSValueToNumber(_context, value, NULL)}};
        case kJSTypeString:
            return {{"value", RJSStringForValue(_context, value).c_str()}};
        case kJSTypeObject:
            break;
    }

    JSObjectRef jsObject = JSValueToObject(_context, value, NULL);

    if (JSValueIsObjectOfClass(_context, value, RJSObjectClass())) {
        realm::Object *object = RJSGetInternal<realm::Object *>(jsObject);
        return {
            {"type", RJSTypeGet(realm::PropertyTypeObject).c_str()},
            {"id", store_object(jsObject)},
            {"schema", serialize_object_schema(object->object_schema)}
        };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSListClass())) {
        realm::List *list = RJSGetInternal<realm::List *>(jsObject);
        return {
            {"type", RJSTypeGet(realm::PropertyTypeArray)},
            {"id", store_object(jsObject)},
            {"size", list->link_view->size()},
            {"schema", serialize_object_schema(list->object_schema)}
         };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSResultsClass())) {
        realm::Results *results = RJSGetInternal<realm::Results *>(jsObject);
        return {
            {"type", RealmObjectTypesResults},
            {"id", store_object(jsObject)},
            {"size", results->size()},
            {"schema", serialize_object_schema(results->object_schema)}
        };
    }
    else if (JSValueIsObjectOfClass(_context, value, RJSNotificationClass())) {
        return {
            {"type", RealmObjectTypesNotification},
            {"id", store_object(jsObject)},
        };
    }
    else if (RJSIsValueArray(_context, value)) {
        size_t length = RJSValidatedListLength(_context, jsObject);
        std::vector<json> array;
        for (unsigned int i = 0; i < length; i++) {
            array.push_back(serialize_json_value(JSObjectGetPropertyAtIndex(_context, jsObject, i, NULL)));
        }
        return {{"value", array}};
    }
    else if (RJSIsValueDate(_context, value)) {
        return {
            {"type", RJSTypeGet(realm::PropertyTypeDate)},
            {"value", RJSValidatedValueToNumber(_context, value)},
        };
    }
    assert(0);
}

json RPCServer::serialize_object_schema(realm::ObjectSchema &objectSchema) {
    json properties = json::array();
    for (realm::Property prop : objectSchema.properties) {
        properties.push_back({
            {"name", prop.name},
            {"type", RJSTypeGet(prop.type)},
        });
    }

    return {
        {"name", objectSchema.name},
        {"properties", properties},
    };
}

JSValueRef RPCServer::deserialize_json_value(const json dict)
{
    json oid = dict["id"];
    if (oid.is_number()) {
        return _objects[oid.get<RPCObjectID>()];
    }

    json value = dict["value"];
    json type = dict["type"];
    if (type.is_string()) {
        std::string type_string = type.get<std::string>();
        if (type_string == RealmObjectTypesFunction) {
            // FIXME: Make this actually call the function by its id once we need it to.
            JSStringRef jsBody = JSStringCreateWithUTF8CString("");
            JSObjectRef jsFunction = JSObjectMakeFunction(_context, NULL, 0, NULL, jsBody, NULL, 1, NULL);
            JSStringRelease(jsBody);

            return jsFunction;
        }
        else if (type_string == RJSTypeGet(realm::PropertyTypeDate)) {
            JSValueRef exception = NULL;
            JSValueRef time = JSValueMakeNumber(_context, value.get<double>());
            JSObjectRef date = JSObjectMakeDate(_context, 1, &time, &exception);

            if (exception) {
                throw RJSException(_context, exception);
            }
            return date;
        }
    }

    if (value.is_null()) {
        return JSValueMakeNull(_context);
    }
    else if (value.is_boolean()) {
        return JSValueMakeBoolean(_context, value.get<bool>());
    }
    else if (value.is_number()) {
        return JSValueMakeNumber(_context, value.get<double>());
    }
    else if (value.is_string()) {
        return RJSValueForString(_context, value.get<std::string>());
    }
    else if (value.is_array()) {
        size_t count = value.size();
        JSValueRef jsValues[count];

        for (size_t i = 0; i < count; i++) {
            jsValues[i] = deserialize_json_value(value.at(i));
        }

        return JSObjectMakeArray(_context, count, jsValues, NULL);
    }
    else if (value.is_object()) {
        JSObjectRef jsObject = JSObjectMake(_context, NULL, NULL);

        for (json::iterator it = value.begin(); it != value.end(); ++it) {
            JSValueRef jsValue = deserialize_json_value(it.value());
            JSStringRef jsKey = JSStringCreateWithUTF8CString(it.key().c_str());

            JSObjectSetProperty(_context, jsObject, jsKey, jsValue, 0, NULL);
            JSStringRelease(jsKey);
        }

        return jsObject;
    }

    return JSValueMakeUndefined(_context);
}
