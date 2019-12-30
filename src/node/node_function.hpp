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
#include "node_napi_convert.hpp"

namespace realm {
namespace js {

//template<>
//inline v8::Local<v8::Value> node::Function::call(Napi::Env env, const v8::Local<v8::Function> &function, const v8::Local<v8::Object> &this_object, size_t argc, const v8::Local<v8::Value> arguments[]) {
//	v8::Isolate* isolate = realm::node::getIsolate(env);
//	Nan::TryCatch trycatch;
//
//    auto recv = this_object.IsEmpty() ? isolate->GetCurrentContext()->Global() : this_object;
//    auto result = Nan::Call(function, recv, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));
//
//    if (trycatch.HasCaught()) {
//        throw node::Exception(env, trycatch.Exception());
//    }
//    return result.ToLocalChecked();
//}

template <>
inline Napi::Value node::Function::call(Napi::Env env, const Napi::Function& function, const Napi::Object& this_object, size_t argc, const Napi::Value arguments[]) {
	auto recv = this_object.IsEmpty() ? env.Global() : this_object;
	try {
		std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
		auto result = function.Call(recv, args);
		return result;
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template <>
//inline v8::Local<v8::Value> node::Function::callback(Napi::Env env, const v8::Local<v8::Function> &function, const v8::Local<v8::Object> &this_object, size_t argc, const v8::Local<v8::Value> arguments[])
//{
//	v8::Isolate *isolate = realm::node::getIsolate(env);
//	if (!isolate->GetCallingContext().IsEmpty())
//	{
//		// if there are any JavaScript frames on the stack below this one we don't need to
//		// go through the trouble of calling MakeCallback. MakeCallback is only for when a
//		// thread with no JavaScript frames on its stack needs to call into JavaScript, like in
//		// an uv_async callback.
//		return call(env, function, this_object, argc, arguments);
//	}
//
//	v8::TryCatch trycatch(isolate);
//
//	auto recv = this_object.IsEmpty() ? isolate->GetCurrentContext()->Global() : this_object;
//	auto result = ::node::MakeCallback(isolate, recv, function, (int)argc, const_cast<v8::Local<v8::Value> *>(arguments));
//
//	if (trycatch.HasCaught())
//	{
//		::node::FatalException(isolate, trycatch);
//	}
//	return result;
//}

template <>
inline Napi::Value node::Function::callback(Napi::Env env, const Napi::Function& function, const Napi::Object& this_object, size_t argc, const Napi::Value arguments[]) {
	auto recv = this_object.IsEmpty() ? env.Global() : this_object;
	try	{
		std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
		auto result = function.MakeCallback(recv, args);
		return result;
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

//template <>
//inline v8::Local<v8::Object> node::Function::construct(Napi::Env env, const v8::Local<v8::Function> &function, size_t argc, const v8::Local<v8::Value> arguments[])
//{
//	v8::Isolate *isolate = realm::node::getIsolate(env);
//	Nan::TryCatch trycatch;
//	auto result = Nan::NewInstance(function, (int)argc, const_cast<v8::Local<v8::Value> *>(arguments));
//
//	if (trycatch.HasCaught())
//	{
//		throw node::Exception(env, trycatch.Exception());
//	}
//	return result.ToLocalChecked();
//}


template <>
inline Napi::Object node::Function::construct(Napi::Env env, const Napi::Function& function, size_t argc, const Napi::Value arguments[]) {
	try {
		std::vector<napi_value> args(const_cast<const Napi::Value*>(arguments), const_cast<const Napi::Value*>(arguments) + argc);
		auto result = function.New(args);
		return result;
	}
	catch (const Napi::Error& e) {
		throw node::Exception(env, e.Message());
	}
}

} // namespace js
} // namespace realm
