////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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
