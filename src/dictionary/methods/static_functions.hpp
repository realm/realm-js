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
#include "common/object/methods.hpp"

#include "dictionary/collection/notification.hpp"
#include "dictionary/methods/callbacks.hpp"


namespace realm {
namespace js {

template <typename T>
class ListenersMethodsForDictionary {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using ValueType = typename T::Value;

   public:
    static void add_listener(Args arguments) {
        ContextType context = arguments.context;
        ObjectObserver *observer = arguments.observer;
        std::string error_msg =  "A callback function is required.";

        auto fn = js::Value<T>::validated_to_function(context, arguments.get(0, error_msg));
        auto *subscriber = new NotificationsCallback<T>{context, fn};
        observer->subscribe(subscriber);
    }

    static void remove_listener(Args arguments) {
        ContextType context = arguments.context;
        ObjectObserver* observer = arguments.observer;
        std::string error_msg =  "A callback function is required.";

        auto callback = js::Value<T>::validated_to_function(context,  arguments.get(0, error_msg));
        auto *subscriber = new NotificationsCallback<T>{context, callback};
        observer->remove_subscription(subscriber);
    }

    static void remove_all_listeners(Args arguments) {
        arguments.observer->unsubscribe_all();
    }

    static void put(Args arguments) {
        std::string error_msg =  "This method cannot be empty.";
        auto context = arguments.context;
        auto dictionary = arguments.collection;

        auto obj =  js::Value<T>::validated_to_object(context, arguments.get(0, error_msg));
        auto keys = js::Object<T>::get_property_names(context, obj);

        for (auto index = 0; index < keys.size(); index++) {
            std::string key = keys[index];
            auto value = js::Object<T>::get_property(context, obj, key);
            dictionary->set(context, key, value);
        }
    }

    template<typename JavascriptObject, typename Data>
    void apply(JavascriptObject& object, Data *_o) {
        object.template add_method<T, add_listener>("addListener", _o);
        object.template add_method<T, remove_listener>("removeListener", _o);
        object.template add_method<T, remove_all_listeners>("removeAllListeners", _o);
        object.template add_method<T, put>("put", _o);
    }
};

}  // namespace js
}  // namespace realm

