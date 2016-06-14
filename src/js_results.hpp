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

#include "results.hpp"
#include "list.hpp"
#include "parser.hpp"
#include "query_builder.hpp"

namespace realm {
namespace js {

template<typename T>
struct ResultsClass : ClassDefinition<T, realm::Results, CollectionClass<T>> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;

    static ObjectType create_instance(ContextType, const realm::Results &, bool live = true);
    static ObjectType create_instance(ContextType, const realm::List &, bool live = true);
    static ObjectType create_instance(ContextType, SharedRealm, const ObjectSchema &, bool live = true);
    static ObjectType create_instance(ContextType, SharedRealm, const ObjectSchema &, Query, bool live = true);

    template<typename U>
    static ObjectType create_filtered(ContextType, const U &, size_t, const ValueType[]);

    template<typename U>
    static ObjectType create_sorted(ContextType, const U &, size_t, const ValueType[]);

    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);

    static void snapshot(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void filtered(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void sorted(ContextType, ObjectType, size_t, const ValueType[], ReturnValue &);
    static void is_valid(ContextType, ObjectType, size_t, const ValueType [], ReturnValue &);

    std::string const name = "Results";

    MethodMap<T> const methods = {
        {"snapshot", wrap<snapshot>},
        {"filtered", wrap<filtered>},
        {"sorted", wrap<sorted>},
        {"isValid", wrap<is_valid>},
    };
    
    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
    };
    
    IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};
};

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, const realm::Results &results, bool live) {
    auto new_results = new realm::Results(results);
    new_results->set_live(live);

    return create_object<T, ResultsClass<T>>(ctx, new_results);
}

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, const realm::List &list, bool live) {
    return create_instance(ctx, list.get_realm(), list.get_object_schema(), list.get_query(), live);
}

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, SharedRealm realm, const ObjectSchema &object_schema, bool live) {
    auto table = ObjectStore::table_for_object_type(realm->read_group(), object_schema.name);
    auto results = new realm::Results(realm, object_schema, *table);
    results->set_live(live);

    return create_object<T, ResultsClass<T>>(ctx, results);
}

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, SharedRealm realm, const ObjectSchema &object_schema, Query query, bool live) {
    auto results = new realm::Results(realm, object_schema, std::move(query));
    results->set_live(live);

    return create_object<T, ResultsClass<T>>(ctx, results);
}

template<typename T>
template<typename U>
typename T::Object ResultsClass<T>::create_filtered(ContextType ctx, const U &collection, size_t argc, const ValueType arguments[]) {
    auto query_string = Value::validated_to_string(ctx, arguments[0], "predicate");
    auto query = collection.get_query();
    auto const &realm = collection.get_realm();
    auto const &object_schema = collection.get_object_schema();

    std::vector<ValueType> args;
    args.reserve(argc - 1);

    for (size_t i = 1; i < argc; i++) {
        args.push_back(arguments[i]);
    }

    parser::Predicate predicate = parser::parse(query_string);
    query_builder::ArgumentConverter<ValueType, ContextType> converter(ctx, realm, args);
    query_builder::apply_predicate(query, predicate, converter, *realm->config().schema, object_schema.name);

    return create_instance(ctx, realm, object_schema, std::move(query));
}

template<typename T>
template<typename U>
typename T::Object ResultsClass<T>::create_sorted(ContextType ctx, const U &collection, size_t argc, const ValueType arguments[]) {
    auto const &realm = collection.get_realm();
    auto const &object_schema = collection.get_object_schema();
    std::vector<std::string> prop_names;
    std::vector<bool> ascending;
    size_t prop_count;

    if (Value::is_array(ctx, arguments[0])) {
        validate_argument_count(argc, 1, "Second argument is not allowed if passed an array of sort descriptors");

        ObjectType js_prop_names = Value::validated_to_object(ctx, arguments[0]);
        prop_count = Object::validated_get_length(ctx, js_prop_names);
        if (!prop_count) {
            throw std::invalid_argument("Sort descriptor array must not be empty");
        }

        prop_names.resize(prop_count);
        ascending.resize(prop_count);

        for (unsigned int i = 0; i < prop_count; i++) {
            ValueType value = Object::validated_get_property(ctx, js_prop_names, i);

            if (Value::is_array(ctx, value)) {
                ObjectType array = Value::to_array(ctx, value);
                prop_names[i] = Object::validated_get_string(ctx, array, 0);
                ascending[i] = !Object::validated_get_boolean(ctx, array, 1);
            }
            else {
                prop_names[i] = Value::validated_to_string(ctx, value);
                ascending[i] = true;
            }
        }
    }
    else {
        validate_argument_count(argc, 1, 2);

        prop_count = 1;
        prop_names.push_back(Value::validated_to_string(ctx, arguments[0]));
        ascending.push_back(argc == 1 ? true : !Value::to_boolean(ctx, arguments[1]));
    }

    std::vector<size_t> columns;
    columns.reserve(prop_count);

    for (std::string &prop_name : prop_names) {
        const Property *prop = object_schema.property_for_name(prop_name);
        if (!prop) {
            throw std::runtime_error("Property '" + prop_name + "' does not exist on object type '" + object_schema.name + "'");
        }
        columns.push_back(prop->table_column);
    }

    auto results = new realm::Results(realm, object_schema, collection.get_query(), {std::move(columns), std::move(ascending)});
    return create_object<T, ResultsClass<T>>(ctx, results);
}

template<typename T>
void ResultsClass<T>::get_length(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(object);
    return_value.set((uint32_t)results->size());
}

template<typename T>
void ResultsClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(object);
    auto row = results->get(index);

    // Return null for deleted objects in a snapshot.
    if (!row.is_attached()) {
        return_value.set_null();
        return;
    }

    auto realm_object = realm::Object(results->get_realm(), results->get_object_schema(), results->get(index));
    return_value.set(RealmObjectClass<T>::create_instance(ctx, std::move(realm_object)));
}

template<typename T>
void ResultsClass<T>::snapshot(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0);

    auto results = get_internal<T, ResultsClass<T>>(this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, *results, false));
}

template<typename T>
void ResultsClass<T>::filtered(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count_at_least(argc, 1);

    auto results = get_internal<T, ResultsClass<T>>(this_object);
    return_value.set(create_filtered(ctx, *results, argc, arguments));
}

template<typename T>
void ResultsClass<T>::sorted(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 1, 2);

    auto results = get_internal<T, ResultsClass<T>>(this_object);
    return_value.set(create_sorted(ctx, *results, argc, arguments));
}

template<typename T>
void ResultsClass<T>::is_valid(ContextType ctx, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    return_value.set(get_internal<T, ResultsClass<T>>(this_object)->is_valid());
}

} // js
} // realm
