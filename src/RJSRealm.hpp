////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#import "RJSUtil.hpp"
#include <map>

namespace realm {
    class Realm;
    using ObjectDefaults = std::map<std::string, JSValueRef>;
}

JSClassRef RJSRealmClass();
JSClassRef RJSRealmConstructorClass();
JSClassRef RJSNotificationClass();

std::string RJSDefaultPath();
void RJSSetDefaultPath(std::string path);

std::map<std::string, realm::ObjectDefaults> &RJSDefaults(realm::Realm *realm);
std::map<std::string, JSValueRef> &RJSPrototypes(realm::Realm *realm);
