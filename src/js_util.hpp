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

#include <limits>
#include <sstream>
#include <stdexcept>

#include "shared_realm.hpp"

namespace realm {
namespace js {

template<typename T>
class RealmDelegate;

template<typename T>
static inline RealmDelegate<T> *get_delegate(realm::Realm *realm) {
    return static_cast<RealmDelegate<T> *>(realm->m_binding_context.get());
}

template<typename T>
static inline T stot(const std::string &s) {
    std::istringstream iss(s);
    T value;
    iss >> value;
    if (iss.fail()) {
        throw std::invalid_argument("Cannot convert string '" + s + "'");
    }
    return value;
}

static inline uint32_t validated_positive_index(std::string string) {
    int64_t index = stot<int64_t>(string);
    if (index < 0) {
        throw std::out_of_range(std::string("Index ") + string + " cannot be less than zero.");
    }
    if (index > std::numeric_limits<uint32_t>::max()) {
        throw std::out_of_range(std::string("Index ") + string + " must be a 32-bit unsigned integer");
    }
    return static_cast<uint32_t>(index);
}

static inline void validate_argument_count(size_t count, size_t expected, const char *message = nullptr) {
    if (count != expected) {
        throw std::invalid_argument(message ? message : "Invalid arguments");
    }
}

static inline void validate_argument_count(size_t count, size_t min, size_t max, const char *message = nullptr) {
    if (count < min || count > max) {
        throw std::invalid_argument(message ? message : "Invalid arguments");
    }
}

static inline void validate_argument_count_at_least(size_t count, size_t expected, const char *message = nullptr) {
    if (count < expected) {
        throw std::invalid_argument(message ? message : "Invalid arguments");
    }
}

} // js
} // realm
