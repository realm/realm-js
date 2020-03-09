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

namespace realm {
namespace js {

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
        static const String response_status_code = "statusCode";
        static const String response_headers = "headers";
        static const String response_body = "body";

        // Create a JavaScript version of the request
        ObjectType request_object = Object::create_empty(m_ctx);
        Object::set_property(m_ctx, request_object, "method", node::Value::from_string(m_ctx, fromHttpMethod(request.method)));
        Object::set_property(m_ctx, request_object, "url", node::Value::from_string(m_ctx, request.url));
        Object::set_property(m_ctx, request_object, "timeoutMs", Value::from_number(m_ctx, request.timeout_ms));
        Object::set_property(m_ctx, request_object, "body", Value::from_string(m_ctx, request.body));
        ObjectType headers_object = Object::create_empty(m_ctx);
        for (auto header : request.headers) {
            Object::set_property(m_ctx, headers_object, header.first, Value::from_string(m_ctx, header.second));
        }
        Object::set_property(m_ctx, request_object, "headers", headers_object);

        ValueType arguments[] = {
            request_object
        };
        ObjectType response_object = Value::validated_to_object(m_ctx, Object::call_method(m_ctx, Value::to_object(m_ctx, network_transport), "fetchSync", 1, arguments));

        app::Response response;

        // Copy the response from JavaScript to an Obejct Store object
        int http_status_code;
        int custom_status_code = 0;
        std::map<std::string, std::string> headers;
        std::string body;

        ValueType status_code_value = Object::get_property(m_ctx, response_object, response_status_code);
        if (!Value::is_undefined(m_ctx, status_code_value))
        {
            http_status_code = static_cast<int>(Value::validated_to_number(m_ctx, status_code_value));
        }

        ValueType headers_value = Object::get_property(m_ctx, response_object, response_headers);
        if (!Value::is_undefined(m_ctx, headers_value))
        {
            ObjectType headers_object = Value::validated_to_object(m_ctx, headers_value);
            for (auto key : Object::get_property_names(m_ctx, headers_object))
            {
                ValueType value = Object::get_property(m_ctx, headers_object, key);
                std::string value_as_string = Value::validated_to_string(m_ctx, value);
                headers.insert(std::pair<std::string, std::string>(key, value_as_string));
            }
        }

        ValueType body_value = Object::get_property(m_ctx, response_object, response_body);
        if (!Value::is_undefined(m_ctx, body_value)) {
            body = Value::validated_to_string(m_ctx, body_value);
        }

        completion_callback(app::Response{http_status_code, custom_status_code, headers, body});
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