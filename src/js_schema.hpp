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

#pragma once

#include "js_util.hpp"
#include <map>

namespace realm {
    class Schema;
    using ObjectDefaults = std::map<std::string, JSValueRef>;
}

JSClassRef RJSSchemaClass();
JSObjectRef RJSSchemaCreate(JSContextRef ctx, realm::Schema *schema);

realm::Schema RJSParseSchema(JSContextRef ctx, JSObjectRef jsonObject, std::map<std::string, realm::ObjectDefaults> &defaults, std::map<std::string, JSObjectRef> &constructors);
