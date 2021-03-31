////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#include "dictionary/collection/notification.hpp"
#include "common/object/interfaces.hpp"
#include "js_mixed.hpp"
namespace realm {
namespace js {

template <typename T, typename Collection>
class CollectionAdapter: public IOCollection {
   private:
    Collection collection;
    using Mixed = TypeMixed<T>;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context;

public:
    CollectionAdapter(Collection _collection)
        : collection{_collection} {}

    /*
     * Makes the contents of this collection compatible with the existing
     * mechanisms.
     */
    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return collection.add_notification_callback(arguments...);
    }

    auto begin() {
        return collection.begin();
    }

    auto end() {
        return collection.end();
    }

    void set(ContextType context, std::string key, ValueType value){
        auto mixed = Mixed::get_instance().unwrap(context, value);
        collection.insert(key, mixed);
    }

    ValueType get(ContextType context, std::string key) {
        auto mixed_value = collection.get_any(key);
        return Mixed::get_instance().wrap(context, mixed_value);
    }

    operator Collection() { return collection; }
};

}  // namespace js
}  // namespace realm

