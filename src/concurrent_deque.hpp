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

#include <condition_variable>
#include <deque>
#include <mutex>

#include <realm/util/optional.hpp>

namespace realm {

template <typename T>
class ConcurrentDeque {
public:
    T pop_back() {
        std::unique_lock<std::mutex> lock(m_mutex);
        m_condition.wait(lock, [this] { return !m_deque.empty(); });
        return do_pop_back();
    }

    T pop_if(std::function<bool(const T&)> predicate) {
        std::unique_lock<std::mutex> lock(m_mutex);

        for (auto it = m_deque.begin(); it != m_deque.end();) {
            if (predicate(*it)) {
                T item = std::move(*it);
                m_deque.erase(it);
                return item;
            }
            else {
                ++it;
            }
        }

        return nullptr;
    }

    util::Optional<T> try_pop_back(size_t timeout) {
        std::unique_lock<std::mutex> lock(m_mutex);
        m_condition.wait_for(lock, std::chrono::milliseconds(timeout),
                             [this] { return !m_deque.empty(); });
        return m_deque.empty() ? util::none : util::make_optional(do_pop_back());
    }

    void push_front(T&& item) {
        std::unique_lock<std::mutex> lock(m_mutex);
        m_deque.push_front(std::move(item));
        lock.unlock();
        m_condition.notify_one();
    }

    void push_back(T&& item) {
        std::unique_lock<std::mutex> lock(m_mutex);
        m_deque.push_back(std::move(item));
        lock.unlock();
        m_condition.notify_one();
    }

    bool empty() {
        std::lock_guard <std::mutex> lock(m_mutex);
        return m_deque.empty();
    }

private:
    std::condition_variable m_condition;
    std::mutex m_mutex;
    std::deque<T> m_deque;

    T do_pop_back() {
        T item = std::move(m_deque.back());
        m_deque.pop_back();
        return item;
    }
};

} // realm
