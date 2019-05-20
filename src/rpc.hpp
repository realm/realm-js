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

#include <functional>
#include <future>
#include <thread>

#include "concurrent_deque.hpp"
#include "json.hpp"
#include "jsc/jsc_types.hpp"
#include "jsc/jsc_protected.hpp"

namespace realm {

class ObjectSchema;

namespace rpc {

using json = nlohmann::json;

using RPCObjectID = u_int64_t;
using RPCRequest = std::function<json(const json)>;

class RPCWorker {
  public:
    RPCWorker();
    ~RPCWorker();

    template<typename Fn>
    json add_task(Fn&&);
    void invoke_callback(json);
    json resolve_callback(json args);
    std::future<json> add_promise();

    bool try_run_task();
    void stop();
    json try_pop_callback();
    bool should_stop();

  private:
    bool m_stop = false;
    int m_depth = 0;
#if __APPLE__
    std::thread m_thread;
    CFRunLoopRef m_loop;
#endif
    ConcurrentDeque<std::function<void()>> m_tasks;
    ConcurrentDeque<std::promise<json>> m_promises;
    ConcurrentDeque<json> m_callbacks;
};

class RPCServer {
  public:
    RPCServer();
    ~RPCServer();
    json perform_request(std::string const& name, json&& args);
    bool try_run_task();


  private:
    JSGlobalContextRef m_context;
    std::mutex m_request_mutex;
    std::map<std::string, RPCRequest> m_requests;
    std::map<RPCObjectID, js::Protected<JSObjectRef>> m_objects;
    std::map<RPCObjectID, js::Protected<JSObjectRef>> m_callbacks;
    // The key here is the same as the value in m_callbacks. We use the raw pointer as a key here,
    // because protecting the value in m_callbacks pins the function object and prevents it from being moved
    // by the garbage collector upon compaction.
    std::map<JSObjectRef, RPCObjectID> m_callback_ids;
    RPCObjectID m_session_id;
    RPCWorker m_worker;
    u_int64_t m_callback_call_counter;
    uint64_t m_reset_counter = 0;

    std::mutex m_pending_callbacks_mutex;
    std::map<std::pair<uint64_t, uint64_t>, std::promise<json>> m_pending_callbacks;

    static JSValueRef run_callback(JSContextRef, JSObjectRef, JSObjectRef, size_t, const JSValueRef[], JSValueRef *exception);

    RPCObjectID store_object(JSObjectRef object);
    JSObjectRef get_object(RPCObjectID) const;
    JSObjectRef get_realm_constructor() const;

    json serialize_json_value(JSValueRef value);
    JSValueRef deserialize_json_value(const json dict);
};

} // rpc
} // realm
