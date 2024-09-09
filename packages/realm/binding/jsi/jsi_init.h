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

#pragma once

#import <functional>
#import <jsi/jsi.h>

#ifdef __cplusplus
extern "C" {
#endif

namespace jsi = facebook::jsi;
void realm_jsi_init(jsi::Runtime& rt, jsi::Object& exports);
void realm_jsi_invalidate_caches();

#ifdef __cplusplus
}
#endif
