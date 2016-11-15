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

#include "node_init.hpp"
#include "js_realm.hpp"

namespace realm {
namespace node {

static void init(v8::Local<v8::Object> exports) {
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    v8::Local<v8::Function> realm_constructor = js::RealmClass<Types>::create_constructor(isolate);

    Nan::Set(exports, realm_constructor->GetName(), realm_constructor);
}

} // node
} // realm

NODE_MODULE(Realm, realm::node::init);
