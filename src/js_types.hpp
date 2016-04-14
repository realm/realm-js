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

#include <stdexcept>
#include <string>
#include <vector>

#include <realm/util/to_string.hpp>

#if defined(__GNUC__) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE inline __attribute__((always_inline))
#elif defined(_MSC_VER) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE __forceinline
#else
# define REALM_JS_INLINE inline
#endif

namespace realm {
namespace js {

enum PropertyAttributes {
    None       = 0,
    ReadOnly   = 1 << 0,
    DontEnum   = 1 << 1,
    DontDelete = 1 << 2
};

template<typename T>
struct String {
    using StringType = typename T::String;

  public:
    String(const char *);
    String(const StringType &);
    String(StringType &&);
    String(const std::string &);

    operator StringType() const;
    operator std::string() const;
};

template<typename T>
struct Context {
    using TContext = typename T::Context;
    using GlobalTContext = typename T::GlobalContext;

    static GlobalTContext get_global_context(TContext);
};

template<typename T>
struct Value {
    using TContext = typename T::Context;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;

    static bool is_array(TContext, const TValue &);
    static bool is_array_buffer(TContext, const TValue &);
    static bool is_boolean(TContext, const TValue &);
    static bool is_constructor(TContext, const TValue &);
    static bool is_date(TContext, const TValue &);
    static bool is_function(TContext, const TValue &);
    static bool is_null(TContext, const TValue &);
    static bool is_number(TContext, const TValue &);
    static bool is_object(TContext, const TValue &);
    static bool is_string(TContext, const TValue &);
    static bool is_undefined(TContext, const TValue &);
    static bool is_valid(const TValue &);

    static TValue from_boolean(TContext, bool);
    static TValue from_null(TContext);
    static TValue from_number(TContext, double);
    static TValue from_string(TContext, const String<T> &);
    static TValue from_undefined(TContext);

    static TObject to_array(TContext, const TValue &);
    static bool to_boolean(TContext, const TValue &);
    static TFunction to_constructor(TContext, const TValue &);
    static TObject to_date(TContext, const TValue &);
    static TFunction to_function(TContext, const TValue &);
    static double to_number(TContext, const TValue &);
    static TObject to_object(TContext, const TValue &);
    static String<T> to_string(TContext, const TValue &);

#define VALIDATED(return_t, type) \
    static return_t validated_to_##type(TContext ctx, const TValue &value, const char *name = nullptr) { \
        if (!is_##type(ctx, value)) { \
            std::string prefix = name ? std::string("'") + name + "'" : "JS value"; \
            throw std::invalid_argument(prefix + " must be: " #type); \
        } \
        return to_##type(ctx, value); \
    }

    VALIDATED(TObject, array)
    VALIDATED(bool, boolean)
    VALIDATED(TFunction, constructor)
    VALIDATED(TObject, date)
    VALIDATED(TFunction, function)
    VALIDATED(double, number)
    VALIDATED(TObject, object)
    VALIDATED(String<T>, string)

#undef VALIDATED
};

template<typename T>
struct Function {
    using TContext = typename T::Context;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;

    static TValue call(TContext, const TFunction &, const TObject &, size_t, const TValue[]);
    static TValue call(TContext ctx, const TFunction &function, const TObject &this_object, const std::vector<TValue> &arguments) {
        return call(ctx, function, this_object, arguments.size(), arguments.data());
    }

    static TObject construct(TContext, const TFunction &, size_t, const TValue[]);
    static TValue construct(TContext ctx, const TFunction &function, const std::vector<TValue> &arguments) {
        return construct(ctx, function, arguments.size(), arguments.data());
    }
};

template<typename T>
struct Object {
    using TContext = typename T::Context;
    using TFunction = typename T::Function;
    using TObject = typename T::Object;
    using TValue = typename T::Value;

  public:
    static TValue get_prototype(TContext, const TObject &);
    static void set_prototype(TContext, const TObject &, const TValue &);

    static bool has_property(TContext, const TObject &, const String<T> &);
    static bool has_property(TContext, const TObject &, uint32_t);
    static TValue get_property(TContext, const TObject &, const String<T> &);
    static TValue get_property(TContext, const TObject &, uint32_t);
    static void set_property(TContext, const TObject &, const String<T> &, const TValue &, PropertyAttributes attributes = None);
    static void set_property(TContext, const TObject &, uint32_t, const TValue &);
    static std::vector<String<T>> get_property_names(TContext, const TObject &);

    template<typename P>
    static TValue validated_get_property(TContext ctx, const TObject &object, const P &property, const char *message = nullptr) {
        if (!has_property(ctx, object, property)) {
            throw std::out_of_range(message ?: "Object missing expected property: " + util::to_string(property));
        }
        return get_property(ctx, object, property);
    }

    static uint32_t validated_get_length(TContext ctx, const TObject &object) {
        static const String<T> length_string = "length";
        return Value<T>::validated_to_number(ctx, get_property(ctx, object, length_string));
    }

#define VALIDATED(return_t, type) \
    static return_t validated_get_##type(TContext ctx, const TObject &object, const String<T> &key, const char *message = nullptr) { \
        try { \
            return Value<T>::validated_to_##type(ctx, get_property(ctx, object, key), std::string(key).c_str()); \
        } \
        catch(std::invalid_argument &e) { \
            throw message ? std::invalid_argument(message) : e; \
        } \
    } \
    static return_t validated_get_##type(TContext ctx, const TObject &object, uint32_t index, const char *message = nullptr) { \
        try { \
            return Value<T>::validated_to_##type(ctx, get_property(ctx, object, index)); \
        } \
        catch(std::invalid_argument &e) { \
            throw message ? std::invalid_argument(message) : e; \
        } \
    }

    VALIDATED(TObject, array)
    VALIDATED(bool, boolean)
    VALIDATED(TFunction, constructor)
    VALIDATED(TObject, date)
    VALIDATED(TFunction, function)
    VALIDATED(double, number)
    VALIDATED(TObject, object)
    VALIDATED(String<T>, string)

#undef VALIDATED

    static TValue call_method(TContext ctx, const TObject &object, const String<T> &name, uint32_t argc, const TValue arguments[]) {
        TFunction method = validated_get_function(ctx, object, name);
        return Function<T>::call(ctx, method, object, argc, arguments);
    }
    static TValue call_method(TContext ctx, const TObject &object, const String<T> &name, const std::vector<TValue> &arguments) {
        return call_method(ctx, object, name, (uint32_t)arguments.size(), arguments.data());
    }

    static TObject create_empty(TContext);
    static TObject create_array(TContext, uint32_t, const TValue[]);

    static TObject create_array(TContext ctx, const std::vector<TValue> &values) {
        return create_array(ctx, (uint32_t)values.size(), values.data());
    }
    static TObject create_array(TContext ctx) {
        return create_array(ctx, 0, nullptr);
    }

    static TObject create_date(TContext, double);

    template<typename U>
    static TObject create_instance(TContext, U*);

    template<typename U>
    static bool is_instance(TContext, const TObject &);

    template<typename U>
    static U* get_internal(const TObject &);

    template<typename U>
    static void set_internal(const TObject &, U*);
};

template<typename TValue>
class Protected {
    operator TValue() const;
    bool operator==(const TValue &) const;
    bool operator!=(const TValue &) const;
    bool operator==(const Protected<TValue> &) const;
    bool operator!=(const Protected<TValue> &) const;
    bool operator<(const Protected<TValue> &) const;
};

template<typename T>
struct Exception : public std::runtime_error {
    using TContext = typename T::Context;
    using TValue = typename T::Value;

    const Protected<TValue> m_value;

    Exception(TContext ctx, const TValue &val)
        : std::runtime_error(std::string(Value<T>::to_string(ctx, val))), m_value(ctx, val) {}

    operator TValue() const {
        return m_value;
    }

    static TValue value(TContext ctx, const std::string &message);

    static TValue value(TContext ctx, const std::exception &exp) {
        if (const Exception<T> *js_exp = dynamic_cast<const Exception<T> *>(&exp)) {
            return *js_exp;
        }
        return value(ctx, exp.what());
    }
};

template<typename T>
struct ReturnValue {
    using TValue = typename T::Value;

    void set(const TValue &);
    void set(const std::string &);
    void set(bool);
    void set(double);
    void set(int32_t);
    void set(uint32_t);
    void set_null();
    void set_undefined();
};

template<typename T, typename U>
REALM_JS_INLINE typename T::Object create_object(typename T::Context ctx, U* internal = nullptr) {
    return Object<T>::template create_instance<U>(ctx, internal);
}

template<typename T, typename U>
REALM_JS_INLINE U* get_internal(const typename T::Object &object) {
    return Object<T>::template get_internal<U>(object);
}

template<typename T, typename U>
REALM_JS_INLINE void set_internal(const typename T::Object &object, U* ptr) {
    Object<T>::template set_internal<U>(object, ptr);
}

} // js
} // realm
