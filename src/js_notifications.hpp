////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#include <map>
#include <vector>

#include <realm/object-store/collection_notifications.hpp>

#include "js_types.hpp"

namespace realm::js::notifications {

using IdType = unsigned long long;

template <typename T, typename Token>
class NotificationHandle;

/**
 * @brief A class with static members used to manage ownership of `Token`s returned by the object store
 * notification APIs.
 * This abstraction is needed to enable graceful JS runtime destruction by preventing circular references from objects
 * owning a `Token` owning a lambda that captures `Protected` values of the object itself.
 *
 * @note This exposes a simple `clear` method, which should be called just before the JS runtime is torn down.
 *
 * @tparam T The JS runtime types.
 * @tparam Token The type of tokens stored.
 */
template <typename T, typename Token>
class NotificationBucket {
    using ProtectedFunction = Protected<typename T::Function>;
    using TokensMap = std::map<IdType, std::vector<std::pair<ProtectedFunction, Token>>>;
    using Handle = NotificationHandle<T, Token>;

public:
    static void emplace(Handle& handle, ProtectedFunction&& callback, Token&& token)
    {
        if (handle) {
            auto& s_tokens = get_tokens();
            s_tokens[handle].emplace_back(std::move(callback), std::move(token));
        }
        else {
            throw std::runtime_error("Cannot emplace notifications using an unset handle");
        }
    }

    static void clear()
    {
        auto& s_tokens = get_tokens();
        s_tokens.clear();
    }

    static void erase(Handle& handle)
    {
        if (handle) {
            auto& s_tokens = get_tokens();
            s_tokens.erase(handle);
        }
    }

    static void erase(Handle& handle, ProtectedFunction&& callback)
    {
        if (handle) {
            auto& s_tokens = get_tokens();
            auto& tokens = s_tokens[handle];
            auto compare = [&callback](auto&& token) {
                return typename ProtectedFunction::Comparator()(token.first, callback);
            };
            tokens.erase(std::remove_if(tokens.begin(), tokens.end(), compare), tokens.end());
        }
        else {
            throw std::runtime_error("Cannot erase notifications using an unset handle");
        }
    }

    /**
     * @brief Get the static tokens object.
     *
     * @note We cannot use a simple static object on the namespace, because we are referencing this across multiple
     * translation units and this could lead to code using this before it's initialized.
     *
     * @return auto& A reference to the static map of tokens.
     */
    inline static TokensMap& get_tokens()
    {
        static TokensMap s_tokens;
        return s_tokens;
    }
};

/**
 * @brief An object owned by objects which will delegate ownership of `Token`s to the
 * `NotificationBucket`.
 *
 * @tparam T The JS runtime types.
 * @tparam Token The type of tokens stored.
 */
template <typename T, typename Token>
class NotificationHandle {
    static inline IdType s_next_id = 0;
    std::optional<IdType> m_id;

public:
    /**
     * @brief Construct a new Notification Handle object to be owned by an object and passed to the
     * `NotificationBucket` when managing `Token`s returned by the object store notification APIs.
     */
    NotificationHandle()
    {
        m_id = s_next_id;
        if (s_next_id == std::numeric_limits<IdType>::max()) {
            throw std::overflow_error("No more NotificationHandle ids");
        }
        s_next_id += 1;
    };

    /**
     * @brief Destroys the Notification Handle object and erases any outstanding listeners from the
     * `NotificationBucket`.
     */
    ~NotificationHandle()
    {
        NotificationBucket<T, Token>::erase(*this);
    }

    operator IdType() const
    {
        return *m_id;
    };

    operator bool() const
    {
        return m_id.has_value();
    };

    /**
     * @brief Move constructs a new Notification Handle by resetting the `id` on the object being moved from.
     * This ensures that the abandoned object won't erase tokens from the `NotificationBucket` when destructed.
     *
     * @param other The object being moved from.
     */
    NotificationHandle(NotificationHandle&& other)
    {
        m_id = std::move(other.m_id);
        other.m_id.reset();
    }
};

} // namespace realm::js::notifications
