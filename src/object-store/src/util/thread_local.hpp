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

#ifndef REALM_THREAD_LOCAL_HPP
#define REALM_THREAD_LOCAL_HPP

#include <realm/util/features.h>

#if (!defined(__clang__) || REALM_HAVE_CLANG_FEATURE(tls) || REALM_HAVE_CLANG_FEATURE(cxx_thread_local)) && \
    (!REALM_PLATFORM_APPLE || __IPHONE_OS_VERSION_MIN_REQUIRED >= 80000 || MAC_OS_X_VERSION_MIN_REQUIRED >= 1070)

#define REALM_THREAD_LOCAL_TYPE(type) REALM_THREAD_LOCAL type

#else

#define REALM_THREAD_LOCAL_TYPE(type) realm::_impl::ThreadLocal<type>

#include <pthread.h>

namespace realm {
namespace _impl {

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

} // namespace _impl
} // namespace realm

#endif
#endif // REALM_THREAD_LOCAL_HPP
