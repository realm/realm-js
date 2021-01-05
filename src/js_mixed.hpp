#include <iostream>
#include <map>
#include <realm/mixed.hpp>
#include <type_traits>

namespace realm {

#if REALM_PLATFORM_NODE
#include "napi.h"

struct TypeDeduction {
    static std::string realm_typeof(DataType value) {
        std::map<DataType, std::string> realm_typeof = {
            {DataType::type_String, "string"},
            {DataType::type_Int, "Int"},
            {DataType::type_Float, "Float"},
            {DataType::type_Double, "Double"},
            {DataType::type_Decimal, "Decimal128"},
            {DataType::type_Bool, "Boolean"},
        };
        return realm_typeof[value];
    }

    static DataType typeof(const Napi::Value& value) {
        if (value.IsNull()) {
            return DataType::type_TypedLink;
        }
        if (value.IsNumber()) {
            return DataType::type_Double;
        }
        if (value.IsString()) {
            return DataType::type_String;
        }
        if (value.IsBoolean()) {
            return DataType::type_Bool;
        }
        if (value.IsUndefined()) {
            return DataType::type_TypedLink;
        }
        if (value.IsObject()) {
            return DataType::type_Link;
        }

        return DataType::type_Link;
    }

    static bool is_boolean(const Napi::Value& value) {
        return value.IsBoolean();
    }

    static bool is_null(const Napi::Value& value) { return value.IsNull(); }

    static bool is_number(const Napi::Value& value) { return value.IsNumber(); }

    static bool is_string(const Napi::Value& value) { return value.IsString(); }

    static bool is_undefined(const Napi::Value& value) {
        return value.IsUndefined();
    }
};

#else
#include <JavaScriptCore/JSStringRef.h>
#endif

template <typename Context, typename Value>
class MixedWrapper {
   public:
    virtual Mixed wrap(Context, Value const&) = 0;
    virtual Value unwrap(Context, Mixed) = 0;
};

template <typename Context, typename Value, typename Utils>
class StringMixed : public MixedWrapper<Context, Value> {
    // we need this <cache> to keep the value life long enough to get into the
    // DB, we do this because the realm::Mixed type is just a reference
    // container.
    std::string cache;

   public:
    Mixed wrap(Context context, Value const& value) {
        cache = Utils::to_string(context, value);
        return realm::Mixed(cache);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_string(
            context, mixed.template get<realm::StringData>().data());
    }
};

template <typename Context, typename Value, typename Utils>
class BooleanMixed : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const& value) {
        return realm::Mixed(Utils::to_boolean(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_boolean(context, mixed.get<bool>());
    }
};

template <typename Context, typename Value, typename Utils,
          typename RealmNumberType>
class Number : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const& value) {
        return Utils::to_number(context, value);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_number(context, mixed.get<RealmNumberType>());
    }
};

template <typename JavascriptEngine>
class TypeMixed {
   private:
    using Context = typename JavascriptEngine::Context;
    using Value = typename JavascriptEngine::Value;
    using U = js::Value<JavascriptEngine>;
    using Strategy = MixedWrapper<Context, Value>*;

    std::map<DataType, Strategy> strategies = {
        {DataType::type_String, new StringMixed<Context, Value, U>},
        {DataType::type_Int, new Number<Context, Value, U, realm::Int>},
        {DataType::type_Float, new Number<Context, Value, U, realm::Float>},
        {DataType::type_Double, new Number<Context, Value, U, realm::Double>},
        {DataType::type_Bool, new BooleanMixed<Context, Value, U>}};

    Context context;
    Strategy get_strategy(DataType type) { return strategies[type]; }

   public:
    TypeMixed(Context ctx) : context{ctx} {}

    Value wrap(realm::Mixed mixed) {
        auto strategy = get_strategy(mixed.get_type());

        if (strategy == nullptr)
            throw std::runtime_error(
                "The " + TypeDeduction::realm_typeof(mixed.get_type()) +
                " value is not supported for the mixed type.");
        return strategy->unwrap(context, mixed);
    }

    realm::Mixed unwrap(Value const& js_value) {
        auto type = TypeDeduction::typeof(js_value);
        auto strategy = get_strategy(type);

        if (strategy == nullptr)
            throw std::runtime_error(
                "Mixed conversion not possible for type: " +
                TypeDeduction::realm_typeof(type));

        return strategy->wrap(context, js_value);
    }
};

}  // namespace realm
