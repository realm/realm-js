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

// NOTE: This dummy file exists only to make Xcode build the Realm Node dynamic library.
#include "node.h"

extern "C" void node_module_register(void* mod) {}

namespace node {
namespace Buffer {
    bool HasInstance(v8::Local<v8::Value> val) { return false; }
    char* Data(v8::Local<v8::Value> val) { return nullptr; }
    size_t Length(v8::Local<v8::Value> val) { return 0; }
}
}
