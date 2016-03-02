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

#pragma once

#include "json.hpp"
#include <JavaScriptCore/JSBase.h>

namespace realm {
    class ObjectSchema;
}

namespace realm_js {

using json = nlohmann::json;
using RPCObjectID = u_int64_t;
using RPCRequest = std::function<json(const json)>;

class RPCServer {
  public:
    RPCServer();
    ~RPCServer();
    json perform_request(std::string name, json &args);

  private:
    JSGlobalContextRef m_context;
    std::map<std::string, RPCRequest> m_requests;
    std::map<RPCObjectID, JSObjectRef> m_objects;
    RPCObjectID m_session_id;

    RPCObjectID store_object(JSObjectRef object);

    json serialize_json_value(JSValueRef value);
    JSValueRef deserialize_json_value(const json dict);

    json serialize_object_schema(const realm::ObjectSchema &objectSchema);
};

}

