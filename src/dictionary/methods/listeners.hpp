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


#ifndef REALMJS_LISTENERS_HPP
#define REALMJS_LISTENERS_HPP
#include "dictionary/collection/notification.hpp"
#include "dictionary/methods/callbacks.hpp"
#include "napi.h"

namespace realm {
namespace js {

template <typename T>
class ListenersMethodsForDictionary {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using Notifications = DictionaryNotifications<NotificationsCallback<T>>;
    using Value = js::Value<T>;
    using Dictionary = object_store::Dictionary;

    std::unique_ptr<Notifications> notifications;
    ContextType context;

    template <class Fn>
    auto add_js_fn(std::string&& name, ObjectType object, Fn&& function) {
        auto fn = Napi::Function::New(context, function, name);
        js::Object<T>::set_property(context, object, name, fn,
                                     PropertyAttributes::DontEnum);
    }

   public:
    ListenersMethodsForDictionary(ContextType _context) : context{_context} {}

    template <class Dictionary>
    void apply(ObjectType& object, Dictionary* dictionary) {
        add_js_fn("addListener", object, add_listener(object, dictionary));
        add_js_fn("removeListener", object,
                  remove_listener(object, dictionary));
        add_js_fn("removeAllListeners", object,
                  remove_all_listeners(object, dictionary));

        notifications = std::make_unique<Notifications>(dictionary);
    }

    auto add_listener(ObjectType& object, Dictionary* dictionary) {
        return [=](const Napi::CallbackInfo& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback, object};
            notifications->register_for_notifications(std::move(subscriber));
        };
    }

    auto remove_listener(ObjectType& object, Dictionary* dictionary) {
        return [=](const Napi::CallbackInfo& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback};
            notifications->remove_listener(std::move(subscriber));
        };
    }

    auto remove_all_listeners(ObjectType& object, Dictionary* dictionary) {
        return [=](const Napi::CallbackInfo& info) {
            notifications->remove_all_listeners();
        };
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_LISTENERS_HPP
