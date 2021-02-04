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

#include "property.hpp"

#include <stdexcept>
#include <string>
#include <vector>
#include <sstream>

#include <realm/binary_data.hpp>
#include <realm/string_data.hpp>
#include <realm/util/to_string.hpp>
#include <realm/util/optional.hpp>
#include <realm/util/base64.hpp>
#include <realm/mixed.hpp>

#include "object-store/src/util/bson/bson.hpp"
#include "object-store/src/util/event_loop_dispatcher.hpp"
#include "object-store/src/sync/generic_network_transport.hpp"

#if defined(__GNUC__) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE inline __attribute__((always_inline))
#elif defined(_MSC_VER) && !(defined(DEBUG) && DEBUG)
# define REALM_JS_INLINE __forceinline
#else
# define REALM_JS_INLINE inline
#endif

namespace realm {
    class ObjectSchema;
}

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

// JS: Number.MAX_SAFE_INTEGER === Math.pow(2, 53)-1;
constexpr static int64_t JS_MAX_SAFE_INTEGER = (1ll << 53) - 1;

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
    static bool is_error(ContextType, const ValueType &);
    static bool is_function(ContextType, const ValueType &);
    static bool is_null(ContextType, const ValueType &);
    static bool is_number(ContextType, const ValueType &);
    static bool is_decimal128(ContextType, const ValueType &);
    static bool is_object_id(ContextType, const ValueType &);
    static bool is_object(ContextType, const ValueType &);
    static bool is_string(ContextType, const ValueType &);
    static bool is_undefined(ContextType, const ValueType &);
    static bool is_binary(ContextType, const ValueType &);
    static bool is_valid(const ValueType &);
    static bool is_bson(ContextType, const ValueType &);

    static bool is_valid_for_property(ContextType, const ValueType&, const Property&);
    static bool is_valid_for_property_type(ContextType, const ValueType&, realm::PropertyType type, StringData object_type);

    static ValueType from_boolean(ContextType, bool);
    static ValueType from_null(ContextType);
    static ValueType from_number(ContextType, double);
    static ValueType from_decimal128(ContextType, const Decimal128&);
    static ValueType from_object_id(ContextType, const ObjectId&);
    static ValueType from_string(ContextType ctx, const char *s) { return s ? from_nonnull_string(ctx, s) : from_null(ctx); }
    static ValueType from_string(ContextType ctx, StringData s) { return s ? from_nonnull_string(ctx, String<T>(s)) : from_null(ctx); }
    static ValueType from_string(ContextType ctx, const std::string& s) { return from_nonnull_string(ctx, s.c_str()); }
    static ValueType from_binary(ContextType ctx, BinaryData b) { return b ? from_nonnull_binary(ctx, b) : from_null(ctx); }
    static ValueType from_nonnull_string(ContextType, const String<T>&);
    static ValueType from_nonnull_binary(ContextType, BinaryData);
    static ValueType from_undefined(ContextType);
    static ValueType from_timestamp(ContextType, Timestamp);
    static ValueType from_mixed(ContextType, const util::Optional<Mixed> &);
    static ValueType from_bson(ContextType, const bson::Bson &);
    static ObjectType from_bson(ContextType, const bson::BsonDocument &);

    static ObjectType to_array(ContextType, const ValueType &);
    static bool to_boolean(ContextType, const ValueType &);
    static FunctionType to_constructor(ContextType, const ValueType &);
    static ObjectType to_date(ContextType, const ValueType &);
    static FunctionType to_function(ContextType, const ValueType &);
    static double to_number(ContextType, const ValueType &);
    static Decimal128 to_decimal128(ContextType, const ValueType &);
    static ObjectId to_object_id(ContextType, const ValueType &);
    static ObjectType to_object(ContextType, const ValueType &);
    static String<T> to_string(ContextType, const ValueType &);
    static OwnedBinaryData to_binary(ContextType, ValueType);
    static bson::Bson to_bson(ContextType, ValueType);


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
    VALIDATED(Decimal128, decimal128)
    VALIDATED(ObjectId, object_id)

#undef VALIDATED
};

template<typename T>
struct Function {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;

    static ValueType callback(ContextType, const FunctionType &, const ObjectType &, size_t, const ValueType[]);
    static ValueType callback(ContextType ctx, const FunctionType & f, const ObjectType& o,  std::initializer_list<ValueType> args) {
        return callback(ctx, f, o, args.size(), args.begin());
    }
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

    static ObjectType construct(ContextType ctx, const FunctionType & f, std::initializer_list<ValueType> args) {
        return construct(ctx, f, args.size(), args.begin());
    }
    static ObjectType construct(ContextType, const FunctionType &, size_t, const ValueType[]);
    static ObjectType construct(ContextType ctx, const FunctionType &function, const std::vector<ValueType> &arguments) {
        return construct(ctx, function, arguments.size(), arguments.data());
    }

    /**
     * These wrap a js callback into a C++ callback that takes an Optional<AppError> and possibly a result.
     * The versions that accept a result use the converter argument to convert the C++ result into a js result.
     * The returned callbacks have the following signatures:
     *
     * wrap_void_callback         - void(const util::Optional<app::AppError>& error)
     * wrap_callback_error_first  - void(const util::Optional<app::AppError>& error, auto&& result)
     * wrap_callback_result_first - void(auto&& result, const util::Optional<app::AppError>& error)
     *
     * In all cases, the converter should have a signature like JsResultType(ContextType, CppResultType), possibly with
     * const and reference qualifiers on CppResultType. The converter will only be called when there is no error.
     */
    static auto wrap_void_callback(ContextType, const ObjectType& this_object, const FunctionType& callback);
    template<typename Converter>
    static auto wrap_callback_error_first(ContextType, const ObjectType& this_object, const FunctionType& callback, Converter&& converter);
    template<typename Converter>
    static auto wrap_callback_result_first(ContextType, const ObjectType& this_object, const FunctionType& callback, Converter&& converter);
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
    VALIDATED(ObjectType, Decimal128)
    VALIDATED(ObjectType, object)
    VALIDATED(String<T>, string)
    VALIDATED(ObjectType, ObjectId)

#undef VALIDATED

    static ValueType call_method(ContextType ctx, const ObjectType &object, const String<T> &name, uint32_t argc, const ValueType arguments[]) {
        FunctionType method = validated_get_function(ctx, object, name);
        return Function<T>::call(ctx, method, object, argc, arguments);
    }
    static ValueType call_method(ContextType ctx, const ObjectType &object, const String<T> &name, const std::vector<ValueType> &arguments) {
        return call_method(ctx, object, name, (uint32_t)arguments.size(), arguments.data());
    }
    static ValueType call_method(ContextType ctx, const ObjectType &object, const String<T> &name, const std::initializer_list<ValueType> &arguments) {
        return call_method(ctx, object, name, (uint32_t)arguments.size(), arguments.begin());
    }

    static ObjectType create_empty(ContextType);
    static ObjectType create_obj(ContextType ctx, std::initializer_list<std::pair<String<T>, ValueType>> values) {
        auto obj = create_empty(ctx);
        for (auto&& [name, val] : values) {
            set_property(ctx, obj, name, val);
        }
        return obj;
    }

    static ObjectType create_array(ContextType, uint32_t, const ValueType[]);
    static ObjectType create_array(ContextType ctx, const std::vector<ValueType> &values) {
        return create_array(ctx, (uint32_t)values.size(), values.data());
    }
    static ObjectType create_array(ContextType ctx, std::initializer_list<ValueType> values) {
        return create_array(ctx, (uint32_t)values.size(), values.begin());
    }
    static ObjectType create_array(ContextType ctx) {
        return create_array(ctx, 0, nullptr);
    }

    static ObjectType create_date(ContextType, double);

    template<typename ClassType>
    static ObjectType create_instance(ContextType, typename ClassType::Internal*);

    template<typename ClassType>
    static ObjectType create_instance_by_schema(ContextType, typename T::Function& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal*);

    template<typename ClassType>
    static bool is_instance(ContextType, const ObjectType &);

    template<typename ClassType>
    static typename ClassType::Internal* get_internal(const ObjectType &);

    template<typename ClassType>
    static typename ClassType::Internal* get_internal(ContextType ctx, const ObjectType &);

    template<typename ClassType>
    static void set_internal(ContextType ctx, const ObjectType &, typename ClassType::Internal*);

    static ObjectType create_bson_type(ContextType, StringData type, std::initializer_list<ValueType> args);

    static ObjectType create_from_app_error(ContextType, const app::AppError&);
    static ValueType create_from_optional_app_error(ContextType, const util::Optional<app::AppError>&);
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
template <typename GlobalCtx>
Protected(GlobalCtx) -> Protected<GlobalCtx>;
template <typename Ctx, typename T>
Protected(Ctx, T) -> Protected<T>;


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
    void set(Decimal128);
    void set(ObjectId);
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
REALM_JS_INLINE typename T::Object create_instance_by_schema(typename T::Context ctx, typename T::Function& constructor, const realm::ObjectSchema& schema, typename ClassType::Internal* internal = nullptr) {
    return Object<T>::template create_instance_by_schema<ClassType>(ctx, constructor, schema, internal);
}

template<typename T, typename ClassType>
REALM_JS_INLINE typename ClassType::Internal* get_internal(typename T::Context ctx, const typename T::Object &object) {
    return Object<T>::template get_internal<ClassType>(ctx, object);
}

template<typename T, typename ClassType>
REALM_JS_INLINE void set_internal(typename T::Context ctx, const typename T::Object &object, typename ClassType::Internal* ptr) {
    Object<T>::template set_internal<ClassType>(ctx, object, ptr);
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
            case PropertyType::Decimal:
                return is_decimal128(context, value);
            case PropertyType::ObjectId:
                return is_object_id(context, value);
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
            return check_collection_type(get_internal<T, ResultsClass<T>>(context, object));
        }
        if (Object<T>::template is_instance<ListClass<T>>(context, object)) {
            return check_collection_type(get_internal<T, ListClass<T>>(context, object));
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
inline typename T::Object Object<T>::create_bson_type(ContextType ctx, StringData type, std::initializer_list<ValueType> args) {
    auto realm = Value<T>::validated_to_object(ctx, Object<T>::get_global(ctx, "Realm"));
    auto bson = Value<T>::validated_to_object(ctx, Object<T>::get_property(ctx, realm, "BSON"));
    auto ctor = Value<T>::to_constructor(ctx, Object<T>::get_property(ctx, bson, type));
    return Function<T>::construct(ctx, ctor, args);
}

template<typename T>
inline typename T::Object Object<T>::create_from_app_error(ContextType ctx, const app::AppError& error) {
    return Object::create_obj(ctx, {
        {"message", Value<T>::from_string(ctx, error.message)},
        {"code", Value<T>::from_number(ctx, error.error_code.value())},
    });
}

template<typename T>
inline typename T::Value Object<T>::create_from_optional_app_error(ContextType ctx, const util::Optional<app::AppError>& error) {
    if (!error)
        return Value<T>::from_undefined(ctx);
    return create_from_app_error(ctx, *error);
}

template<typename T>
inline typename T::Value Value<T>::from_mixed(typename T::Context ctx, const util::Optional<Mixed>& mixed) {
    if (!mixed) {
        return from_undefined(ctx);
    }

    Mixed value = *mixed;
    switch (value.get_type()) {
    case type_Bool:
        return from_boolean(ctx, value.get<bool>());
    case type_Int:
        return from_number(ctx, static_cast<double>(value.get<int64_t>()));
    case type_Float:
        return from_number(ctx, value.get<float>());
    case type_Double:
        return from_number(ctx, value.get<double>());
    case type_Decimal:
        return from_decimal128(ctx, value.get<Decimal128>());
    case type_ObjectId:
        return from_object_id(ctx, value.get<ObjectId>());
    case type_Timestamp:
        return from_timestamp(ctx, value.get<Timestamp>());
    case type_String:
        return from_string(ctx, value.get<StringData>().data());
    case type_Binary:
        return from_binary(ctx, value.get<BinaryData>());
    case type_Link:
    case type_LinkList:
    case type_OldDateTime:
    case type_OldTable:
    case type_OldMixed:
        break;
    }
    throw std::invalid_argument("Value not convertible.");
}

template<typename T>
inline typename T::Value Value<T>::from_bson(typename T::Context ctx, const bson::Bson& value) {
    using Type = bson::Bson::Type;

    switch (value.type()) {
    case Type::MinKey:
        return Object<T>::create_bson_type(ctx, "MinKey", {});
    case Type::MaxKey:
        return Object<T>::create_bson_type(ctx, "MaxKey", {});
    case Type::Null:
        return from_null(ctx);
    case Type::Bool:
        return from_boolean(ctx, value.operator bool());
    case Type::Double:
        return from_number(ctx, value.operator double());
    case Type::Int32:
        // All int32 values can be precisely represented as a double
        return from_number(ctx, double(value.operator int32_t()));
    case Type::Int64: {
        // int64 needs special handling. The server uses it for all intish numbers, even 1.0, so we map
        // it to a plain js number if it is in the range where it can be done precisely, otherwise
        // we map to the bson.Long type which preserves the value, but is harder to use.
        const auto i64_val = value.operator int64_t();
        if (-JS_MAX_SAFE_INTEGER <= i64_val && i64_val <= JS_MAX_SAFE_INTEGER)
            return Value<T>::from_number(ctx, double(i64_val));

        return Object<T>::create_bson_type(ctx, "Long", {
            Value<T>::from_number(ctx, int32_t(i64_val)), // low
            Value<T>::from_number(ctx, int32_t(i64_val >> 32)), // high
        });
    }
    case Type::Decimal128:
        return from_decimal128(ctx, value.operator Decimal128());
    case Type::ObjectId:
        return from_object_id(ctx, value.operator ObjectId());
    case Type::Datetime:
        return from_timestamp(ctx, value.operator Timestamp());
    case Type::Timestamp: {
        auto mts = value.operator bson::MongoTimestamp();
        return Object<T>::create_bson_type(ctx, "Timestamp", {
            // The constructor takes the arguments "backwards" from standard order.
            Value<T>::from_number(ctx, mts.increment),
            Value<T>::from_number(ctx, mts.seconds),
        });
    }
    case Type::String:
        return from_string(ctx, value.operator const std::string&());
    case Type::Binary: {
        const auto& vec = value.operator const std::vector<char>&();
        const auto decoded = realm::util::base64_decode_to_vector(StringData(vec.data(), vec.size()));
        if (!decoded)
            throw std::invalid_argument("invalid base64 in binary data");
        auto Uint8Array = Value<T>::to_function(ctx, Object<T>::get_global(ctx, "Uint8Array"));
        auto array = Function<T>::construct(ctx, Uint8Array, {
            from_nonnull_binary(ctx, {decoded->data(), decoded->size()}),
        });
        return Object<T>::create_bson_type(ctx, "Binary", {
            array,
            Value<T>::from_number(ctx, 0), // TODO get subtype from `value` once it is possible.
        });
    }
    case Type::Document:
        return from_bson(ctx, value.operator const bson::BsonDocument&());
    case Type::Array: {
        auto&& in_vec = value.operator const std::vector<bson::Bson>&();
        std::vector<ValueType> out_vec;
        out_vec.reserve(in_vec.size());
        for (auto&& elem : in_vec) {
            out_vec.push_back(from_bson(ctx, elem));
        }
        return Object<T>::create_array(ctx, out_vec);
    }
    case Type::RegularExpression: {
        auto&& re = value.operator const bson::RegularExpression&();
        std::ostringstream oss;
        oss << re.options();
        return Object<T>::create_bson_type(ctx, "BSONRegExp", {
            Value<T>::from_string(ctx, re.pattern()),
            Value<T>::from_string(ctx, oss.str()),
        });
    }
    }
    throw std::invalid_argument("Value not convertible.");
}

template<typename T>
inline typename T::Object Value<T>::from_bson(typename T::Context ctx, const bson::BsonDocument& doc) {
    auto out = Object<T>::create_empty(ctx);
    for (auto&& [k, v] : doc) {
        Object<T>::set_property(ctx, out, k, from_bson(ctx, v));
    }
    return out;
}

template<typename T>
inline bson::Bson Value<T>::to_bson(typename T::Context ctx, ValueType value) {
    // For now going through the bson.EJSON.stringify() since it will correctly handle the special JS types.
    // Consider directly converting to Bson if we need more control or there are performance issues.
    auto realm = Value::validated_to_object(ctx, Object<T>::get_global(ctx, "Realm"));
    auto bson = Value::validated_to_object(ctx, Object<T>::get_property(ctx, realm, "BSON"));
    auto ejson = Value::validated_to_object(ctx, Object<T>::get_property(ctx, bson, "EJSON"));
    auto call_args_json = Object<T>::call_method(ctx, ejson, "stringify", {
        value,
        Object<T>::create_obj(ctx, {{"relaxed", Value::from_boolean(ctx, false)}}),
    });
    return bson::parse(std::string(Value::to_string(ctx, call_args_json)));
}

template <typename T>
auto Function<T>::wrap_void_callback(ContextType ctx, const ObjectType& this_object, const FunctionType& callback) {
    return [ctx = Protected(Context<T>::get_global_context(ctx)),
            callback = Protected(ctx, callback),
            this_object = Protected(ctx, this_object)]
        (const util::Optional<app::AppError>& error) {
            HANDLESCOPE(ctx);
            Function::callback(ctx, callback, this_object, {
                Object<T>::create_from_optional_app_error(ctx, error),
            });
        };
}

template <typename T>
template <typename Converter>
auto Function<T>::wrap_callback_error_first(ContextType ctx, const ObjectType& this_object, const FunctionType& callback, Converter&& converter) {
    return [ctx = Protected(Context<T>::get_global_context(ctx)),
            callback = Protected(ctx, callback),
            this_object = Protected(ctx, this_object),
            converter = std::forward<Converter>(converter)]
        (const util::Optional<app::AppError>& error, auto&& result) {
            HANDLESCOPE(ctx);
            Function::callback(ctx, callback, this_object, {
                error ? Value<T>::from_undefined(ctx) : converter(ctx, std::forward<decltype(result)>(result)),
                Object<T>::create_from_optional_app_error(ctx, error),
            });
        };
}

template <typename T>
template <typename Converter>
auto Function<T>::wrap_callback_result_first(ContextType ctx, const ObjectType& this_object, const FunctionType& callback, Converter&& converter) {
    return [callback = wrap_callback_error_first(ctx, this_object, callback, std::forward<Converter>(converter))]
            (auto&& result, const util::Optional<app::AppError>& error) -> decltype(auto) {
                return callback(error, std::forward<decltype(result)>(result));
            };
}
} // js
} // realm
