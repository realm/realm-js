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
#include "common/object/interfaces.hpp"

#include "dictionary/collection/notification.hpp"
#include "dictionary/methods/dictionary_changes_subscriber.hpp"

namespace realm {
namespace js {

template <typename T>
class MethodsForDictionary {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using ValueType = typename T::Value;
    using JSMixedAPI = TypeMixed<T>;
    using Subscriber = DictionaryChangesSubscriber<T>;

   public:
    template <typename Fn>
    static void object_keys(ContextType& context, ValueType _object, Fn&& fn){
        auto obj =  js::Value<T>::validated_to_object(context, _object);
        auto keys = js::Object<T>::get_property_names(context, obj);

        for (auto index = 0; index < keys.size(); index++) {
            std::string key = keys[index];
            fn(key, obj);
        }
    }

    static void add_listener(method::Arguments arguments) {
        ContextType context = arguments.context;
        ObjectObserver *observer = arguments.observer;
        std::string error_msg =  "A callback function is required.";

        auto callback = js::Value<T>::validated_to_function(context, arguments.get(0, error_msg));
        observer->subscribe(std::make_unique<Subscriber>(context, callback));
    }

    static void remove_listener(method::Arguments arguments) {
        ContextType context = arguments.context;
        ObjectObserver* observer = arguments.observer;
        std::string error_msg =  "A callback function is required.";

        auto callback = js::Value<T>::validated_to_function(context,  arguments.get(0, error_msg));
        observer->remove_subscription(std::make_unique<Subscriber>(context, callback));
    }

    static void remove_all_listeners(method::Arguments arguments) {
        arguments.observer->unsubscribe_all();
    }

    static void put(method::Arguments arguments) {
        std::string error_msg =  "This method cannot be empty.";
        auto context = arguments.context;
        IOCollection *collection = arguments.collection;

        object_keys(context, arguments.get(0, error_msg),
                    [=](std::string& key, auto object){
            auto value = js::Object<T>::get_property(context, object, key);
            auto mixed = JSMixedAPI::get_instance().unwrap(context, value);
            collection->set(key, mixed);
        });
    }

    static void remove(method::Arguments arguments) {
        std::string error_msg =  "This method cannot be empty.";
        auto context = arguments.context;
        IOCollection *collection = arguments.collection;

        object_keys(context, arguments.get(0, error_msg),
                    [=](std::string& _key, auto object){
                        auto value = js::Object<T>::get_property(context, object, _key);
                        std::string key = js::Value<T>::validated_to_string(context, value, "Dictionary key");
                        collection->remove(key);
                    });
    }


};

}  // namespace js
}  // namespace realm

