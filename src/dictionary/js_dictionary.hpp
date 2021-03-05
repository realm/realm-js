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

template <typename Listener>
class DictionaryNotifications {
private:
    NotificationToken token;
    std::vector<Listener> listeners;
    object_store::Dictionary dictionary;
    bool listening = false;

    void listen_for_collection_changes() {
        if (listening) {
            return;
        }

        token = dictionary.add_key_based_notification_callback(
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
    DictionaryNotifications(object_store::Dictionary& _dictionary): dictionary{_dictionary} {}
    DictionaryNotifications(DictionaryNotifications&& dictionary)  = default;

    void remove_listener(Listener listener){
        int index = -1;
        for(auto const& candidate: listeners){
           index++;
           if(listener == candidate){
               listeners.erase(listeners.begin() + index);
               break;
           }
        }
    }
    void remove_all_listeners() { listeners.clear(); }

    template <class Delegate>
    void register_for_notifications(Delegate delegate) {
        listeners.push_back(delegate);
        listen_for_collection_changes();
    }
};

template <typename Collection, typename Notifications>
class CollectionAdapter: public Notifications {
   private:
    Collection collection;

   public:
    CollectionAdapter(Collection _collection) : collection{_collection}, Notifications{_collection} {}
    CollectionAdapter(CollectionAdapter&& collection_adapter)  = default;

    /*
     * Makes the contents of this collection compatible with the existing mechanism.
     */
    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return collection.add_notification_callback(arguments...);
    }
    Collection& get_collection() { return collection; }
};

template <typename MixedAPI>
struct AccessorsForDictionary {
    using Dictionary = object_store::Dictionary;

    template <typename JavascriptObject>
    auto make_getter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary *realm_dictionary = &object->get_data().get_collection();
            auto mixed_value = realm_dictionary->get_any(key_name);
            return MixedAPI::get_instance().wrap(info.Env(), mixed_value);
        };
    }
    template <typename JavascriptObject>
    auto make_setter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary *realm_dictionary = &object->get_data().get_collection();
            auto mixed = MixedAPI::get_instance().unwrap(info.Env(), info[0]);

            realm_dictionary->insert(key_name, mixed);
        };
    }
};

template <typename T>
struct JSPersistentCallback {
    using ObjectType = typename T::Object;
    using FunctionType = typename T::Function;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context ;

    using PFunction = Protected<FunctionType>;
    using PObject = Protected<ObjectType>;
    using PGlobalContext = Protected<typename T::GlobalContext>;

    using Object = js::Object<T>;

    PFunction fn;
    PObject plain_object;
    PGlobalContext context;

    JSPersistentCallback(ContextType& _context, FunctionType& _fn)
    : fn{_context, _fn},
      plain_object{_context, Object::create_empty(_context)},
      context{Context<T>::get_global_context(_context)} {}

    JSPersistentCallback(FunctionType& _fn, ObjectType& obj, ContextType& _context)
        :   fn{_context, _fn},
            plain_object{_context, obj},
            context{Context<T>::get_global_context(_context)} {}

    template <typename Collection>
    auto build_array(Collection& collection) const {
        std::vector<ValueType> values;
        for (auto mixed_item : collection) {
            values.push_back(
                TypeMixed<T>::get_instance().wrap(context, mixed_item));
        }

        return Object::create_array(context, values);
    }

    bool operator==(const JSPersistentCallback<T>& candidate){
        return static_cast<FunctionType>(fn) == static_cast<FunctionType>(candidate.fn);
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

template <typename VM, typename Collection>
class CollectionPersistence {
private:
    using ContextType = typename VM::Context;
    using ObjectType = typename VM::Object;
    using FunctionType = typename VM::Function;
    using Value = js::Value<VM>;

    ContextType context;
public:
    CollectionPersistence(ContextType _context) : context{_context} {}

    template <typename JavascriptPlainObject>
    void apply(JavascriptPlainObject* object) {
        auto collection = &object->get_data();
        auto plain_object = object->get_plain_object();
        auto external_value = Napi::External<Collection>::New(context, &object->get_data());

        auto access_descriptor = Napi::PropertyDescriptor::Value("__internal", external_value, napi_default);
        object->register_accessor(access_descriptor);
    }
};


template <typename VM>
class ListenersMethodsForDictionary {
   private:
    using ContextType = typename VM::Context;
    using ObjectType = typename VM::Object;
    using FunctionType = typename VM::Function;
    using Value = js::Value<VM>;

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
        add_javascript_function("removeListener", remove_listener(object), object);
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

            JSPersistentCallback<VM> js_callback {callback,
                                                plain_object,
                                                context};

            collection->register_for_notifications(js_callback);
        };
    }

    template <typename JavascriptPlainObject>
    auto remove_listener(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            ContextType context = info.Env();
            auto callback = Value::validated_to_function(context, info[0]);
            JSPersistentCallback<VM> js_callback { context, callback};
            auto collection = &object->get_data();
            collection->remove_listener(js_callback);

        };
    }
    template <typename JavascriptPlainObject>
    auto remove_all_listeners(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            ContextType env = info.Env();
            auto collection = &object->get_data();
            collection->remove_all_listeners();
        };
    }
};

template <typename VM>
class DictionaryAdapter {
   private:
    using ValueType = typename VM::Value;
    using Context = typename VM::Context;
    using Callbacks = JSPersistentCallback<VM>;
    using Collection = CollectionAdapter<object_store::Dictionary, DictionaryNotifications<Callbacks>>;
    using JSObjectBuilder = JSObjectBuilder<VM, Collection>;
    using MixedAPI = TypeMixed<VM>;
    using DictionaryGetterSetter =
        AccessorsConfiguration<Context, AccessorsForDictionary<MixedAPI>>;

   public:
    ValueType wrap(Context context,
                   realm::object_store::Dictionary dictionary) {
        std::cout << "I'm just getting the same dict? -> " << dictionary.size() << '\n';

        Collection collection{std::move(dictionary)};
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
        js_builder->template add_feature<CollectionPersistence<VM, Collection>>();

        return js_builder->build();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
