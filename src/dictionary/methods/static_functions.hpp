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
#include "dictionary/methods/callbacks.hpp"

namespace realm {
namespace js {

template <typename T>
class ListenersMethodsForDictionary {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Dictionary = CollectionAdapter<TypeMixed<T>, object_store::Dictionary>;
   public:


    static void add_listener(ContextType context, ValueType value, ObjectObserver* observer, IOCollection*) {
        auto fn = Value::validated_to_function(context, value);
        auto *subscriber = new NotificationsCallback<T>{context, fn};
        observer->subscribe(subscriber);
    }

    static void remove_listener(ContextType context, ValueType value, ObjectObserver* observer, IOCollection*) {
        auto callback = Value::validated_to_function(context, value);
        auto *subscriber = new NotificationsCallback<T>{context, callback};
        observer->remove_subscription(subscriber);
    }

    static void remove_all_listeners(ContextType, ValueType, ObjectObserver* observer, IOCollection*) {
        observer->unsubscribe_all();
    }

    static void put(ContextType context, ValueType value, ObjectObserver*, IOCollection* dictionary) {
        auto obj = Value::validated_to_object(context, value);
        auto keys = obj.GetPropertyNames();
        auto size = keys.Length();

        for (auto index = 0; index < size; index++) {
            std::string key = Value::to_string(context, keys[index]);
            auto value = Object::get_property(context, obj, key);
            dictionary->set(context, key, value);
        }
    }

    template<typename JavascriptObject, typename Data>
    void apply(JavascriptObject object, Data *_o) {
        object.template add_method<T, add_listener>("addListener", _o);
        object.template add_method<T, remove_listener>("removeListener", _o);
        object.template add_method<T, remove_all_listeners>("removeAllListeners", _o);
        object.template add_method<T, put>("put", _o);
    }
};

}  // namespace js
}  // namespace realm

