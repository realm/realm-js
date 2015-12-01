/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include "js_util.hpp"
#include "shared_realm.hpp"
#include "list.hpp"

JSClassRef RJSListClass();
JSObjectRef RJSListCreate(JSContextRef ctx, realm::List &list);
