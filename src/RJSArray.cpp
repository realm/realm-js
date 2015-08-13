//
//  RJSArray.cpp
//  RealmJS
//
//  Created by Ari Lazier on 7/21/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#include "RJSArray.hpp"
#include "RJSObject.hpp"
#include "object_accessor.hpp"

using namespace realm;

JSValueRef ArrayGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        // index subscripting
        ObjectArray *array = RJSGetInternal<ObjectArray *>(object);
        std::string indexStr = RJSStringForJSString(propertyName);
        size_t size = array->link_view->size();
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, size);
        }

        long index = std::stol(indexStr);
        if (index < 0 || index >= size) {
            throw std::range_error("Invalid index '" + indexStr + "'");
        }
        return RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->link_view->get(index)));
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

void ArrayPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    ObjectArray *array = RJSGetInternal<ObjectArray *>(object);
    char str[32];
    for (int i = 0; i < array->link_view->size(); i++) {
        sprintf(str, "%i", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

JSObjectRef RJSArrayCreate(JSContextRef ctx, realm::ObjectArray *array) {
    return RJSWrapObject<ObjectArray *>(ctx, RJSArrayClass(), array);
}


JSClassRef RJSArrayClass() {
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Object>("Results", ArrayGetProperty, NULL, NULL, NULL, ArrayPropertyNames);
    return s_objectClass;
}
