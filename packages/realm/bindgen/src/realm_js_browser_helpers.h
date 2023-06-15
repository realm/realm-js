#pragma once

#include <emscripten.h>
#include <realm_helpers.h>

namespace realm::js::browser {
namespace {

REALM_NOINLINE inline emscripten::val toEmscriptenErrorCode(const std::error_code& e) noexcept
{
    REALM_ASSERT_RELEASE(e);
    auto jsErr = emscripten::val::global("Error")(emscripten::val(e.message()));
    jsErr.set("code", e.value());
    jsErr.set("category", e.category().name());

    return jsErr;
}
REALM_NOINLINE inline emscripten::val toEmscriptenException(const std::exception& e) noexcept
{
    return emscripten::val::global("Error")(std::string(e.what()));
}
REALM_NOINLINE inline emscripten::val toEmscriptenException(const std::exception_ptr& e) noexcept
{
    try {
        std::rethrow_exception(e);
    }
    catch (const std::exception& e) {
        return toEmscriptenException(e);
    }
    catch (...) {
        return emscripten::val::global("Error")(std::string("Unknown error"));
    }
}
// Allocate a new C++ buffer big enough to fit the JS buffer
// Create a JS memory view around the C++ buffer
// Call TypedArray.prototype.set to efficiently copy the JS buffer into the C++ buffer via the view
REALM_NOINLINE inline std::string toBinaryData(const emscripten::val array_buffer) noexcept
{
    REALM_ASSERT(array_buffer.instanceof(emscripten::val::global("ArrayBuffer")));
    std::string buf;
    buf.resize(array_buffer["byteLength"].as<int32_t>());

    emscripten::val mv(emscripten::typed_memory_view(buf.length(), buf.data()));
    mv.call<void>("set", emscripten::val::global("Uint8Array").new_(array_buffer));

    return buf;

}
REALM_NOINLINE inline OwnedBinaryData toOwnedBinaryData(const emscripten::val array_buffer) noexcept
{
    REALM_ASSERT(array_buffer.instanceof(emscripten::val::global("ArrayBuffer")));
    auto length = array_buffer["byteLength"].as<int32_t>();
    
    std::unique_ptr<char[]> buf(new char[length]);

    emscripten::val mv(emscripten::typed_memory_view(length, buf.get()));
    mv.call<void>("set", emscripten::val::global("Uint8Array").new_(array_buffer));

    return OwnedBinaryData(std::move(buf), length);

}
} // namespace
} // namespace realm::js::node
