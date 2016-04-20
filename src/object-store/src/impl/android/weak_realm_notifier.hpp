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

#include "impl/weak_realm_notifier_base.hpp"

namespace realm {
class Realm;

namespace _impl {

class WeakRealmNotifier : public WeakRealmNotifierBase {
public:
    WeakRealmNotifier(const std::shared_ptr<Realm>& realm, bool cache);
    ~WeakRealmNotifier();

    WeakRealmNotifier(WeakRealmNotifier&&);
    WeakRealmNotifier& operator=(WeakRealmNotifier&&);

    WeakRealmNotifier(const WeakRealmNotifier&) = delete;
    WeakRealmNotifier& operator=(const WeakRealmNotifier&) = delete;

    // Register  or unregister the handler on the looper so we will react to refresh notifications
    void set_auto_refresh(bool auto_refresh);

    // Asyncronously call notify() on the Realm on the appropriate thread
    void notify();

private:
    // Pointer to the handler, created by Java/C#.
    void* m_handler;
};

using create_handler_function = void*(*)();
extern create_handler_function create_handler_for_current_thread;

using notify_handler_function = void(*)(void* handler, void* realm);
extern notify_handler_function notify_handler;

using destroy_handler_function = void(*)(void* handler);
extern destroy_handler_function destroy_handler;
} // namespace _impl
} // namespace realm

