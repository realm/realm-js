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
#include <iostream>
#include <memory>
#include <queue>

#include <realm/util/logger.hpp>
#include <realm/object-store/sync/sync_manager.hpp> // SyncLoggerFactory
#include <realm/object-store/util/scheduler.hpp>    // realm::util::Scheduler

#if REALM_ANDROID
#include <android/log.h>
#endif

namespace realm {
namespace common {
namespace logger {

using LoggerLevel = realm::util::Logger::Level;

// TODO we are coupling core with JS Land here, change to string.
using Entry = std::pair<LoggerLevel, std::string>;
using Delegated = std::function<void(int, std::string)>;

/*
 * The idea here is to one day implement a functionality to delegate the logs
 * to the mobile OS, for that we got two specialized behaviour that we can
 * inject at compile time or at runtime.
 *
 */

#if REALM_ANDROID
class AndroidLogger {
    std::map<LoggerLevel, android_LogPriority> map_android_log_level{
        {LoggerLevel::all, ANDROID_LOG_VERBOSE},    {LoggerLevel::info, ANDROID_LOG_INFO},
        {LoggerLevel::trace, ANDROID_LOG_DEFAULT},  {LoggerLevel::debug, ANDROID_LOG_DEBUG},
        {LoggerLevel::detail, ANDROID_LOG_VERBOSE}, {LoggerLevel::warn, ANDROID_LOG_WARN},
        {LoggerLevel::error, ANDROID_LOG_ERROR},    {LoggerLevel::fatal, ANDROID_LOG_FATAL},
        {LoggerLevel::off, ANDROID_LOG_SILENT},
    };

    void print(Entry& entry)
    {
        auto android_log_level = map_android_log_level[entry.first];
        __android_log_print(android_log_level, "realm", "%s", entry.second.c_str());
    }
};
#endif

#ifdef __APPLE__
class IOSLogger {
    void print() {}
};
#endif

class SyncLoggerDelegator : public util::Logger {
public:
    SyncLoggerDelegator() = delete;
    SyncLoggerDelegator(Delegated&& delegate)
        : loggerDelegate(delegate){};

    void delegate() {}

protected:
    void do_log(LoggerLevel level, const std::string& message)
    {
        std::lock_guard<std::mutex> lock(m_mutex);

        // TODO we are coupling core with JS here, change to string use hashmap
        // map_level.
        auto entry = std::make_pair(level, message);

        m_log_queue.push(entry);
        m_scheduler->invoke([this] {
            std::queue<Entry> popped;
            {
                std::lock_guard<std::mutex> lock(m_mutex); // Throws
                popped.swap(m_log_queue);
            }

            while (!popped.empty()) {
                Entry& entry = popped.front();
                loggerDelegate(static_cast<int>(entry.first), entry.second);
                popped.pop();
            }
        });
    }

private:
    std::queue<Entry> m_log_queue;
    std::shared_ptr<util::Scheduler> m_scheduler = util::Scheduler::make_default();
    std::mutex m_mutex;
    Delegated loggerDelegate;
};

class Logger {
private:
    // Warning: If this grows to big (for example: another method) we should
    // make this class non-static.
    /*
       Log levels available.
       More info in (realm-core) realm/util/logger.hpp

       [ all, trace, debug, detail, info, warn, error, fatal, off ]
    */
    const static inline std::map<LoggerLevel, std::string> map_level = {
        {LoggerLevel::all, "all"},     {LoggerLevel::info, "info"},     {LoggerLevel::trace, "trace"},
        {LoggerLevel::debug, "debug"}, {LoggerLevel::detail, "detail"}, {LoggerLevel::warn, "warn"},
        {LoggerLevel::error, "error"}, {LoggerLevel::fatal, "fatal"},   {LoggerLevel::off, "off"},
    };

public:
    static LoggerLevel get_level(const std::string level)
    {
        for (auto const& [key, value] : Logger::map_level) {
            if (value == level)
                return key;
        }

        throw std::runtime_error("Bad log level");
    }

    static SyncClientConfig::LoggerFactory build_sync_logger(Delegated&& log_fn)
    {
        return [captured_logger = std::move(log_fn)](realm::util::Logger::Level level) mutable {
            auto logger = std::make_unique<SyncLoggerDelegator>(std::move(captured_logger));
            logger->set_level_threshold(level);
            logger->delegate();
            return logger;
        };
    }
};

} // namespace logger
} // namespace common
} // namespace realm
