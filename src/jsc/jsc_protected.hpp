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
namespace jsc {

template<typename MemberType>
class Protected {
    const MemberType m_value;

  public:
    Protected(MemberType value) : m_value(value) {}

    operator MemberType() const {
        return m_value;
    }
};

} // jsc

namespace js {

template<>
class Protected<JSGlobalContextRef> : public jsc::Protected<JSGlobalContextRef> {
  public:
    Protected(JSGlobalContextRef ctx) : jsc::Protected<JSGlobalContextRef>(ctx) {
        JSGlobalContextRetain(*this);
    }
    ~Protected() {
        JSGlobalContextRelease(*this);
    }
};

template<>
class Protected<JSValueRef> : public jsc::Protected<JSValueRef> {
    const JSGlobalContextRef m_context;

  public:
    Protected(JSContextRef ctx, JSValueRef value) : jsc::Protected<JSValueRef>(value), m_context(JSContextGetGlobalContext(ctx)) {
        JSValueProtect(m_context, *this);
    }
    ~Protected() {
        JSValueUnprotect(m_context, *this);
    }
};

template<>
class Protected<JSObjectRef> : public Protected<JSValueRef> {
  public:
    Protected(JSContextRef ctx, JSObjectRef object) : Protected<JSValueRef>(ctx, object) {}

    operator JSObjectRef() const {
        JSValueRef value = static_cast<JSValueRef>(*this);
        return (JSObjectRef)value;
    }
};

} // js
} // realm
