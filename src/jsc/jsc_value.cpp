////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

#include "jsc_value.hpp"

#include "jsc_function.hpp"
#include "jsc_object.hpp"

namespace realm {
namespace js {

template<>
bool jsc::Value::is_binary(JSContextRef ctx, const JSValueRef &value)
{
    static jsc::String s_array_buffer = "ArrayBuffer";
    static jsc::String s_is_view = "isView";

    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    JSObjectRef array_buffer_constructor = jsc::Object::validated_get_constructor(ctx, global_object, s_array_buffer);

    // Value should either be an ArrayBuffer or ArrayBufferView (i.e. TypedArray or DataView).
    if (JSValueIsInstanceOfConstructor(ctx, value, array_buffer_constructor, nullptr)) {
        return true;
    }
    if (JSObjectRef object = JSValueToObject(ctx, value, nullptr)) {
        // Check if value is an ArrayBufferView by calling ArrayBuffer.isView(val).
        JSValueRef is_view = jsc::Object::call_method(ctx, array_buffer_constructor, s_is_view, 1, &object);

        return jsc::Value::to_boolean(ctx, is_view);
    }
    return false;
}

template<>
JSValueRef jsc::Value::from_nonnull_binary(JSContextRef ctx, BinaryData data)
{
    static jsc::String s_buffer = "buffer";
    static jsc::String s_uint8_array = "Uint8Array";

    size_t byte_count = data.size();
    JSValueRef byte_count_value = jsc::Value::from_number(ctx, byte_count);
    JSObjectRef uint8_array_constructor = jsc::Object::validated_get_constructor(ctx, JSContextGetGlobalObject(ctx), s_uint8_array);
    JSObjectRef uint8_array = jsc::Function::construct(ctx, uint8_array_constructor, 1, &byte_count_value);

    for (uint32_t i = 0; i < byte_count; i++) {
        JSValueRef num = jsc::Value::from_number(ctx, data[i]);
        jsc::Object::set_property(ctx, uint8_array, i, num);
    }

    return jsc::Object::validated_get_object(ctx, uint8_array, s_buffer);
}

template<>
OwnedBinaryData jsc::Value::to_binary(JSContextRef ctx, JSValueRef value)
{
    static jsc::String s_array_buffer = "ArrayBuffer";
    static jsc::String s_buffer = "buffer";
    static jsc::String s_byte_length = "byteLength";
    static jsc::String s_byte_offset = "byteOffset";
    static jsc::String s_is_view = "isView";
    static jsc::String s_uint8_array = "Uint8Array";

    JSObjectRef global_object = JSContextGetGlobalObject(ctx);
    JSObjectRef array_buffer_constructor = jsc::Object::validated_get_constructor(ctx, global_object, s_array_buffer);
    JSObjectRef uint8_array_constructor = jsc::Object::validated_get_constructor(ctx, global_object, s_uint8_array);
    JSValueRef uint8_array_arguments[3];
    uint32_t uint8_array_argc = 0;

    // Value should either be an ArrayBuffer or ArrayBufferView (i.e. TypedArray or DataView).
    if (JSValueIsInstanceOfConstructor(ctx, value, array_buffer_constructor, nullptr)) {
        uint8_array_arguments[0] = value;
        uint8_array_argc = 1;
    }
    else if (JSObjectRef object = JSValueToObject(ctx, value, nullptr)) {
        // Check if value is an ArrayBufferView by calling ArrayBuffer.isView(val).
        JSValueRef is_view = jsc::Object::call_method(ctx, array_buffer_constructor, s_is_view, 1, &object);

        if (jsc::Value::to_boolean(ctx, is_view)) {
            uint8_array_arguments[0] = jsc::Object::validated_get_object(ctx, object, s_buffer);
            uint8_array_arguments[1] = jsc::Object::get_property(ctx, object, s_byte_offset);
            uint8_array_arguments[2] = jsc::Object::get_property(ctx, object, s_byte_length);
            uint8_array_argc = 3;
        }
    }

    if (!uint8_array_argc) {
        throw std::runtime_error("Can only convert ArrayBuffer and TypedArray objects to binary");
    }

    JSObjectRef uint8_array = jsc::Function::construct(ctx, uint8_array_constructor, uint8_array_argc, uint8_array_arguments);
    uint32_t byte_count = jsc::Object::validated_get_length(ctx, uint8_array);
    auto buffer = std::make_unique<char[]>(byte_count);

    for (uint32_t i = 0; i < byte_count; i++) {
        JSValueRef byteValue = jsc::Object::get_property(ctx, uint8_array, i);
        buffer[i] = jsc::Value::to_number(ctx, byteValue);
    }

    return OwnedBinaryData(std::move(buffer), byte_count);
}

} // namespace js
} // namespace realm
