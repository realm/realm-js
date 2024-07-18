////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

#include <realm/util/functional.hpp>
#include <realm/object-store/util/scheduler.hpp>

#include <napi.h>

namespace realm::js::node {

using VoidUniqueFunctionImpl = std::remove_pointer_t<decltype(realm::util::UniqueFunction<void()>().release())>;

class NapiScheduler : public realm::util::Scheduler {
public:
    NapiScheduler(Napi::Env& env);
    bool is_on_thread() const noexcept override;
    bool is_same_as(const Scheduler* other) const noexcept override;
    bool can_invoke() const noexcept override;
    void invoke(realm::util::UniqueFunction<void()>&& func) override;

private:
    Napi::Env m_env;
    Napi::TypedThreadSafeFunction<std::nullptr_t, VoidUniqueFunctionImpl> m_tsf;
};

} // namespace realm::js::node
