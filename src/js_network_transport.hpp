////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

#include "sync/generic_network_transport.hpp"
#include "js_types.hpp"
#include <string>

namespace realm {
namespace js {

using ResponseHandlerCompletionCallback = std::function<void(const app::Response)>;

class ResponseHandler {
public:
    ResponseHandler(ResponseHandlerCompletionCallback callback) {
        m_completion_callback = callback;
    }

    ResponseHandlerCompletionCallback m_completion_callback;
};

template<typename T>
class ResponseHandlerClass : public ClassDefinition<T, ResponseHandler> {
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
    std::string const name = "ResponseHandler";

    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, ResponseHandlerCompletionCallback);


    static void on_success(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void on_error(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const methods = {
        {"onSuccess", wrap<on_success>},
        {"onError", wrap<on_error>}
    };
};

template<typename T>
inline typename T::Function ResponseHandlerClass<T>::create_constructor(ContextType ctx) {
    FunctionType response_handler_constructor = ObjectWrap<T, ResponseHandlerClass<T>>::create_constructor(ctx);
    return response_handler_constructor;
}

template <typename T>
typename T::Object ResponseHandlerClass<T>::create_instance(ContextType ctx, ResponseHandlerCompletionCallback completion_callback) {
    return create_object<T, ResponseHandlerClass<T>>(ctx, new ResponseHandler(std::move(completion_callback)));
}


template<typename T>
void ResponseHandlerClass<T>::on_success(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    static const String response_status_code = "statusCode";
    static const String response_headers = "headers";
    static const String response_body = "body";

    args.validate_count(1);

    auto response_handler = get_internal<T, ResponseHandlerClass<T>>(this_object);
    ObjectType response_object = Value::validated_to_object(ctx, args[0]);

    // Copy the response from JavaScript to an Object Store object
    int http_status_code;
    int custom_status_code = 0;
    std::map<std::string, std::string> headers;
    std::string body;

    ValueType status_code_value = Object::get_property(ctx, response_object, response_status_code);
    if (!Value::is_undefined(ctx, status_code_value)) {
        http_status_code = static_cast<int>(Value::validated_to_number(ctx, status_code_value));
    }

    ValueType headers_value = Object::get_property(ctx, response_object, response_headers);
    if (!Value::is_undefined(ctx, headers_value)) {
        ObjectType headers_object = Value::validated_to_object(ctx, headers_value);
        for (auto key : Object::get_property_names(ctx, headers_object)) {
            ValueType value = Object::get_property(ctx, headers_object, key);
            std::string value_as_string = Value::validated_to_string(ctx, value);
            headers.insert(std::pair<std::string, std::string>(key, value_as_string));
        }
    }

    ValueType body_value = Object::get_property(ctx, response_object, response_body);
    if (!Value::is_undefined(ctx, body_value)) {
        body = Value::validated_to_string(ctx, body_value);
    }

    response_handler->m_completion_callback(app::Response{http_status_code, custom_status_code, headers, body});
}


template<typename T>
void ResponseHandlerClass<T>::on_error(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value) {
    args.validate_count(1);

    auto response_handler = get_internal<T, ResponseHandlerClass<T>>(this_object);
    ObjectType error_object = Value::validated_to_object(ctx, args[0]);

    // Copy the error from JavaScript to an Object Store response object
    int http_status_code = 0;
    int custom_status_code = 1;
    std::map<std::string, std::string> headers;
    std::string body;

    response_handler->m_completion_callback(app::Response{http_status_code, custom_status_code, headers, body});
}


template<typename T>
struct JavaScriptNetworkTransportWrapper : public app::GenericNetworkTransport {
    using ContextType = typename T::Context;

    JavaScriptNetworkTransportWrapper(ContextType ctx) : GenericNetworkTransport() {};

    void send_request_to_server(const app::Request request, std::function<void(const app::Response)> completion_callback) override {};
};

template<typename T>
struct JavaScriptNetworkTransport : public JavaScriptNetworkTransportWrapper<T> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    JavaScriptNetworkTransport(ContextType ctx) : JavaScriptNetworkTransportWrapper<T>(ctx)  {
        m_ctx = ctx;

        realm_constructor = Value::validated_to_object(m_ctx, Object::get_global(m_ctx, "Realm"));
        network_transport = Object::get_property(m_ctx, realm_constructor, "_networkTransport");
    };

    void send_request_to_server(const app::Request request, std::function<void(const app::Response)> completion_callback) override {
        // Create a response handler
        ObjectType response_handler = ResponseHandlerClass<T>::create_instance(m_ctx, std::move(completion_callback));

        // Create a JavaScript version of the request
        ObjectType request_object = Object::create_empty(m_ctx);
        Object::set_property(m_ctx, request_object, "method", Value::from_string(m_ctx, fromHttpMethod(request.method)));
        Object::set_property(m_ctx, request_object, "url", Value::from_string(m_ctx, request.url));
        Object::set_property(m_ctx, request_object, "timeoutMs", Value::from_number(m_ctx, request.timeout_ms));
        Object::set_property(m_ctx, request_object, "body", Value::from_string(m_ctx, request.body));
        ObjectType headers_object = Object::create_empty(m_ctx);
        for (auto header : request.headers) {
            Object::set_property(m_ctx, headers_object, header.first, Value::from_string(m_ctx, header.second));
        }
        Object::set_property(m_ctx, request_object, "headers", headers_object);

        ValueType arguments[] = {
            request_object,
            response_handler,
        };

        Object::call_method(m_ctx, Value::to_object(m_ctx, network_transport), "fetchWithCallbacks", 2, arguments);
    }

private:
    ContextType m_ctx;
    ObjectType realm_constructor;
    ValueType network_transport;

    std::string static fromHttpMethod(app::HttpMethod method) {
        switch (method) {
            case app::HttpMethod::get:   return "GET";
            case app::HttpMethod::put:   return "PUT";
            case app::HttpMethod::post:  return "POST";
            case app::HttpMethod::del:   return "DEL";
            case app::HttpMethod::patch: return "PATCH";
        }
    }
};

}
}
