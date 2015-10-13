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

#include "RJSList.hpp"
#include "RJSObject.hpp"
#include "RJSUtil.hpp"
#include "object_accessor.hpp"

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm;

static inline List * RJSVerifiedList(JSObjectRef object) {
    List *list = RJSGetInternal<List *>(object);
    list->verify_attached();
    return list;
}

static inline List * RJSVerifiedMutableList(JSObjectRef object) {
    List *list = RJSVerifiedList(object);
    if (!list->realm->is_in_transaction()) {
        throw std::runtime_error("Can only mutate lists within a transaction.");
    }
    return list;
}

JSValueRef ListGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        // index subscripting
        List *list = RJSVerifiedList(object);
        size_t size = list->size();

        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, size);
        }

        return RJSObjectCreate(ctx, Object(list->realm, list->object_schema, list->get(RJSValidatedPositiveIndex(indexStr))));
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

bool ListSetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef* jsException) {
    try {
        List *list = RJSVerifiedMutableList(object);
        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            throw std::runtime_error("The 'length' property is readonly.");
        }

        list->set(RJSValidatedPositiveIndex(indexStr), RJSAccessor::to_object_index(ctx, list->realm, const_cast<JSValueRef &>(value), list->object_schema.name, false));
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

void ListPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    List *list = RJSVerifiedList(object);
    size_t size = list->size();
    
    char str[32];
    for (size_t i = 0; i < size; i++) {
        sprintf(str, "%zu", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

JSValueRef ListPush(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        List *array = RJSVerifiedMutableList(thisObject);
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

JSValueRef ListPop(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        List *list = RJSVerifiedMutableList(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);

        size_t size = list->size();
        if (size == 0) {
            return JSValueMakeUndefined(ctx);
        }
        size_t index = size - 1;
        JSValueRef obj = RJSObjectCreate(ctx, Object(list->realm, list->object_schema, list->get(index)));
        list->link_view->remove(index);
        return obj;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ListUnshift(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        List *array = RJSVerifiedMutableList(thisObject);
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

JSValueRef ListShift(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        List *list = RJSVerifiedMutableList(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);
        if (list->size() == 0) {
            return JSValueMakeUndefined(ctx);
        }
        JSValueRef obj = RJSObjectCreate(ctx, Object(list->realm, list->object_schema, list->get(0)));
        list->link_view->remove(0);
        return obj;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ListSplice(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        List *list = RJSVerifiedMutableList(thisObject);
        size_t size = list->size();

        RJSValidateArgumentCountIsAtLeast(argumentCount, 2);
        long index = std::min<long>(RJSValidatedValueToNumber(ctx, arguments[0]), size);
        if (index < 0) {
            index = std::max<long>(size + index, 0);
        }

        long remove = std::max<long>(RJSValidatedValueToNumber(ctx, arguments[1]), 0);
        remove = std::min<long>(remove, size - index);

        std::vector<JSObjectRef> removedObjects(remove);
        for (size_t i = 0; i < remove; i++) {
            removedObjects[i] = RJSObjectCreate(ctx, Object(list->realm, list->object_schema, list->get(index)));
            list->link_view->remove(index);
        }
        for (size_t i = 2; i < argumentCount; i++) {
            list->link_view->insert(index + i - 2, RJSAccessor::to_object_index(ctx, list->realm, const_cast<JSValueRef &>(arguments[i]), list->object_schema.name, false));
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

JSObjectRef RJSListCreate(JSContextRef ctx, realm::List &list) {
    return RJSWrapObject<List *>(ctx, RJSListClass(), new List(list));
}

const JSStaticFunction RJSListFuncs[] = {
    {"push", ListPush, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"pop", ListPop, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"shift", ListShift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"unshift", ListUnshift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"splice", ListSplice, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSListClass() {
    static JSClassRef s_listClass = RJSCreateWrapperClass<Object>("RealmList", ListGetProperty, ListSetProperty, RJSListFuncs, NULL, ListPropertyNames);
    return s_listClass;
}
