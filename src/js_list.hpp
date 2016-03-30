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

#include "js_collection.hpp"
#include "js_object.hpp"
#include "js_results.hpp"
#include "js_util.hpp"

#include "shared_realm.hpp"
#include "list.hpp"
#include "object_accessor.hpp"
#include "parser.hpp"
#include "query_builder.hpp"

#include <assert.h>

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
namespace realm {
namespace js {

template<typename T>
struct List {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using ReturnType = typename T::Return;

    static void Push(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Pop(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Unshift(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Shift(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Splice(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void StaticResults(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Filtered(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
    static void Sorted(ContextType ctx, ObjectType thisObject, size_t argCount, const ValueType args[], ReturnType &ret);
};

template<typename T>
void List<T>::Push(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
    for (size_t i = 0; i < argumentCount; i++) {
        list->add(ctx, arguments[i]);
    }
    RJSSetReturnNumber(ctx, returnObject, list->size());
}

template<typename T>
void List<T>::Pop(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCount(argumentCount, 0);
    
    size_t size = list->size();
    if (size == 0) {
        list->verify_in_transaction();
        RJSSetReturnUndefined(ctx, returnObject);
    }
    else {
        size_t index = size - 1;
        returnObject = RJSObjectCreate(ctx, Object(list->get_realm(), list->get_object_schema(), list->get(index)));
        list->remove(index);
    }
}


template<typename T>
void List<T>::Unshift(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
    for (size_t i = 0; i < argumentCount; i++) {
        list->insert(ctx, arguments[i], i);
    }
    RJSSetReturnNumber(ctx, returnObject, list->size());
}

template<typename T>
void List<T>::Shift(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCount(argumentCount, 0);
    if (list->size() == 0) {
        list->verify_in_transaction();
        RJSSetReturnUndefined(ctx, returnObject);
    }
    else {
        returnObject = RJSObjectCreate(ctx, Object(list->get_realm(), list->get_object_schema(), list->get(0)));
        list->remove(0);
    }
}

template<typename T>
void List<T>::Splice(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    size_t size = list->size();
    
    RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
    long index = std::min<long>(RJSValidatedValueToNumber(ctx, arguments[0]), size);
    if (index < 0) {
        index = std::max<long>(size + index, 0);
    }
    
    long remove;
    if (argumentCount < 2) {
        remove = size - index;
    }
    else {
        remove = std::max<long>(RJSValidatedValueToNumber(ctx, arguments[1]), 0);
        remove = std::min<long>(remove, size - index);
    }
    
    std::vector<ReturnType> removedObjects(remove);
    for (size_t i = 0; i < remove; i++) {
        removedObjects[i] = RJSObjectCreate(ctx, Object(list->get_realm(), list->get_object_schema(), list->get(index)));
        list->remove(index);
    }
    for (size_t i = 2; i < argumentCount; i++) {
        list->insert(ctx, arguments[i], index + i - 2);
    }
    RJSSetReturnArray(ctx, remove, removedObjects.data(), returnObject);
}


template<typename T>
void List<T>::StaticResults(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCount(argumentCount, 0);
    returnObject = RJSResultsCreate(ctx, list->get_realm(), list->get_object_schema(), std::move(list->get_query()), false);
}

template<typename T>
void List<T>::Filtered(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentCountIsAtLeast(argumentCount, 1);
    
    SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
    returnObject = RJSResultsCreateFiltered(ctx, sharedRealm, list->get_object_schema(), std::move(list->get_query()), argumentCount, arguments);
}

template<typename T>
void List<T>::Sorted(ContextType ctx, ObjectType thisObject, size_t argumentCount, const ValueType arguments[], ReturnType &returnObject) {
    realm::List *list = RJSGetInternal<realm::List *>(thisObject);
    RJSValidateArgumentRange(argumentCount, 1, 2);
    
    SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
    returnObject = RJSResultsCreateSorted(ctx, sharedRealm, list->get_object_schema(), std::move(list->get_query()), argumentCount, arguments);
}
    
}
}
