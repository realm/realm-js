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
#include <memory>

namespace realm {
    class Realm;
    class Query;
    typedef std::shared_ptr<Realm> SharedRealm;
}

JSClassRef RJSResultsClass();
JSObjectRef RJSResultsCreate(JSContextRef ctx, realm::SharedRealm realm, std::string className);
JSObjectRef RJSResultsCreate(JSContextRef ctx, realm::SharedRealm realm, std::string className, std::string query, std::vector<JSValueRef> args);
JSObjectRef RJSResultsCreate(JSContextRef ctx, realm::SharedRealm realm, const realm::ObjectSchema &objectSchema, realm::Query query, bool live = true);
JSObjectRef RJSResultsCreateFiltered(JSContextRef ctx, realm::SharedRealm realm, const realm::ObjectSchema &objectSchema, realm::Query query, size_t argumentCount, const JSValueRef arguments[]);
JSObjectRef RJSResultsCreateSorted(JSContextRef ctx, realm::SharedRealm realm, const realm::ObjectSchema &objectSchema, realm::Query query, size_t argumentCount, const JSValueRef arguments[]);
