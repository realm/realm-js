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

#ifndef REALM_THREAD_ID_HPP
#define REALM_THREAD_ID_HPP

#include <realm/util/features.h>

#include <atomic>

#if __has_feature(tls) || __has_feature(cxx_thread_local)
#define REALM_HAS_THREAD_LOCAL 1
#else
#define REALM_HAS_THREAD_LOCAL 0
#include <pthread.h>
#endif

namespace realm {

using thread_id_t = std::size_t;

namespace _impl {

#if !REALM_HAS_THREAD_LOCAL
template<typename T>
class ThreadLocal {
  public:
    ThreadLocal() : m_initial_value() {
        init_key();
    }
    ThreadLocal(const T &value) : m_initial_value(value) {
        init_key();
    }
    ~ThreadLocal() {
        pthread_key_delete(m_key);
    }

    operator T&() {
        void* ptr = pthread_getspecific(m_key);
        if (!ptr) {
            ptr = new T(m_initial_value);
            pthread_setspecific(m_key, ptr);
        }
        return *static_cast<T*>(ptr);
    }
    T& operator=(const T &value) {
        T& value_ref = operator T&();
        value_ref = value;
        return value_ref;
    }

  private:
    T m_initial_value;
    pthread_key_t m_key;

    void init_key() {
        pthread_key_create(&m_key, [](void* ptr) {
            delete static_cast<T*>(ptr);
        });
    }
};
#endif

} // namespace _impl

namespace util {

// Since std::thread::id may be reused after a thread is destroyed, we use
// an atomically incremented, thread-local identifier instead.
inline thread_id_t get_thread_id() {
    static std::atomic<thread_id_t> id_counter;

#if REALM_HAS_THREAD_LOCAL
    static REALM_THREAD_LOCAL thread_id_t thread_id = 0;
#else
    static _impl::ThreadLocal<thread_id_t> thread_id = 0;
#endif

    if (REALM_UNLIKELY(!thread_id)) {
        thread_id = ++id_counter;
    }

    return thread_id;
}

} // namespace util
} // namespace realm

#endif // REALM_THREAD_ID_HPP
