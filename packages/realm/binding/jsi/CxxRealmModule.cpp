#include "CxxRealmModule.hpp"

#include "jsi_init.h"
#include "react_scheduler.h"

namespace realm::js {

CxxRealmModule::CxxRealmModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : facebook::react::TurboModule(CxxRealmModule::kModuleName, jsInvoker)
{

    methodMap_["initialize"] = MethodMetadata{1, &CxxRealmModule::initialize};
    // TODO: Create a ReactScheduler instead of storing the callInvoker
    callInvoker_ = std::move(jsInvoker);
    realm::js::react_scheduler::create_scheduler(callInvoker_);
}

CxxRealmModule::~CxxRealmModule()
{
    // Reset the scheduler to prevent invocations using an old runtime
    realm::js::react_scheduler::reset_scheduler();
    realm_jsi_invalidate_caches();
}

facebook::jsi::Value CxxRealmModule::initialize(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule,
                                                const facebook::jsi::Value args[], size_t count)
{
    facebook::jsi::Object exports(rt);
    realm_jsi_init(rt, exports);
    return exports;
}

} // namespace realm::js