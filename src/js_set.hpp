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

#include <realm/object-store/shared_realm.hpp>
#include <realm/object-store/set.hpp>

namespace realm {
namespace js {

template<typename JSEngine>
class NativeAccessor;

template<typename T>
class Set : public realm::object_store::Set {
  public:
    Set(const realm::object_store::Set &set) : realm::object_store::Set(set) {}

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
};

template<typename T>
struct SetClass : ClassDefinition<T, realm::js::Set<T>, CollectionClass<T>> {
    using Type = T;
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

    static ObjectType create_instance(ContextType, realm::object_store::Set);

    // properties
    static void get_length(ContextType, ObjectType, ReturnValue &);
//     static void get_type(ContextType, ObjectType, ReturnValue &);
//     static void get_optional(ContextType, ObjectType, ReturnValue &);
     static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);
     static void get_type(ContextType, ObjectType, ReturnValue &);

//     static bool set_index(ContextType, ObjectType, uint32_t, ValueType);

//     // methods
//     static void push(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void add(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void get(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void clear(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void delete_element(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void has(ContextType, ObjectType, Arguments &, ReturnValue &);


    static void filtered(ContextType, ObjectType, Arguments &, ReturnValue &);

//     static void unshift(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void shift(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void splice(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void snapshot(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void filtered(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void sorted(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void is_valid(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void is_empty(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void index_of(ContextType, ObjectType, Arguments &, ReturnValue &);

//     // observable
//     static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
//     static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);

     std::string const name = "Set";

     MethodMap<T> const methods = {
         {"add", wrap<add>},
         {"get", wrap<get>},
         {"clear", wrap<clear>},
         {"delete", wrap<delete_element>},
         {"has", wrap<has>},
         {"filtered", wrap<filtered>}


//         {"min", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Min>>},
//         {"max", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Max>>},
//         {"sum", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Sum>>},
//         {"avg", wrap<compute_aggregate_on_collection<ListClass<T>, AggregateFunc::Avg>>},
//         {"addListener", wrap<add_listener>},
//         {"removeListener", wrap<remove_listener>},
//         {"removeAllListeners", wrap<remove_all_listeners>},
     };

     PropertyMap<T> const properties = {
         {"size", {wrap<get_length>, nullptr}},
         {"length", {wrap<get_length>, nullptr}},       // length property is required for, e.g., JavaScript serialization
         {"type", {wrap<get_type>, nullptr}},
//         {"optional", {wrap<get_optional>, nullptr}},
     };

     IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};

private:
    static void validate_value(ContextType, realm::object_store::Set &, ValueType);
};

template<typename T>
typename T::Object SetClass<T>::create_instance(ContextType ctx, realm::object_store::Set set) {
    return create_object<T, SetClass<T>>(ctx, new realm::js::Set<T>(std::move(set)));
}

template<typename T>
void SetClass<T>::get_length(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto set = get_internal<T, SetClass<T>>(ctx, object);
    return_value.set(static_cast<uint32_t>(set->size()));
}

// template<typename T>
// void ListClass<T>::get_type(ContextType ctx, ObjectType object, ReturnValue &return_value) {
//     auto list = get_internal<T, ListClass<T>>(ctx, object);
//     return_value.set(local_string_for_property_type(list->get_type() & ~realm::PropertyType::Flags));
// }

// template<typename T>
// void ListClass<T>::get_optional(ContextType ctx, ObjectType object, ReturnValue &return_value) {
//     auto list = get_internal<T, ListClass<T>>(ctx, object);
//     return_value.set(is_nullable(list->get_type()));
// }

template<typename T>
void SetClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto set = get_internal<T, SetClass<T>>(ctx, object);
    NativeAccessor<T> accessor(ctx, *set);
    return_value.set(set->get(accessor, index));
}

// template<typename T>
// bool SetClass<T>::set_index(ContextType ctx, ObjectType object, uint32_t index, ValueType value) {
//     // auto set = get_internal<T, SetClass<T>>(ctx, object);
//     // validate_value(ctx, *set, value);
//     // NativeAccessor<T> accessor(ctx, *set);
//     // set->set(accessor, index, value);
//     return true;
// }

// template<typename T>
// void ListClass<T>::push(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
//     auto list = get_internal<T, ListClass<T>>(ctx, this_object);
//     for (size_t i = 0; i < args.count; i++) {
//         validate_value(ctx, *list, args[i]);
//     }

//     NativeAccessor<T> accessor(ctx, *list);
//     for (size_t i = 0; i < args.count; i++) {
//         list->add(accessor, args[i]);
//     }

//     return_value.set((uint32_t)list->size());
// }

template<typename T>
void SetClass<T>::add(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);

    for (size_t i = 0; i < args.count; i++) {
        validate_value(ctx, *set, args[i]);
    }

    NativeAccessor<T> accessor(ctx, *set);
    for (size_t i = 0; i < args.count; i++) {
        set->insert(accessor, args[i]);
    }

    return_value.set(this_object);
}

template<typename T>
void SetClass<T>::get(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    // auto size = static_cast<unsigned int>(set->size());
    // if (size == 0) {
    //     set->verify_in_transaction();
    //     return_value.set_undefined();
    // }
    // else {
    //     get_index(ctx, this_object, size - 1, return_value);
    //     list->remove(size - 1);
    // }

    // TODO: assert that args[0] is a number

    NativeAccessor<T> accessor(ctx, *set);
    auto const value_type = set->get_type();

    switch_on_type(value_type, [&](auto const type_indicator) -> void {
        try {
            using element_type = std::remove_pointer_t<decltype(type_indicator)>;
            int requested_index = Value::validated_to_number(ctx, args[0]);
            realm::Mixed element_value = set->template get<std::remove_pointer_t<decltype(type_indicator)>>(requested_index);
            return_value.set(element_value);
        } catch (...) {
            // TODO:  propagate exception to JS
        }
    });

    // TODO:  Select correct type for return value from Mixed


    // auto huhu = set->get(ctx, Value::to_number(ctx, args[0]));

    // return_value.set(huhu);
}

template<typename T>
void SetClass<T>::clear(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    set->remove_all();
    return_value.set_undefined();
}

template<typename T>
void SetClass<T>::delete_element(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    auto const index = args[0];

    validate_value(ctx, *set, index);
    NativeAccessor<T> accessor(ctx, *set);
    std::pair<size_t, bool> const success = set->remove(accessor, index);

    return_value.set(success.second);
}

/**
 * @brief Implements JavaScript Set's has() method.
 *  
 *   has() checks whether the given element exists in the set.
 *   Sets return_value to true if the element is found, false otherwise.
 * 
 * @param args The element to look for (one element only)
 * @param ctx
 * @param this_object
 * @param return_value Structure holding the return value
 */
template<typename T>
void SetClass<T>::has(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    auto const value = args[0];

    validate_value(ctx, *set, value);
    NativeAccessor<T> accessor(ctx, *set);

    // set->find will return npos if the element is not found
    size_t const index = set->find(accessor, value);
    return_value.set(index != npos);
}

template<typename T>
void SetClass<T>::filtered(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    return_value.set(ResultsClass<T>::create_filtered(ctx, *set, args));
}


template<typename T>
void SetClass<T>::get_type(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto const set = get_internal<T, ListClass<T>>(ctx, object);
    return_value.set(local_string_for_property_type(set->get_type() & ~realm::PropertyType::Flags));
}


template<typename T>
void SetClass<T>::validate_value(ContextType ctx, realm::object_store::Set &set, ValueType value) {
    auto type = set.get_type();
    StringData object_type;
    if (type == realm::PropertyType::Object) {
        object_type = set.get_object_schema().name;
    }
    if (!Value::is_valid_for_property_type(ctx, value, type, object_type)) {
        throw TypeErrorException("Property", object_type ? object_type : local_string_for_property_type(type), Value::to_string(ctx, value));
    }
}

} // js
} // realm
