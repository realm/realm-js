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
#include "realm_coordinator.hpp"

namespace realm {
namespace js {

static std::string s_default_path = "";

std::string default_path() {
    if (s_default_path.size() == 0) {
        s_default_path = realm::default_realm_file_directory() + "/default.realm";
    }
    return s_default_path;
}

void set_default_path(std::string path) {
    s_default_path = path;
}

void delete_all_realms() {
    realm::_impl::RealmCoordinator::clear_all_caches();
    realm::remove_realm_files_from_directory(realm::default_realm_file_directory());
}

} // js
} // realm
