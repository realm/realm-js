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

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_observable.hpp"

#include "collection_notifications.hpp"
#include "object_changeset.hpp"
#if REALM_ENABLE_SYNC
#include "sync/subscription_state.hpp"
#endif

namespace realm {
namespace js {

// Empty class that merely serves as useful type for now.
class Collection {};

template<typename T>
struct CollectionClass : ClassDefinition<T, Collection, ObservableClass<T>> {
    using ContextType = typename T::Context;
    using ValueType = typename T::Value;
    using ObjectType = typename T::Object;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    std::string const name = "Collection";

    static inline ValueType create_collection_change_set(ContextType ctx, const ObjectChangeSet &change_set);
    static inline ValueType create_collection_change_set(ContextType ctx, const CollectionChangeSet &change_set);
};

template<typename T>
typename T::Value CollectionClass<T>::create_collection_change_set(ContextType ctx, const ObjectChangeSet &change_set)
{
    ObjectType object = Object::create_empty(ctx);
    std::vector<ValueType> scratch;
    auto make_array = [&](auto const& keys) {
        scratch.clear();
        scratch.reserve(keys.size());
        for (auto index : keys) {
            scratch.push_back(Value::from_number(ctx, index));
        }
        return Object::create_array(ctx, scratch);
    };

    auto make_array_from_modifications = [&](auto const& keys) {
        scratch.clear();
        scratch.reserve(keys.size());
        for (auto index : keys) {
            scratch.push_back(Value::from_number(ctx, index.first));
        }
        return Object::create_array(ctx, scratch);
    };

    if (change_set.clear_did_occur()) {
        Object::set_property(ctx, object, "deletions", Object::create_array(ctx, {Value::from_null(ctx)}));
    }
    else {
        Object::set_property(ctx, object, "deletions", make_array(change_set.get_deletions()));
    }

    Object::set_property(ctx, object, "insertions", make_array(change_set.get_insertions()));

    auto old_modifications = make_array_from_modifications(change_set.get_modifications());
    Object::set_property(ctx, object, "modifications", old_modifications);

    // we don't set "newModifications" or "oldModifications" here, as they are the same as modifications
    // since the keys don't change across transactions (as compared to indices in an IndexSet)

    return object;
}

template<typename T>
typename T::Value CollectionClass<T>::create_collection_change_set(ContextType ctx, const CollectionChangeSet &change_set)
{
    ObjectType object = Object::create_empty(ctx);
    std::vector<ValueType> scratch;
    auto make_array = [&](realm::IndexSet const& index_set) {
        scratch.clear();
        scratch.reserve(index_set.count());
        for (auto index : index_set.as_indexes()) {
            scratch.push_back(Value::from_number(ctx, index));
        }
        return Object::create_array(ctx, scratch);
    };

    if (change_set.deletions.count() == std::numeric_limits<size_t>::max()) {
        Object::set_property(ctx, object, "deletions", Object::create_array(ctx, {Value::from_null(ctx)}));
    }
    else {
        Object::set_property(ctx, object, "deletions", make_array(change_set.deletions));
    }
    Object::set_property(ctx, object, "insertions", make_array(change_set.insertions));
    Object::set_property(ctx, object, "newModifications", make_array(change_set.modifications_new));

    auto old_modifications = make_array(change_set.modifications);
    Object::set_property(ctx, object, "modifications", old_modifications);
    Object::set_property(ctx, object, "oldModifications", old_modifications);

    return object;
}

} // js
} // realm
