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

#include "types.hpp"
#include <string>

namespace realm {
namespace js {

static inline bool ValueIsUndefined(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsUndefined(ctx, value); }
static inline bool ValueIsNull(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsNull(ctx, value); }
static inline bool ValueIsBoolean(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsBoolean(ctx, value); }
static inline bool ValueIsNumber(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsNumber(ctx, value); }
static inline bool ValueIsString(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsString(ctx, value); }
static inline bool ValueIsObject(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsObject(ctx, value); }

static inline void ValueProtect(jsc::Types::Context ctx, jsc::Types::Value value) { JSValueProtect(ctx, value); }
static inline void ValueUnprotect(jsc::Types::Context ctx, jsc::Types::Value value) { JSValueUnprotect(ctx, value); }

static inline void ObjectCallAsFunction(jsc::Types::Context ctx, jsc::Types::Object function, jsc::Types::Object thisObject, size_t argsCount, const jsc::Types::Value args[], jsc::Types::Exception &exception) {
    JSObjectCallAsFunction(ctx, function, thisObject, argsCount, args, &exception);
}

static inline void GlobalContextProtect(jsc::Types::GlobalContext ctx) { JSGlobalContextRetain(ctx); }
static inline void GlobalContextUnprotect(jsc::Types::GlobalContext ctx) { JSGlobalContextRelease(ctx); }

template<class T>
static jsc::Types::Object WrapObject(jsc::Types::Context ctx, jsc::Types::ObjectClass objectClass, T internal, jsc::Types::Object prototype = nullptr) {
    JSObjectRef ref = JSObjectMake(ctx, objectClass, (void *)internal);
    if (prototype) {
        JSObjectSetPrototype(ctx, ref, prototype);
    }
    return ref;
}

static inline jsc::Types::ObjectClass realm_class();
static inline jsc::Types::ObjectClass list_class();
static inline jsc::Types::ObjectClass object_class();
static inline jsc::Types::ObjectClass results_class();

}}
