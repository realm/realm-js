#pragma once

#include <jsi/jsi.h>
#include <realm_js_helpers.h>
#include <type_traits>

namespace realm::js::JSI {
namespace {
namespace jsi = facebook::jsi;
template <typename Ref>
struct HostRefWrapper : jsi::HostObject {
    static_assert(std::is_reference_v<Ref>);
    HostRefWrapper(Ref ref)
        : ref(ref)
    {
    }

    static std::shared_ptr<HostRefWrapper> create(Ref val)
    {
        return std::make_shared<HostRefWrapper>(val);
    }

    static jsi::Object create(jsi::Runtime& rt, Ref val)
    {
        return jsi::Object::createFromHostObject(rt, create(val));
    }

    static Ref& extract(jsi::Runtime& rt, jsi::Object&& obj)
    {
        return FWD(obj).getHostObject<HostRefWrapper>(rt)->ref;
    }
    static Ref& extract(jsi::Runtime& rt, jsi::Value&& val)
    {
        return extract(rt, FWD(val).getObject(rt));
    }
    static Ref& extract(jsi::Runtime& rt, const jsi::Value& val)
    {
        return extract(rt, val.getObject(rt));
    }

    Ref ref;
};

template <typename T, typename Base = T>
struct HostObjClassWrapper : HostRefWrapper<Base&> {
    HostObjClassWrapper(T&& val)
        : HostRefWrapper<Base&>(this->value)
        , value(std::move(val))
    {
    }

    static std::shared_ptr<HostObjClassWrapper> create(T&& val)
    {
        return std::make_shared<HostObjClassWrapper>(FWD(val));
    }

    static jsi::Object create(jsi::Runtime& rt, T&& val)
    {
        return jsi::Object::createFromHostObject(rt, create(FWD(val)));
    }

    T value;
};

template <typename T>
std::remove_cvref_t<T> copyIfNeeded(jsi::Runtime& rt, const T& val)
{
    return T(rt, val);
}

template <typename T>
std::remove_cvref_t<T> copyIfNeeded(jsi::Runtime&, T&& val)
{
    return FWD(val);
}

#define FWD_OR_COPY(x) copyIfNeeded(_env, FWD(x))

REALM_NOINLINE inline jsi::Value toJsiErrorCode(jsi::Runtime& env, const std::error_code& e) noexcept
{
    REALM_ASSERT_RELEASE(e);
    auto out = jsi::JSError(env, e.message()).value().getObject(env);
    out.setProperty(env, "code", e.value());
    out.setProperty(env, "category", e.category().name());
    return jsi::Value(std::move(out));
}

REALM_NOINLINE inline jsi::Value toJsiException(jsi::Runtime& env, const std::exception_ptr& e) noexcept
{
    auto jsError = [&] {
        try {
            std::rethrow_exception(e);
        }
        catch (const jsi::JSError& e) {
            return e;
        }
        catch (const std::exception& e) {
            return jsi::JSError(env, e.what());
        }
        catch (...) {
            return jsi::JSError(env, "Unknown Error");
        }
    }();
    return jsi::Value(env, jsError.value());
}

[[noreturn]] REALM_NOINLINE inline void throwJsiException(jsi::Runtime& env, const std::exception& e)
{
    if (dynamic_cast<const jsi::JSError*>(&e))
        throw; // Just allow exception propagation to continue
    // TODO consider throwing more specific errors in some cases.
    // TODO consider using ThrowAsJavaScriptException instead here.
    throw jsi::JSError(env, e.what());
}

[[noreturn]] REALM_NOINLINE inline void throwNullSharedPtrError(jsi::Runtime& env, const char* clsName)
{
    throw jsi::JSError(env, util::format("Attempting to use an instanace of $1 holding a null shared_ptr. "
                                         "Did you call $resetSharedPtr on it already?",
                                         clsName));
}

/**
 * Stores Func in a std::shared_ptr if it isn't copyable.
 */
template <typename Func>
class MakeCopyable {
public:
    explicit MakeCopyable(Func&& func)
        : m_func(std::make_shared<Func>(FWD(func)))
    {
    }

    auto operator()(auto&&... args) const
        // TODO replace with this once stdlib has concepts.
        //requires std::invocable<Func, decltype(FWD(args))...>
        requires std::is_invocable_v<Func, decltype(FWD(args))...>
    {
        return (*m_func)(FWD(args)...);
    }

private:
    static_assert(!std::is_copy_constructible_v<Func>);
    static_assert(!std::is_reference_v<Func>);
    std::shared_ptr<Func> m_func;
};

/**
 * Specialization if Func is already copyable stores Func inline.
 */
template <typename Func>
    requires std::is_copy_constructible_v<Func>
class MakeCopyable<Func> {
public:
    explicit MakeCopyable(Func&& func)
        : m_func(FWD(func))
    {
    }

    auto operator()(auto&&... args) const
        // TODO replace with this once stdlib has concepts.
        //requires std::invocable<Func, decltype(FWD(args))...>
        requires std::is_invocable_v<Func, decltype(FWD(args))...>
    {
        return m_func(FWD(args)...);
    }

private:
    static_assert(!std::is_reference_v<Func>);
    Func m_func;
};

} // namespace
} // namespace realm::js::JSI
