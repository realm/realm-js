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

// We need to flush the React Native UI task queue whenever we call into JS from C++ – see
// `_flushUiTaskQueue` in `lib/extensions.js` for detailed explanation of why this is necessary.
extern js::Protected<JSObjectRef> FlushUiTaskQueueFunction;

inline void flush_ui_task_queue(JSContextRef ctx)
{
    // Cache the JS _flushUiTaskQueue function, which is stored on the Realm constructor, to avoid having
    // to look it up each time. We don't do this once at jsc_class_init, because the Realm constructor
    // does not exist at that point.
    if (!FlushUiTaskQueueFunction) {
        JSObjectRef global_object = JSContextGetGlobalObject(ctx);
        JSValueRef value = jsc::Object::get_property(ctx, global_object, "Realm");
        JSObjectRef realm_object = jsc::Value::to_object(ctx, value);
        value = jsc::Object::get_property(ctx, realm_object, "_flushUiTaskQueue");
        FlushUiTaskQueueFunction = js::Protected<JSObjectRef>(ctx, jsc::Value::to_object(ctx, value));
    }

    if (FlushUiTaskQueueFunction && !JSValueIsUndefined(ctx, FlushUiTaskQueueFunction)) {
        // We will ignore this exception, as it's not a fatal error if we can't flush the task queue for some
        // reason - the UI will update when the user next touches the screen
        JSValueRef flush_ui_task_queue_exception = nullptr;
        // Call the function directly rather than via `Function::call` to avoid an infinite loop
        JSObjectCallAsFunction(ctx, FlushUiTaskQueueFunction, nullptr, 0, {}, &flush_ui_task_queue_exception);
    }
}

template <>
inline JSValueRef jsc::Function::call(JSContextRef ctx, const JSObjectRef& function, const JSObjectRef& this_object,
                                      size_t argc, const JSValueRef arguments[])
{
    JSValueRef exception = nullptr;
    JSValueRef result = JSObjectCallAsFunction(ctx, function, this_object, argc, arguments, &exception);

    // flush_ui_task_queue(ctx);

    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}

template <>
inline JSValueRef jsc::Function::callback(JSContextRef ctx, const JSObjectRef& function,
                                          const JSObjectRef& this_object, size_t argc, const JSValueRef arguments[])
{
    return jsc::Function::call(ctx, function, this_object, argc, arguments);
}

template <>
inline JSObjectRef jsc::Function::construct(JSContextRef ctx, const JSObjectRef& function, size_t argc,
                                            const JSValueRef arguments[])
{
    JSValueRef exception = nullptr;
    JSObjectRef result = JSObjectCallAsConstructor(ctx, function, argc, arguments, &exception);

    // flush_ui_task_queue(ctx);

    if (exception) {
        throw jsc::Exception(ctx, exception);
    }
    return result;
}

} // namespace js
} // namespace realm
