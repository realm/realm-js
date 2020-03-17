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

#include "js_types.hpp"

#include "napi.h"

#define HANDLESCOPE(env) Napi::HandleScope handle_scope(env);

namespace realm {
namespace node {

struct Types {
	using Context = Napi::Env;
	using GlobalContext = Napi::Env;
	using Value = Napi::Value;
	using Object = Napi::Object;
	using String = Napi::String;
	using Function = Napi::Function;

	typedef Napi::Value(*NapiFunctionCallback)(const Napi::CallbackInfo& info);

	typedef Napi::Value(*NapiIndexGetterCallback)(const Napi::CallbackInfo& info, const Napi::Object& instance, uint32_t index);
	typedef Napi::Value(*NapiIndexSetterCallback)(const Napi::CallbackInfo& info, const Napi::Object& instance, uint32_t index, const Napi::Value& value);
	typedef Napi::Value(*NapiPropertyGetterCallback)(const Napi::CallbackInfo& info);
	typedef void(*NapiPropertySetterCallback)(const Napi::CallbackInfo& info, const Napi::Value& value);

	typedef Napi::Value(*NapiStringPropertyGetterCallback)(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property);
	typedef Napi::Value(*NapiStringPropertySetterCallback)(const Napi::CallbackInfo& info, const Napi::Object& instance, const Napi::String& property, const Napi::Value& value);
	typedef Napi::Value(*NapiStringPropertyEnumeratorCallback)(const Napi::CallbackInfo& info, const Napi::Object& instance);

	using ConstructorCallback = NapiFunctionCallback;
	using FunctionCallback = NapiFunctionCallback;
	using PropertyGetterCallback = NapiPropertyGetterCallback;
	using PropertySetterCallback = NapiPropertySetterCallback;
	using IndexPropertyGetterCallback = NapiIndexGetterCallback;
	using IndexPropertySetterCallback = NapiIndexSetterCallback;

	using StringPropertyGetterCallback = NapiStringPropertyGetterCallback;
	using StringPropertySetterCallback = NapiStringPropertySetterCallback;
	using StringPropertyEnumeratorCallback = NapiStringPropertyEnumeratorCallback;
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
