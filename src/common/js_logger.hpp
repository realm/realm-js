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
#include "sync/sync_manager.hpp"

#if REALM_ANDROID
    #include <android/log.h>
#endif



namespace realm {
namespace common {

using logger_fn = std::function<void(std::string, std::string)>;
using log_level = realm::util::Logger::Level;
using log_entry = std::pair<std::string, std::string>;

class Logger: public realm::util::RootLogger {
public:
    void delegate(logger_fn&& delegate){

        m_scheduler->set_notify_callback([this, delegate = std::move(delegate)] { 

            std::lock_guard<std::mutex> lock(m_mutex); 
            while (!m_log_queue.empty()) {
                auto entry = m_log_queue.front();

                delegate(entry.first, entry.second);  
                m_log_queue.pop();
            }
        });
    }
   
protected:
    void do_log(log_level level, std::string message){

        std::lock_guard<std::mutex> lock(m_mutex); 
        auto log_entry = std::make_pair(map_level[level], message);
        m_log_queue.push(log_entry);

        #if REALM_ANDROID
        auto android_log_level = map_android_log_level[level]; 
        __android_log_print(android_log_level, 
                    "realm",
                    "%s",
                    log_entry.second.c_str());
        #endif

        m_scheduler->notify();
    }

private:
    std::queue<log_entry> m_log_queue;
    logger_fn loggerDelegate;
    std::shared_ptr<realm::util::Scheduler> m_scheduler = realm::util::Scheduler::make_default();
    std::mutex m_mutex;

    /*
       Log levels available.
       More info on (realm-core) realm/util/logger.hpp
    
       [ all, trace, debug, detail, info, warn, error, fatal, off ]
    */

    std::map <log_level, std::string> map_level {
        { log_level::all, "all"},
        { log_level::info, "info"},
        { log_level::trace, "trace"},
        { log_level::debug, "debug"},
        { log_level::detail, "detail"},
        { log_level::warn, "warn"},
        { log_level::error, "error"},
        { log_level::fatal, "fatal"},
        { log_level::off,   "off"},
    };


    #if REALM_ANDROID
    std::map <log_level, android_LogPriority> map_android_log_level {
        { log_level::all, ANDROID_LOG_VERBOSE},
        { log_level::info, ANDROID_LOG_INFO},
        { log_level::trace, ANDROID_LOG_DEFAULT},
        { log_level::debug, ANDROID_LOG_DEBUG},
        { log_level::detail, ANDROID_LOG_VERBOSE},
        { log_level::warn, ANDROID_LOG_WARN},
        { log_level::error, ANDROID_LOG_ERROR},
        { log_level::fatal, ANDROID_LOG_FATAL},
        { log_level::off,   ANDROID_LOG_SILENT},
    };
    #endif
};

class JSLoggerFactory: public realm::SyncLoggerFactory {
    public:

        void logs(logger_fn&& _logs_fn){
            logs_fn = _logs_fn;
        }

    std::unique_ptr<realm::util::Logger> make_logger(realm::util::Logger::Level level)
        {
            auto logger = std::make_unique<Logger>();
            logger->set_level_threshold(level);
            logger->delegate(std::move(logs_fn));

            return std::unique_ptr<realm::util::Logger>(logger.release());
        }

    private:
        logger_fn logs_fn;
};


} // namespace js
} // namespace realm
