/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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

