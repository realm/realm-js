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

#ifndef REALM_NODE_UV_ASYNC_HPP
#define REALM_NODE_UV_ASYNC_HPP

#include <functional>
#include <memory>
#include <utility>
#include <stdexcept>

#include <uv.h>

namespace realm {
namespace node {

// Must be created and destroyed by the thread that is associated with the
// specified libuv event loop.
class UvAsync {
public:
    UvAsync(std::function<void()> func, uv_loop_t* = uv_default_loop());
    ~UvAsync() noexcept;

    /// Schedule the associated callback function to be executed by the
    /// associated libuv event loop. May be called by any thread.
    void send();

private:
    struct Rep;

    Rep* m_rep;

    static void exec(uv_async_t* handle) noexcept;
    static void close(uv_handle_t* handle) noexcept;
};




// implementation

struct UvAsync::Rep {
    uv_async_t handle;
    std::function<void()> func;
};

inline UvAsync::UvAsync(std::function<void()> func, uv_loop_t* loop)
{
    std::unique_ptr<Rep> rep(new Rep);
    rep->handle.data = &*rep;
    rep->func = std::move(func);
    int ret = uv_async_init(loop, &rep->handle, &UvAsync::exec);
    if (ret < 0)
        throw std::runtime_error("uv_async_init() failed");
    m_rep = rep.release();
}

inline UvAsync::~UvAsync() noexcept
{
    m_rep->func = std::function<void()>();
    uv_close(reinterpret_cast<uv_handle_t*>(&m_rep->handle), &UvAsync::close);
}

inline void UvAsync::send()
{
    int ret = uv_async_send(&m_rep->handle);
    if (ret < 0)
        throw std::runtime_error("uv_async_send() failed");
}

inline void UvAsync::exec(uv_async_t* handle) noexcept
{
    Rep* rep = static_cast<Rep*>(handle->data);
    if (rep->func)
        rep->func(); // Throws

    // FIXME: How to deal with C++ exceptions here?
}

inline void UvAsync::close(uv_handle_t* handle) noexcept
{
    Rep* rep = static_cast<Rep*>(handle->data);
    delete rep;
}

} // namespace node
} // namespace realm

#endif // REALM_NODE_UV_ASYNC_HPP
