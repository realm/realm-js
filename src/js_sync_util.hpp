////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

#pragma once

#include "js_types.hpp"
#include "object-store/src/sync/app.hpp"
#include "object-store/src/sync/sync_manager.hpp"
#include "sync/sync_config.hpp"
#include "sync/sync_manager.hpp"
#include "sync/sync_session.hpp"
#include "sync/app.hpp"
#include "platform.hpp"

#include <realm/util/optional.hpp>

namespace realm {
namespace js {

template<typename T>
inline realm::SyncManager& syncManagerShared(typename T::Context &ctx) {
    static std::once_flag flag;
    std::call_once(flag, [ctx] {
        auto realm_constructor = js::Value<T>::validated_to_object(ctx, js::Object<T>::get_global(ctx, "Realm"));
        std::string user_agent_binding_info;
        auto user_agent_function = js::Object<T>::get_property(ctx, realm_constructor, "_createUserAgentDescription");
        if (js::Value<T>::is_function(ctx, user_agent_function)) {
            auto result = js::Function<T>::call(ctx, js::Value<T>::to_function(ctx, user_agent_function), realm_constructor, 0, nullptr);
            user_agent_binding_info = js::Value<T>::validated_to_string(ctx, result);
        }
        ensure_directory_exists_for_file(default_realm_file_directory());
        SyncClientConfig client_config;
        client_config.base_file_path = default_realm_file_directory();
        client_config.metadata_mode = SyncManager::MetadataMode::NoEncryption;
        client_config.user_agent_binding_info = user_agent_binding_info;
        SyncManager::shared().configure(client_config);
    });
    return SyncManager::shared();
}

}
}
