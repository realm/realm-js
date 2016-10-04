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

#ifndef REALM_NODE_GLOBAL_LOGGER_HPP
#define REALM_NODE_GLOBAL_LOGGER_HPP

#include <string>
#include <set>
#include <queue>

#include <nan.h>

#include "node_uv_async.hpp"

namespace realm {
namespace node {

    struct SyncLoggerMessage {
        std::string m_message;
        realm::util::Logger::Level m_level;
        SyncLoggerMessage(realm::util::Logger::Level level, std::string message):
            m_message(message),
            m_level(level) { }
    };

    class SyncLoggerQueue {
    public:
        SyncLoggerQueue(v8::Isolate* v8_isolate, v8::Local<v8::Object> callback_this_object, v8::Local<v8::Function> callback) :
            m_log_uv_async([this] { log_uv_callback(); }), // Throws
            m_v8_isolate(v8_isolate),
            m_callback_this_object(callback_this_object),
            m_callback(callback) { }
        ~SyncLoggerQueue() noexcept;

    protected:
        void log_uv_callback();
        std::queue<SyncLoggerMessage> m_log_queue;
        std::mutex m_mutex;
        UvAsync m_log_uv_async;

    private:
        v8::Isolate* m_v8_isolate;
        Nan::Persistent<v8::Object> m_callback_this_object;
        Nan::Persistent<v8::Function> m_callback;
    };

    class SyncLogger: public realm::util::RootLogger, public SyncLoggerQueue {
    public:
        SyncLogger(v8::Isolate* v8_isolate, v8::Local<v8::Object> callback_this_object, v8::Local<v8::Function> callback) :
            SyncLoggerQueue(v8_isolate, callback_this_object, callback) { }

    protected:
        void do_log(realm::util::Logger::Level, std::string) override final;
    };

    class SyncLoggerFactory : public realm::SyncLoggerFactory {
    public:
        SyncLoggerFactory(v8::Isolate* v8_isolate, v8::Local<v8::Object> callback_this_object, v8::Local<v8::Function> callback) :
            m_v8_isolate(v8_isolate),
            m_callback_this_object(callback_this_object),
            m_callback(callback) { }
        ~SyncLoggerFactory() noexcept;

        virtual std::unique_ptr<util::Logger> make_logger(util::Logger::Level level);
    private:
        v8::Isolate* m_v8_isolate;
        Nan::Persistent<v8::Object> m_callback_this_object;
        Nan::Persistent<v8::Function> m_callback;
    };

} // namespace node
} // namespace realm

#endif // REALM_NODE_GLOBAL_LOGGER_HPP
