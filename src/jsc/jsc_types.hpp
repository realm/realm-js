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

#include "js_types.hpp"

#define HANDLESCOPE(context)

namespace realm {
namespace jsc {

struct Types {
    using Context = JSContextRef;
    using GlobalContext = JSGlobalContextRef;
    using Value = JSValueRef;
    using Object = JSObjectRef;
    using String = JSStringRef;
    using Function = JSObjectRef;

    using ConstructorCallback = JSObjectCallAsConstructorCallback;
    using FunctionCallback = JSObjectCallAsFunctionCallback;
    using PropertyGetterCallback = JSObjectGetPropertyCallback;
    using PropertySetterCallback = JSObjectSetPropertyCallback;
    using IndexPropertyGetterCallback = JSValueRef (*)(JSContextRef, JSObjectRef, uint32_t, JSValueRef*);
    using IndexPropertySetterCallback = bool (*)(JSContextRef, JSObjectRef, uint32_t, JSValueRef, JSValueRef*);
    using StringPropertyGetterCallback = JSObjectGetPropertyCallback;
    using StringPropertySetterCallback = JSObjectSetPropertyCallback;
    using StringPropertyEnumeratorCallback = JSObjectGetPropertyNamesCallback;
};

template<typename ClassType>
class ObjectWrap;

using String = js::String<Types>;
using Context = js::Context<Types>;
using Value = js::Value<Types>;
using Function = js::Function<Types>;
using Object = js::Object<Types>;
using Exception = js::Exception<Types>;
using ReturnValue = js::ReturnValue<Types>;

} // jsc
} // realm
