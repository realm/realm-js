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
#include "common/object/interfaces.hpp"
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

template <typename T>
class CollectionAdapter: public IOCollection {
   private:
    using Value = js::Value<T>;
    using JSMixedAPI = TypeMixed<T>;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context;
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

    void set(ContextType context, std::string key, ValueType value){
        auto mixed = JSMixedAPI::get_instance().unwrap(context, value);
        dictionary.insert(key.c_str(), mixed);

        update(collection::Notification{dictionary, {}, false});
    }

    ValueType get(ContextType context, std::string key) {
        try{
            auto mixed_value = dictionary.get_any(key.c_str());
            auto value = JSMixedAPI::get_instance().wrap(context, mixed_value);
            return value;
        }catch (realm::KeyNotFound& error){}

        return Value::from_undefined(context);
    }

    operator Collection() { return dictionary; }
    object_store::Dictionary& data(){ return dictionary; }
};

}  // namespace js
}  // namespace realm