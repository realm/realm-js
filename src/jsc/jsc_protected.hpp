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
class Protected<JSGlobalContextRef> {
    JSGlobalContextRef m_context;

  public:
    Protected() : m_context(nullptr) {}
    Protected(const Protected<JSGlobalContextRef> &other) : Protected(other.m_context) {}
    Protected(Protected<JSGlobalContextRef> &&other) : m_context(other.m_context) {
        other.m_context = nullptr;
    }
    explicit Protected(JSGlobalContextRef ctx) : m_context(ctx) {
        JSGlobalContextRetain(m_context);
    }
    ~Protected() {
        if (m_context) {
            JSGlobalContextRelease(m_context);
        }
    }
    operator JSGlobalContextRef() const {
        return m_context;
    }
    operator bool() const {
        return m_context != nullptr;
    }
    
    struct Comparator {
        bool operator() (const Protected<JSGlobalContextRef>& a, const Protected<JSGlobalContextRef>& b) const {
            return a.m_context == b.m_context;
        }
    };
};

template<>
class Protected<JSValueRef> {
  protected:
    JSGlobalContextRef m_context;
    JSValueRef m_value;

  public:
    Protected() {}
    Protected(const Protected<JSValueRef> &other) : Protected(other.m_context, other.m_value) {}
    Protected(Protected<JSValueRef> &&other) : m_context(other.m_context), m_value(other.m_value) {
        other.m_context = nullptr;
        other.m_value = nullptr;
    }
    Protected(JSContextRef ctx, JSValueRef value) : m_context(JSContextGetGlobalContext(ctx)), m_value(value) {
        JSValueProtect(m_context, m_value);
    }
    ~Protected() {
        if (m_value) {
            JSValueUnprotect(m_context, m_value);
        }
    }
    operator JSValueRef() const {
        return m_value;
    }
    operator bool() const {
        return m_value != nullptr;
    }
    
    struct Comparator {
        bool operator() (const Protected<JSValueRef>& a, const Protected<JSValueRef>& b) const {
            if (a.m_context != b.m_context) {
                return false;
            }
            return JSValueIsStrictEqual(a.m_context, a.m_value, b.m_value);
        }
    };
    
    Protected<JSValueRef>& operator=(Protected<JSValueRef> other) {
        std::swap(m_context, other.m_context);
        std::swap(m_value, other.m_value);
        return *this;
    }
};

template<>
class Protected<JSObjectRef> : public Protected<JSValueRef> {
  public:
    Protected() : Protected<JSValueRef>() {}
    Protected(const Protected<JSObjectRef> &other) : Protected<JSValueRef>(other) {}
    Protected(Protected<JSObjectRef> &&other) : Protected<JSValueRef>(std::move(other)) {}
    Protected(JSContextRef ctx, JSObjectRef value) : Protected<JSValueRef>(ctx, value) {}

    operator JSObjectRef() const {
        JSValueRef value = static_cast<JSValueRef>(*this);
        return (JSObjectRef)value;
    }
    
    Protected<JSObjectRef>& operator=(Protected<JSObjectRef> other) {
        std::swap(m_context, other.m_context);
        std::swap(m_value, other.m_value);
        return *this;
    }
};

} // js
} // realm
