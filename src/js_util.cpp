/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "js_util.hpp"
#include <JavaScriptCore/JSStringRef.h>

using namespace realm;

JSValueRef RJSMakeError(JSContextRef ctx, RJSException &exp) {
    JSValueRef value = exp.exception();
    return JSObjectMakeError(ctx, 1, &value, NULL);
}

JSValueRef RJSMakeError(JSContextRef ctx, std::exception &exp) {
    if (RJSException *rjsExp = dynamic_cast<RJSException *>(&exp)) {
        return RJSMakeError(ctx, *rjsExp);
    }
    return RJSMakeError(ctx, exp.what());
}

JSValueRef RJSMakeError(JSContextRef ctx, const std::string &message) {
    JSValueRef value = RJSValueForString(ctx, message);
    return JSObjectMakeError(ctx, 1, &value, NULL);
}

std::string RJSStringForJSString(JSStringRef jsString) {
    std::string str;
    size_t maxSize = JSStringGetMaximumUTF8CStringSize(jsString);
    str.resize(maxSize);
    str.resize(JSStringGetUTF8CString(jsString, &str[0], maxSize) - 1);
    return str;
}

std::string RJSStringForValue(JSContextRef ctx, JSValueRef value) {
    JSValueRef exception = nullptr;
    JSStringRef jsString = JSValueToStringCopy(ctx, value, &exception);
    if (!jsString) {
        throw RJSException(ctx, exception);
    }

    std::string string = RJSStringForJSString(jsString);
    JSStringRelease(jsString);

    return string;
}

std::string RJSValidatedStringForValue(JSContextRef ctx, JSValueRef value, const char * name) {
    if (!JSValueIsString(ctx, value)) {
        if (name) {
            throw std::invalid_argument((std::string)"'" + name + "' must be of type 'String'");
        }
        else {
            throw std::invalid_argument("JSValue must be of type 'String'");
        }
    }

    return RJSStringForValue(ctx, value);
}

JSStringRef RJSStringForString(const std::string &str) {
    return JSStringCreateWithUTF8CString(str.c_str());
}

JSValueRef RJSValueForString(JSContextRef ctx, const std::string &str) {
    JSStringRef jsStr = RJSStringForString(str);
    JSValueRef value = JSValueMakeString(ctx, jsStr);
    JSStringRelease(jsStr);
    return value;
}

bool RJSIsValueArray(JSContextRef ctx, JSValueRef value) {
    static JSStringRef arrayString = JSStringCreateWithUTF8CString("Array");
    return RJSIsValueObjectOfType(ctx, value, arrayString);
}

bool RJSIsValueArrayBuffer(JSContextRef ctx, JSValueRef value) {
    static JSStringRef arrayString = JSStringCreateWithUTF8CString("ArrayBuffer");
    return RJSIsValueObjectOfType(ctx, value, arrayString);
}

bool RJSIsValueDate(JSContextRef ctx, JSValueRef value) {
    static JSStringRef dateString = JSStringCreateWithUTF8CString("Date");
    return RJSIsValueObjectOfType(ctx, value, dateString);
}
