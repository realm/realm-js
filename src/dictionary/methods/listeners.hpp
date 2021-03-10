//
// Created by Cesar Valdez on 07/03/2021.
//

#ifndef REALMJS_LISTENERS_HPP
#define REALMJS_LISTENERS_HPP
#include "dictionary/collection/notification.hpp"
#include "dictionary/methods/callbacks.hpp"
#include "napi.h"

namespace realm {
namespace js {

template <typename VM>
class ListenersMethodsForDictionary {
   private:
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;
    using Dictionary = object_store::Dictionary;
    using Value = js::Value<VM>;
    using Notifications = DictionaryNotifications<NotificationsCallback<VM>>;

    std::unique_ptr<Notifications> notifications;
    ContextType context;

    template <class Fn>
    auto add_js_fn(std::string&& name, ObjectType object, Fn&& function) {
        auto fn = Napi::Function::New(context, function, name);
        js::Object<VM>::set_property(context, object, name, fn,
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
            NotificationsCallback<VM> subscriber{ctx, callback, object};
            notifications->register_for_notifications(std::move(subscriber));
        };
    }

    auto remove_listener(ObjectType& object, Dictionary* dictionary) {
        return [=](const Napi::CallbackInfo& info) {
            auto ctx = info.Env();
            auto callback = Value::validated_to_function(ctx, info[0]);
            NotificationsCallback<VM> subscriber{ctx, callback};
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
