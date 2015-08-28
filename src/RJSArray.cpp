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
#include "RJSUtil.hpp"
#include "object_accessor.hpp"

using namespace realm;

size_t ObjectArray::size() {
    return link_view->size();
}

Row ObjectArray::get(std::size_t row_ndx) {
    if (row_ndx >= link_view->size()) {
        throw std::range_error(std::string("Index ") + std::to_string(row_ndx) + " is outside of range 0..." +
                               std::to_string(link_view->size()) + ".");
    }
    return link_view->get(row_ndx);
}

void ObjectArray::verify_attached() {
    if (!link_view->is_attached()) {
        throw std::runtime_error("Tableview is not attached");
    }
    link_view->sync_if_needed();
}

static inline ObjectArray * RJSVerifiedArray(JSObjectRef object) {
    ObjectArray *array = RJSGetInternal<ObjectArray *>(object);
    array->verify_attached();
    return array;
}

JSValueRef ArrayGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        // index subscripting
        ObjectArray *array = RJSVerifiedArray(object);
        array->verify_attached();
        size_t size = array->size();

        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, size);
        }

        return RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(std::stol(indexStr))));
    }
    catch (std::invalid_argument &exp) {
        // for stol failure this could be another property that is handled externally, so ignore
        return NULL;
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

JSValueRef ArrayPush(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedArray(thisObject);
        RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
        for (size_t i = 0; i < argumentCount; i++) {
            array->link_view->add(RJSAccessor::to_object_index(ctx, array->realm, const_cast<JSValueRef &>(arguments[i]), array->object_schema.name, false));
        }
        return JSValueMakeNumber(ctx, array->link_view->size());
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ArrayPop(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedArray(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);
        if (array->link_view->size() == 0) {
            return JSValueMakeUndefined(ctx);
        }
        size_t index = array->link_view->size()-1;
        JSValueRef obj = RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(array->link_view->size()-1)));
        array->link_view->remove(index);
        return obj;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ArrayUnshift(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedArray(thisObject);
        RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
        for (size_t i = 0; i < argumentCount; i++) {
            array->link_view->insert(i, RJSAccessor::to_object_index(ctx, array->realm, const_cast<JSValueRef &>(arguments[i]), array->object_schema.name, false));
        }
        return JSValueMakeNumber(ctx, array->link_view->size());
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ArrayShift(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedArray(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);
        if (array->size() == 0) {
            return JSValueMakeUndefined(ctx);
        }
        JSValueRef obj = RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(0)));
        array->link_view->remove(0);
        return obj;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ArraySplice(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedArray(thisObject);
        RJSValidateArgumentCountIsAtLeast(argumentCount, 2);
        long index = RJSValidatedValueToNumber(ctx, arguments[0]);
        if (index < 0) {
            index = array->size() + index;
        }

        long remove = RJSValidatedValueToNumber(ctx, arguments[1]);
        if (index + remove > array->size()) {
            throw std::runtime_error("Attempting to slice elements beyond Array bounds.");
        }

        while (remove-- > 0) {
            array->link_view->remove(index);
        }
        for (size_t i = 2; i < argumentCount; i++) {
            array->link_view->insert(index + i - 2, RJSAccessor::to_object_index(ctx, array->realm, const_cast<JSValueRef &>(arguments[i]), array->object_schema.name, false));
        }
        return JSValueMakeNumber(ctx, array->link_view->size());
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSObjectRef RJSArrayCreate(JSContextRef ctx, realm::ObjectArray *array) {
    return RJSWrapObject<ObjectArray *>(ctx, RJSArrayClass(), array);
}

JSClassRef RJSArrayClass() {
    const JSStaticFunction arrayFuncs[] = {
        {"push", ArrayPush, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {"pop", ArrayPop, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {"shift", ArrayShift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {"unshift", ArrayUnshift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {"splice", ArraySplice, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {NULL, NULL},
    };
    static JSClassRef s_arrayClass = RJSCreateWrapperClass<Object>("RealmArray", ArrayGetProperty, NULL, arrayFuncs, NULL, ArrayPropertyNames);
    return s_arrayClass;
}
