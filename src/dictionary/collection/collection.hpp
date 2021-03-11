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

template <typename Collection, typename Notifications>
class CollectionAdapter : public Notifications {
   private:
    Collection collection;

   public:
    CollectionAdapter(Collection _collection)
        : collection{_collection}, Notifications{_collection} {}
    CollectionAdapter(CollectionAdapter&& collection_adapter) = default;

    /*
     * Makes the contents of this collection compatible with the existing
     * mechanism.
     */
    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return collection.add_notification_callback(arguments...);
    }
    Collection& get_collection() { return collection; }
};

}  // namespace js
}  // namespace realm

