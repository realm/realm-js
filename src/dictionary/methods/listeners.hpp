//
// Created by Cesar Valdez on 07/03/2021.
//

#ifndef REALMJS_LISTENERS_HPP
#define REALMJS_LISTENERS_HPP

#include "dictionary/methods/callbacks.hpp"
#include "napi.h"
namespace realm {
namespace js {

template <typename VM>
class ListenersMethodsForDictionary {
   private:
    using Value = js::Value<VM>;

    template <typename Fn, typename JavascriptPlainObject>
    auto add_javascript_function(std::string&& name, Fn&& function,
                                 JavascriptPlainObject* object) {
        auto plain_object = object->get_plain_object();
        auto context = object->get_context();

        auto fn = Napi::Function::New(context, function, name,
                                      static_cast<void*>(object));
        js::Object<VM>::set_property(context, plain_object, name, fn,
                                     PropertyAttributes::DontEnum);
    }

   public:
    template <typename JavascriptPlainObject>
    void apply(JavascriptPlainObject* object) {
        add_javascript_function("addListener", add_listener(object), object);
        add_javascript_function("removeListener", remove_listener(object),
                                object);
        add_javascript_function("removeAllListeners",
                                remove_all_listeners(object), object);
    }

    template <typename JavascriptPlainObject>
    auto add_listener(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            auto context = info.Env();
            auto callback = Value::validated_to_function(context, info[0]);
            auto collection = &object->get_data();
            auto plain_object = object->get_plain_object();

            NotificationsCallback<VM> js_callback{callback, plain_object,
                                                  context};

            collection->register_for_notifications(js_callback);
        };
    }

    template <typename JavascriptPlainObject>
    auto remove_listener(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            auto context = info.Env();
            auto callback = Value::validated_to_function(context, info[0]);
            NotificationsCallback<VM> js_callback{context, callback};
            auto collection = &object->get_data();
            collection->remove_listener(js_callback);
        };
    }
    template <typename JavascriptPlainObject>
    auto remove_all_listeners(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            auto collection = &object->get_data();
            collection->remove_all_listeners();
        };
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_LISTENERS_HPP
