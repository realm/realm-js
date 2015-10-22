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

#pragma once

#import "json.hpp"
#import <JavaScriptCore/JavaScriptCore.h>

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
    json perform_request(const std::string &name, const json args);

  private:
    JSGlobalContextRef _context;
    std::map<std::string, RPCRequest> _requests;
    std::map<RPCObjectID, JSObjectRef> _objects;
    RPCObjectID _sessionID;

    RPCObjectID store_object(JSObjectRef object);

    json serialize_json_value(JSValueRef value);
    JSValueRef deserialize_json_value(const json dict);

    json serialize_object_schema(realm::ObjectSchema &objectSchema);
};

}

