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

#include "jsc_class.hpp"
#include "jsc_realm.hpp"
#include "js_realm.hpp"
#include "js_object.hpp"
#include "js_results.hpp"
#include "jsc_list.hpp"
#include "js_schema.hpp"
#include "jsc_util.hpp"
#include "platform.hpp"

#include "shared_realm.hpp"
#include "impl/realm_coordinator.hpp"
#include "object_accessor.hpp"
#include "binding_context.hpp"
#include "results.hpp"

#include <cassert>

using namespace realm;
using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;

bool RealmHasInstance(JSContextRef ctx, JSObjectRef constructor, JSValueRef value, JSValueRef* exception) {
    return JSValueIsObjectOfClass(ctx, value, RJSRealmClass());
}

using RJSRealm = realm::js::Realm<realm::jsc::Types>;
WRAP_CONSTRUCTOR(RJSRealm, Constructor);
WRAP_CLASS_METHOD(RJSRealm, SchemaVersion)
WRAP_PROPERTY_GETTER(RJSRealm, GetDefaultPath)
WRAP_PROPERTY_SETTER(RJSRealm, SetDefaultPath)

static const JSStaticValue RealmConstructorStaticProperties[] = {
    {"defaultPath", RJSRealmGetDefaultPath, RJSRealmSetDefaultPath, kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL}
};

static const JSStaticFunction RealmConstructorFuncs[] = {
    {"schemaVersion", RJSRealmSchemaVersion, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmConstructorClass() {
    JSClassDefinition realmConstructorDefinition = kJSClassDefinitionEmpty;
    realmConstructorDefinition.attributes = kJSClassAttributeNoAutomaticPrototype;
    realmConstructorDefinition.className = "RealmConstructor";
    realmConstructorDefinition.callAsConstructor = RJSRealmConstructor;
    realmConstructorDefinition.hasInstance = RealmHasInstance;
    realmConstructorDefinition.staticValues = RealmConstructorStaticProperties;
    realmConstructorDefinition.staticFunctions = RealmConstructorFuncs;
    return JSClassCreate(&realmConstructorDefinition);
}

WRAP_CLASS_METHOD(RJSRealm, Objects)
WRAP_CLASS_METHOD(RJSRealm, Create)
WRAP_CLASS_METHOD(RJSRealm, Delete)
WRAP_CLASS_METHOD(RJSRealm, DeleteAll)
WRAP_CLASS_METHOD(RJSRealm, Write)
WRAP_CLASS_METHOD(RJSRealm, AddListener)
WRAP_CLASS_METHOD(RJSRealm, RemoveListener)
WRAP_CLASS_METHOD(RJSRealm, RemoveAllListeners)
WRAP_CLASS_METHOD(RJSRealm, Close)
WRAP_PROPERTY_GETTER(RJSRealm, GetPath)
WRAP_PROPERTY_GETTER(RJSRealm, GetSchemaVersion)

static const JSStaticValue RealmStaticProperties[] = {
    {"path", RJSRealmGetPath, NULL, kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"schemaVersion", RJSRealmGetSchemaVersion, NULL, kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL}
};

static const JSStaticFunction RJSRealmFuncs[] = {
    {"objects", RJSRealmObjects, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"create", RJSRealmCreate, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"delete", RJSRealmDelete, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"deleteAll", RJSRealmDeleteAll, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"write", RJSRealmWrite, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"addListener", RJSRealmAddListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeListener", RJSRealmRemoveListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeAllListeners", RJSRealmRemoveAllListeners, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"close", RJSRealmClose, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmClass() {
    static JSClassRef s_realmClass = RJSCreateWrapperClass<SharedRealm *>("Realm", NULL, NULL, RJSRealmFuncs, NULL, NULL, RealmStaticProperties);
    return s_realmClass;
}

namespace realm {
namespace js {
JSClassRef realm_class() { return RJSRealmClass(); };
}
}
