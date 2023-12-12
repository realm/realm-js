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

#include <optional>

#include "jsi_types.hpp"
#include "jsi_string.hpp"

namespace realm {
namespace js {

namespace fbjsi = facebook::jsi;

template <>
class ReturnValue<realmjsi::Types> {
    JsiEnv m_env;
    fbjsi::Value m_value; // defaults to undefined

public:
    ReturnValue(JsiEnv env)
        : m_env(env)
    {
    }
    ReturnValue(JsiEnv env, fbjsi::Value&& value)
        : m_env(env)
        , m_value(std::move(value))
    {
    }
    ReturnValue(JsiEnv env, const fbjsi::Value& value)
        : m_env(env)
        , m_value(env, value)
    {
    }

    fbjsi::Value ToValue() &&
    {
        return std::move(m_value);
    }

    void set(JsiVal value)
    {
        m_value = std::move(value.get());
    }

    void set(const std::string& string)
    {
        m_value = str(m_env, string).get();
    }

    void set(const char* c_str)
    {
        if (!c_str) {
            set_null();
        }
        else {
            m_value = str(m_env, c_str).get();
        }
    }

    void set(bool boolean)
    {
        m_value = fbjsi::Value(boolean);
    }

    void set(double number)
    {
        m_value = fbjsi::Value(number);
    }

    void set(int32_t number)
    {
        set(double(number));
    }

    void set(uint32_t number)
    {
        set(double(number));
    }

    void set(realm::Mixed mixed)
    {
        m_value = js::Value<realmjsi::Types>::from_mixed(m_env, nullptr, mixed).get();
    }

    void set_null()
    {
        m_value = fbjsi::Value::null();
    }


    void set_undefined()
    {
        m_value = fbjsi::Value::undefined();
    }

    template <typename T>
    void set(const std::optional<T>& value)
    {
        if (value) {
            set(std::move(*value));
        }
        else {
            set_undefined();
        }
    }

    operator JsiVal() const
    {
        return m_env(m_value);
    }
};

} // namespace js
} // namespace realm
