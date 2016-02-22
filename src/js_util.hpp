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

#include <JavaScriptCore/JSContextRef.h>
#include <JavaScriptCore/JSObjectRef.h>
#include <JavaScriptCore/JSStringRef.h>

#include <math.h>
#include <string>
#include <sstream>

#include <stdexcept>
#include <cmath>
#include "property.hpp"
#include "schema.hpp"


template<typename T>
inline void RJSFinalize(JSObjectRef object) {
    delete static_cast<T>(JSObjectGetPrivate(object));
    JSObjectSetPrivate(object, NULL);
}

template<typename T>
inline JSObjectRef RJSWrapObject(JSContextRef ctx, JSClassRef jsClass, T object, JSValueRef prototype = NULL) {
    JSObjectRef ref = JSObjectMake(ctx, jsClass, (void *)object);
    if (prototype) {
        JSObjectSetPrototype(ctx, ref, prototype);
    }
    return ref;
}

template<typename T>
inline T RJSGetInternal(JSObjectRef jsObject) {
    return static_cast<T>(JSObjectGetPrivate(jsObject));
}

template<typename T>
JSClassRef RJSCreateWrapperClass(const char * name, JSObjectGetPropertyCallback getter = NULL, JSObjectSetPropertyCallback setter = NULL, const JSStaticFunction *funcs = NULL,
                                 JSObjectGetPropertyNamesCallback propertyNames = NULL) {
    JSClassDefinition classDefinition = kJSClassDefinitionEmpty;
    classDefinition.className = name;
    classDefinition.finalize = RJSFinalize<T>;
    classDefinition.getProperty = getter;
    classDefinition.setProperty = setter;
    classDefinition.staticFunctions = funcs;
    classDefinition.getPropertyNames = propertyNames;
    return JSClassCreate(&classDefinition);
}

std::string RJSStringForJSString(JSStringRef jsString);
std::string RJSStringForValue(JSContextRef ctx, JSValueRef value);
std::string RJSValidatedStringForValue(JSContextRef ctx, JSValueRef value, const char * name = nullptr);

JSStringRef RJSStringForString(const std::string &str);
JSValueRef RJSValueForString(JSContextRef ctx, const std::string &str);

inline void RJSValidateArgumentCount(size_t argumentCount, size_t expected, const char *message = NULL) {
    if (argumentCount != expected) {
        throw std::invalid_argument(message ?: "Invalid arguments");
    }
}

inline void RJSValidateArgumentCountIsAtLeast(size_t argumentCount, size_t expected, const char *message = NULL) {
    if (argumentCount < expected) {
        throw std::invalid_argument(message ?: "Invalid arguments");
    }
}

inline void RJSValidateArgumentRange(size_t argumentCount, size_t min, size_t max, const char *message = NULL) {
    if (argumentCount < min || argumentCount > max) {
        throw std::invalid_argument(message ?: "Invalid arguments");
    }
}

class RJSException : public std::runtime_error {
public:
    RJSException(JSContextRef ctx, JSValueRef &ex) : std::runtime_error(RJSStringForValue(ctx, ex)),
        m_jsException(ex) {}
    JSValueRef exception() { return m_jsException; }

private:
    JSValueRef m_jsException;
};

JSValueRef RJSMakeError(JSContextRef ctx, RJSException &exp);
JSValueRef RJSMakeError(JSContextRef ctx, std::exception &exp);
JSValueRef RJSMakeError(JSContextRef ctx, const std::string &message);

bool RJSIsValueArray(JSContextRef ctx, JSValueRef value);
bool RJSIsValueArrayBuffer(JSContextRef ctx, JSValueRef value);
bool RJSIsValueDate(JSContextRef ctx, JSValueRef value);

static inline JSObjectRef RJSValidatedValueToObject(JSContextRef ctx, JSValueRef value, const char *message = NULL) {
    JSObjectRef object = JSValueToObject(ctx, value, NULL);
    if (!object) {
        throw std::runtime_error(message ?: "Value is not an object.");
    }
    return object;
}

static inline JSObjectRef RJSValidatedValueToDate(JSContextRef ctx, JSValueRef value, const char *message = NULL) {
    JSObjectRef object = JSValueToObject(ctx, value, NULL);
    if (!object || !RJSIsValueDate(ctx, object)) {
        throw std::runtime_error(message ?: "Value is not a date.");
    }
    return object;
}

static inline JSObjectRef RJSValidatedValueToFunction(JSContextRef ctx, JSValueRef value, const char *message = NULL) {
    JSObjectRef object = JSValueToObject(ctx, value, NULL);
    if (!object || !JSObjectIsFunction(ctx, object)) {
        throw std::runtime_error(message ?: "Value is not a function.");
    }
    return object;
}

static inline double RJSValidatedValueToNumber(JSContextRef ctx, JSValueRef value) {
    if (JSValueIsNull(ctx, value)) {
        throw std::invalid_argument("`null` is not a number.");
    }
    
    JSValueRef exception = NULL;
    double number = JSValueToNumber(ctx, value, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }
    if (isnan(number)) {
        throw std::invalid_argument("Value not convertible to a number.");
    }
    return number;
}

static inline JSValueRef RJSValidatedPropertyValue(JSContextRef ctx, JSObjectRef object, JSStringRef property) {
    JSValueRef exception = NULL;
    JSValueRef propertyValue = JSObjectGetProperty(ctx, object, property, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }
    return propertyValue;
}

static inline JSValueRef RJSValidatedPropertyAtIndex(JSContextRef ctx, JSObjectRef object, unsigned int index) {
    JSValueRef exception = NULL;
    JSValueRef propertyValue = JSObjectGetPropertyAtIndex(ctx, object, index, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }
    return propertyValue;
}

static inline JSObjectRef RJSValidatedObjectProperty(JSContextRef ctx, JSObjectRef object, JSStringRef property, const char *err = NULL) {
    JSValueRef propertyValue = RJSValidatedPropertyValue(ctx, object, property);
    if (JSValueIsUndefined(ctx, propertyValue)) {
        throw std::runtime_error(err ?: "Object property '" + RJSStringForJSString(property) + "' is undefined");
    }
    return RJSValidatedValueToObject(ctx, propertyValue, err);
}

static inline JSObjectRef RJSValidatedObjectAtIndex(JSContextRef ctx, JSObjectRef object, unsigned int index) {
    return RJSValidatedValueToObject(ctx, RJSValidatedPropertyAtIndex(ctx, object, index));
}

static inline std::string RJSValidatedStringProperty(JSContextRef ctx, JSObjectRef object, JSStringRef property) {
    JSValueRef exception = NULL;
    JSValueRef propertyValue = JSObjectGetProperty(ctx, object, property, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }
    return RJSValidatedStringForValue(ctx, propertyValue, RJSStringForJSString(property).c_str());
}

static inline size_t RJSValidatedListLength(JSContextRef ctx, JSObjectRef object) {
    JSValueRef exception = NULL;
    static JSStringRef lengthString = JSStringCreateWithUTF8CString("length");
    JSValueRef lengthValue = JSObjectGetProperty(ctx, object, lengthString, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }
    if (!JSValueIsNumber(ctx, lengthValue)) {
        throw std::runtime_error("Missing property 'length'");
    }

    return RJSValidatedValueToNumber(ctx, lengthValue);
}

template<typename T>
T stot(const std::string s) {
    std::istringstream iss(s);
    T value;
    iss >> value;
    if (iss.fail()) {
        throw std::invalid_argument("Cannot convert string '" + s + "'");
    }
    return value;
}

static inline size_t RJSValidatedPositiveIndex(std::string indexStr) {
    long index = stot<long>(indexStr);
    if (index < 0) {
        throw std::out_of_range(std::string("Index ") + indexStr + " cannot be less than zero.");
    }
    return index;
}

static inline bool RJSIsValueObjectOfType(JSContextRef ctx, JSValueRef value, JSStringRef type) {
    JSObjectRef globalObject = JSContextGetGlobalObject(ctx);

    JSValueRef exception = NULL;
    JSValueRef constructorValue = JSObjectGetProperty(ctx, globalObject, type, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }

    bool ret = JSValueIsInstanceOfConstructor(ctx, value, RJSValidatedValueToObject(ctx, constructorValue), &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }

    return ret;
}
