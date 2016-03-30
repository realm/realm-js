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

#include "js_schema.hpp"
#include "object_store.hpp"

/*
namespace realm {
    struct SchemaWrapper {
        Schema *schema;
        bool owned;
        ~SchemaWrapper() {
            if (owned) {
                delete schema;
            }
        }
    };
}

using namespace realm;

JSClassRef RJSSchemaClass() {
    static JSClassRef s_schemaClass = RJSCreateWrapperClass<SchemaWrapper *>("Schema");
    return s_schemaClass;
}

JSObjectRef RJSSchemaCreate(JSContextRef ctx, Schema &schema) {
    SchemaWrapper *wrapper = new SchemaWrapper();
    wrapper->schema = &schema;
    wrapper->owned = false;
    return js::WrapObject(ctx, RJSSchemaClass(), wrapper);
}
*/
