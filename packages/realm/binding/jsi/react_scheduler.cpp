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

#include "react_scheduler.h"

#include <realm/object-store/util/scheduler.hpp>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/SchedulerPriority.h>

#include <thread>

using Scheduler = realm::util::Scheduler;

namespace {

std::shared_ptr<Scheduler> scheduler_{};

class ReactScheduler : public realm::util::Scheduler {
public:
    ReactScheduler(std::shared_ptr<facebook::react::CallInvoker> js_call_invoker)
        : m_js_call_invoker(js_call_invoker)
    {
    }

    bool is_on_thread() const noexcept override
    {
        return m_id == std::this_thread::get_id();
    }

    bool is_same_as(const Scheduler* other) const noexcept override
    {
        auto o = dynamic_cast<const ReactScheduler*>(other);
        return (o && (o->m_js_call_invoker == m_js_call_invoker));
    }

    bool can_invoke() const noexcept override
    {
        return true;
    }

    void invoke(realm::util::UniqueFunction<void()>&& func) override
    {
        // TODO: We could pass `facebook::react::SchedulerPriority::NormalPriority` as first argument
        // TODO: We could pass a callback taking a `jsi::Runtime` as first argument
        // Doing either would require our peer dependency on `react-native` to be >= 0.75.0
        m_js_call_invoker->invokeAsync([ptr = func.release()] {
            (realm::util::UniqueFunction<void()>(ptr))();
        });
    }

private:
    std::shared_ptr<facebook::react::CallInvoker> m_js_call_invoker;
    std::thread::id m_id = std::this_thread::get_id();
};

std::shared_ptr<Scheduler> get_scheduler()
{
    if (scheduler_) {
        REALM_ASSERT(scheduler_->is_on_thread());
        return scheduler_;
    }
    else {
        return Scheduler::make_platform_default();
    }
}

} // namespace

namespace realm::js::react_scheduler {


void create_scheduler(std::shared_ptr<facebook::react::CallInvoker> js_call_invoker)
{
    scheduler_ = std::make_shared<ReactScheduler>(js_call_invoker);
    Scheduler::set_default_factory(get_scheduler);
}

void reset_scheduler()
{
    scheduler_.reset();
}

} // namespace realm::js::react_scheduler
