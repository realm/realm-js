#pragma once

#include <emscripten.h>
#include <realm_helpers.h>

namespace realm::js::browser {
namespace {

REALM_NOINLINE inline emscripten::val toEmscriptenErrorCode(const std::error_code& e) noexcept
{
    REALM_ASSERT_RELEASE(e);
    auto out = emscripten::val();
    out.set("code", e.value());
    out.set("category", e.category().name());
    out.set("message", e.message());// TODO needed?

    return out;
}
REALM_NOINLINE [[noreturn]] inline emscripten::val toEmscriptenException(const std::exception_ptr& e) noexcept
{
    try {
        std::rethrow_exception(e);
    }
    catch (const std::exception& e) {
        // TODO throw an actual Error object (maybe using EM_JS)
        emscripten::val(e.what()).throw_();
    }
    catch (...) {
        emscripten::val("Unknown Error").throw_();
    }
}
} // namespace
} // namespace realm::js::node
