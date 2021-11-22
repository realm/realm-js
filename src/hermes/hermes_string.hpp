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

namespace realm {
namespace js {

template<>
class String<hermes::Types> {
    using StringType = String<hermes::Types>;

    std::string m_str;

  public:
    static bson::Bson to_bson(StringType stringified_ejson) {
        return bson::parse(std::string(std::move(stringified_ejson)));
    }

    static std::string from_bson(const bson::Bson& bson) {
        return bson.to_string();
    }

    String(StringData s) : m_str(s) {}
    String(std::string&& s) : m_str(std::move(s)) {}
    String(const std::string& s) : m_str(s) {}
    String(const char* s) : m_str(s) {}

    operator StringData() const {
        return m_str;
    }

    operator std::string() && {
        return std::move(m_str);
    }
    operator std::string() const& {
        return m_str;
    }

    jsi::String ToString(jsi::Runtime* env) {
        return jsi::String::createFromUtf8(*env, m_str);
    }
};

inline jsi::PropNameID propName(JsiEnv env, StringData name) {
    return jsi::PropNameID::forUtf8(env, reinterpret_cast<const uint8_t*>(name.data()), name.size());
}

inline JsiString str(JsiEnv env, StringData name) {
    return env(jsi::String::createFromUtf8(env, reinterpret_cast<const uint8_t*>(name.data()), name.size()));
}

} // js
} // realm
