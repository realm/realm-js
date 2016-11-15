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
namespace node {

template<typename MemberType>
class Protected {
    // TODO: Figure out why Nan::CopyablePersistentTraits causes a build failure.
    Nan::Persistent<MemberType, v8::CopyablePersistentTraits<MemberType>> m_value;

  public:
    Protected() {}
    Protected(v8::Local<MemberType> value) : m_value(value) {}

    operator v8::Local<MemberType>() const {
        return Nan::New(m_value);
    }
    explicit operator bool() const {
        return m_value.isEmpty();
    }
    bool operator==(const v8::Local<MemberType> &other) const {
        return m_value == other;
    }
    bool operator!=(const v8::Local<MemberType> &other) const {
        return m_value != other;
    }
    bool operator==(const Protected<MemberType> &other) const {
        return m_value == other.m_value;
    }
    bool operator!=(const Protected<MemberType> &other) const {
        return m_value != other.m_value;
    }

    struct Comparator {
        bool operator()(const Protected<MemberType>& a, const Protected<MemberType>& b) const {
            return Nan::New(a.m_value)->StrictEquals(Nan::New(b.m_value));
        }
    };
};

} // node

namespace js {

template<>
class Protected<node::Types::GlobalContext> : public node::Protected<v8::Context> {
  public:
    Protected() : node::Protected<v8::Context>() {}
    Protected(v8::Local<v8::Context> ctx) : node::Protected<v8::Context>(ctx) {}

    operator v8::Isolate*() const {
        return v8::Local<v8::Context>(*this)->GetIsolate();
    }
};

template<>
class Protected<node::Types::Value> : public node::Protected<v8::Value> {
  public:
    Protected() : node::Protected<v8::Value>() {}
    Protected(v8::Isolate* isolate, v8::Local<v8::Value> value) : node::Protected<v8::Value>(value) {}
};

template<>
class Protected<node::Types::Object> : public node::Protected<v8::Object> {
  public:
    Protected() : node::Protected<v8::Object>() {}
    Protected(v8::Isolate* isolate, v8::Local<v8::Object> object) : node::Protected<v8::Object>(object) {}
};

template<>
class Protected<node::Types::Function> : public node::Protected<v8::Function> {
  public:
    Protected() : node::Protected<v8::Function>() {}
    Protected(v8::Isolate* isolate, v8::Local<v8::Function> object) : node::Protected<v8::Function>(object) {}
};

template<typename T>
struct GlobalCopyablePersistentTraits {
    typedef v8::Persistent<T, GlobalCopyablePersistentTraits<T>> CopyablePersistent;
    static const bool kResetInDestructor = false;
    template<typename S, typename M>
    static inline void Copy(const v8::Persistent<S, M> &source, CopyablePersistent *dest) {}
};

} // js
} // realm
