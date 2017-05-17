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
inline JSValueRef jsc::Function::call(JSContextRef ctx, const JSObjectRef &function, const JSObjectRef &this_object, size_t argc, const JSValueRef arguments[]) {
    JSValueRef exception = nullptr;
    JSValueRef result = JSObjectCallAsFunction(ctx, function, this_object, argc, arguments, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}

template<>
inline JSValueRef jsc::Function::callback(JSContextRef ctx, const JSObjectRef &function, const JSObjectRef &this_object, size_t argc, const JSValueRef arguments[]) {
   return jsc::Function::call(ctx, function, this_object, argc, arguments);
}

template<>
inline JSObjectRef jsc::Function::construct(JSContextRef ctx, const JSObjectRef &function, size_t argc, const JSValueRef arguments[]) {
    JSValueRef exception = nullptr;
    JSObjectRef result = JSObjectCallAsConstructor(ctx, function, argc, arguments, &exception);
    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}
    
} // js
} // realm
