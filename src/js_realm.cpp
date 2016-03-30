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

#include "platform.hpp"

namespace realm {
namespace js {

static std::string s_defaultPath = "";
std::string default_path() {
    if (s_defaultPath.size() == 0) {
        s_defaultPath = realm::default_realm_file_directory() + "/default.realm";
    }
    return s_defaultPath;
}

void set_default_path(std::string path) {
    s_defaultPath = path;
}

} // js
} // realm
