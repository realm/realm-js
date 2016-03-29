////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include "js_util.hpp"
#include "shared_realm.hpp"
#include "binding_context.hpp"
#include <map>
#include <set>

namespace realm {
namespace js {

template<typename T>
class RealmDelegate : public BindingContext {
  public:
    using GlobalContextType = typename T::GlobalContext;
    using ObjectClassType = typename T::ObjectClass;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using ObjectDefaults = std::map<std::string, ValueType>;

    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {
        notify("change");
    }
    virtual std::vector<ObserverState> get_observed_rows() {
        return std::vector<ObserverState>();
    }
    virtual void will_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {}

    RealmDelegate(std::weak_ptr<Realm> realm, GlobalContextType ctx) : m_context(ctx), m_realm(realm) {
        GlobalContextProtect(m_context);
    }
    ~RealmDelegate() {
        remove_all_notifications();

        for (auto constructor : m_constructors) {
            ValueUnprotect(m_context, constructor.second);
        }
        for (auto objectDefaults : m_defaults) {
            for (auto value : objectDefaults.second) {
                ValueUnprotect(m_context, value.second);
            }
        }
        GlobalContextUnprotect(m_context);
    }

    void add_notification(JSObjectRef notification) {
        if (!m_notifications.count(notification)) {
            ValueProtect(m_context, notification);
            m_notifications.insert(notification);
        }
    }
    void remove_notification(JSObjectRef notification) {
        if (m_notifications.count(notification)) {
            ValueUnprotect(m_context, notification);
            m_notifications.erase(notification);
        }
    }
    void remove_all_notifications() {
        for (auto notification : m_notifications) {
            ValueUnprotect(m_context, notification);
        }
        m_notifications.clear();
    }

    std::map<std::string, ObjectDefaults> m_defaults;
    std::map<std::string, ObjectType> m_constructors;

private:
    std::set<ObjectType> m_notifications;
    GlobalContextType m_context;
    std::weak_ptr<Realm> m_realm;
    
    void notify(const char *notification_name) {
        JSValueRef arguments[2];
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }
        ObjectType realm_object = WrapObject<SharedRealm *>(m_context, realm::js::RealmClass(), new SharedRealm(realm));
        arguments[0] = realm_object;
        arguments[1] = RJSValueForString(m_context, notification_name);

        for (auto callback : m_notifications) {
            JSValueRef ex = NULL;
            ObjectCallAsFunction(m_context, callback, realm_object, 2, arguments, ex);
            if (ex) {
                throw RJSException(m_context, ex);
            }
        }
    }
};

template<typename T>
static RealmDelegate<T> *get_delegate(Realm *realm) {
    return dynamic_cast<realm::js::RealmDelegate<T> *>(realm->m_binding_context.get());
}

}
}

JSClassRef RJSRealmClass();
JSClassRef RJSRealmConstructorClass();

std::string RJSDefaultPath();
void RJSSetDefaultPath(std::string path);

