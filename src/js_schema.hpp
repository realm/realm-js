/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include "js_util.hpp"
#include <map>

namespace realm {
    class Schema;
    using ObjectDefaults = std::map<std::string, JSValueRef>;
}

JSClassRef RJSSchemaClass();
JSObjectRef RJSSchemaCreate(JSContextRef ctx, realm::Schema *schema);

realm::Schema RJSParseSchema(JSContextRef ctx, JSObjectRef jsonObject, std::map<std::string, realm::ObjectDefaults> &defaults, std::map<std::string, JSValueRef> &prototypes);
