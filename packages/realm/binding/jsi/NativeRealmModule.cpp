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
#include <jsi_init.h>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace realm {

namespace jsi = facebook::jsi;

NativeRealmModule::NativeRealmModule(std::shared_ptr<facebook::react::CallInvoker> js_invoker)
    : TurboModule("Realm", js_invoker)
{
    auto get_binding = [] (jsi::Runtime& rt, TurboModule& turbo_module, const jsi::Value* args, size_t count) {
        auto exports = jsi::Object(rt);
        realm_jsi_init(rt, exports, [&] () {
            auto &realm_module = static_cast<NativeRealmModule&>(turbo_module);
            realm_module.flush_ui();
        });
        return jsi::Value(rt, exports);
    };
    // Registering the get_binding method on the turbo module
    methodMap_["getBinding"] = MethodMetadata{0, get_binding};
}

NativeRealmModule::~NativeRealmModule()
{
    realm_jsi_invalidate_caches();
}


void NativeRealmModule::flush_ui() {
    // Calling invokeAsync tells React Native to execute the lambda passed
    // in on the JS thread, and then flush the internal "microtask queue", which has the
    // effect of flushing any pending UI updates.
    //
    // We call this after we have called into JS from C++, in order to ensure that the RN
    // UI updates in response to any changes from Realm. We need to do this as we bypass
    // the usual RN bridge mechanism for communicating between C++ and JS, so without doing
    // this RN has no way to know that a change has occurred which might require an update
    // (see #4389, facebook/react-native#33006).
    //
    // Calls are debounced using the waiting_for_ui_flush flag, so if an async flush is already
    // pending when another JS to C++ call happens, we don't call invokeAsync again. This works
    // because the work is performed before the microtask queue is flushed - see sequence
    // diagram at https://bit.ly/3kexhHm. It might be possible to further optimize this,
    // e.g. only flush the queue a maximum of once per frame, but this seems reasonable.
    
    if (!this->waiting_for_ui_flush) {
        this->waiting_for_ui_flush = true;
        this->jsInvoker_->invokeAsync([&] {
            this->waiting_for_ui_flush = false;
        });
    }
}

} // namespace realm
