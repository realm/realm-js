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

#include "node_object_accessor.hpp"

using namespace realm;
using namespace realm::node;

using Accessor = js::NativeAccessor<Types>;

template<>
std::string Accessor::to_binary(v8::Isolate* isolate, v8::Local<v8::Value> &value) {
    // TODO
    return std::string();
}

template<>
v8::Local<v8::Value> Accessor::from_binary(v8::Isolate* isolate, BinaryData data) {
    // TODO
    return v8::Local<v8::Value>();
}
