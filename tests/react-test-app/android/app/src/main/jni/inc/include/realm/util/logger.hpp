/*************************************************************************
 *
 * REALM CONFIDENTIAL
 * __________________
 *
 *  [2011] - [2013] Realm Inc
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Realm Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Realm Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Realm Incorporated.
 *
 **************************************************************************/
#ifndef REALM_UTIL_LOGGER_HPP
#define REALM_UTIL_LOGGER_HPP

#include <string>
#include <sstream>
#include <iostream>

#include <realm/util/features.h>
#include <realm/util/tuple.hpp>
#include <realm/util/thread.hpp>

namespace realm {
namespace util {


/// Examples:
///
///    logger.log("Overlong message from master coordinator");
///    logger.log("Listening for peers on %1:%2", listen_address, listen_port);
class Logger {
public:
    template<class... Params>
    void log(const char* message, Params... params)
    {
        State state(message);
        log_impl(state, params...);
    }

    virtual ~Logger() {}

protected:
    virtual void do_log(const std::string& message)
    {
        std::cerr << message << '\n' << std::flush;
    }

    static void do_log(Logger* logger, const std::string& message)
    {
        logger->do_log(message);
    }

private:
    struct State {
        std::string m_message;
        std::string m_search;
        int m_param_num = 1;
        std::ostringstream m_formatter;
        State(const char* s):
            m_message(s),
            m_search(m_message)
        {
        }
    };

    template<class T>
    struct Subst {
        void operator()(const T& param, State* state)
        {
            state->m_formatter << "%" << state->m_param_num;
            std::string key = state->m_formatter.str();
            state->m_formatter.str(std::string());
            std::string::size_type j = state->m_search.find(key);
            if (j != std::string::npos) {
                state->m_formatter << param;
                std::string str = state->m_formatter.str();
                state->m_formatter.str(std::string());
                state->m_message.replace(j, key.size(), str);
                state->m_search.replace(j, key.size(), std::string(str.size(), '\0'));
            }
            ++state->m_param_num;
        }
    };

    void log_impl(State& state)
    {
        do_log(state.m_message);
    }

    template<class Param, class... Params>
    void log_impl(State& state, const Param& param, Params... params)
    {
        Subst<Param>()(param, &state);
        log_impl(state, params...);
    }
};



/// this makes all the log() methods are thread-safe.
class ThreadSafeLogger: public Logger {
public:
    ThreadSafeLogger(Logger& base_logger):
        m_base_logger(&base_logger)
    {
    }

protected:
    Logger* const m_base_logger;
    Mutex m_mutex;

    void do_log(const std::string& msg) override
    {
        LockGuard l(m_mutex);
        Logger::do_log(m_base_logger, msg);
    }
};



class PrefixLogger: public Logger {
public:
    PrefixLogger(std::string prefix, Logger& base_logger):
        m_prefix(prefix), m_base_logger(&base_logger)
    {
    }

protected:
    const std::string m_prefix;
    Logger* const m_base_logger;

    void do_log(const std::string& msg) override
    {
        Logger::do_log(m_base_logger, m_prefix + msg);
    }
};


} // namespace util
} // namespace realm

#endif // REALM_UTIL_LOGGER_HPP
