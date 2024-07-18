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

#include "napi_scheduler.h"

#include <realm/util/functional.hpp>
#include <realm/object-store/util/scheduler.hpp>

#include <napi.h>

#include <functional>
#include <memory>
#include <type_traits>

namespace realm::js::node {

namespace {
/**
 * Assumes called exactly once per data value:
 * An absent call results in a leak and multiple calls result in use-after-free.
 */
void call_func_from_data(Napi::Env, Napi::Function, std::nullptr_t*, VoidUniqueFunctionImpl* data)
{
    (realm::util::UniqueFunction<void()>(data))();
}

/**
 * A NAPI thread-safe function which use the data to construct and call a `UniqueFunction`:
 * Simpler and faster than passing and calling a `Napi::Function` to `NonBlockingCall`.
 */
using SchedulerThreadSafeFunction =
    Napi::TypedThreadSafeFunction<std::nullptr_t, VoidUniqueFunctionImpl, &call_func_from_data>;

} // namespace

NapiScheduler::NapiScheduler(Napi::Env& env)
    : m_env(env)
    // TODO: Consider including an id from the env in the resource name
    , m_tsf(SchedulerThreadSafeFunction::New(env, "realm::NapiScheduler", 0, 1))
{
}

bool NapiScheduler::is_on_thread() const noexcept
{
    return false;
}

bool NapiScheduler::is_same_as(const Scheduler* other) const noexcept
{
    auto o = dynamic_cast<const NapiScheduler*>(other);
    return (o && (o->m_env == m_env));
}

bool NapiScheduler::can_invoke() const noexcept
{
    return true;
}

void NapiScheduler::invoke(realm::util::UniqueFunction<void()>&& func)
{
    m_tsf.NonBlockingCall(func.release());
}

} // namespace realm::js::node
