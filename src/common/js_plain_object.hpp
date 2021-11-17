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
#include <iostream>

#include "object/interfaces.hpp"
#include "object/strategies.hpp"

namespace realm {
namespace js {

template <typename VM, typename GetterSetters = EmptyGetterSetters, typename Builder = NoBuilder<VM>,
          typename Collection = NoData>
struct JSObject : public ObjectObserver {
private:
    using Value = js::Value<VM>;
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;

    ContextType context;
    bool waiting_for_notifications{false};

    std::unique_ptr<Builder> builder;
    std::unique_ptr<Collection> collection;
    std::vector<std::unique_ptr<Subscriber>> subscribers;
    common::JavascriptObject<GetterSetters> javascript_object;

public:
    template <typename RealmData>
    JSObject(ContextType _context, RealmData _data)
        : context{_context}
        , javascript_object{_context}
    {
        builder = std::make_unique<Builder>();
        collection = std::make_unique<Collection>(_data);

        collection->on_change([=](collection::Notification notification) {
            update(notification);

            // This is to control when JS-VM is shutting down but they are still updates pending by Realm.
            // We basically ignore any update if the object has been disposed.
            if (notification.from_realm) {
                notify_subscribers(notification);
            }
        });
    };

    Collection* get_collection()
    {
        return collection.get();
    }

    void watch_collection()
    {
        if (waiting_for_notifications) {
            return;
        }

        waiting_for_notifications = collection->watch();
    }

    void subscribe(std::unique_ptr<Subscriber> subscriber)
    {
        subscribers.push_back(std::move(subscriber));
        watch_collection();
    }

    void remove_subscription(std::unique_ptr<Subscriber> subscriber)
    {
        int index = -1;
        for (auto const& candidate : subscribers) {
            index++;
            if (candidate->equals(subscriber)) {
                subscribers.erase(subscribers.begin() + index);
                break;
            }
        }
    }

    void unsubscribe_all()
    {
        subscribers.clear();
    }

    void notify_subscribers(collection::Notification notification)
    {
        HANDLESCOPE(context)
        for (auto& subscriber : subscribers) {
            subscriber->notify(javascript_object.get(), notification.change_set);
        }
    }

    template <typename Realm_ChangeSet>
    void update(Realm_ChangeSet& change_set)
    {
        /* This is necessary for NodeJS. */
        HANDLESCOPE(context)

        // This is to control when JS-VM is shutting down but they are still updates pending by Realm.
        // We basically ignore any update if the object has been disposed.
        if (javascript_object.is_alive()) {
            builder->add_accessors(javascript_object, collection->data());
            builder->remove_accessors(javascript_object, collection.get());
        }
    }

    ObjectType build()
    {
        builder->template add_methods<VM>(javascript_object);
        builder->add_accessors(javascript_object, collection->data());

        javascript_object.set_collection(collection.get());
        javascript_object.set_observer(this);

        return javascript_object.create();
    }

    template <typename CB>
    void setup_finalizer(CB&& cb)
    {
        // This method gets called when GC dispose the JS Object.
        javascript_object.finalize(
            [=]() {
                cb();
            },
            this);
    }

    ~JSObject() = default;
};
} // namespace js
} // namespace realm
