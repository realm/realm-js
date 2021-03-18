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


//FIXME: MIXED: when mixed is fixed
#if REALM_PLATFORM_NODE
template <typename T>
struct Method {
    using ContextType = typename T::Context;
    using Object = js::Object<T>;
    using ObjectType = typename T::Object;
    ContextType context;


    Method(ContextType _context) : context{_context} {}

    template <class Fn>
    auto define(std::string&& name, ObjectType object, Fn&& function) {
        auto fn = Napi::Function::New(context, function, name);
        Object::set_property(context, object, name, fn,
                                    PropertyAttributes::DontEnum);
    }
};
#endif



template <typename T>
class ListenersMethodsForDictionary: public Method<T> {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using Notifications = DictionaryNotifications<NotificationsCallback<T>>;
    using Value = js::Value<T>;
    using Dictionary = object_store::Dictionary;

    std::unique_ptr<Notifications> notifications;
    ContextType context;

   public:
    ListenersMethodsForDictionary(ContextType _context) : context{_context}, Method<T>{_context} {}

    template <class Dictionary>
    void apply(ObjectType& object, Dictionary* dictionary) {
        Method<T>::define("addListener", object, add_listener(object, dictionary));
        Method<T>::define("removeListener", object,
                  remove_listener(object, dictionary));
        Method<T>::define("removeAllListeners", object,
                  remove_all_listeners(object, dictionary));

        notifications = std::make_unique<Notifications>(dictionary);
    }

    auto add_listener(ObjectType& object, Dictionary* dictionary) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback, object};
            notifications->register_for_notifications(std::move(subscriber));
        };
    }

    auto remove_listener(ObjectType& object, Dictionary* dictionary) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback};
            notifications->remove_listener(std::move(subscriber));
        };
    }

    auto remove_all_listeners(ObjectType& object, Dictionary* dictionary) {
        return [=](const auto& info) {
            notifications->remove_all_listeners();
        };
    }
};

}  // namespace js
}  // namespace realm

