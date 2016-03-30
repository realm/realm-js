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

#include "jsc_list.hpp"
#include "js_list.hpp"

#include <assert.h>

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm;

void ListPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    List *list = RJSGetInternal<List *>(object);
    size_t size = list->size();
    
    char str[32];
    for (size_t i = 0; i < size; i++) {
        sprintf(str, "%zu", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

using RJSList = realm::js::List<realm::jsc::Types>;
WRAP_PROPERTY_GETTER(RJSList, GetLength)
WRAP_INDEXED_GETTER(RJSList, GetIndex)
WRAP_INDEXED_SETTER(RJSList, SetIndex)
WRAP_CLASS_METHOD(RJSList, Push)
WRAP_CLASS_METHOD(RJSList, Pop)
WRAP_CLASS_METHOD(RJSList, Unshift)
WRAP_CLASS_METHOD(RJSList, Shift)
WRAP_CLASS_METHOD(RJSList, Splice)
WRAP_CLASS_METHOD(RJSList, StaticResults)
WRAP_CLASS_METHOD(RJSList, Filtered)
WRAP_CLASS_METHOD(RJSList, Sorted)

JSObjectRef RJSListCreate(JSContextRef ctx, List &list) {
    return realm::js::WrapObject<List *>(ctx, realm::js::list_class(), new List(list));
}

static const JSStaticFunction RJSListFuncs[] = {
    {"push", RJSListPush, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"pop", RJSListPop, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"shift", RJSListShift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"unshift", RJSListUnshift, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"splice", RJSListSplice, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"filtered", RJSListFiltered, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"sorted", RJSListSorted, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"snapshot", RJSListStaticResults, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

static const JSStaticValue RJSListProps[] = {
    {"length", RJSListGetLength, nullptr, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSListClass() {
    static JSClassRef s_listClass = RJSCreateWrapperClass<List *>("List", RJSListGetIndex, RJSListSetIndex, RJSListFuncs, ListPropertyNames, RJSCollectionClass(), RJSListProps);
    return s_listClass;
}

JSClassRef realm::js::list_class() { return RJSListClass(); };
