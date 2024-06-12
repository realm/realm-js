////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

#include "NativeRealmModule.h"
#include "jsi_init.h"
#include "flush_ui_queue_workaround.h"

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace realm::js {

namespace jsi = facebook::jsi;

NativeRealmModule::NativeRealmModule(std::shared_ptr<facebook::react::CallInvoker> js_invoker)
    : TurboModule("Realm", js_invoker)
{
    realm::js::flush_ui_workaround::inject_js_call_invoker(js_invoker);
    auto get_binding = [] (jsi::Runtime& rt, TurboModule& turbo_module, const jsi::Value* args, size_t count) {
        auto exports = jsi::Object(rt);
        realm_jsi_init(rt, exports);
        return jsi::Value(rt, exports);
    };
    // Registering the get_binding method on the turbo module
    methodMap_["getBinding"] = MethodMetadata{0, get_binding};
}

NativeRealmModule::~NativeRealmModule()
{
    // Resetting to allow the js_invoker to destruct
    realm::js::flush_ui_workaround::reset_js_call_invoker();
#if DEBUG
    // Immediately close any open sync sessions to prevent race condition with new
    // JS thread when hot reloading
    realm_jsi_close_sync_sessions();
#endif
    realm_jsi_invalidate_caches();
}

} // namespace realm
