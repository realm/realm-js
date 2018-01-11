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
#include "js_object_accessor.hpp"
#include "js_realm_object.hpp"
#include "js_results.hpp"
#include "js_types.hpp"
#include "js_util.hpp"

#include "shared_realm.hpp"
#include "list.hpp"

namespace realm {
namespace js {

template<typename JSEngine>
class NativeAccessor;

template<typename T>
class List : public realm::List {
  public:
    List(std::shared_ptr<realm::Realm> r, const ObjectSchema& s, LinkViewRef l) noexcept : realm::List(r, l) {}
    List(const realm::List &l) : realm::List(l) {}

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
};

template<typename T>
struct ListClass : ClassDefinition<T, realm::js::List<T>, CollectionClass<T>> {
    using Type = T;
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

    static ObjectType create_instance(ContextType, realm::List);

    // properties
    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_type(ContextType, ObjectType, ReturnValue &);
    static void get_optional(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);
    static bool set_index(ContextType, ObjectType, uint32_t, ValueType);

    // methods
    static void push(ContextType, ObjectType, Arguments, ReturnValue &);
    static void pop(ContextType, ObjectType, Arguments, ReturnValue &);
    static void unshift(ContextType, ObjectType, Arguments, ReturnValue &);
    static void shift(ContextType, ObjectType, Arguments, ReturnValue &);
    static void splice(ContextType, ObjectType, Arguments, ReturnValue &);
    static void snapshot(ContextType, ObjectType, Arguments, ReturnValue &);
    static void filtered(ContextType, ObjectType, Arguments, ReturnValue &);
    static void sorted(ContextType, ObjectType, Arguments, ReturnValue &);
    static void is_valid(ContextType, ObjectType, Arguments, ReturnValue &);
    static void index_of(ContextType, ObjectType, Arguments, ReturnValue &);

    // observable
    static void add_listener(ContextType, ObjectType, Arguments, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments, ReturnValue &);

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
        {"indexOf", wrap<index_of>},
        {"min", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Min>>},
        {"max", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Max>>},
        {"sum", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Sum>>},
        {"avg", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Avg>>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };

    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
        {"type", {wrap<get_type>, nullptr}},
        {"optional", {wrap<get_optional>, nullptr}},
    };

    IndexPropertyType<T> const index_accessor = {wrap<get_index>, wrap<set_index>};

private:
    static void validate_value(ContextType, realm::List&, ValueType);
};

template<typename T>
typename T::Object ListClass<T>::create_instance(ContextType ctx, realm::List list) {
    return create_object<T, ListClass<T>>(ctx, new realm::js::List<T>(std::move(list)));
}

template<typename T>
void ListClass<T>::get_length(ContextType, ObjectType object, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::get_type(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    return_value.set(string_for_property_type(list->get_type() & ~realm::PropertyType::Flags));
}

template<typename T>
void ListClass<T>::get_optional(ContextType, ObjectType object, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    return_value.set(is_nullable(list->get_type()));
}

template<typename T>
void ListClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    NativeAccessor<T> accessor(ctx, *list);
    return_value.set(list->get(accessor, index));
}

template<typename T>
bool ListClass<T>::set_index(ContextType ctx, ObjectType object, uint32_t index, ValueType value) {
    auto list = get_internal<T, ListClass<T>>(object);
    validate_value(ctx, *list, value);
    NativeAccessor<T> accessor(ctx, *list);
    list->set(accessor, index, value);
    return true;
}

template<typename T>
void ListClass<T>::push(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    for (size_t i = 0; i < args.count; i++) {
        validate_value(ctx, *list, args[i]);
    }

    NativeAccessor<T> accessor(ctx, *list);
    for (size_t i = 0; i < args.count; i++) {
        list->add(accessor, args[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::pop(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    auto size = static_cast<unsigned int>(list->size());
    if (size == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        get_index(ctx, this_object, size - 1, return_value);
        list->remove(size - 1);
    }
}

template<typename T>
void ListClass<T>::unshift(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    for (size_t i = 0; i < args.count; i++) {
        validate_value(ctx, *list, args[i]);
    }

    NativeAccessor<T> accessor(ctx, *list);
    for (size_t i = 0; i < args.count; i++) {
        list->insert(accessor, i, args[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::shift(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    if (list->size() == 0) {
        list->verify_in_transaction();
        return_value.set_undefined();
    }
    else {
        get_index(ctx, this_object, 0, return_value);
        list->remove(0);
    }
}

template<typename T>
void ListClass<T>::splice(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    size_t size = list->size();
    long index = std::min<long>(Value::to_number(ctx, args[0]), size);
    if (index < 0) {
        index = std::max<long>(size + index, 0);
    }

    size_t remove;
    if (args.count < 2) {
        remove = size - index;
    }
    else {
        remove = std::max<long>(Value::to_number(ctx, args[1]), 0);
        remove = std::min<long>(remove, size - index);
    }

    std::vector<ValueType> removed_objects;
    removed_objects.reserve(remove);

    NativeAccessor<T> accessor(ctx, *list);
    for (size_t i = 0; i < remove; i++) {
        removed_objects.push_back(list->get(accessor, index));
        list->remove(index);
    }
    for (size_t i = 2; i < args.count; i++) {
        list->insert(accessor, index + i - 2, args[i]);
    }

    return_value.set(Object::create_array(ctx, removed_objects));
}

template<typename T>
void ListClass<T>::snapshot(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, list->snapshot()));
}

template<typename T>
void ListClass<T>::filtered(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_filtered(ctx, *list, args));
}

template<typename T>
void ListClass<T>::sorted(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, list->sort(ResultsClass<T>::get_keypaths(ctx, args))));
}

template<typename T>
void ListClass<T>::is_valid(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    return_value.set(get_internal<T, ListClass<T>>(this_object)->is_valid());
}

template<typename T>
void ListClass<T>::index_of(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto fn = [&](auto&& row) {
        auto list = get_internal<T, ListClass<T>>(this_object);
        NativeAccessor<T> accessor(ctx, *list);
        return list->find(accessor, row);
    };
    ResultsClass<T>::index_of(ctx, fn, args, return_value);
}

template<typename T>
void ListClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    ResultsClass<T>::add_listener(ctx, *list, this_object, args);
}

template<typename T>
void ListClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(this_object);
    ResultsClass<T>::remove_listener(ctx, *list, this_object, args);
}

template<typename T>
void ListClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto list = get_internal<T, ListClass<T>>(this_object);
    list->m_notification_tokens.clear();
}

template<typename T>
void ListClass<T>::validate_value(ContextType ctx, realm::List& list, ValueType value) {
    auto type = list.get_type();
    StringData object_type;
    if (type == realm::PropertyType::Object) {
        object_type = list.get_object_schema().name;
    }
    if (!Value::is_valid_for_property_type(ctx, value, type, object_type)) {
        throw TypeErrorException("Property", object_type ? object_type : string_for_property_type(type), Value::to_string(ctx, value));
    }
}

} // js
} // realm
