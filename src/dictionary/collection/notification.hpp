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
namespace realm {
namespace js {

class DictionaryNotifications {
   private:
    NotificationToken token;
    object_store::Dictionary dictionary;
    using Update = std::function<void(object_store::Dictionary, DictionaryChangeSet&)>;
    Update update;
    bool listening = false;

    void listen_for_collection_changes() {
        if (listening) {
            return;
        }

        token = dictionary.add_key_based_notification_callback(
            [=](DictionaryChangeSet change_set, std::exception_ptr error) {
                if (error) {
                    std::rethrow_exception(error);
                }

                if(update) {
                    update(dictionary, change_set);
                }
            });
        listening = true;
    }

   public:
    DictionaryNotifications(object_store::Dictionary _dictionary): dictionary{_dictionary}{}

    DictionaryNotifications(DictionaryNotifications &&dictionary) = default;


    void on_change(Update&& _update){
        update = _update;
        listen_for_collection_changes();
    }
};

}  // namespace js
}  // namespace realm


