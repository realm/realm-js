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

#include "jsc_types.hpp"
#include "jsc_string.hpp"

namespace realm {
namespace js {

template<>
class ReturnValue<jsc::Types> {
    const JSContextRef m_context;
    JSValueRef m_value = nullptr;

  public:
    ReturnValue(JSContextRef ctx) : m_context(ctx) {}

    void set(const JSValueRef &value) {
        m_value = value;
    }
    void set(const std::string &string) {
        m_value = JSValueMakeString(m_context, jsc::String(string));
    }
    void set(const char *string) {
        m_value = JSValueMakeString(m_context, jsc::String(string));
    }
    void set(bool boolean) {
        m_value = JSValueMakeBoolean(m_context, boolean);
    }
    void set(double number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set(int32_t number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set(uint32_t number) {
        m_value = JSValueMakeNumber(m_context, number);
    }
    void set(const util::Optional<realm::Mixed>& mixed) {
        m_value = Value<jsc::Types>::from_mixed(m_context, mixed);
    }
    void set_null() {
        m_value = JSValueMakeNull(m_context);
    }
    void set_undefined() {
        m_value = JSValueMakeUndefined(m_context);
    }

    template<typename T>
    void set(const util::Optional<T>& value) {
        if (value) {
            set(*value);
        }
        else {
            set_undefined();
        }
    }

    operator JSValueRef() const {
        return m_value;
    }
};
    
} // js
} // realm
