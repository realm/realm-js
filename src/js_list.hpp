/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "js_util.hpp"
#import "shared_realm.hpp"
#import "list.hpp"

JSClassRef RJSListClass();
JSObjectRef RJSListCreate(JSContextRef ctx, realm::List &list);
