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

#ifndef JS_DICTIONARY_HEADER
#define JS_DICTIONARY_HEADER

#include <iostream>

#include "object/interfaces.hpp"
#include "object/strategies.hpp"

#pragma once

#if REALM_ANDROID
#include <android/log.h>
#endif

namespace realm {
namespace js {

/*
 *  Dictionary accessors for JS Objects.
 */
template <typename Accessor>
struct AccessorsConfiguration {
    template <class JSObject>
    void apply(common::JavascriptObject& js_object, JSObject* _o) {
        auto collection = _o->get_collection();
        for (auto entry_pair : *collection) {
            auto key = entry_pair.first.get_string().data();
            js_object.template add_accessor<Accessor>(key, collection);
        }
    }
};

template <typename VM,
          typename GetterSetters,
          typename NotificationStrategy = NoNotificationsStrategy,
          typename Methods = NoMethods<VM>,
          typename Collection = NoData>
struct JSObject : public ObjectObserver {
   private:
    using Value = js::Value<VM>;
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;

    NotificationStrategy notifications;
    std::thread::id this_id;

    bool waiting_for_notifications{false};
    std::unique_ptr<Methods> methods;
    std::unique_ptr<GetterSetters> getters_setters;
    std::unique_ptr<Collection> collection;

    std::vector<Subscriber*> subscribers;
    ContextType context;
    Protected<typename VM::GlobalContext> protected_context;

   public:
    template <typename RealmData>
    JSObject(ContextType _context, RealmData _data)
        : context{_context},
          protected_context {Context<VM>::get_global_context(_context)},
        notifications{_data} {
        getters_setters = std::make_unique<GetterSetters>();
        methods = std::make_unique<Methods>();
        collection = std::make_unique<Collection>(_data);
        this_id = std::this_thread::get_id();
        #if REALM_ANDROID
            __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "Are we in the same thread %d", (this_id == std::this_thread::get_id() ));
        #endif
    };

    Collection* get_collection() { return collection.get(); }

    void activate_on_change() {
        if (waiting_for_notifications) {
            return;
        }

        notifications.on_change(
            [=](auto dict, auto change_set) { update(change_set); });

        waiting_for_notifications = true;
    }

    void subscribe(Subscriber* subscriber) {
        subscribers.push_back(subscriber);
        activate_on_change();
    }

    void remove_subscription(const Subscriber* subscriber) {
#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "remove_subscription [begin]");
#endif
        int index = -1;
        for (auto const& candidate : subscribers) {
            index++;
            if (candidate->equals(subscriber)) {
                subscribers.erase(subscribers.begin() + index);
                break;
            }
        }

#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "remove_subscription [end] size -> %d", (int)subscribers.size());
#endif
    }

    void unsubscribe_all() {
        subscribers.clear();
    }

    template <typename Realm_ChangeSet>
    void update(Realm_ChangeSet& change_set) {
        /* This is necessary for NodeJS. */
        HANDLESCOPE(context)

        ObjectType obj;

        #if REALM_ANDROID
            obj = _test(protected_context);
        #else
            obj = build();
        #endif

        for (Subscriber* subscriber : subscribers) {
            subscriber->notify(obj, change_set);
        }
    }

    ObjectType _test(ContextType _context) {
#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "build_test [begin]");
#endif

        common::JavascriptObject js_object{_context};

        methods->apply(js_object, this);
        getters_setters->apply(js_object, this);

#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "Are we in the same thread %d", (this_id == std::this_thread::get_id() ));

       js_object.set_collection(collection.get());
       js_object.set_observer(this);
#endif

        auto obj =  js_object.get_object();

#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "build_test [end]");
#endif
        return obj;
    }

    ObjectType build() {
#if REALM_ANDROID
        __android_log_print(ANDROID_LOG_INFO, "RealmJS::JS_Plain_Object", "build [begin]");
#endif
        common::JavascriptObject js_object{context};
        methods->apply(js_object, this);
        getters_setters->apply(js_object, this);

#if REALM_ANDROID
       js_object.set_collection(collection.get());
       js_object.set_observer(this);
#endif

        return js_object.get_object();;
    }

    template <typename CB>
    void setup_finalizer(ObjectType object, CB&& cb) {
        // This method gets called when GC dispose the JS Object.
        common::JavascriptObject::finalize(
            object, [=]() { cb(); }, this);
    }

    ~JSObject() = default;
};
}  // namespace js
}  // namespace realm

#endif