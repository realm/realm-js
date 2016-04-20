////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#include "impl/weak_realm_notifier.hpp"

#include <atomic>
#include <assert.h>

namespace realm {
namespace _impl {

WeakRealmNotifier::WeakRealmNotifier(const std::shared_ptr<Realm>& realm, bool cache)
: WeakRealmNotifierBase(realm, cache)
{
}

WeakRealmNotifier::WeakRealmNotifier(WeakRealmNotifier&& rgt)
: WeakRealmNotifierBase(std::move(rgt))
, m_handler(rgt.m_handler)
{
    rgt.m_handler = nullptr;
}

WeakRealmNotifier& WeakRealmNotifier::operator=(WeakRealmNotifier&& rgt)
{
    WeakRealmNotifierBase::operator=(std::move(rgt));
    m_handler = rgt.m_handler;
    rgt.m_handler = nullptr;

    return *this;
}

WeakRealmNotifier::~WeakRealmNotifier()
{
    if (m_handler) {
        destroy_handler(m_handler);
        m_handler = nullptr;
    }
}

void WeakRealmNotifier::set_auto_refresh(bool auto_refresh)
{
    if (auto_refresh) {
        m_handler = create_handler_for_current_thread();
    }
    else {
        destroy_handler(m_handler);
        m_handler = nullptr;
    }
}

void WeakRealmNotifier::notify()
{
    if (m_handler && realm().get()) {
        auto realmPtr = new std::weak_ptr<Realm>(realm());
        notify_handler(m_handler, realmPtr);
    }
}

create_handler_function create_handler_for_current_thread = nullptr;
notify_handler_function notify_handler = nullptr;
destroy_handler_function destroy_handler = nullptr;

}
}
