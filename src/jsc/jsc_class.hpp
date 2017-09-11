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

#include "js_class.hpp"
#include "js_util.hpp"

namespace realm {
namespace jsc {

template<typename T>
using ClassDefinition = js::ClassDefinition<Types, T>;

using ConstructorType = js::ConstructorType<Types>;
using ArgumentsMethodType = js::ArgumentsMethodType<Types>;
using MethodType = js::MethodType<Types>;
using Arguments = js::Arguments<Types>;
using PropertyType = js::PropertyType<Types>;
using IndexPropertyType = js::IndexPropertyType<Types>;
using StringPropertyType = js::StringPropertyType<Types>;
using MethodMap = js::MethodMap<Types>;
using PropertyMap = js::PropertyMap<Types>;

template<typename ClassType>
class ObjectWrap {
    using Internal = typename ClassType::Internal;
    using ParentClassType = typename ClassType::Parent;

  public:
    static JSObjectRef create_instance(JSContextRef ctx, Internal* internal = nullptr) {
        return JSObjectMake(ctx, get_class(), new ObjectWrap<ClassType>(internal));
    }

    static JSObjectRef create_constructor(JSContextRef ctx) {
        return JSObjectMake(ctx, get_constructor_class(), nullptr);
    }

    static JSClassRef get_class() {
        static JSClassRef js_class = create_class();
        return js_class;
    }

    static JSClassRef get_constructor_class() {
        static JSClassRef js_class = create_constructor_class();
        return js_class;
    }

    static bool has_instance(JSContextRef ctx, JSValueRef value) {
        return JSValueIsObjectOfClass(ctx, value, get_class());
    }

    operator Internal*() const {
        return m_object.get();
    }

    ObjectWrap<ClassType>& operator=(Internal* object) {
        if (m_object.get() != object) {
            m_object = std::unique_ptr<Internal>(object);
        }
        return *this;
    }

  private:
    static ClassType s_class;

    std::unique_ptr<Internal> m_object;

    ObjectWrap(Internal* object = nullptr) : m_object(object) {}

    static JSClassRef create_constructor_class();
    static JSClassRef create_class();

    static std::vector<JSStaticFunction> get_methods(const MethodMap &);
    static std::vector<JSStaticValue> get_properties(const PropertyMap &);

    static JSValueRef call(JSContextRef, JSObjectRef, JSObjectRef, size_t, const JSValueRef[], JSValueRef*);
    static JSObjectRef construct(JSContextRef, JSObjectRef, size_t, const JSValueRef[], JSValueRef*);
    static void initialize_constructor(JSContextRef, JSObjectRef);
    static void finalize(JSObjectRef);
    static void get_property_names(JSContextRef, JSObjectRef, JSPropertyNameAccumulatorRef);
    static JSValueRef get_property(JSContextRef, JSObjectRef, JSStringRef, JSValueRef*);
    static bool set_property(JSContextRef, JSObjectRef, JSStringRef, JSValueRef, JSValueRef*);

    static bool set_readonly_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
        *exception = Exception::value(ctx, std::string("Cannot assign to read only property '") + std::string(String(property)) + "'");
        return false;
    }

    static bool has_instance(JSContextRef ctx, JSObjectRef constructor, JSValueRef value, JSValueRef* exception) {
        return has_instance(ctx, value);
    }
};

template<>
class ObjectWrap<void> {
public:
    using Internal = void;
    
    static JSClassRef get_class() {
        return nullptr;
    }
};
    
// The static class variable must be defined as well.
template<typename ClassType>
ClassType ObjectWrap<ClassType>::s_class;

template<typename ClassType>
inline JSClassRef ObjectWrap<ClassType>::create_class() {
    JSClassDefinition definition = kJSClassDefinitionEmpty;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> properties;

    definition.parentClass = ObjectWrap<ParentClassType>::get_class();
    definition.className = s_class.name.c_str();
    definition.finalize = finalize;

    if (!s_class.methods.empty()) {
        methods = get_methods(s_class.methods);
        definition.staticFunctions = methods.data();
    }
    if (!s_class.properties.empty()) {
        properties = get_properties(s_class.properties);
        definition.staticValues = properties.data();
    }

    if (s_class.index_accessor.getter || s_class.string_accessor.getter) {
        definition.getProperty = get_property;
        definition.setProperty = set_property;
    }
    else if (s_class.index_accessor.setter || s_class.string_accessor.setter) {
        definition.setProperty = set_property;
    }

    if (s_class.index_accessor.getter || s_class.string_accessor.enumerator) {
        definition.getPropertyNames = get_property_names;
    }

    return JSClassCreate(&definition);
}

template<typename ClassType>
inline JSClassRef ObjectWrap<ClassType>::create_constructor_class() {
    JSClassDefinition definition = kJSClassDefinitionEmpty;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> properties;

    definition.attributes = kJSClassAttributeNoAutomaticPrototype;
    definition.className = "Function";
    definition.initialize = initialize_constructor;
    definition.hasInstance = has_instance;

    // This must be set for `typeof constructor` to be 'function'.
    definition.callAsFunction = call;

    if (reinterpret_cast<void*>(s_class.constructor)) {
        definition.callAsConstructor = construct;
    }
    if (!s_class.static_methods.empty()) {
        methods = get_methods(s_class.static_methods);
        definition.staticFunctions = methods.data();
    }
    if (!s_class.static_properties.empty()) {
        properties = get_properties(s_class.static_properties);
        definition.staticValues = properties.data();
    }

    return JSClassCreate(&definition);
}

template<typename ClassType>
inline std::vector<JSStaticFunction> ObjectWrap<ClassType>::get_methods(const MethodMap &methods) {
    std::vector<JSStaticFunction> functions;
    functions.reserve(methods.size() + 1);

    JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    size_t index = 0;

    for (auto &pair : methods) {
        functions[index++] = {pair.first.c_str(), pair.second, attributes};
    }

    functions[index] = {0};
    return functions;
}

template<typename ClassType>
inline std::vector<JSStaticValue> ObjectWrap<ClassType>::get_properties(const PropertyMap &properties) {
    std::vector<JSStaticValue> values;
    values.reserve(properties.size() + 1);

    JSPropertyAttributes attributes = kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
    size_t index = 0;

    for (auto &pair : properties) {
        auto &prop = pair.second;
        values[index++] = {pair.first.c_str(), prop.getter, prop.setter ?: set_readonly_property, attributes};
    }

    values[index] = {0};
    return values;
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::call(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    // This should only be called as a super() call in the constructor of a subclass.
    if (!has_instance(ctx, this_object)) {
        *exception = jsc::Exception::value(ctx, s_class.name + " cannot be called as a function");
        return nullptr;
    }

    // Classes without a constructor should still be subclassable.
    if (reinterpret_cast<void*>(s_class.constructor)) {
        try {
            s_class.constructor(ctx, this_object, argc, arguments);
        }
        catch (std::exception &e) {
            *exception = jsc::Exception::value(ctx, e);
            return nullptr;
        }
    }

    return JSValueMakeUndefined(ctx);
}

template<typename ClassType>
inline JSObjectRef ObjectWrap<ClassType>::construct(JSContextRef ctx, JSObjectRef constructor, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    if (!reinterpret_cast<void*>(s_class.constructor)) {
        *exception = jsc::Exception::value(ctx, s_class.name + " is not a constructor");
        return nullptr;
    }

    JSObjectRef this_object = create_instance(ctx);
    try {
        s_class.constructor(ctx, this_object, argc, arguments);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
    return this_object;
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::initialize_constructor(JSContextRef ctx, JSObjectRef constructor) {
    static const String prototype_string = "prototype";

    // Set the prototype of the constructor to be Function.prototype.
    Object::set_prototype(ctx, constructor, Object::get_prototype(ctx, JSObjectMakeFunctionWithCallback(ctx, nullptr, call)));

    // Set the constructor prototype to be the prototype generated from the instance JSClassRef.
    JSObjectRef prototype = Object::validated_get_object(ctx, JSObjectMakeConstructor(ctx, get_class(), construct), prototype_string);
    Object::set_property(ctx, constructor, prototype_string, prototype, js::ReadOnly | js::DontEnum | js::DontDelete);
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::finalize(JSObjectRef object) {
    // This is called for the most derived class before superclasses.
    if (auto wrap = static_cast<ObjectWrap<ClassType> *>(JSObjectGetPrivate(object))) {
        delete wrap;
        JSObjectSetPrivate(object, nullptr);
    }
}

template<typename ClassType>
inline void ObjectWrap<ClassType>::get_property_names(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
    if (s_class.index_accessor.getter) {
        try {
            uint32_t length = Object::validated_get_length(ctx, object);
            char string[32];
            for (uint32_t i = 0; i < length; i++) {
                sprintf(string, "%u", i);
                JSPropertyNameAccumulatorAddName(accumulator, jsc::String(string));
            }
        }
        catch (std::exception &) {
            // Enumerating properties should never throw an exception into JS.
        }
    }
    if (auto string_enumerator = s_class.string_accessor.enumerator) {
        string_enumerator(ctx, object, accumulator);
    }
}

static inline bool try_get_int(JSStringRef property, int64_t& value) {
    value = 0;
    auto str = JSStringGetCharactersPtr(property);
    auto end = str + JSStringGetLength(property);
    while (str != end && iswspace(*str)) {
        ++str;
    }
    bool negative = false;
    if (str != end && *str == '-') {
        negative = true;
        ++str;
    }
    while (str != end && *str >= '0' && *str <= '9') {
        if (int_multiply_with_overflow_detect(value, 10)) {
            return false;
        }
        value += *str - '0';
        ++str;
    }
    if (negative) {
        value *= -1;
    }
    return str == end;
}

template<typename ClassType>
inline JSValueRef ObjectWrap<ClassType>::get_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    if (auto index_getter = s_class.index_accessor.getter) {
        int64_t num;
        if (try_get_int(property, num)) {
            uint32_t index;
            if (num < 0 || util::int_cast_with_overflow_detect(num, index)) {
                // Out-of-bounds index getters should just return undefined in JS.
                return Value::from_undefined(ctx);
            }
            return index_getter(ctx, object, index, exception);
        }
    }
    if (auto string_getter = s_class.string_accessor.getter) {
        return string_getter(ctx, object, property, exception);
    }
    return nullptr;
}

template<typename ClassType>
inline bool ObjectWrap<ClassType>::set_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    auto index_setter = s_class.index_accessor.setter;

    if (index_setter || s_class.index_accessor.getter) {
        int64_t num;
        if (try_get_int(property, num)) {
            if (num < 0) {
                *exception = Exception::value(ctx, util::format("Index %1 cannot be less than zero.", num));
                return false;
            }
            int32_t index;
            if (util::int_cast_with_overflow_detect(num, index)) {
                *exception = Exception::value(ctx, util::format("Index %1 cannot be greater than %2.",
                                                                num, std::numeric_limits<uint32_t>::max()));
                return false;
            }
            if (index_setter) {
                return index_setter(ctx, object, index, value, exception);
            }
            *exception = Exception::value(ctx, util::format("Cannot assign to read only index %1", index));
            return false;
        }
    }
    if (auto string_setter = s_class.string_accessor.setter) {
        return string_setter(ctx, object, property, value, exception);
    }
    return false;
}

} // jsc

namespace js {

template<typename ClassType>
class ObjectWrap<jsc::Types, ClassType> : public jsc::ObjectWrap<ClassType> {};

template<jsc::MethodType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, function, this_object, argc, arguments, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::ArgumentsMethodType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, this_object, jsc::Arguments{ctx, argc, arguments}, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::PropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::PropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        F(ctx, object, value);
        return true;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::IndexPropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, index, return_value);
        return return_value;
    }
    catch (std::out_of_range &) {
        // Out-of-bounds index getters should just return undefined in JS.
        return jsc::Value::from_undefined(ctx);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::IndexPropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, index, value);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::StringPropertyType::GetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, property, return_value);
        return return_value;
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return nullptr;
    }
}

template<jsc::StringPropertyType::SetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, property, value);
    }
    catch (std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
        return false;
    }
}

template<jsc::StringPropertyType::EnumeratorType F>
void wrap(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
    auto names = F(ctx, object);
    for (auto &name : names) {
        JSPropertyNameAccumulatorAddName(accumulator, name);
    }
}

} // js
} // realm

