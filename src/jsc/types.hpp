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

#include <JavaScriptCore/JSContextRef.h>
#include <JavaScriptCore/JSObjectRef.h>
#include <JavaScriptCore/JSStringRef.h>

namespace realm {
namespace jsc {
    
class String {
  public:
    String(const char * str) : m_str(JSStringCreateWithUTF8CString(str)) {}
    String(const String &other) : m_str(JSStringRetain(other)) {}
    ~String() { JSStringRelease(m_str); }
    operator JSStringRef() const { return m_str; }
    
  private:
    JSStringRef m_str;
};
    
struct Types {
    using Context = JSContextRef;
    using GlobalContext = JSGlobalContextRef;
    using ObjectClass = JSClassRef;
    using Value = JSValueRef;
    using Object = JSObjectRef;
    using String = jsc::String;
    using Function = JSObjectRef;
    using Return = JSValueRef;
    using Exception = JSValueRef;
};
    
}}