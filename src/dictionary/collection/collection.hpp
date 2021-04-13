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
#include <exception>

#include "dictionary/collection/notification.hpp"
#include "common/collection.hpp"
#include "common/object/error_handling.hpp"
#include "js_mixed.hpp"

namespace realm {
namespace js {

namespace collection {
    struct Notification {
        object_store::Dictionary data;
        DictionaryChangeSet change_set;
        bool from_realm = false;

        bool no_op(){
            return change_set.deletions.size() == 0 ||
                   change_set.insertions.size() == 0 ||
                   change_set.modifications.size() == 0;
        }
    };
}

class CollectionAdapter: public IOCollection {
   private:
    using Update = std::function<void(collection::Notification)>;

    object_store::Dictionary dictionary;
    NotificationToken token;
    Update update;
    bool listening = false;

    void listen_for_collection_changes() {
        if (listening) {
            return;
        }

        auto callback = [=](DictionaryChangeSet change_set, std::exception_ptr error) {
            if (error) {
                std::rethrow_exception(error);
            }

            if(update) {
                update(collection::Notification{dictionary, change_set, true});
            }
        };

        token = dictionary.add_key_based_notification_callback(callback);
        listening = true;
    }

public:
    bool watch(){
        try{
            listen_for_collection_changes();
            return true;
        }catch(...){}

        return false;
    }

    void on_change(Update&& _update){
        update = _update;
    }

    CollectionAdapter(object_store::Dictionary _dict)
        : dictionary{_dict} {}

    /*
     * Makes the contents of this collection compatible with the existing
     * mechanisms.
     */
    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return dictionary.add_notification_callback(arguments...);
    }

    auto begin() {
        return dictionary.begin();
    }

    auto end() {
        return dictionary.end();
    }

    bool contains(std::string key){
        return dictionary.contains(key.c_str());
    }

    void set(std::string key, realm::Mixed value){
        dictionary.insert(key.c_str(), value);
        update(collection::Notification{dictionary, {}, false});
    }

    realm::Mixed get(std::string key) {
        return dictionary.get_any(key.c_str());
    }

    void remove(std::string key){
        dictionary.erase(key.c_str());
        update(collection::Notification{dictionary, {}, false});
    }

    operator object_store::Dictionary() { return dictionary; }
    object_store::Dictionary& data(){ return dictionary; }
};

}  // namespace js
}  // namespace realm