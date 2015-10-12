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

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm;

size_t ObjectArray::size() {
    return link_view->size();
}

Row ObjectArray::get(std::size_t row_ndx) {
    verify_valid_row(row_ndx);
    return link_view->get(row_ndx);
}

void ObjectArray::set(std::size_t row_ndx, std::size_t target_row_ndx) {
    verify_valid_row(row_ndx);
    link_view->set(row_ndx, target_row_ndx);
}

void ObjectArray::verify_valid_row(std::size_t row_ndx) {
    size_t size = link_view->size();
    if (row_ndx >= size) {
        throw std::out_of_range(std::string("Index ") + std::to_string(row_ndx) + " is outside of range 0..." + std::to_string(size) + ".");
    }
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

static inline ObjectArray * RJSVerifiedMutableArray(JSObjectRef object) {
    ObjectArray *array = RJSVerifiedArray(object);
    if (!array->realm->is_in_transaction()) {
        throw std::runtime_error("Can only mutate lists within a transaction.");
    }
    return array;
}

static inline size_t RJSVerifiedPositiveIndex(std::string indexStr) {
    long index = std::stol(indexStr);
    if (index < 0) {
        throw std::out_of_range(std::string("Index ") + indexStr + " cannot be less than zero.");
    }
    return index;
}

JSValueRef ArrayGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        // index subscripting
        ObjectArray *array = RJSVerifiedArray(object);
        size_t size = array->size();

        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, size);
        }

        return RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(RJSVerifiedPositiveIndex(indexStr))));
    }
    catch (std::out_of_range &exp) {
        // getters for nonexistent properties in JS should always return undefined
        return JSValueMakeUndefined(ctx);
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

bool ArraySetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedMutableArray(object);
        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            throw std::runtime_error("The 'length' property is readonly.");
        }

        array->set(RJSVerifiedPositiveIndex(indexStr), RJSAccessor::to_object_index(ctx, array->realm, const_cast<JSValueRef &>(value), array->object_schema.name, false));
        return true;
    }
    catch (std::invalid_argument &exp) {
        // for stol failure this could be another property that is handled externally, so ignore
        return false;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return false;
    }
}

void ArrayPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    ObjectArray *array = RJSVerifiedArray(object);
    size_t size = array->size();
    
    char str[32];
    for (size_t i = 0; i < size; i++) {
        sprintf(str, "%zu", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

JSValueRef ArrayPush(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        ObjectArray *array = RJSVerifiedMutableArray(thisObject);
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
        ObjectArray *array = RJSVerifiedMutableArray(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);

        size_t size = array->size();
        if (size == 0) {
            return JSValueMakeUndefined(ctx);
        }
        size_t index = size - 1;
        JSValueRef obj = RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(index)));
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
        ObjectArray *array = RJSVerifiedMutableArray(thisObject);
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
        ObjectArray *array = RJSVerifiedMutableArray(thisObject);
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
        ObjectArray *array = RJSVerifiedMutableArray(thisObject);
        size_t size = array->size();

        RJSValidateArgumentCountIsAtLeast(argumentCount, 2);
        long index = std::min<long>(RJSValidatedValueToNumber(ctx, arguments[0]), size);
        if (index < 0) {
            index = std::max<long>(size + index, 0);
        }

        long remove = std::max<long>(RJSValidatedValueToNumber(ctx, arguments[1]), 0);
        remove = std::min<long>(remove, size - index);

        std::vector<JSObjectRef> removedObjects(remove);
        for (size_t i = 0; i < remove; i++) {
            removedObjects[i] = RJSObjectCreate(ctx, Object(array->realm, array->object_schema, array->get(index)));
            array->link_view->remove(index);
        }
        for (size_t i = 2; i < argumentCount; i++) {
            array->link_view->insert(index + i - 2, RJSAccessor::to_object_index(ctx, array->realm, const_cast<JSValueRef &>(arguments[i]), array->object_schema.name, false));
        }
        return JSObjectMakeArray(ctx, remove, removedObjects.data(), jsException);
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

const JSStaticFunction RJSArrayFuncs[] = {
    {"push", ArrayPush, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"pop", ArrayPop, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"shift", ArrayShift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"unshift", ArrayUnshift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"splice", ArraySplice, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSArrayClass() {
    static JSClassRef s_arrayClass = RJSCreateWrapperClass<Object>("RealmArray", ArrayGetProperty, ArraySetProperty, RJSArrayFuncs, NULL, ArrayPropertyNames);
    return s_arrayClass;
}
