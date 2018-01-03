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
#include <exception>
#include <mutex>

namespace realm {

class ConcurrentDequeTimeout : public std::exception {
  public:
    ConcurrentDequeTimeout() : std::exception() {}
};

template <typename T>
class ConcurrentDeque {
  public:
    T pop_front(size_t timeout = 0) {
        std::unique_lock<std::mutex> lock(m_mutex);
        while (m_deque.empty()) {
            wait(lock, timeout);
        }
        T item = std::move(m_deque.front());
        m_deque.pop_front();
        return item;
    }

    T pop_back(size_t timeout = 0) {
        std::unique_lock<std::mutex> lock(m_mutex);
        while (m_deque.empty()) {
            wait(lock, timeout);
        }
        T item = std::move(m_deque.back());
        m_deque.pop_back();
        return item;
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
        std::lock_guard<std::mutex> lock(m_mutex);
        return m_deque.empty();
    }

    void wait(std::unique_lock<std::mutex> &lock, size_t timeout = 0) {
        if (!timeout) {
            m_condition.wait(lock);
        }
        else if (m_condition.wait_for(lock, std::chrono::milliseconds(timeout)) == std::cv_status::timeout) {
            throw ConcurrentDequeTimeout();
        }
    }

  private:
    std::condition_variable m_condition;
    std::mutex m_mutex;
    std::deque<T> m_deque;
};

} // realm
