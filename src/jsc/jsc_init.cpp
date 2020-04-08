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

#include <algorithm>
#include <cassert>

#include "jsc_init.hpp"
#include "platform.hpp"
namespace realm {
namespace jsc {
    js::Protected<JSObjectRef> ObjectDefineProperty;
    js::Protected<JSObjectRef> FunctionPrototype;
    js::Protected<JSObjectRef> RealmObjectClassConstructor;
    js::Protected<JSObjectRef> RealmObjectClassConstructorPrototype;
}
}

extern "C" {

using namespace realm;
using namespace realm::jsc;

JSObjectRef RJSConstructorCreate(JSContextRef ctx) {
    return js::RealmClass<Types>::create_constructor(ctx);
}

void RJSInitializeInContext(JSContextRef ctx) {
    static const jsc::String realm_string = "Realm";

    JSObjectRef global_object = JSContextGetGlobalObject(ctx);

    jsc_class_init(ctx, global_object);

    JSObjectRef realm_constructor = RJSConstructorCreate(ctx);

    jsc::Object::set_property(ctx, global_object, realm_string, realm_constructor, js::ReadOnly | js::DontEnum | js::DontDelete);
}

} // extern "C"
