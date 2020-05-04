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

#include "util/scheduler.hpp"

#include <realm/util/logger.hpp>

#include <mutex>
#include <queue>
#include <stdexcept>
#include <string>
#include <utility>

using namespace realm;
using namespace realm::node;

namespace {
struct SyncLoggerMessage {
    std::string m_message;
    realm::util::Logger::Level m_level;
};

class SyncLoggerQueue {
public:
    SyncLoggerQueue(Napi::Env env, Napi::Function callback)
    : m_env(env), m_callback(Napi::Persistent(callback))
    {
        m_scheduler->set_notify_callback([this] { log_uv_callback(); });
    }

protected:
    void log_uv_callback();
    std::queue<SyncLoggerMessage> m_log_queue;
    std::mutex m_mutex;
    std::shared_ptr<util::Scheduler> m_scheduler = util::Scheduler::make_default();

private:
    Napi::Env m_env;
    Napi::FunctionReference m_callback;
};

class SyncLogger : public realm::util::RootLogger, public SyncLoggerQueue {
public:
    SyncLogger(Napi::Env env, Napi::Function callback)
        : SyncLoggerQueue(env, callback)
    {
    }

protected:
    void do_log(realm::util::Logger::Level, std::string) override final;
};

void SyncLoggerQueue::log_uv_callback()
{
    // This function is always executed by the Node.js event loop thread.
    Napi::HandleScope scope(m_env);

    std::queue<SyncLoggerMessage> popped;
    {
        std::lock_guard<std::mutex> lock(m_mutex); // Throws
        popped.swap(m_log_queue);
    }

    while (!popped.empty()) {
        m_callback.Call(m_env.Null(),
            {
                Napi::Number::New(m_env, static_cast<int>(popped.front().m_level)),
                Napi::String::New(m_env, popped.front().m_message.c_str())
            }
        );

        popped.pop();
    }
}

void SyncLogger::do_log(realm::util::Logger::Level level, std::string message)
{
    std::lock_guard<std::mutex> lock(m_mutex); // Throws
    m_log_queue.push({std::move(message), level});
    m_scheduler->notify();
}

} // anonymous namespace

std::unique_ptr<util::Logger> realm::node::SyncLoggerFactory::make_logger(util::Logger::Level level)
{
    Napi::HandleScope scope(m_env);
    Napi::Function callback = m_callback.Value();

    auto logger = std::make_unique<SyncLogger>(m_env, callback); // Throws
    logger->set_level_threshold(level);
    return std::unique_ptr<util::Logger>(logger.release());
}
