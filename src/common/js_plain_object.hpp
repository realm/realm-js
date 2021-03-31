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

#include <iostream>
#include "common/object/interfaces.hpp"

#pragma once

namespace realm {
namespace js {

#if REALM_PLATFORM_NODE
#include "common/object/node_object.hpp"
#else
#include "common/object/jsc_object.hpp"
#endif

/*
 *  Dictionary accessors for JS Objects.
 */
template <typename T, typename Accessor>
struct AccessorsConfiguration {
    template <class JavascriptObject, class JSObject>
    void apply(JavascriptObject& js_object, JSObject* _o) {
        auto dictionary = _o->get_data();
        for (auto entry_pair : dictionary) {
            auto key = entry_pair.first.get_string().data();
            js_object.template add_accessor<Accessor>(key, dictionary);
        }
    }
};

template <typename VM>
struct NoMethods {
    using ContextType = typename VM::Context;
    ContextType context;
    NoMethods(ContextType _context) : context{_context} {};
};

class NoData{};

struct NoNotificationsStrategy{
    int empty{0};

    void on_change(){}
};


template <typename VM,
          typename GetterSetters,
          typename NotificationStrategy = NoNotificationsStrategy,
          typename Methods = NoMethods<VM>,
          typename Data = NoData>
struct JSObject: public ObjectMutationObserver {
   private:
    using Value = js::Value<VM>;
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;
    NotificationStrategy notifications;

    bool waiting_for_notifications{false};
    std::unique_ptr<Methods> methods;
    std::unique_ptr<GetterSetters> getters_setters;
    Data data;


    std::vector<Subscriber*> subscribers;
    ContextType context;

   public:
    JSObject(ContextType _context, Data _data) : context{_context},
    data{_data},
    notifications{_data} {
        getters_setters = std::make_unique<GetterSetters>();
        methods = std::make_unique<Methods>();
    };

    Data& get_data() { return data; }

    void activate_on_change() {
        if(waiting_for_notifications){
            return;
        }

        notifications.on_change(
                [=](auto dict, auto change_set) {
                    update(change_set);
                });

        waiting_for_notifications = true;
    }

    void subscribe(Subscriber* subscriber) {
        subscribers.push_back(subscriber);
        activate_on_change();
    }

    void remove_subscription(const Subscriber *subscriber) {
        int index = -1;
        for (auto const &candidate : subscribers) {
            index++;
            if (candidate->equals(subscriber)) {
                subscribers.erase(subscribers.begin() + index);
                break;
            }
        }
    }

    void unsubscribe_all(){
        subscribers.clear();
    }

    template <typename Realm_ChangeSet>
    void update(Realm_ChangeSet& change_set) {
        /* This is necessary for NodeJS. */
        HANDLESCOPE(context)

        auto obj_value = build();

        for (Subscriber* subs : subscribers) {
            subs->notify(obj_value, change_set);
        }
    }

    ObjectType build() {
        T::common::JavascriptObject js_object{context};
        methods->apply(js_object, this);
        getters_setters->apply(js_object, this);
        return js_object.get_object();
    }

    template <typename CB>
    void setup_finalizer(ObjectType object, CB&& cb) {
        // This method gets called when GC dispose the JS Object.
        T::common::JavascriptObject::finalize(
            object, [=]() {
                cb();
            },
            this);
    }

    ~JSObject() = default;
};
}  // namespace js
}  // namespace realm
