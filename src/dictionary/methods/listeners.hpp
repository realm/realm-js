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
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Dictionary = object_store::Dictionary;
    using MixedAPI = TypeMixed<T>;

    template <class Fn>
    void define(ContextType context, std::string&& name, ObjectType& object, Fn&& function) {
        auto fn = Napi::Function::New(context, function, name);
        Object::set_property(context, object, name, fn, PropertyAttributes::DontEnum);
    }

   public:

    template<typename JSObject>
    void apply(ContextType context, ObjectType object, JSObject *_o) {
        define(context,"addListener", object, add_listener(_o));
        define(context,"removeListener", object, remove_listener(_o));
        define(context,"removeAllListeners", object, remove_all_listeners(_o));
        define(context,"put", object, put(_o));
    }

    template <typename JSObject>
    auto add_listener(JSObject *object) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto fn = Value::validated_to_function(ctx, info[0]);
            auto *subscriber = new NotificationsCallback<T>{ctx, fn};
            object->subscribe(subscriber);
        };
    }
    template <typename JSObject>
    auto remove_listener(JSObject *object) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            auto *subscriber = new NotificationsCallback<T>{ctx, callback};
            object->remove_subscription(subscriber);
        };
    }

    template <typename JSObject>
    auto remove_all_listeners(JSObject *object) {
        return [=](const auto& info) {
            object->unsubscribe_all();
        };
    }

    template <typename JSObject>
    auto put(JSObject *object) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto dictionary = object->get_data();
            auto obj = Value::validated_to_object(ctx, info[0]);
            auto keys = obj.GetPropertyNames();
            auto size = keys.Length();

            for (auto index = 0; index < size; index++) {
                std::string key = Value::to_string(ctx, keys[index]);
                auto value = Object::get_property(ctx, obj, key);
                dictionary.set(ctx, key, value);
            }
        };
    }
};

}  // namespace js
}  // namespace realm

