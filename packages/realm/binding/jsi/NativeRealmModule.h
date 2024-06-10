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

#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

namespace realm::js {
namespace jsi = facebook::jsi;
namespace react = facebook::react;

class JSI_EXPORT NativeRealmModule: public react::TurboModule {
public:
    NativeRealmModule(std::shared_ptr<react::CallInvoker> js_invoker);
    ~NativeRealmModule();
    void flush_ui_queue();
private:
    bool waiting_for_ui_flush;
};

}
