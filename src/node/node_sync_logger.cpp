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

#include <utility>
#include <stdexcept>
#include <mutex>

#include "node_init.hpp"
#include "node_class.hpp"
#include "js_realm.hpp"
#include "node_types.hpp"
#include "node_sync_logger.hpp"

namespace realm {
namespace node {

SyncLoggerQueue::~SyncLoggerQueue() noexcept
{
    m_callback_this_object.Reset();
    m_callback.Reset();
}

void SyncLoggerQueue::log_uv_callback()
{
    // This function is always executed by the Node.js event loop
    // thread.
    Nan::HandleScope scope;
    v8::Local<v8::Object> this_object = Nan::New(m_callback_this_object);
    v8::Local<v8::Function> callback = Nan::New(m_callback);

    std::queue<SyncLoggerMessage> popped;
    {
        std::lock_guard<std::mutex> lock(m_mutex); // Throws
        popped.swap(m_log_queue);
    }

    for (;;) {
        if (popped.empty())
            break;

        Nan::TryCatch trycatch;
        v8::Local<v8::Value> argv[] = {
            Nan::New((int)(popped.front().m_level)),
            Nan::New(popped.front().m_message).ToLocalChecked()
        };
        Nan::MakeCallback(this_object, callback, 2, argv);
        if (trycatch.HasCaught()) {
            throw node::Exception(m_v8_isolate, trycatch.Exception());
        }
        popped.pop();
    }
}

void SyncLogger::do_log(realm::util::Logger::Level level, std::string message)
{
    std::lock_guard<std::mutex> lock(m_mutex); // Throws
    m_log_queue.emplace(level, message);
    m_log_uv_async.send();
}

SyncLoggerFactory::~SyncLoggerFactory() noexcept
{
    m_callback_this_object.Reset();
    m_callback.Reset();
}

std::unique_ptr<util::Logger> SyncLoggerFactory::make_logger(util::Logger::Level level)
{
    v8::Local<v8::Object> this_object = Nan::New(m_callback_this_object);
    v8::Local<v8::Function> callback = Nan::New(m_callback);

    SyncLogger *logger = new SyncLogger(m_v8_isolate, this_object, callback); // Throws
    logger->set_level_threshold(level);

    return std::unique_ptr<util::Logger>(logger);
}

} // namespace node
} // namespace realm
