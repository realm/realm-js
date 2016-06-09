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

namespace realm {

using thread_id_t = std::size_t;

namespace util {

// Since std::thread::id may be reused after a thread is destroyed, we use
// an atomically incremented, thread-local identifier instead.
inline thread_id_t get_thread_id() {
    static std::atomic<thread_id_t> id_counter;
    static REALM_THREAD_LOCAL thread_id_t thread_id = 0;

    if (REALM_UNLIKELY(!thread_id)) {
        thread_id = ++id_counter;
    }

    return thread_id;
}

} // namespace util
} // namespace realm

#endif // REALM_THREAD_ID_HPP
