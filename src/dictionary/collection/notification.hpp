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
    std::vector<Listener> subscribers;
    object_store::Dictionary *dictionary;
    bool listening = false;

    bool the_shape_has_change(DictionaryChangeSet& change_set){
        return (change_set.insertions.size() > 0 || change_set.deletions.size() > 0);
    }

    void listen_for_collection_changes() {
        if (listening) {
            return;
        }

        token = dictionary->add_key_based_notification_callback(
            [=](DictionaryChangeSet change_set, std::exception_ptr error) {
                if (error) {
                    std::rethrow_exception(error);
                }

                for (auto &subscriber : subscribers) {
                    bool has_change = the_shape_has_change(change_set);
                    subscriber(dictionary, change_set, has_change);
                }
            });
        listening = true;
    }

   public:
    DictionaryNotifications(object_store::Dictionary *_dictionary)
        : dictionary{_dictionary} {}

    DictionaryNotifications(DictionaryNotifications &&dictionary) = default;

    void remove_listener(const Listener&& subscriber) {
        int index = -1;
        for (auto const &candidate : subscribers) {
            index++;
            if (candidate == subscriber) {
                subscribers.erase(subscribers.begin() + index);
                break;
            }
        }
    }

    void remove_all_listeners() { subscribers.clear(); }

    void register_for_notifications(Listener&& delegate) {
        subscribers.push_back(std::move(delegate));
        listen_for_collection_changes();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_NOTIFICATION_HPP
