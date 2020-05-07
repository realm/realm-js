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

#include "napi.h"

#include "sync/sync_manager.hpp"

namespace realm {
namespace node {

class SyncLoggerFactory : public realm::SyncLoggerFactory {
public:
	SyncLoggerFactory(Napi::Env env, Napi::Function callback)
		: m_env(env),
		  m_callback(Napi::Persistent(callback))
	{
	}

    std::unique_ptr<util::Logger> make_logger(util::Logger::Level level) override final;

private:
    Napi::Env m_env;
    Napi::FunctionReference m_callback;
};

} // namespace node
} // namespace realm
