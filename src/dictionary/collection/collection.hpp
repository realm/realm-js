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

namespace realm {
namespace js {

template <typename MixedAPI, typename Collection>
class CollectionAdapter {
   private:
    Collection collection;

   public:
    CollectionAdapter(Collection _collection)
        : collection{_collection} {}

    /*
     * Makes the contents of this collection compatible with the existing
     * mechanism.
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

    template<class Context, class Value>
    void set(Context context, std::string key, Value value){
        auto mixed = MixedAPI::get_instance().unwrap(context, value);
        collection.insert(key, mixed);
    }

    template<class Context>
    auto get(Context context, std::string key) {
        auto mixed_value = collection.get_any(key);
        return MixedAPI::get_instance().wrap(context, mixed_value);
    }

    operator Collection() { return collection; }
};

}  // namespace js
}  // namespace realm

