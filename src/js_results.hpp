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
#include "js_util.hpp"

#include "keypath_helpers.hpp"
#include "list.hpp"
#include "object_store.hpp"
#include "results.hpp"

#include <realm/parser/parser.hpp>
#include <realm/parser/query_builder.hpp>
#include <realm/util/optional.hpp>
#ifdef REALM_ENABLE_SYNC
#include "js_sync.hpp"
#include "sync/partial_sync.hpp"
#endif

namespace realm {
namespace js {

template<typename>
class NativeAccessor;

struct NonRealmObjectException : public std::logic_error {
    NonRealmObjectException() : std::logic_error("Object is not a Realm object") { }
};

template<typename T>
class Results : public realm::Results {
  public:
    Results(Results const& r) : realm::Results(r) {};
    Results(realm::Results const& r) : realm::Results(r) {};
    Results(Results&&) = default;
    Results& operator=(Results&&) = default;
    Results& operator=(Results const&) = default;

    using realm::Results::Results;

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
};

template<typename T>
struct ResultsClass : ClassDefinition<T, realm::js::Results<T>, CollectionClass<T>> {
    using Type = T;
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

    static ObjectType create_instance(ContextType, realm::Results);
    static ObjectType create_instance(ContextType, SharedRealm, const std::string &object_type);

    template<typename U>
    static ObjectType create_filtered(ContextType, const U &, Arguments &);

    static std::vector<std::pair<std::string, bool>> get_keypaths(ContextType, Arguments &);

    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_type(ContextType, ObjectType, ReturnValue &);
    static void get_optional(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);

    static void description(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void snapshot(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void filtered(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void sorted(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void is_valid(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void is_empty(ContextType, ObjectType, Arguments &, ReturnValue &);
#if REALM_ENABLE_SYNC
    static void subscribe(ContextType, ObjectType, Arguments &, ReturnValue &);
#endif

    static void index_of(ContextType, ObjectType, Arguments &, ReturnValue &);

    template<typename Fn>
    static void index_of(ContextType, Fn&, Arguments &, ReturnValue &);

    static void update(ContextType, ObjectType, Arguments &, ReturnValue &);

    // observable
    static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);

    template<typename U>
    static void add_listener(ContextType, U&, ObjectType, Arguments &);
    template<typename U>
    static void remove_listener(ContextType, U&, ObjectType, Arguments &);

    std::string const name = "Results";

    MethodMap<T> const methods = {
        {"description", wrap<description>},
        {"snapshot", wrap<snapshot>},
        {"filtered", wrap<filtered>},
        {"sorted", wrap<sorted>},
        {"isValid", wrap<is_valid>},
        {"isEmpty", wrap<is_empty>},
#if REALM_ENABLE_SYNC
        {"subscribe", wrap<subscribe>},
#endif
        {"min", wrap<compute_aggregate_on_collection<ResultsClass<T>, AggregateFunc::Min>>},
        {"max", wrap<compute_aggregate_on_collection<ResultsClass<T>, AggregateFunc::Max>>},
        {"sum", wrap<compute_aggregate_on_collection<ResultsClass<T>, AggregateFunc::Sum>>},
        {"avg", wrap<compute_aggregate_on_collection<ResultsClass<T>, AggregateFunc::Avg>>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
        {"indexOf", wrap<index_of>},
        {"update", wrap<update>},
    };

    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
        {"type", {wrap<get_type>, nullptr}},
        {"optional", {wrap<get_optional>, nullptr}},
    };

    IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};
};

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, realm::Results results) {
    return create_object<T, ResultsClass<T>>(ctx, new realm::js::Results<T>(std::move(results)));
}

template<typename T>
typename T::Object ResultsClass<T>::create_instance(ContextType ctx, SharedRealm realm, const std::string &object_type) {
    auto table = ObjectStore::table_for_object_type(realm->read_group(), object_type);
    if (!table) {
        throw std::runtime_error("Table does not exist. Object type: " + object_type);
    }
    return create_object<T, ResultsClass<T>>(ctx, new realm::js::Results<T>(realm, table));
}

template<typename T>
template<typename U>
typename T::Object ResultsClass<T>::create_filtered(ContextType ctx, const U &collection, Arguments &args) {
    if (collection.get_type() != realm::PropertyType::Object) {
        throw std::runtime_error("Filtering non-object Lists and Results is not yet implemented.");
    }

    auto query_string = Value::validated_to_string(ctx, args[0], "predicate");
    auto query = collection.get_query();
    auto const &realm = collection.get_realm();
    auto const &object_schema = collection.get_object_schema();
    DescriptorOrdering ordering;
    parser::KeyPathMapping mapping;
    realm::populate_keypath_mapping(mapping, *realm);

    parser::ParserResult result = parser::parse(query_string);
    NativeAccessor<T> accessor(ctx, realm, object_schema);
    query_builder::ArgumentConverter<ValueType, NativeAccessor<T>> converter(accessor, &args.value[1], args.count - 1);
    query_builder::apply_predicate(query, result.predicate, converter, mapping);
    query_builder::apply_ordering(ordering, query.get_table(), result.ordering, mapping);

    return create_instance(ctx, collection.filter(std::move(query)).apply_ordering(std::move(ordering)));
}

template<typename T>
std::vector<std::pair<std::string, bool>>
ResultsClass<T>::get_keypaths(ContextType ctx, Arguments &args) {
    args.validate_maximum(2);

    std::vector<std::pair<std::string, bool>> sort_order;
    if (args.count == 0) {
        sort_order.emplace_back("self", true);
        return sort_order;
    }
    else if (Value::is_array(ctx, args[0])) {
        validate_argument_count(args.count, 1, "Second argument is not allowed if passed an array of sort descriptors");

        ObjectType js_prop_names = Value::validated_to_object(ctx, args[0]);
        size_t prop_count = Object::validated_get_length(ctx, js_prop_names);
        sort_order.reserve(prop_count);

        for (unsigned int i = 0; i < prop_count; i++) {
            ValueType value = Object::validated_get_property(ctx, js_prop_names, i);

            if (Value::is_array(ctx, value)) {
                ObjectType array = Value::to_array(ctx, value);
                sort_order.emplace_back(Object::validated_get_string(ctx, array, 0),
                                        !Object::validated_get_boolean(ctx, array, 1));
            }
            else {
                sort_order.emplace_back(Value::validated_to_string(ctx, value), true);
            }
        }
    }
    else {
        if (Value::is_boolean(ctx, args[0])) {
            sort_order.emplace_back("self", !Value::to_boolean(ctx, args[0]));
        }
        else {
            sort_order.emplace_back(Value::validated_to_string(ctx, args[0]),
                                    args.count == 1 || !Value::to_boolean(ctx, args[1]));
        }
    }
    return sort_order;
}

template<typename T>
void ResultsClass<T>::get_length(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, object);
    return_value.set((uint32_t)results->size());
}

template<typename T>
void ResultsClass<T>::get_type(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, object);
    return_value.set(string_for_property_type(results->get_type() & ~realm::PropertyType::Flags));
}

template<typename T>
void ResultsClass<T>::get_optional(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, object);
    return_value.set(is_nullable(results->get_type()));
}

template<typename T>
void ResultsClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, object);
    NativeAccessor<T> accessor(ctx, *results);
    return_value.set(results->get(accessor, index));
}

template<typename T>
void ResultsClass<T>::description(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    auto query = results->get_query();
    auto descriptor = results->get_descriptor_ordering();
    std::string serialized_query = query.get_description() + " " + descriptor.get_description(query.get_table());
    return_value.set(Value::from_string(ctx, serialized_query));
}

template<typename T>
void ResultsClass<T>::snapshot(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, results->snapshot()));
}

template<typename T>
void ResultsClass<T>::filtered(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    return_value.set(create_filtered(ctx, *results, args));
}

template<typename T>
void ResultsClass<T>::sorted(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, results->sort(ResultsClass<T>::get_keypaths(ctx, args))));
}

template<typename T>
void ResultsClass<T>::is_valid(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    return_value.set(get_internal<T, ResultsClass<T>>(ctx, this_object)->is_valid());
}

template<typename T>
void ResultsClass<T>::is_empty(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    return_value.set(get_internal<T, ResultsClass<T>>(ctx, this_object)->size() == 0);
}

#if REALM_ENABLE_SYNC
template<typename T>
void ResultsClass<T>::subscribe(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    auto realm = results->get_realm();
    auto object_schema = results->get_object_schema();
    auto sync_config = realm->config().sync_config;
    IncludeDescriptor inclusion_paths;

    util::Optional<std::string> subscription_name;
    bool update = false;
    util::Optional<int64_t> ttl = util::none;
    if (args.count == 1) {
        if (Value::is_string(ctx, args[0])) {
            subscription_name = util::Optional<std::string>(Value::validated_to_string(ctx, args[0]));
        } else {
            ObjectType options_object = Value::validated_to_object(ctx, args[0]);

            std::vector<const char*> available_options = {"name", "update", "timeToLive", "includeLinkingObjects"};
            enum SubscriptionOptions { NAME, UPDATE, TTL, INCLUSIONS };
            auto prop_names = Object::get_property_names(ctx, options_object);
            for (size_t i = 0; i < prop_names.size(); ++i) {
                std::string prop = prop_names[i];
                if (std::find(available_options.begin(), available_options.end(), prop) == available_options.end()) {
                    throw std::logic_error("Unexpected property in subscription options: '" + prop + "'.");
                }
            }

            ValueType name_value = Object::get_property(ctx, options_object, available_options[NAME]);
            if (!Value::is_undefined(ctx, name_value)) {
                subscription_name = util::Optional<std::string>(Value::validated_to_string(ctx, name_value, available_options[NAME]));
            }

            ValueType update_value = Object::get_property(ctx, options_object, available_options[UPDATE]);
            if (!Value::is_undefined(ctx, update_value))
                update = Value::validated_to_boolean(ctx, update_value, available_options[UPDATE]);

            ValueType ttl_value = Object::get_property(ctx, options_object, available_options[TTL]);
            if (!Value::is_undefined(ctx, ttl_value))
                ttl = util::Optional<int64_t>(Value::validated_to_number(ctx, ttl_value, available_options[TTL]));

            ValueType user_includes = Object::get_property(ctx, options_object, available_options[INCLUSIONS]);
            if (!Value::is_undefined(ctx, user_includes)) {
                ObjectType property_paths = Value::validated_to_array(ctx, user_includes, available_options[INCLUSIONS]);

                parser::KeyPathMapping mapping;
                realm::populate_keypath_mapping(mapping, *realm); // this enables user defined linkingObjects property names to be parsed
                DescriptorOrdering combined_orderings;

                size_t prop_count = Object::validated_get_length(ctx, property_paths);
                for (unsigned int i = 0; i < prop_count; i++) {
                    std::string path = Object::validated_get_string(ctx, property_paths, i);
                    DescriptorOrdering ordering;
                    // the parser provides a special function just for this
                    parser::DescriptorOrderingState ordering_state = parser::parse_include_path(path); // throws
                    query_builder::apply_ordering(ordering, results->get_query().get_table(), ordering_state, mapping);
                    combined_orderings.append_include(ordering.compile_included_backlinks());
                }
                if (combined_orderings.will_apply_include()) {
                    inclusion_paths = combined_orderings.compile_included_backlinks();
                }
            }
        }
    }
    else {
        subscription_name = util::none;
    }

    partial_sync::SubscriptionOptions options;
    options.user_provided_name = subscription_name;
    options.inclusions = inclusion_paths;
    options.time_to_live_ms = ttl;
    options.update = update;
    auto subscription = partial_sync::subscribe(*results, options);

    return_value.set(SubscriptionClass<T>::create_instance(ctx, std::move(subscription), subscription_name));
}
#endif

template<typename T>
template<typename Fn>
void ResultsClass<T>::index_of(ContextType ctx, Fn& fn, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    size_t ndx;
    try {
        ndx = fn(args[0]);
    }
    catch (realm::Results::IncorrectTableException &) {
        throw std::runtime_error("Object type does not match the type contained in result");
    }
    catch (NonRealmObjectException&) {
        ndx = realm::not_found;
    }

    if (ndx == realm::not_found) {
        return_value.set(-1);
    }
    else {
        return_value.set((uint32_t)ndx);
    }
}

template<typename T>
void ResultsClass<T>::update(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    std::string property = Value::validated_to_string(ctx, args[0], "property");
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);

    auto schema = results->get_object_schema();
    if (!schema.property_for_name(StringData(property))) {
        throw std::invalid_argument(util::format("No such property: %1", property));
    }

    auto realm = results->get_realm();
    if (!realm->is_in_transaction()) {
        throw std::runtime_error("Can only 'update' objects within a transaction.");
    }

    // TODO: This approach just moves the for-loop from JS to C++
    // Ideally, we'd implement this in OS or Core in an optimized fashion
    for (auto i = results->size(); i > 0; i--) {
        auto realm_object = realm::Object(realm, schema, results->get(i - 1));
        auto obj = RealmObjectClass<T>::create_instance(ctx, realm_object);
        RealmObjectClass<T>::set_property(ctx, obj, property, args[1]);
    }
}

template<typename T>
void ResultsClass<T>::index_of(ContextType ctx, ObjectType this_object,
                               Arguments &args, ReturnValue &return_value) {
    auto fn = [&](auto&& row) {
        auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
        NativeAccessor<T> accessor(ctx, *results);
        return results->index_of(accessor, row);
    };
    index_of(ctx, fn, args, return_value);
}

template<typename T>
template<typename U>
void ResultsClass<T>::add_listener(ContextType ctx, U& collection, ObjectType this_object, Arguments &args) {
    args.validate_maximum(1);

    auto callback = Value::validated_to_function(ctx, args[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto token = collection.add_notification_callback([=](CollectionChangeSet const& change_set, std::exception_ptr exception) {
            HANDLESCOPE(protected_ctx)
            ValueType arguments[] {
                static_cast<ObjectType>(protected_this),
                CollectionClass<T>::create_collection_change_set(protected_ctx, change_set)
            };
            Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
        });
    collection.m_notification_tokens.emplace_back(protected_callback, std::move(token));
}

template<typename T>
void ResultsClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    add_listener(ctx, *results, this_object, args);
}

template<typename T>
template<typename U>
void ResultsClass<T>::remove_listener(ContextType ctx, U& collection, ObjectType this_object, Arguments &args) {
    args.validate_maximum(1);

    auto callback = Value::validated_to_function(ctx, args[0]);
    auto protected_function = Protected<FunctionType>(ctx, callback);

    auto& tokens = collection.m_notification_tokens;
    auto compare = [&](auto&& token) {
        return typename Protected<FunctionType>::Comparator()(token.first, protected_function);
    };
    tokens.erase(std::remove_if(tokens.begin(), tokens.end(), compare), tokens.end());
}

template<typename T>
void ResultsClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    remove_listener(ctx, *results, this_object, args);
}

template<typename T>
void ResultsClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(0);

    auto results = get_internal<T, ResultsClass<T>>(ctx, this_object);
    results->m_notification_tokens.clear();
}

} // js
} // realm
