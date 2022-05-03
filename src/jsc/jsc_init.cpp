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

#include <algorithm>
#include <cassert>

#include <realm/object-store/impl/realm_coordinator.hpp>
#include <realm/object-store/collection_notifications.hpp>
#include <realm/object-store/sync/app.hpp>
#include <realm/object-store/sync/subscribable.hpp>
#include <realm/object-store/sync/sync_user.hpp>

#include "jsc_init.hpp"
#include "platform.hpp"

#include "js_notifications.hpp"

namespace realm {
namespace jsc {
js::Protected<JSObjectRef> ObjectDefineProperty;
js::Protected<JSObjectRef> FunctionPrototype;
js::Protected<JSObjectRef> RealmObjectClassConstructor;
js::Protected<JSObjectRef> RealmObjectClassConstructorPrototype;
} // namespace jsc

namespace js {
std::function<void()> flush_ui_queue;
} // namespace js
} // namespace realm

extern "C" {

using namespace realm;
using namespace realm::jsc;

JSObjectRef RJSConstructorCreate(JSContextRef ctx)
{
    return js::RealmClass<Types>::create_constructor(ctx);
}

void RJSInitializeInContext(JSContextRef ctx, std::function<void()> flush_ui_queue)
{
    static const jsc::String realm_string = "Realm";

    JSObjectRef global_object = JSContextGetGlobalObject(ctx);

    jsc_class_init(ctx, global_object, flush_ui_queue);

    JSObjectRef realm_constructor = RJSConstructorCreate(ctx);

    jsc::Object::set_property(ctx, global_object, realm_string, realm_constructor,
                              js::ReadOnly | js::DontEnum | js::DontDelete);
}

void RJSInvalidateCaches()
{
    // Close all cached Realms
    realm::_impl::RealmCoordinator::clear_all_caches();
    // Clear the Object Store App cache, to prevent instances from using a context that was released
    realm::app::App::clear_cached_apps();
    // Clear notifications
    realm::js::notifications::NotificationBucket<jsc::Types, NotificationToken>::clear();
    realm::js::notifications::NotificationBucket<jsc::Types, Subscribable<realm::SyncUser>::Token>::clear();
    realm::js::notifications::NotificationBucket<jsc::Types, Subscribable<realm::app::App>::Token>::clear();
}

// Note: This must be called before RJSInvalidateCaches, otherwise the app cache
// will have been cleared and so no sync sessions will be closed
void RJSCloseSyncSessions()
{
    // Force all sync sessions to close immediately. This prevents the new JS thread
    // from opening a new sync session while the old one is still active when reloading
    // in dev mode.
    realm::app::App::close_all_sync_sessions();
}

} // extern "C"
