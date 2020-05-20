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
#include "js_types.hpp"

#include "impl/realm_coordinator.hpp"

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

static std::string s_test_files_path;
void clear_test_state() {
    realm::_impl::RealmCoordinator::clear_all_caches();
    realm::remove_realm_files_from_directory(realm::default_realm_file_directory());
#if REALM_ENABLE_SYNC
    for(auto &user : SyncManager::shared().all_logged_in_users()) {
        user->log_out();
    }
    SyncManager::shared().reset_for_testing();
#if REALM_ANDROID
    s_test_files_path = realm::default_realm_file_directory();
    auto ros_dir = s_test_files_path + "/realm-object-server";
    if (File::exists(ros_dir)) {
        util::remove_dir_recursive(s_test_files_path + "/realm-object-server");
    }
#else
    auto remove_test_files = [] {
        if (!s_test_files_path.empty()) {
            util::remove_dir_recursive(s_test_files_path);
        }
    };
    remove_test_files();

    if (s_test_files_path.empty()) {
        atexit(remove_test_files);
    }
    s_test_files_path = util::make_temp_dir();
#endif
    SyncClientConfig client_config;
    client_config.base_file_path = s_test_files_path;
    client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
    SyncManager::shared().configure(client_config);
#endif
}

std::string TypeErrorException::type_string(Property const& prop)
{
    using realm::PropertyType;
    std::string ret;

    switch (prop.type & ~PropertyType::Flags) {
        case PropertyType::Int:
        case PropertyType::Float:
        case PropertyType::Double:
            ret = "number";
            break;
        case PropertyType::Bool:
            ret = "boolean";
            break;
        case PropertyType::String:
            ret = "string";
            break;
        case PropertyType::Date:
            ret = "date";
            break;
        case PropertyType::Data:
            ret = "binary";
            break;
        case PropertyType::LinkingObjects:
        case PropertyType::Object:
            ret = prop.object_type;
            break;
        case PropertyType::Any:
            throw std::runtime_error("'Any' type is not supported");
        default:
            REALM_UNREACHABLE();
    }

    if (realm::is_nullable(prop.type)) {
        ret += "?";
    }
    if (realm::is_array(prop.type)) {
        ret += "[]";
    }
    return ret;
}


} // js
} // realm
