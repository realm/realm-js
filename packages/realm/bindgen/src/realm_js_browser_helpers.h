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
REALM_NOINLINE inline emscripten::val toEmscriptenException(const std::exception& e) noexcept
{
    return emscripten::val::global("Error")(std::string(e.what()));
}
REALM_NOINLINE inline emscripten::val toEmscriptenException(const std::exception_ptr& e)
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
EM_JS(void, copy_buffer_to_typed_view, (emscripten::EM_VAL buffer_handle, emscripten::EM_VAL view_handle), {
    const buffer = Emval.toValue(buffer_handle);
    const view = Emval.toValue(view_handle);
    view.set(new Uint8Array(buffer));
});
// Allocate a new C++ buffer big enough to fit the JS buffer
// Create a JS memory view around the C++ buffer
// Call TypedArray.prototype.set to efficiently copy the JS buffer into the C++ buffer via the view
REALM_NOINLINE inline std::string toBinaryData(const emscripten::val array_buffer) noexcept
{
    REALM_ASSERT(array_buffer.instanceof(emscripten::val::global("ArrayBuffer")));
    std::string buf;
    buf.resize(array_buffer["byteLength"].as<int32_t>());

    emscripten::val mv(emscripten::typed_memory_view(buf.length(), buf.data()));
    copy_buffer_to_typed_view(array_buffer.as_handle(), mv.as_handle());

    return buf;

}
REALM_NOINLINE inline OwnedBinaryData toOwnedBinaryData(const emscripten::val array_buffer) noexcept
{
    REALM_ASSERT(array_buffer.instanceof(emscripten::val::global("ArrayBuffer")));
    auto length = array_buffer["byteLength"].as<int32_t>();
    
    std::unique_ptr<char[]> buf(new char[length]);

    emscripten::val mv(emscripten::typed_memory_view(length, buf.get()));
    copy_buffer_to_typed_view(array_buffer.as_handle(), mv.as_handle());

    return OwnedBinaryData(std::move(buf), length);

}
} // namespace
} // namespace realm::js::node
