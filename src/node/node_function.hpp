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
namespace js {

template<>
inline v8::Local<v8::Value> node::Function::call(v8::Isolate* isolate, const v8::Local<v8::Function> &function, const v8::Local<v8::Object> &this_object, size_t argc, const v8::Local<v8::Value> arguments[]) {
    Nan::TryCatch trycatch;

    auto recv = this_object.IsEmpty() ? isolate->GetCurrentContext()->Global() : this_object;
    auto result = Nan::Call(function, recv, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return result.ToLocalChecked();
}

template<>
inline v8::Local<v8::Value> node::Function::callback(v8::Isolate* isolate, const v8::Local<v8::Function> &function, const v8::Local<v8::Object> &this_object, size_t argc, const v8::Local<v8::Value> arguments[]) {
    if (!isolate->GetCallingContext().IsEmpty()) {
        // if there are any JavaScript frames on the stack below this one we don't need to
        // go through the trouble of calling MakeCallback. MakeCallback is only for when a
        // thread with no JavaScript frames on its stack needs to call into JavaScript, like in
        // an uv_async callback.
        return call(isolate, function, this_object, argc, arguments);
    }

    v8::TryCatch trycatch(isolate);
    
    auto recv = this_object.IsEmpty() ? isolate->GetCurrentContext()->Global() : this_object;
    auto result = ::node::MakeCallback(isolate, recv, function, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));

    if (trycatch.HasCaught()) {
        ::node::FatalException(isolate, trycatch);
    }
    return result;
}

template<>
inline v8::Local<v8::Object> node::Function::construct(v8::Isolate* isolate, const v8::Local<v8::Function> &function, size_t argc, const v8::Local<v8::Value> arguments[]) {
    Nan::TryCatch trycatch;
    auto result = Nan::NewInstance(function, (int)argc, const_cast<v8::Local<v8::Value>*>(arguments));

    if (trycatch.HasCaught()) {
        throw node::Exception(isolate, trycatch.Exception());
    }
    return result.ToLocalChecked();
}
    
} // js
} // realm
