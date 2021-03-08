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

#ifndef REALMJS_NOTIFICATION_HPP
#define REALMJS_NOTIFICATION_HPP

namespace realm {
namespace js {

template <typename Listener>
class DictionaryNotifications {
   private:
    NotificationToken token;
    std::vector<Listener> listeners;
    object_store::Dictionary dictionary;
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

                for (auto listen : listeners) {
                    listen(dictionary, change_set);
                }
            });
        listening = true;
    }

   public:
    DictionaryNotifications(object_store::Dictionary &_dictionary)
        : dictionary{_dictionary} {}

    DictionaryNotifications(DictionaryNotifications &&dictionary) = default;

    void remove_listener(Listener listener) {
        int index = -1;
        for (auto const &candidate : listeners) {
            index++;
            if (listener == candidate) {
                listeners.erase(listeners.begin() + index);
                break;
            }
        }
    }

    void remove_all_listeners() { listeners.clear(); }

    template <class Delegate>
    void register_for_notifications(Delegate delegate) {
        listeners.push_back(delegate);
        listen_for_collection_changes();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_NOTIFICATION_HPP
