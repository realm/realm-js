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

struct JavaScriptNetworkTransport : public app::GenericNetworkTransport {
    // FIXME: constructor

    void send_request_to_sender(const app::Request request, std::function<void(const app::Response)> completion_callback) {
        auto ctx = Object::get_
        m_realm_constructor = js::Value::validated_to_object(isolate, node::Object::get_global(isolate, "Realm"));


        node::Object::call_method(isolate, to_object(isolate, value), "_sendRequstToServer", 0, nullptr);

    }

};

}