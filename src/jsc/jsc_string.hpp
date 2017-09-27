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

namespace realm {
namespace js {

template<>
class String<jsc::Types> {
    using StringType = String<jsc::Types>;

    JSStringRef m_str;

  public:
    String(const char *s) : m_str(JSStringCreateWithUTF8CString(s)) {}
    String(const JSStringRef &s) : m_str(JSStringRetain(s)) {}
    String(StringData str) : String(str.data()) {}
    String(const std::string& str) : String(str.c_str()) {}
    String(const StringType &o) : String(o.m_str) {}
    String(StringType &&o) : m_str(o.m_str) {
        o.m_str = nullptr;
    }
    ~String() {
        if (m_str) {
            JSStringRelease(m_str);
        }
    }

    operator JSStringRef() const {
        return m_str;
    }
    operator std::string() const {
        size_t max_size = JSStringGetMaximumUTF8CStringSize(m_str);
        std::string string;
        string.resize(max_size);
        string.resize(JSStringGetUTF8CString(m_str, &string[0], max_size) - 1);
        return string;
    }
};
    
} // js
} // realm
