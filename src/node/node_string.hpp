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
class String<node::Types> {
    std::string m_str;

  public:
    String(const char* s) : m_str(s) {}
    String(const std::string& s) : m_str(s) {}
    String(const Napi::String& s);
    String(Napi::String&& s) : String(s) {}

    operator std::string() const& {
        return m_str;
    }

    operator std::string() && {
        return std::move(m_str);
    }

    Napi::String ToString(Napi::Env env) {
		return Napi::String::New(env, m_str);
    }
};

inline String<node::Types>::String(const Napi::String& s) {
	m_str = s.Utf8Value();
}

} // js
} // realm
