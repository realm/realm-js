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
#include "js_types.hpp"
#include "js_util.hpp"

#include "shared_realm.hpp"
#include "list.hpp"
#include "parser.hpp"
#include "query_builder.hpp"

namespace realm {
namespace js {

template<typename T>
struct List {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = Object<T>;
    using Value = Value<T>;
    using ReturnValue = ReturnValue<T>;

    static ObjectType create(ContextType, realm::List &);

    static void GetLength(ContextType, ObjectType, ReturnValue &);
    static void GetIndex(ContextType, ObjectType, uint32_t, ReturnValue &);
    static bool SetIndex(ContextType, ObjectType, uint32_t, ValueType);

    static void Push(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Pop(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Unshift(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Shift(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Splice(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void StaticResults(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Filtered(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void Sorted(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
};

template<typename T>
struct ObjectClass<T, realm::List> : BaseObjectClass<T, Collection> {
    using List = List<T>;

    std::string const name = "List";

    MethodMap<T> const methods = {
        {"push", wrap<List::Push>},
        {"pop", wrap<List::Pop>},
        {"unshift", wrap<List::Unshift>},
        {"shift", wrap<List::Shift>},
        {"splice", wrap<List::Splice>},
        {"snapshot", wrap<List::StaticResults>},
        {"filtered", wrap<List::Filtered>},
        {"sorted", wrap<List::Sorted>},
    };

    PropertyMap<T> const properties = {
        {"length", {wrap<List::GetLength>}},
    };

    IndexPropertyType<T> const index_accessor = {wrap<List::GetIndex>, wrap<List::SetIndex>};
};

template<typename T>
typename T::Object List<T>::create(ContextType ctx, realm::List &list) {
    return create_object<T, realm::List>(ctx, new realm::List(list));
}

template<typename T>
void List<T>::GetLength(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto list = get_internal<T, realm::List>(object);
    return_value.set((uint32_t)list->size());
}

template<typename T>
void List<T>::GetIndex(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto list = get_internal<T, realm::List>(object);
    auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

    return_value.set(RealmObject<T>::create(ctx, realm_object));
}

template<typename T>
bool List<T>::SetIndex(ContextType ctx, ObjectType object, uint32_t index, ValueType value) {
    auto list = get_internal<T, realm::List>(object);
    list->set(ctx, value, index);
    return true;
}

template<typename T>
void List<T>::Push(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, realm::List>(this_object);
    for (size_t i = 0; i < argc; i++) {
        list->add(ctx, arguments[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void List<T>::Pop(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, realm::List>(this_object);
    size_t size = list->size();
    if (size == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        size_t index = size - 1;
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

        return_value.set(RealmObject<T>::create(ctx, realm_object));
        list->remove(index);
    }
}

template<typename T>
void List<T>::Unshift(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, realm::List>(this_object);
    for (size_t i = 0; i < argc; i++) {
        list->insert(ctx, arguments[i], i);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void List<T>::Shift(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, realm::List>(this_object);
    if (list->size() == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(0));

        return_value.set(RealmObject<T>::create(ctx, realm_object));
        list->remove(0);
    }
}

template<typename T>
void List<T>::Splice(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, realm::List>(this_object);
    size_t size = list->size();
    long index = std::min<long>(Value::to_number(ctx, arguments[0]), size);
    if (index < 0) {
        index = std::max<long>(size + index, 0);
    }
    
    long remove;
    if (argc < 2) {
        remove = size - index;
    }
    else {
        remove = std::max<long>(Value::to_number(ctx, arguments[1]), 0);
        remove = std::min<long>(remove, size - index);
    }
    
    std::vector<ValueType> removed_objects;
    removed_objects.reserve(remove);

    for (size_t i = 0; i < remove; i++) {
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

        removed_objects.push_back(RealmObject<T>::create(ctx, realm_object));
        list->remove(index);
    }
    for (size_t i = 2; i < argc; i++) {
        list->insert(ctx, arguments[i], index + i - 2);
    }

    return_value.set(Object::create_array(ctx, removed_objects));
}

template<typename T>
void List<T>::StaticResults(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, realm::List>(this_object);
    return_value.set(Results<T>::create(ctx, *list, false));
}

template<typename T>
void List<T>::Filtered(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, realm::List>(this_object);
    return_value.set(Results<T>::create_filtered(ctx, *list, argc, arguments));
}

template<typename T>
void List<T>::Sorted(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);

    auto list = get_internal<T, realm::List>(this_object);
    return_value.set(Results<T>::create_sorted(ctx, *list, argc, arguments));
}
    
} // js
} // realm
