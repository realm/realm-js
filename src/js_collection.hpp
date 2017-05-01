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
    
    static inline ValueType create_collection_change_set(ContextType ctx, const CollectionChangeSet &change_set);
};

template<typename T>
typename T::Value CollectionClass<T>::create_collection_change_set(ContextType ctx, const CollectionChangeSet &change_set)
{
    ObjectType object = Object::create_empty(ctx);
    std::vector<ValueType> deletions, insertions, modifications;
    
    if (change_set.deletions.count() == std::numeric_limits<size_t>::max()) {
        deletions.push_back(Value::from_null(ctx));
    }
    else {
        for (auto index : change_set.deletions.as_indexes()) {
            deletions.push_back(Value::from_number(ctx, index));
        }
    }
    Object::set_property(ctx, object, "deletions", Object::create_array(ctx, deletions));
    
    for (auto index : change_set.insertions.as_indexes()) {
        insertions.push_back(Value::from_number(ctx, index));
    }
    Object::set_property(ctx, object, "insertions", Object::create_array(ctx, insertions));
    
    for (auto index : change_set.modifications.as_indexes()) {
        modifications.push_back(Value::from_number(ctx, index));
    }
    Object::set_property(ctx, object, "modifications", Object::create_array(ctx, modifications));

    return object;
}

} // js
} // realm
