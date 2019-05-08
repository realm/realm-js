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

#pragma once

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wundef"
#include <node.h>
#pragma GCC diagnostic pop

#include "sync/sync_manager.hpp"

namespace realm {
namespace node {

class SyncLoggerFactory : public realm::SyncLoggerFactory {
public:
    SyncLoggerFactory(v8::Isolate* v8_isolate, v8::Local<v8::Function> callback)
        : m_v8_isolate(v8_isolate)
        , m_callback(v8_isolate, callback)
    {
    }

    std::unique_ptr<util::Logger> make_logger(util::Logger::Level level) override final;

private:
    v8::Isolate* m_v8_isolate;
    v8::Persistent<v8::Function> m_callback;
};

} // namespace node
} // namespace realm
