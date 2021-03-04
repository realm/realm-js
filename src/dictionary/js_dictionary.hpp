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

#ifndef REALMJS_JS_DICTIONARY_HPP
#define REALMJS_JS_DICTIONARY_HPP

#pragma once

#include <functional>
#include <map>
#include <regex>

#include "common/js_plain_object.hpp"
#include "common/type_deduction.hpp"
#include "js_mixed.hpp"
#include "realm/object-store/dictionary.hpp"
#include "realm/object-store/property.hpp"

namespace realm {
namespace js {

template <typename Collection, typename Function>
class CollectionAdapter {
   private:
    Collection collection;
    NotificationToken token;
    std::vector<std::function<void(DictionaryChangeSet)>> listeners;
    bool listening = false;

    void listen_for_collection_changes() {
        if (listening) {
            return;
        }

        token = collection.add_key_based_notification_callback(
            [=](DictionaryChangeSet change_set, std::exception_ptr error) {
                if (error) {
                    std::rethrow_exception(error);
                }

                for (auto listen : listeners) {
                    listen(change_set);
                }
            });
        listening = true;
    }

   public:
    CollectionAdapter(Collection _collection) : collection{_collection} {}
    CollectionAdapter(CollectionAdapter&& collection_adapter) {
        token = std::move(collection_adapter.token);
        collection = collection_adapter.get_collection();
    }

    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return collection.add_notification_callback(arguments...);
    }

    template <class Delegate>
    void register_for_notifications(Delegate delegate) {
        listeners.push_back(delegate);
        listen_for_collection_changes();
    }

    Collection& get_collection() { return collection; }
    void remove_all_listeners() { listeners.clear(); }
};

template <typename MixedAPI>
struct AccessorsForDictionary {
    using Dictionary = realm::object_store::Dictionary;

    template <typename JavascriptObject>
    auto make_getter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary realm_dictionary = object->get_data().get_collection();
            auto mixed_value = realm_dictionary.get_any(key_name);
            return MixedAPI::get_instance().wrap(info.Env(), mixed_value);
        };
    }
    template <typename JavascriptObject>
    auto make_setter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary realm_dictionary = object->get_data().get_collection();
            auto mixed = MixedAPI::get_instance().unwrap(info.Env(), info[0]);

            realm_dictionary.insert(key_name, mixed);
        };
    }
};

template <typename T>
struct JSPersistentCallback {
    using Fn = Protected<typename T::Function>;
    using PObject = Protected<typename T::Object>;
    using GlobalContext = Protected<typename T::GlobalContext>;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;

    Fn fn;
    PObject plain_object;
    GlobalContext context;

    JSPersistentCallback(Fn& _fn, PObject& obj, GlobalContext& _context)
        : fn{_fn}, plain_object{obj}, context{_context} {}

    template <typename Collection>
    auto build_array(Collection& collection) const {
        std::vector<ValueType> values;
        for (auto mixed_item : collection) {
            values.push_back(
                TypeMixed<T>::get_instance().wrap(context, mixed_item));
        }

        return Object::create_array(context, values);
    }

    void operator()(DictionaryChangeSet change_set) const {
        HANDLESCOPE(context)

        ObjectType object = Object::create_empty(context);
        Object::set_property(context, object, "insertions",
                             build_array(change_set.insertions));
        Object::set_property(context, object, "modifications",
                             build_array(change_set.modifications));

        ValueType arguments[]{static_cast<ObjectType>(plain_object), object};

        Function<T>::callback(context, fn, plain_object, 2, arguments);
    }
};

template <typename VM>
class ListenersMethodsForDictionary {
   private:
    using ContextType = typename VM::Context;
    using Value = js::Value<VM>;
    using ObjectType = typename VM::Object;
    using FunctionType = typename VM::Function;

    ContextType context;

    template <typename Fn, typename JavascriptPlainObject>
    auto add_javascript_function(std::string&& name, Fn&& function,
                                 JavascriptPlainObject* object) {
        auto plain_object = object->get_plain_object();

        auto fn = Napi::Function::New(context, function, name,
                                      static_cast<void*>(object));
        js::Object<VM>::set_property(context, plain_object, name, fn,
                                     PropertyAttributes::DontEnum);
    }

   public:
    ListenersMethodsForDictionary(ContextType _context) : context{_context} {}

    template <typename JavascriptPlainObject>
    void apply(JavascriptPlainObject* object) {
        add_javascript_function("addListener", add_listener(object), object);
        add_javascript_function("removeListener", remove_listener(), object);
        add_javascript_function("removeAllListeners",
                                remove_all_listeners(object), object);
    }

    template <typename JavascriptPlainObject>
    auto add_listener(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            ContextType context = info.Env();
            auto callback = Value::validated_to_function(context, info[0]);
            auto collection = &object->get_data();
            auto plain_object = object->get_plain_object();

            Protected<FunctionType> protected_callback(context, callback);
            Protected<ObjectType> protected_this(context, plain_object);
            Protected<typename VM::GlobalContext> protected_ctx(
                Context<VM>::get_global_context(context));

            JSPersistentCallback<VM> p_callback{protected_callback,
                                                protected_this,
                                                protected_ctx};

            collection->register_for_notifications(p_callback);
            return Value::from_boolean(context, true);
        };
    }
    auto remove_listener() {
        return [](const Napi::CallbackInfo& info) {
            ContextType env = info.Env();
            return Value::from_boolean(env, true);
        };
    }
    template <typename JavascriptPlainObject>
    auto remove_all_listeners(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            ContextType env = info.Env();
            auto collection = &object->get_data();
            collection->remove_all_listeners();
            return Value::from_undefined(env);
        };
    }
};

template <typename VM>
class DictionaryAdapter {
   private:
    using ValueType = typename VM::Value;
    using Context = typename VM::Context;
    using Collection = CollectionAdapter<object_store::Dictionary,
                                         typename VM::Function>;
    using JSObjectBuilder = JSObjectBuilder<VM, Collection>;
    using MixedAPI = TypeMixed<VM>;
    using DictionaryGetterSetter =
        AccessorsConfiguration<Context, AccessorsForDictionary<MixedAPI>>;

   public:
    ValueType wrap(Context context,
                   realm::object_store::Dictionary dictionary) {
        Collection collection{dictionary};
        JSObjectBuilder* js_builder =
            new JSObjectBuilder(context, std::move(collection));

        js_builder->template configure_object_destructor([=]() {
            /* GC will trigger this function, signaling that...
             * ...we can deallocate the attached C++ object.
             */
            delete js_builder;
        });

        js_builder->template add_feature<DictionaryGetterSetter>();
        js_builder->template add_feature<ListenersMethodsForDictionary<VM>>();

        return js_builder->build();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
