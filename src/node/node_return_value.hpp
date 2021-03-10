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

#include "node_types.hpp"
#include "napi.h"

namespace realm {
namespace js {

template<>
class ReturnValue<node::Types> {
	Napi::Env m_env;
	Napi::Value m_value;

  public:
	ReturnValue(Napi::Env env) : m_env(env), m_value(Napi::Value(env, env.Undefined())) {}
	ReturnValue(Napi::Env env, Napi::Value value) : m_env(env), m_value(value) {}

	Napi::Value ToValue() {
		//guard check. env.Empty() values cause node to fail in obscure places, so return undefined instead
		if (m_value.IsEmpty()) {
			return Napi::Value(m_env, m_env.Undefined());
		}

		return m_value;
	}

    void set(const Napi::Value &value) {
        m_value = Napi::Value(m_env, value);
    }

    void set(const std::string &string) {
		m_value = Napi::Value::From(m_env, string);
    }

    void set(const char *str) {
        if (!str) {
			m_value = Napi::Value(m_env, m_env.Null());
        }
        else {
			m_value = Napi::Value::From(m_env, str);
        }
    }

    void set(bool boolean) {
		m_value = Napi::Value::From(m_env, boolean);
    }
    
	void set(double number) {
		m_value = Napi::Value::From(m_env, number);
    }
    
	void set(int32_t number) {
		m_value = Napi::Value::From(m_env, number);
    }
    
	void set(uint32_t number) {
		m_value = Napi::Value::From(m_env, number);
    }

    void set(realm::Mixed mixed) {
		m_value = Napi::Value(m_env, Value<node::Types>::from_mixed(m_env, mixed));
    }

    void set_null() {
		m_value = Napi::Value(m_env, m_env.Null());
    }


    void set_undefined() {
		m_value = Napi::Value(m_env, m_env.Undefined());
    }

    template<typename T>
    void set(util::Optional<T> value) {
        if (value) {
            set(*value);
        }
        else {
			set_undefined();
        }
    }
};
    
} // js
} // realm
