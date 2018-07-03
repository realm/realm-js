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

#include "execution_context_id.hpp"
#include "property.hpp"

#include <stdexcept>
#include <string>
#include <vector>

#include <realm/binary_data.hpp>
#include <realm/string_data.hpp>
#include <realm/util/to_string.hpp>
#include <realm/util/optional.hpp>
#include <realm/mixed.hpp>

#if defined(__GNUC__) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE inline __attribute__((always_inline))
#elif defined(_MSC_VER) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE __forceinline
#else
# define REALM_JS_INLINE inline
#endif

namespace realm {
namespace js {

template<typename>
struct ResultsClass;
template<typename>
struct ListClass;

enum PropertyAttributes : unsigned {
    None       = 0,
    ReadOnly   = 1 << 0,
    DontEnum   = 1 << 1,
    DontDelete = 1 << 2
};

inline PropertyAttributes operator|(PropertyAttributes a, PropertyAttributes b) {
    return PropertyAttributes(static_cast<unsigned>(a) | static_cast<unsigned>(b));
}

template<typename T>
struct String {
    using StringType = typename T::String;

  public:
    String(const char *);
    String(const StringType &);
    String(StringType &&);
    String(StringData);

    operator StringType() const;
    operator std::string() const;
};

template<typename T>
struct Context {
    using ContextType = typename T::Context;
    using GlobalContextType = typename T::GlobalContext;

    static GlobalContextType get_global_context(ContextType);
    static AbstractExecutionContextID get_execution_context_id(ContextType);
};

class TypeErrorException : public std::invalid_argument {
public:
    template<typename NativeAccessor, typename ValueType>
    TypeErrorException(NativeAccessor& accessor, StringData object_type,
                       Property const& prop, ValueType value)
    : std::invalid_argument(util::format("%1.%2 must be of type '%3', got '%4' (%5)",
                                         object_type, prop.name, type_string(prop),
                                         accessor.typeof(value),
                                         accessor.print(value)))
    {}

    TypeErrorException(const char *name, std::string const& type, std::string const& value)
    : std::invalid_argument(util::format("%1 must be of type '%2', got (%3)",
                                         name ? name : "JS value", type, value))
    {}

    static std::string type_string(Property const& prop);
};

template<typename T>
struct Value {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;

    static const char *typeof(ContextType, const ValueType &);

    static bool is_array(ContextType, const ValueType &);
    static bool is_array_buffer(ContextType, const ValueType &);
    static bool is_array_buffer_view(ContextType, const ValueType &);
    static bool is_boolean(ContextType, const ValueType &);
    static bool is_constructor(ContextType, const ValueType &);
    static bool is_date(ContextType, const ValueType &);
    static bool is_function(ContextType, const ValueType &);
    static bool is_null(ContextType, const ValueType &);
    static bool is_number(ContextType, const ValueType &);
    static bool is_object(ContextType, const ValueType &);
    static bool is_string(ContextType, const ValueType &);
    static bool is_undefined(ContextType, const ValueType &);
    static bool is_binary(ContextType, const ValueType &);
    static bool is_valid(const ValueType &);

    static bool is_valid_for_property(ContextType, const ValueType&, const Property&);
    static bool is_valid_for_property_type(ContextType, const ValueType&, realm::PropertyType type, StringData object_type);

    static ValueType from_boolean(ContextType, bool);
    static ValueType from_null(ContextType);
    static ValueType from_number(ContextType, double);
    static ValueType from_string(ContextType ctx, const char *s) { return s ? from_nonnull_string(ctx, s) : from_null(ctx); }
    static ValueType from_string(ContextType ctx, StringData s) { return s ? from_nonnull_string(ctx, s) : from_null(ctx); }
    static ValueType from_string(ContextType ctx, const std::string& s) { return from_nonnull_string(ctx, s.c_str()); }
    static ValueType from_binary(ContextType ctx, BinaryData b) { return b ? from_nonnull_binary(ctx, b) : from_null(ctx); }
    static ValueType from_nonnull_string(ContextType, const String<T>&);
    static ValueType from_nonnull_binary(ContextType, BinaryData);
    static ValueType from_undefined(ContextType);
    static ValueType from_timestamp(ContextType, Timestamp);
    static ValueType from_mixed(ContextType, const util::Optional<Mixed> &);

    static ObjectType to_array(ContextType, const ValueType &);
    static bool to_boolean(ContextType, const ValueType &);
    static FunctionType to_constructor(ContextType, const ValueType &);
    static ObjectType to_date(ContextType, const ValueType &);
    static FunctionType to_function(ContextType, const ValueType &);
    static double to_number(ContextType, const ValueType &);
    static ObjectType to_object(ContextType, const ValueType &);
    static String<T> to_string(ContextType, const ValueType &);
    static OwnedBinaryData to_binary(ContextType, ValueType);


#define VALIDATED(return_t, type) \
    static return_t validated_to_##type(ContextType ctx, const ValueType &value, const char *name = nullptr) { \
        if (!is_##type(ctx, value)) { \
            throw TypeErrorException(name, #type, to_string(ctx, value)); \
        } \
        return to_##type(ctx, value); \
    }

    VALIDATED(ObjectType, array)
    VALIDATED(bool, boolean)
    VALIDATED(FunctionType, constructor)
    VALIDATED(ObjectType, date)
    VALIDATED(FunctionType, function)
    VALIDATED(double, number)
    VALIDATED(ObjectType, object)
    VALIDATED(String<T>, string)
    VALIDATED(OwnedBinaryData, binary)

#undef VALIDATED
};

template<typename T>
struct Function {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;

    static ValueType callback(ContextType, const FunctionType &, const ObjectType &, size_t, const ValueType[]);
    static ValueType call(ContextType, const FunctionType &, const ObjectType &, size_t, const ValueType[]);
    template<size_t N> static ValueType call(ContextType ctx, const FunctionType &function,
                                             const ObjectType &this_object, const ValueType (&arguments)[N])
    {
        return call(ctx, function, this_object, N, arguments);
    }
    static ValueType call(ContextType ctx, const FunctionType &function, size_t argument_count, const ValueType arguments[]) {
        return call(ctx, function, {}, argument_count, arguments);
    }
    static ValueType call(ContextType ctx, const FunctionType &function, const ObjectType &this_object, const std::vector<ValueType> &arguments) {
        return call(ctx, function, this_object, arguments.size(), arguments.data());
    }

    static ObjectType construct(ContextType, const FunctionType &, size_t, const ValueType[]);
    static ValueType construct(ContextType ctx, const FunctionType &function, const std::vector<ValueType> &arguments) {
        return construct(ctx, function, arguments.size(), arguments.data());
    }
};

template<typename T>
struct Object {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;

  public:
    static ValueType get_prototype(ContextType, const ObjectType &);
    static void set_prototype(ContextType, const ObjectType &, const ValueType &);

    static ValueType get_property(ContextType, const ObjectType &, StringData);
    static ValueType get_property(ContextType c, const ObjectType &o, const char *s) { return get_property(c, o, StringData(s)); }
    static ValueType get_property(ContextType c, const ObjectType &o, const std::string &s) { return get_property(c, o, StringData(s)); }
    static ValueType get_property(ContextType, const ObjectType &, const String<T> &);
    static ValueType get_property(ContextType, const ObjectType &, uint32_t);
    static void set_property(ContextType, const ObjectType &, const String<T> &, const ValueType &, PropertyAttributes attributes = None);
    static void set_property(ContextType, const ObjectType &, uint32_t, const ValueType &);
    static std::vector<String<T>> get_property_names(ContextType, const ObjectType &);

    static void set_global(ContextType, const String<T> &, const ValueType &);
    static ValueType get_global(ContextType, const String<T> &);

    template<typename P>
    static ValueType validated_get_property(ContextType ctx, const ObjectType &object, const P &property, const char *message = nullptr) {
        auto value = get_property(ctx, object, property);
        if (Value<T>::is_undefined(ctx, value)) {
            throw std::out_of_range(message ? message : "Object missing expected property: " + util::to_string(property));
        }
        return value;
    }

    static uint32_t validated_get_length(ContextType ctx, const ObjectType &object) {
        static const String<T> length_string = "length";
        return Value<T>::validated_to_number(ctx, get_property(ctx, object, length_string));
    }

#define VALIDATED(return_t, type) \
    static return_t validated_get_##type(ContextType ctx, const ObjectType &object, const String<T> &key, const char *message = nullptr) { \
        try { \
            return Value<T>::validated_to_##type(ctx, get_property(ctx, object, key), std::string(key).c_str()); \
        } \
        catch (std::invalid_argument &e) { \
            throw message ? std::invalid_argument(util::format("Failed to read %1: %2", message, e.what())) : e; \
        } \
    } \
    static return_t validated_get_##type(ContextType ctx, const ObjectType &object, uint32_t index, const char *message = nullptr) { \
        try { \
            return Value<T>::validated_to_##type(ctx, get_property(ctx, object, index)); \
        } \
        catch (std::invalid_argument &e) { \
            throw message ? std::invalid_argument(util::format("Failed to read %1: %2", message, e.what())) : e; \
        } \
    }

    VALIDATED(ObjectType, array)
    VALIDATED(bool, boolean)
    VALIDATED(FunctionType, constructor)
    VALIDATED(ObjectType, date)
    VALIDATED(FunctionType, function)
    VALIDATED(double, number)
    VALIDATED(ObjectType, object)
    VALIDATED(String<T>, string)

#undef VALIDATED

    static ValueType call_method(ContextType ctx, const ObjectType &object, const String<T> &name, uint32_t argc, const ValueType arguments[]) {
        FunctionType method = validated_get_function(ctx, object, name);
        return Function<T>::call(ctx, method, object, argc, arguments);
    }
    static ValueType call_method(ContextType ctx, const ObjectType &object, const String<T> &name, const std::vector<ValueType> &arguments) {
        return call_method(ctx, object, name, (uint32_t)arguments.size(), arguments.data());
    }

    static ObjectType create_empty(ContextType);
    static ObjectType create_array(ContextType, uint32_t, const ValueType[]);

    static ObjectType create_array(ContextType ctx, const std::vector<ValueType> &values) {
        return create_array(ctx, (uint32_t)values.size(), values.data());
    }
    static ObjectType create_array(ContextType ctx) {
        return create_array(ctx, 0, nullptr);
    }

    static ObjectType create_date(ContextType, double);

    template<typename ClassType>
    static ObjectType create_instance(ContextType, typename ClassType::Internal*);

    template<typename ClassType>
    static bool is_instance(ContextType, const ObjectType &);

    template<typename ClassType>
    static typename ClassType::Internal* get_internal(const ObjectType &);

    template<typename ClassType>
    static void set_internal(const ObjectType &, typename ClassType::Internal*);
};

template<typename ValueType>
class Protected {
    operator ValueType() const;
    bool operator==(const ValueType &) const;
    bool operator!=(const ValueType &) const;
    bool operator==(const Protected<ValueType> &) const;
    bool operator!=(const Protected<ValueType> &) const;

    struct Comparator {
        bool operator()(const Protected<ValueType>& a, const Protected<ValueType>& b) const;
    };
};

template<typename T>
struct Exception : public std::runtime_error {
    using ContextType = typename T::Context;
    using ValueType = typename T::Value;

    const Protected<ValueType> m_value;

    Exception(ContextType ctx, const std::string &message)
        : std::runtime_error(message), m_value(ctx, value(ctx, message)) {}
    Exception(ContextType ctx, const ValueType &val)
        : std::runtime_error(std::string(Value<T>::to_string(ctx, val))), m_value(ctx, val) {}

    operator ValueType() const {
        return m_value;
    }

    static ValueType value(ContextType ctx, const std::string &message);

    static ValueType value(ContextType ctx, const std::exception &exp) {
        if (const Exception<T> *js_exp = dynamic_cast<const Exception<T> *>(&exp)) {
            return *js_exp;
        }
        return value(ctx, exp.what());
    }
};

template<typename T>
struct ReturnValue {
    using ValueType = typename T::Value;

    void set(const ValueType &);
    void set(const std::string &);
    void set(bool);
    void set(double);
    void set(int32_t);
    void set(uint32_t);
    void set_null();
    void set_undefined();
};

template<typename T, typename ClassType>
REALM_JS_INLINE typename T::Object create_object(typename T::Context ctx, typename ClassType::Internal* internal = nullptr) {
    return Object<T>::template create_instance<ClassType>(ctx, internal);
}

template<typename T, typename ClassType>
REALM_JS_INLINE typename ClassType::Internal* get_internal(const typename T::Object &object) {
    return Object<T>::template get_internal<ClassType>(object);
}

template<typename T, typename ClassType>
REALM_JS_INLINE void set_internal(const typename T::Object &object, typename ClassType::Internal* ptr) {
    Object<T>::template set_internal<ClassType>(object, ptr);
}

template<typename T>
inline bool Value<T>::is_valid_for_property(ContextType context, const ValueType &value, const Property& prop)
{
    return is_valid_for_property_type(context, value, prop.type, prop.object_type);
}

template<typename T>
inline bool Value<T>::is_valid_for_property_type(ContextType context, const ValueType &value, realm::PropertyType type, StringData object_type) {
    using realm::PropertyType;

    auto check_value = [&](auto&& value) {
        if (is_nullable(type) && (is_null(context, value) || is_undefined(context, value))) {
            return true;
        }
        switch (type & ~PropertyType::Flags) {
            case PropertyType::Int:
            case PropertyType::Float:
            case PropertyType::Double:
                return is_number(context, value);
            case PropertyType::Bool:
                return is_boolean(context, value);
            case PropertyType::String:
                return is_string(context, value);
            case PropertyType::Data:
                return is_binary(context, value) || is_string(context, value);
            case PropertyType::Date:
                return is_date(context, value) || is_string(context, value);
            case PropertyType::Object:
                return true;
            case PropertyType::Any:
                return false;
            default:
                REALM_UNREACHABLE();
        }
    };
    auto check_collection_type = [&](auto&& list) {
        auto list_type = list->get_type();
        return list_type == type
            && is_nullable(list_type) == is_nullable(type)
            && (type != PropertyType::Object || list->get_object_schema().name == object_type);
    };

    if (!realm::is_array(type)) {
        return check_value(value);
    }

    if (is_object(context, value)) {
        auto object = to_object(context, value);
        if (Object<T>::template is_instance<ResultsClass<T>>(context, object)) {
            return check_collection_type(get_internal<T, ResultsClass<T>>(object));
        }
        if (Object<T>::template is_instance<ListClass<T>>(context, object)) {
            return check_collection_type(get_internal<T, ListClass<T>>(object));
        }
    }

    if (type == PropertyType::Object) {
        // FIXME: Do we need to validate the types of the contained objects?
        return is_array(context, value);
    }

    if (!is_array(context, value)) {
        return false;
    }

    auto array = to_array(context, value);
    uint32_t size = Object<T>::validated_get_length(context, array);
    for (uint32_t i = 0; i < size; ++i) {
        if (!check_value(Object<T>::get_property(context, array, i))) {
            return false;
        }
    }
    return true;
}

template<typename T>
inline typename T::Value Value<T>::from_timestamp(typename T::Context ctx, Timestamp ts) {
    return Object<T>::create_date(ctx, ts.get_seconds() * 1000 + ts.get_nanoseconds() / 1000000);
}

template<typename T>
inline typename T::Value Value<T>::from_mixed(typename T::Context ctx, const util::Optional<Mixed>& mixed) {
    if (!mixed) {
        return from_undefined(ctx);
    }

    Mixed value = *mixed;
    switch (value.get_type()) {
    case type_Bool:
        return from_boolean(ctx, value.get_bool());
    case type_Int:
        return from_number(ctx, static_cast<double>(value.get_int()));
    case type_Float:
        return from_number(ctx, value.get_float());
    case type_Double:
        return from_number(ctx, value.get_double());
    case type_Timestamp:
        return from_timestamp(ctx, value.get_timestamp());
    case type_String:
        return from_string(ctx, value.get_string().data());
    case type_Binary:
        return from_binary(ctx, value.get_binary());
    default:
        throw std::invalid_argument("Value not convertible.");
    }
}

} // js
} // realm
