/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include "js_util.hpp"

namespace realm {
    class Object;
}

JSClassRef RJSObjectClass();
JSObjectRef RJSObjectCreate(JSContextRef ctx, realm::Object object);
