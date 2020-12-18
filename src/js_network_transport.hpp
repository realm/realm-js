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
        {"onError", wrap<on_error>},
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

    auto response_handler = get_internal<T, ResponseHandlerClass<T>>(ctx, this_object);
    ObjectType response_object = Value::validated_to_object(ctx, args[0]);

    // Copy the response from JavaScript to an Object Store object
    int http_status_code = 0;
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
    static const String status_code = "statusCode";
    static const String error_message = "errorMessage";
    static const String network_message = "message";
    args.validate_count(1);

    auto response_handler = get_internal<T, ResponseHandlerClass<T>>(ctx, this_object);

    ObjectType error_object = Value::validated_to_object(ctx, args[0]);

    // Copy the error from JavaScript to an Object Store response object
    int http_status_code = 0;
    int custom_status_code = 0;
    std::map<std::string, std::string> headers;
    std::string body = "undefined js network transport error";
    ValueType status_code_object = Object::get_property(ctx, error_object, status_code);
    ValueType message_code_object = Object::get_property(ctx, error_object, error_message);
    ValueType network_message_code_object = Object::get_property(ctx, error_object, network_message);
    // There's two paths to reporting errors respectively:
    // 1) we've found the expected status fields, pass through the http_status_code and the raw body, and let object-store code attempt to parse it
    // 2) set custom_status_code to something non-zero and object-store will propagate the body as is, this will happen if we're dealing with a raw NetworkTransport error
    // we choose 2 for now because it seems to be the most descriptive
    if (!Value::is_undefined(ctx, status_code_object) && !Value::is_undefined(ctx, message_code_object)) {
        http_status_code = static_cast<int>(Value::validated_to_number(ctx, Object::get_property(ctx, error_object, status_code), "statusCode"));
        body = Value::validated_to_string(ctx, Object::get_property(ctx, error_object, error_message), "errorMessage");
    } 
    else if (!Value::is_undefined(ctx, network_message_code_object)) {
        custom_status_code = -1;
        body = Value::validated_to_string(ctx, Object::get_property(ctx, error_object, network_message), "message");
    }
    else { // unexpected, but just pass through the default message
        custom_status_code = -1;
    }

    response_handler->m_completion_callback(app::Response{http_status_code, custom_status_code, headers, body});
}


template<typename T>
struct JavaScriptNetworkTransport : public app::GenericNetworkTransport {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    using NetworkTransportFactory = std::function<std::unique_ptr<app::GenericNetworkTransport>(ContextType)>;
    using SendRequestHandler = void(ContextType m_ctx, const app::Request request, std::function<void(const app::Response)> completion_callback);

	JavaScriptNetworkTransport(ContextType ctx) : m_ctx(ctx),
		m_dispatcher {JavaScriptNetworkTransport::send_request_to_server_impl}
	{
	};

    static ObjectType makeRequest(ContextType ctx, const app::Request& request) {
        ObjectType headers_object = Object::create_empty(ctx);
        for (auto header : request.headers) {
            Object::set_property(ctx, headers_object, header.first, Value::from_string(ctx, header.second));
        }
        auto request_object = Object::create_obj(ctx, {
            {"method", Value::from_string(ctx, fromHttpMethod(request.method))},
            {"url", Value::from_string(ctx, request.url)},
            {"timeoutMs", Value::from_number(ctx, request.timeout_ms)},
            {"headers", headers_object},
        });
        if (!request.body.empty()) {
            Object::set_property(ctx, request_object, "body", Value::from_string(ctx, request.body));
        }
        return request_object;
    }

    void send_request_to_server(const app::Request request, std::function<void(const app::Response)> completion_callback) override {
        m_dispatcher(m_ctx, request, completion_callback);
    }

private:
    ContextType m_ctx;
    realm::util::EventLoopDispatcher<SendRequestHandler> m_dispatcher;

    static void send_request_to_server_impl(ContextType m_ctx, const app::Request request, std::function<void(const app::Response)> completion_callback) {
        HANDLESCOPE(m_ctx);

        ObjectType realm_constructor = Value::validated_to_object(m_ctx, Object::get_global(m_ctx, "Realm"));
        ValueType network_transport = Object::get_property(m_ctx, realm_constructor, "_networkTransport");

        Object::call_method(m_ctx, Value::to_object(m_ctx, network_transport), "fetchWithCallbacks", {
            makeRequest(m_ctx, request),
            ResponseHandlerClass<T>::create_instance(m_ctx, std::move(completion_callback)),
        });
    }

    std::string static fromHttpMethod(app::HttpMethod method) {
        switch (method) {
            case app::HttpMethod::get:   return "GET";
            case app::HttpMethod::put:   return "PUT";
            case app::HttpMethod::post:  return "POST";
            case app::HttpMethod::del:   return "DELETE";
            case app::HttpMethod::patch: return "PATCH";
            default: throw std::runtime_error("Unknown HttpMethod argument");
        }
    }
};

}
}
