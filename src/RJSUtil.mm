//
//  RJSUtil.m
//  RealmJS
//
//  Created by Ari Lazier on 4/27/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"

void RJSRegisterGlobalClass(JSContextRef ctx, JSObjectRef globalObject, JSClassRef classRef, const char * name, JSValueRef *exception) {
    JSObjectRef classObject = JSObjectMake(ctx, classRef, NULL);
    JSStringRef nameString = JSStringCreateWithUTF8CString(name);
    JSObjectSetProperty(ctx, globalObject, nameString, classObject, kJSPropertyAttributeNone, exception);
    JSStringRelease(nameString);
}

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

std::string RJSValidatedStringForValue(JSContextRef ctx, JSValueRef value, const char * name) {
    if (!JSValueIsString(ctx, value)) {
        if (name) {
            throw std::invalid_argument((std::string)"'" + name + "' must be of type 'string'");
        }
        else {
            throw std::invalid_argument("JSValue must be of type 'string'");
        }
    }

    JSValueRef *exception;
    JSStringRef jsString = JSValueToStringCopy(ctx, value, exception);
    if (!jsString) {
        throw RJSException(ctx, *exception);
    }

    return RJSStringForJSString(jsString);
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
