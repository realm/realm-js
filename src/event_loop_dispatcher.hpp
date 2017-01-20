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

#include <queue>
#include <tuple>
#include <mutex>

#include "util/event_loop_signal.hpp"

namespace __apply_polyfill {
template <class Tuple, class F, size_t... Is>
constexpr auto apply_impl(Tuple t, F f, std::index_sequence<Is...>) {
    return f(std::get<Is>(t)...);
}

template <class Tuple, class F>
constexpr auto apply(Tuple t, F f) {
    return apply_impl(t, f, std::make_index_sequence<std::tuple_size<Tuple>{}>{});
}
}

namespace realm {
template <class F>
class EventLoopDispatcher;

template <typename... Args>
class EventLoopDispatcher<void(Args...)> {
    using Tuple = std::tuple<typename std::remove_reference<Args>::type...>;
private:
    struct State {
    public:
        State(std::function<void(Args...)> func) : m_func(func) { }
        
        const std::function<void(Args...)> m_func;
        std::queue<Tuple> m_invocations;
        std::mutex m_mutex;
    };
    const std::shared_ptr<State> m_state;
    
    struct Callback {
        std::weak_ptr<State> m_state;
        
    public:
        void operator()()
        {
            if (auto state = m_state.lock()) {
                std::unique_lock<std::mutex> lock(state->m_mutex);
                while (!state->m_invocations.empty()) {
                    auto& tuple = state->m_invocations.front();
                    ::__apply_polyfill::apply(tuple, state->m_func);
                    state->m_invocations.pop();
                }
            }
        }
    };
    const std::shared_ptr<EventLoopSignal<Callback>> m_signal;
    
public:
    EventLoopDispatcher(std::function<void(Args...)> func)
    : m_state(std::make_shared<State>(func))
    , m_signal(std::make_shared<EventLoopSignal<Callback>>(Callback{m_state}))
    {
        
    }
    
    void operator()(Args... args)
    {
        {
            std::unique_lock<std::mutex> lock(m_state->m_mutex);
            m_state->m_invocations.push(std::make_tuple(args...));
        }
        m_signal->notify();
    }
};
}
