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
#include "parser.hpp"
#include "query_builder.hpp"

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
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;

    static ObjectType create_instance(ContextType, realm::List);

    // properties
    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);
    static bool set_index(ContextType, ObjectType, uint32_t, ValueType);

    // methods
    static void push(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void pop(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void unshift(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void shift(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void splice(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void snapshot(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void filtered(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void sorted(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void is_valid(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void index_of(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

    // observable
    static void add_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void remove_all_listeners(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
    
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
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };

    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
    };

    IndexPropertyType<T> const index_accessor = {wrap<get_index>, wrap<set_index>};
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
void ListClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto list = get_internal<T, ListClass<T>>(object);
    auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
bool ListClass<T>::set_index(ContextType ctx, ObjectType object, uint32_t index, ValueType value) {
    auto list = get_internal<T, ListClass<T>>(object);
    NativeAccessor<T> accessor(ctx, list->get_realm(), list->get_object_schema());
    list->set(accessor, index, value);
    return true;
}

template<typename T>
void ListClass<T>::push(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    NativeAccessor<T> accessor(ctx, list->get_realm(), list->get_object_schema());
    for (size_t i = 0; i < argc; i++) {
        list->add(accessor, arguments[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::pop(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void ListClass<T>::unshift(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    NativeAccessor<T> accessor(ctx, list->get_realm(), list->get_object_schema());
    for (size_t i = 0; i < argc; i++) {
        list->insert(accessor, i, arguments[i]);
    }

    return_value.set((uint32_t)list->size());
}

template<typename T>
void ListClass<T>::shift(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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
void ListClass<T>::splice(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
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

    NativeAccessor<T> accessor(ctx, list->get_realm(), list->get_object_schema());
    for (size_t i = 0; i < remove; i++) {
        auto realm_object = realm::Object(list->get_realm(), list->get_object_schema(), list->get(index));

        removed_objects.push_back(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
        list->remove(index);
    }
    for (size_t i = 2; i < argc; i++) {
        list->insert(accessor, index + i - 2, arguments[i]);
    }

    return_value.set(Object::create_array(ctx, removed_objects));
}

template<typename T>
void ListClass<T>::snapshot(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, list->snapshot()));
}

template<typename T>
void ListClass<T>::filtered(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_filtered(ctx, *list, argc, arguments));
}

template<typename T>
void ListClass<T>::sorted(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);

    auto list = get_internal<T, ListClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_sorted(ctx, *list, argc, arguments));
}
    
template<typename T>
void ListClass<T>::is_valid(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    return_value.set(get_internal<T, ListClass<T>>(this_object)->is_valid());
}

template<typename T>
void ListClass<T>::index_of(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);

    ObjectType arg = Value::validated_to_object(ctx, arguments[0]);
    if (Object::template is_instance<RealmObjectClass<T>>(ctx, arg)) {
        auto object = get_internal<T, RealmObjectClass<T>>(arg);
        if (!object->is_valid()) {
            throw std::runtime_error("Object is invalid. Either it has been previously deleted or the Realm it belongs to has been closed.");
        }

        auto list = get_internal<T, ListClass<T>>(this_object);
        size_t ndx = list->find(object->row());

        if (ndx == realm::not_found) {
            return_value.set(-1);
        }
        else {
            return_value.set((uint32_t)ndx);
        }
    }
    else {
        return_value.set(-1);
    }
}

template<typename T>
void ListClass<T>::add_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);
    
    auto list = get_internal<T, ListClass<T>>(this_object);
    auto callback = Value::validated_to_function(ctx, arguments[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto token = list->add_notification_callback([=](CollectionChangeSet change_set, std::exception_ptr exception) {
        HANDLESCOPE

        ValueType arguments[2];
        arguments[0] = static_cast<ObjectType>(protected_this);
        arguments[1] = CollectionClass<T>::create_collection_change_set(protected_ctx, change_set);
        Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
    });
    list->m_notification_tokens.emplace_back(protected_callback, std::move(token));
}
    
template<typename T>
void ListClass<T>::remove_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1);
    
    auto list = get_internal<T, ListClass<T>>(this_object);
    auto callback = Value::validated_to_function(ctx, arguments[0]);
    auto protected_function = Protected<FunctionType>(ctx, callback);

    auto iter = list->m_notification_tokens.begin();
    typename Protected<FunctionType>::Comparator compare;
    while (iter != list->m_notification_tokens.end()) {
        if(compare(iter->first, protected_function)) {
            iter = list->m_notification_tokens.erase(iter);
        }
        else {
            iter++;
        }
    }
}
    
template<typename T>
void ListClass<T>::remove_all_listeners(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto list = get_internal<T, ListClass<T>>(this_object);
    list->m_notification_tokens.clear();
}

} // js
} // realm
