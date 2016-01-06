/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include "js_util.hpp"
#include <map>

namespace realm {
    class Realm;
    using ObjectDefaults = std::map<std::string, JSValueRef>;
}

JSClassRef RJSRealmClass();
JSClassRef RJSRealmConstructorClass();

std::string RJSDefaultPath();
void RJSSetDefaultPath(std::string path);

std::map<std::string, realm::ObjectDefaults> &RJSDefaults(realm::Realm *realm);
std::map<std::string, JSValueRef> &RJSPrototypes(realm::Realm *realm);
