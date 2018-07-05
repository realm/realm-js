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

namespace realm {
namespace js {

template<>
class String<node::Types> {
    std::string m_str;

  public:
    String(const char* s) : m_str(s) {}
    String(const std::string &s) : m_str(s) {}
    String(const v8::Local<v8::String> &s);
    String(v8::Local<v8::String> &&s) : String(s) {}

    operator std::string() const& {
        return m_str;
    }
    operator std::string() && {
        return std::move(m_str);
    }
    operator v8::Local<v8::String>() const {
        return Nan::New(m_str).ToLocalChecked();
    }
};

inline String<node::Types>::String(const v8::Local<v8::String> &s) {
    if (s.IsEmpty() || s->Length() == 0) {
        return;
    }
    m_str.resize(s->Utf8Length());
    const int flags = v8::String::NO_NULL_TERMINATION | v8::String::REPLACE_INVALID_UTF8;
    s->WriteUtf8(&m_str[0], m_str.size(), 0, flags);
}

} // js
} // realm
