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

#include "flush_ui_queue_workaround.h"

#include <ReactCommon/CallInvoker.h>

namespace realm::js::flush_ui_workaround {
    // Calls are debounced using the waiting_for_ui_flush bool, so if an async flush is already
    // pending when another JS to C++ call happens, we don't call invokeAsync again. This works
    // because the work is performed before the microtask queue is flushed - see sequence
    // diagram at https://bit.ly/3kexhHm. It might be possible to further optimize this,
    // e.g. only flush the queue a maximum of once per frame, but this seems reasonable.
    bool waiting_for_ui_flush = false;
    std::shared_ptr<facebook::react::CallInvoker> js_invoker_ {};

    void inject_js_call_invoker(std::shared_ptr<facebook::react::CallInvoker> js_invoker) {
        js_invoker_ = js_invoker;
    }

    void reset_js_call_invoker() {
        // TODO: Consider taking an invoker as an argument and only resetting if it matches js_invoker_
        // This would ensure the pointer isn't resetting from a subsequent assignment from the constructor
        js_invoker_.reset();
    }

    void flush_ui_queue() {
        if (js_invoker_ && !waiting_for_ui_flush) {
            waiting_for_ui_flush = true;
            // Calling invokeAsync tells React Native to execute the lambda passed
            // in on the JS thread, and then flush the internal "microtask queue", which has the
            // effect of flushing any pending UI updates.
            // 
            // We call this after we have called into JS from C++, in order to ensure that the RN
            // UI updates in response to any changes from Realm. We need to do this as we bypass
            // the usual RN bridge mechanism for communicating between C++ and JS, so without doing
            // this RN has no way to know that a change has occurred which might require an update
            // (see #4389, facebook/react-native#33006).
            js_invoker_->invokeAsync([&] {
                waiting_for_ui_flush = false;
            });
        }
    }
}
