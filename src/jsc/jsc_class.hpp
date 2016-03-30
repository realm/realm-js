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
using ObjectClass = js::ObjectClass<Types, T>;

using BaseObjectClass = js::BaseObjectClass<Types>;
using ConstructorType = js::ConstructorType<Types>;
using MethodType = js::MethodType<Types>;
using PropertyGetterType = js::PropertyGetterType<Types>;
using PropertySetterType = js::PropertySetterType<Types>;
using IndexPropertyGetterType = js::IndexPropertyGetterType<Types>;
using IndexPropertySetterType = js::IndexPropertySetterType<Types>;
using StringPropertyGetterType = js::StringPropertyGetterType<Types>;
using StringPropertySetterType = js::StringPropertySetterType<Types>;
using StringPropertyEnumeratorType = js::StringPropertyEnumeratorType<Types>;

template<typename T>
static inline T stot(const std::string &s) {
    std::istringstream iss(s);
    T value;
    iss >> value;
    if (iss.fail()) {
        throw std::invalid_argument("Cannot convert string '" + s + "'");
    }
    return value;
}

template<typename T>
class ObjectWrap {
    static ObjectClass<T> s_class;

    std::unique_ptr<T> m_object;

    ObjectWrap(T* object = nullptr) : m_object(object) {}

    static JSObjectRef construct(JSContextRef ctx, JSObjectRef constructor, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
        JSObjectRef this_object = ObjectWrap<T>::create(ctx, nullptr);
        try {
            s_class.constructor(ctx, this_object, argc, arguments);
        }
        catch(std::exception &e) {
            *exception = jsc::Exception::value(ctx, e);
        }
        return this_object;
    }

    static JSValueRef get_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
        if (auto index_getter = s_class.index_accessor.getter) {
            try {
                uint32_t index = validated_positive_index(jsc::String(property));
                return index_getter(ctx, object, index, exception);
            }
            catch (std::out_of_range &) {}
            catch (std::invalid_argument &) {}
        }
        if (auto string_getter = s_class.string_accessor.getter) {
            return string_getter(ctx, object, property, exception);
        }
        return NULL;
    }

    static bool set_property(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
        if (auto index_setter = s_class.index_accessor.setter) {
            try {
                uint32_t index = validated_positive_index(jsc::String(property));
                return index_setter(ctx, object, index, value, exception);
            }
            catch (std::out_of_range &) {}
            catch (std::invalid_argument &) {}
        }
        if (auto string_setter = s_class.string_accessor.setter) {
            return string_setter(ctx, object, property, value, exception);
        }
        return false;
    }

    static void get_property_names(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
        if (s_class.index_accessor.getter) {
            try {
                uint32_t length = Object::validated_get_length(ctx, object);
                char string[32];
                for (uint32_t i = 0; i < length; i++) {
                    sprintf(string, "%lu", i);
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

    template<typename U>
    static JSClassRef get_superclass(BaseObjectClass*) {
        return nullptr;
    }
    template<typename U>
    static JSClassRef get_superclass(ObjectClass<U>*) {
        return ObjectWrap<U>::get_class();
    }

    static JSClassRef create_class() {
        JSStaticFunction staticFunctions[s_class.methods.size() + 1];
        JSStaticValue staticValues[s_class.properties.size() + 1];
        JSClassDefinition definition;

        // TODO: Set parentClass ensuring finalize is setup to do the right thing.
        definition.finalize = finalize;

        if (s_class.constructor) {
            // TODO: Correctly setup constructor class with static methods/properties.
            // definition.callAsConstructor = construct;
        }
        if (s_class.index_accessor.getter || s_class.string_accessor.getter) {
            definition.getProperty = get_property;
        }
        if (s_class.index_accessor.setter || s_class.string_accessor.setter) {
            definition.setProperty = set_property;
        }
        if (s_class.index_accessor.getter || s_class.string_accessor.enumerator) {
            definition.getPropertyNames = get_property_names;
        }

        if (!s_class.methods.empty()) {
            JSPropertyAttributes attributes = kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
            size_t index = 0;

            for (auto &pair : s_class.methods) {
                staticFunctions[index++] = {pair.first.c_str(), pair.second, attributes};
            }

            staticFunctions[index] = {0};
            definition.staticFunctions = staticFunctions;
        }

        if (!s_class.properties.empty()) {
            JSPropertyAttributes attributes = kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;
            size_t index = 0;

            for (auto &pair : s_class.properties) {
                auto &prop = pair.second;
                staticValues[index++] = {pair.first.c_str(), prop.getter, prop.setter, attributes | (prop.setter ? 0 : kJSPropertyAttributeReadOnly)};
            }

            staticValues[index] = {0};
            definition.staticValues = staticValues;
        }

        return JSClassCreate(&definition);
    }

    static JSClassRef get_class() {
        static JSClassRef js_class = create_class();
        return js_class;
    }

    static void finalize(JSObjectRef object) {
        delete static_cast<ObjectWrap<T> *>(JSObjectGetPrivate(object));
    }

    static JSObjectRef uncallable_constructor(JSContextRef ctx, JSObjectRef constructor, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
        *exception = jsc::Exception::value(ctx, "Illegal constructor");
        return NULL;
    }

  public:
    operator T*() const {
        return m_object.get();
    }

    static JSObjectRef create(JSContextRef ctx, T* internal = nullptr) {
        return JSObjectMake(ctx, get_class(), new ObjectWrap<T>(internal));
    }

    static JSObjectRef create_constructor(JSContextRef ctx) {
        return JSObjectMakeConstructor(ctx, get_class(), uncallable_constructor);
    }

    static bool has_instance(JSContextRef ctx, JSValueRef value) {
        return JSValueIsObjectOfClass(ctx, value, get_class());
    }
};

// The declared static variables must be defined as well.
template<typename T> ObjectClass<T> ObjectWrap<T>::s_class;

} // jsc

namespace js {

template<jsc::MethodType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef function, JSObjectRef this_object, size_t argc, const JSValueRef arguments[], JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, this_object, argc, arguments, return_value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return return_value;
}

template<jsc::PropertyGetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, return_value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return return_value;
}

template<jsc::PropertySetterType F>
void wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        F(ctx, object, value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
}

template<jsc::IndexPropertyGetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, index, return_value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return return_value;
}

template<jsc::IndexPropertySetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, uint32_t index, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, index, value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return false;
}

template<jsc::StringPropertyGetterType F>
JSValueRef wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef* exception) {
    jsc::ReturnValue return_value(ctx);
    try {
        F(ctx, object, property, return_value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return return_value;
}

template<jsc::StringPropertySetterType F>
bool wrap(JSContextRef ctx, JSObjectRef object, JSStringRef property, JSValueRef value, JSValueRef* exception) {
    try {
        return F(ctx, object, property, value);
    }
    catch(std::exception &e) {
        *exception = jsc::Exception::value(ctx, e);
    }
    return false;
}

template<jsc::StringPropertyEnumeratorType F>
void wrap(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef accumulator) {
    auto names = F(ctx, object);
    for (auto &name : names) {
        JSPropertyNameAccumulatorAddName(accumulator, name);
    }
}

} // js
} // realm

