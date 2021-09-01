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

#include "hermes_types.hpp"
#include "hermes_string.hpp"

namespace realm {
namespace js {

template <>
class ReturnValue<hermes::Types> {
    JsiEnv m_env;
    jsi::Value m_value; // defaults to undefined

public:
    ReturnValue(JsiEnv env)
        : m_env(env)
    {
    }
    ReturnValue(JsiEnv env, jsi::Value&& value)
        : m_env(env)
        , m_value(std::move(value))
    {
    }
    ReturnValue(JsiEnv env, const jsi::Value& value)
        : m_env(env)
        , m_value(env, value)
    {
    }

    jsi::Value ToValue() &&
    {
        return std::move(m_value);
    }

    void set(JsiVal value)
    {
        m_value = std::move(value.get());
    }
    void set(const jsi::Value& value)
    {
        m_value = jsi::Value(m_env, value);
    }
    void set(jsi::Value&& value)
    {
        m_value = std::move(value);
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
        m_value = jsi::Value(boolean);
    }

    void set(double number)
    {
        m_value = jsi::Value(number);
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
        m_value = jsi::Value(m_env, TypeMixed<hermes::Types>::get_instance().wrap(m_env, mixed));
    }

    void set_null()
    {
        m_value = jsi::Value::null();
    }


    void set_undefined()
    {
        m_value = jsi::Value::undefined();
    }

    template <typename T>
    void set(util::Optional<T> value)
    {
        if (value) {
            set(std::move(*value));
        }
        else {
            set_undefined();
        }
    }
};

} // namespace js
} // namespace realm
