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

#include "sync_logger.hpp"

#include "util/event_loop_signal.hpp"

#include <realm/util/logger.hpp>

#include <mutex>
#include <stdexcept>
#include <string>
#include <utility>
#include <set>
#include <queue>

using namespace realm;
using namespace realm::node;

namespace {
struct SyncLoggerMessage {
    std::string m_message;
    realm::util::Logger::Level m_level;
};

class SyncLoggerQueue {
public:
    SyncLoggerQueue(v8::Isolate* v8_isolate, v8::Local<v8::Function> callback)
        : m_log_uv_async([this] { log_uv_callback(); }) // Throws
        , m_v8_isolate(v8_isolate)
        , m_callback(v8_isolate, callback)
    {
    }

protected:
    void log_uv_callback();
    std::queue<SyncLoggerMessage> m_log_queue;
    std::mutex m_mutex;
    EventLoopSignal<std::function<void()>> m_log_uv_async;

private:
    v8::Isolate* m_v8_isolate;
    v8::Persistent<v8::Function> m_callback;
};

class SyncLogger : public realm::util::RootLogger, public SyncLoggerQueue {
public:
    SyncLogger(v8::Isolate* v8_isolate, v8::Local<v8::Function> callback)
        : SyncLoggerQueue(v8_isolate, callback)
    {
    }

protected:
    void do_log(realm::util::Logger::Level, std::string) override final;
};

void SyncLoggerQueue::log_uv_callback()
{
    // This function is always executed by the Node.js event loop
    // thread.
    v8::HandleScope scope(m_v8_isolate);
    v8::Local<v8::Function> callback = v8::Local<v8::Function>::New(m_v8_isolate, m_callback);

    std::queue<SyncLoggerMessage> popped;
    {
        std::lock_guard<std::mutex> lock(m_mutex); // Throws
        popped.swap(m_log_queue);
    }

    while (!popped.empty()) {
        v8::Local<v8::Value> argv[] = {v8::Integer::New(m_v8_isolate, static_cast<int>(popped.front().m_level)),
                                       v8::String::NewFromUtf8(m_v8_isolate, popped.front().m_message.c_str())};

        callback->Call(m_v8_isolate->GetCurrentContext(), v8::Null(m_v8_isolate), 2, argv);

        popped.pop();
    }
}

void SyncLogger::do_log(realm::util::Logger::Level level, std::string message)
{
    std::lock_guard<std::mutex> lock(m_mutex); // Throws
    m_log_queue.push({std::move(message), level});
    m_log_uv_async.notify();
}

} // anonymous namespace

std::unique_ptr<util::Logger> realm::node::SyncLoggerFactory::make_logger(util::Logger::Level level)
{
    v8::Local<v8::Function> callback = v8::Local<v8::Function>::New(m_v8_isolate, m_callback);

    auto logger = std::make_unique<SyncLogger>(m_v8_isolate, callback); // Throws
    logger->set_level_threshold(level);
    return std::unique_ptr<util::Logger>(logger.release());
}
