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

template <>
inline Napi::Value node::Function::call(Napi::Env env, const Napi::Function& function, const Napi::Object& this_object, size_t argc, const Napi::Value arguments[]) {
	auto recv = this_object.IsEmpty() ? env.Global() : this_object;

	std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
	auto result = function.Call(recv, args);
	return result;
}

template <>
inline Napi::Value node::Function::callback(Napi::Env env, const Napi::Function& function, const Napi::Object& this_object, size_t argc, const Napi::Value arguments[]) {
	auto recv = this_object.IsEmpty() ? env.Global() : this_object;
	
	std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
	auto result = function.MakeCallback(recv, args);
	return result;
}

template <>
inline Napi::Object node::Function::construct(Napi::Env env, const Napi::Function& function, size_t argc, const Napi::Value arguments[]) {
	std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
	auto result = function.New(args);
	return result;
}

} // namespace js
} // namespace realm
