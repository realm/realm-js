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

#include "realm/object-store/sync/generic_network_transport.hpp"
#include "js_types.hpp"
#include "js_network_transport.hpp"
#include <string>

namespace realm {
namespace rpc {

/*
struct RPCFetchRef {
    static JSValueRef value;
};
*/

/**
 * Provides an implementation of GenericNetworkTransport for use when the library is loaded in a runtime which doesn't provide the APIs required to perform network requests directly.
 * Instead it uses the RPC server to ask the RPC client to perform network requests on its behalf.
 */
struct RPCNetworkTransport : public app::GenericNetworkTransport {
    using T = jsc::Types;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Function = js::Function<T>;

    using SendRequestHandler = void(ContextType m_ctx, const app::Request request, std::function<void(const app::Response)> completion_callback);
    
    static inline js::Protected<FunctionType> fetch_function;

    RPCNetworkTransport(ContextType ctx) : m_ctx(ctx) {}

    void send_request_to_server(const app::Request request, std::function<void(const app::Response)> completion_callback) override {
        // Build up a JS request object
        auto request_object = js::JavaScriptNetworkTransport<T>::makeRequest(m_ctx, request);
        // Ask the RPC layer to enqueue a call to the client-side fetch function
        Function::call(m_ctx, fetch_function, nullptr, {
            request_object,
            js::ResponseHandlerClass<T>::create_instance(m_ctx, std::move(completion_callback)),
        });
    }

private:
    ContextType m_ctx;
};

}
}
