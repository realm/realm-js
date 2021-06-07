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


#include "hermes_init.hpp"

#if !REALM_ENABLE_SYNC
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "crypt32")
#endif

#include "js_realm.hpp"

namespace realm::js::hermes {
extern "C" void realm_hermes_init(jsi::Runtime& rt, jsi::Object& exports)
{
    auto env = JsiEnv(rt);
    jsi::Function realm_constructor = js::RealmClass<Types>::create_constructor(env);
    auto name = realm_constructor.getProperty(env, "name").asString(env);
    exports.setProperty(env, std::move(name), std::move(realm_constructor));
}
} // namespace realm::js::hermes

// TODO hook up as TurboModule
