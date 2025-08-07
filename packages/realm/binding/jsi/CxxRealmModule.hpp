#pragma once

#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace realm::js {

class JSI_EXPORT CxxRealmModule : public facebook::react::TurboModule {
public:
    static constexpr const char* kModuleName = "Realm";
    CxxRealmModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
    ~CxxRealmModule() override;

    static facebook::jsi::Value initialize(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule,
                                           const facebook::jsi::Value args[], size_t count);

private:
    std::shared_ptr<facebook::react::CallInvoker> callInvoker_;
};

} // namespace realm::js