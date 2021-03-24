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
    using ObjectType = typename T::Object;
    using Object = js::Object<T>;

    ContextType context;
    Method(ContextType _context) : context{_context} {}

    template <class Fn>
    auto define(std::string&& name, ObjectType& object, Fn&& function) {
        auto fn = Napi::Function::New(context, function, name);
        Object::set_property(context, object, name, fn, PropertyAttributes::DontEnum);
    }
};
#endif

template <typename T>
class ListenersMethodsForDictionary {
   private:
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using Notifications = DictionaryNotifications<NotificationsCallback<T>>;
    using Value = js::Value<T>;
    using Dictionary = object_store::Dictionary;

    std::unique_ptr<Notifications> notifications;

   public:
    template <class JSObject>
    void apply(ContextType context, ObjectType object, JSObject *_o) {
        Method<T> methods {context};
        methods.define("addListener", object, add_listener(_o));
        methods.define("removeListener", object, remove_listener(_o));
        methods.define("removeAllListeners", object, remove_all_listeners(_o));

        notifications = std::make_unique<Notifications>(_o->get_data());
    }

    template <typename JSObject>
    auto add_listener(JSObject *object) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback};
            notifications->register_for_notifications(std::move(subscriber));
        };
    }
    template <typename JSObject>
    auto remove_listener(JSObject *object) {
        return [=](const auto& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<T> subscriber{ctx, callback};
            notifications->remove_listener(std::move(subscriber));
        };
    }
    template <typename JSObject>
    auto remove_all_listeners(JSObject *object) {
        return [=](const auto& info) {
            notifications->remove_all_listeners();
        };
    }
};

}  // namespace js
}  // namespace realm

