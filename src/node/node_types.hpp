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

#include <cmath>
#include <functional>
#include <map>
#include <string>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wundef"
#include <nan.h>
#pragma GCC diagnostic pop

#include "js_types.hpp"

#if defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 4 || (V8_MAJOR_VERSION == 4 && defined(V8_MINOR_VERSION) && V8_MINOR_VERSION >= 3))
#define REALM_V8_ARRAY_BUFFER_API 1
#endif

#define HANDLESCOPE Nan::HandleScope handle_scope;

namespace realm {
namespace node {

struct Types {
    using Context = v8::Isolate*;
    using GlobalContext = v8::Local<v8::Context>;
    using Value = v8::Local<v8::Value>;
    using Object = v8::Local<v8::Object>;
    using String = v8::Local<v8::String>;
    using Function = v8::Local<v8::Function>;

    using ConstructorCallback = v8::FunctionCallback;
    using FunctionCallback = v8::FunctionCallback;
    using PropertyGetterCallback = v8::AccessorGetterCallback;
    using PropertySetterCallback = v8::AccessorSetterCallback;
    using IndexPropertyGetterCallback = v8::IndexedPropertyGetterCallback;
    using IndexPropertySetterCallback = v8::IndexedPropertySetterCallback;
    using StringPropertyGetterCallback = v8::NamedPropertyGetterCallback;
    using StringPropertySetterCallback = v8::NamedPropertySetterCallback;
    using StringPropertyEnumeratorCallback = v8::NamedPropertyEnumeratorCallback;
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

} // node
} // realm
