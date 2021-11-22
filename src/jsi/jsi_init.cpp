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


#include "jsi_init.hpp"

#if !REALM_ENABLE_SYNC
#pragma comment( lib, "ws2_32.lib")
#pragma comment (lib, "crypt32")
#endif

#include "js_realm.hpp"

#include <realm/object-store/impl/realm_coordinator.hpp>
#include <realm/object-store/sync/app.hpp>

namespace realmjsi = realm::js::realmjsi;
namespace fbjsi = facebook::jsi;

namespace realm::js::jsi {
    extern "C" void realm_jsi_init(fbjsi::Runtime& rt, fbjsi::Object& exports) {
        auto env = JsiEnv(rt);
        fbjsi::Function realm_constructor = js::RealmClass<realmjsi::Types>::create_constructor(env);
        auto name = realm_constructor.getProperty(env, "name").asString(env);
        exports.setProperty(env, std::move(name), std::move(realm_constructor));
    }
    extern "C" void realm_jsi_invalidate_caches() {
        // Close all cached Realms
        realm::_impl::RealmCoordinator::clear_all_caches();
        // Clear the Object Store App cache, to prevent instances from using a context that was released
        realm::app::App::clear_cached_apps();
        // Ensure all registered invalidators get notified that the runtime is going away.
        realm::js::Context<realm::js::realmjsi::Types>::invalidate();
    }
}

// TODO hook up as TurboModule
