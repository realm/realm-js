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

#include <uv.h>

#include "shared_realm.hpp"

// Include the whole implementation of the "android" version.
#include "impl/android/weak_realm_notifier.cpp"

namespace realm {
namespace node {

static uv_async_t* create_handler() {
    // This assumes that only one thread matters: the main thread (default loop).
    uv_async_t *handle = new uv_async_t;

    uv_async_init(uv_default_loop(), handle, [](uv_async_t* handle) {
        auto realm_weak_ptr = static_cast<WeakRealm*>(handle->data);
        auto realm = realm_weak_ptr->lock();
        delete realm_weak_ptr;

        if (realm) {
            realm->notify();
        }
    });

    return handle;
}

static void notify_handler(uv_async_t* handle, void* realm_ptr) {
    handle->data = realm_ptr;
    uv_async_send(handle);
}

static void destroy_handler(uv_async_t* handle) {
    uv_close((uv_handle_t*)handle, [](uv_handle_t* handle) {
        delete handle;
    });
}

__attribute__((constructor))
static void init_handlers() {
    _impl::create_handler_for_current_thread = (_impl::create_handler_function)create_handler;
    _impl::notify_handler = (_impl::notify_handler_function)notify_handler;
    _impl::destroy_handler = (_impl::destroy_handler_function)destroy_handler;
}

} // node
} // realm
