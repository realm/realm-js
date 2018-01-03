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

#if REALM_ENABLE_SYNC
#include "sync/sync_manager.hpp"
#include "sync/sync_user.hpp"
#endif

namespace realm {
namespace js {

static std::string s_default_path = "";

std::string default_path() {
    if (s_default_path.empty()) {
        s_default_path = realm::default_realm_file_directory() +
#if defined(WIN32) && WIN32
            '\\'
#else       
            '/'
#endif
            + "default.realm";
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

void clear_test_state() {
    delete_all_realms();
#if REALM_ENABLE_SYNC
    for(auto &user : SyncManager::shared().all_logged_in_users()) {
        user->log_out();
    }
    SyncManager::shared().reset_for_testing();
    SyncManager::shared().configure_file_system(default_realm_file_directory(), SyncManager::MetadataMode::NoEncryption);
#endif
}
    
} // js
} // realm
