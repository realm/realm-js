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
#include "js_realm_object.hpp"
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
struct ListClass : ClassDefinition<T, realm::List, CollectionClass<T>> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;

    static ObjectType create_instance(ContextType, realm::List);

    // properties
    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);
    static bool set_index(ContextType, ObjectType, uint32_t, ValueType);

    // methods
    static void push(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void pop(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void unshift(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void shift(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void splice(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void snapshot(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void filtered(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void sorted(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void is_valid(ContextType, ObjectType, size_t, const ValueType [], ReturnValue &);

    std::string const name = "List";

    MethodMap<T> const methods = {
        {"push", wrap<push>},
        {"pop", wrap<pop>},
        {"unshift", wrap<unshift>},
        {"shift", wrap<shift>},
        {"splice", wrap<splice>},
        {"snapshot", wrap<snapshot>},
        {"filtered", wrap<filtered>},
        {"sorted", wrap<sorted>},
        {"isValid", wrap<is_valid>},
    };

    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
    };

    IndexPropertyType<T> const index_accessor = {wrap<get_index>, wrap<set_index>};
};

template<typename T>
typename T::Object ListClass<T>::create_instance(ContextType ctx, realm::List list) {
    return create_object<T, ListClass<T>>(ctx, new realm::List(std::move(list)));
}

template<typename T>
void ListClass<T>::get_length(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
bool ListClass<T>::set_index(ContextType ctx, ObjectType object, uint32_t index, ValueType value) {
    auto list = get_internal<T, ListClass<T>>(object);
    list->set(ctx, value, index);
    return true;
}

template<typename T>
void ListClass<T>::push(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    for (size_t i = 0; i < argc; i++) {
        list->add(ctx, arguments[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::pop(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    size_t size = list->size();
    if (size == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        size_t index = size - 1;
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

        return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
        list->remove(index);
    }
}

template<typename T>
void ListClass<T>::unshift(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    for (size_t i = 0; i < argc; i++) {
        list->insert(ctx, arguments[i], i);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::shift(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    if (list->size() == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(0));

        return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
        list->remove(0);
    }
}

template<typename T>
void ListClass<T>::splice(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    size_t size = list->size();
    long index = std::min<long>(Value::to_number(ctx, arguments[0]), size);
    if (index < 0) {
        index = std::max<long>(size + index, 0);
    }

    size_t remove;
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

        removed_objects.push_back(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
        list->remove(index);
    }
    for (size_t i = 2; i < argc; i++) {
        list->insert(ctx, arguments[i], index + i - 2);
    }

    return_value.set(Object::create_array(ctx, removed_objects));
}

template<typename T>
void ListClass<T>::snapshot(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, *list, false));
}

template<typename T>
void ListClass<T>::filtered(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_filtered(ctx, *list, argc, arguments));
}

template<typename T>
void ListClass<T>::sorted(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_sorted(ctx, *list, argc, arguments));
}
    
template<typename T>
void ListClass<T>::is_valid(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    return_value.set(get_internal<T, ListClass<T>>(this_object)->is_valid());
}

} // js
} // realm
