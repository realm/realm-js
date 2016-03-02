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

#include "cached_realm.hpp"

#include <atomic>

namespace realm {
namespace _impl {

CachedRealm::CachedRealm(const std::shared_ptr<Realm>& realm, bool cache)
: CachedRealmBase(realm, cache)
{
}

CachedRealm::CachedRealm(CachedRealm&& rgt)
: CachedRealmBase(std::move(rgt))
, m_handler(rgt.m_handler)
{
    rgt.m_handler = nullptr;
}

CachedRealm& CachedRealm::operator=(CachedRealm&& rgt)
{
    CachedRealmBase::operator=(std::move(rgt));
    m_handler = rgt.m_handler;
    rgt.m_handler = nullptr;

    return *this;
}

CachedRealm::~CachedRealm()
{
    if (m_handler) {
        destroy_handler(m_handler);
        m_handler = nullptr;
    }
}

void CachedRealm::set_auto_refresh(bool auto_refresh)
{
    if (auto_refresh) {
        auto locked_ptr = new std::shared_ptr<Realm> {realm()};
        m_handler = create_handler_for_current_thread(locked_ptr);
    }
}

void CachedRealm::notify()
{
    notify_handler(m_handler);
}

create_handler_function create_handler_for_current_thread = nullptr;
notify_handler_function notify_handler = nullptr;
destroy_handler_function destroy_handler = nullptr;

}
}
