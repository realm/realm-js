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

    static std::string typeof(const Napi::Value& value) {
        if (value.IsNull()) {
            return "null";
        }
        if (value.IsNumber()) {
            return "number";
        }
        if (value.IsString()) {
            return "string";
        }
        if (value.IsBoolean()) {
            return "boolean";
        }
        if (value.IsUndefined()) {
            return "undefined";
        }
        if (value.IsObject()) {
            return "object";
        }
        return "unknown";
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

template <typename Context, typename Value, typename JSUtils>
struct Strategies {
    /* DB Storing strategies */
    static auto javascript_value_to_mixed_string(Context context,
                                                 Value const& value) {
        // we need this to keep the value life long enough to get into the DB,
        // because the Mixed type is just a reference container.
        auto cache = JSUtils::to_string(context, value);
        return realm::Mixed(cache);
    };

    static auto javascript_value_to_mixed_int(Context context,
                                              Value const& value) {
        return realm::Mixed(JSUtils::to_number(context, value));
    };

    static auto javascript_value_to_mixed_boolean(Context context,
                                                  Value const& value) {
        return realm::Mixed(JSUtils::to_boolean(context, value));
    };

    static auto javascript_value_to_mixed_null(Context context,
                                               Value const& value) {
        return realm::Mixed();
    };

    /* DB Loading strategies */
    static Value load_boolean(Context context, realm::Mixed mixed) {
        return JSUtils::from_boolean(context, mixed.get<bool>());
    }

    static Value load_string(Context context, realm::Mixed mixed) {
        return JSUtils::from_string(context,
                                    mixed.get<realm::StringData>().data());
    }

    template <typename NumberType>
    static Value load_number(Context context, realm::Mixed mixed) {
        return JSUtils::from_number(context, mixed.get<NumberType>());
    }

    static Value load_decimal128(Context context, realm::Mixed mixed) {
        return JSUtils::from_decimal128(context, mixed.get<Decimal128>());
    }
};

template <typename JavascriptEngine>
class TypeMixed {
   private:
    using Context = typename JavascriptEngine::Context;
    using Value = typename JavascriptEngine::Value;
    using JSSetterSignature = std::function<Value(Context, Mixed)>;
    using MixedSetterSignature = std::function<Mixed(Context, Value const&)>;
    using S = Strategies<Context, Value, js::Value<JavascriptEngine>>;
    using Loaders = std::map<DataType, JSSetterSignature>;
    using Storanges = std::map<std::string, MixedSetterSignature>;

    Loaders mixed_to_js_strategies = {
        {DataType::type_String, S::load_string},
        {DataType::type_Int, S::template load_number<realm::Int>},
        {DataType::type_Float, S::template load_number<realm::Float>},
        {DataType::type_Double, S::template load_number<realm::Double>},
        {DataType::type_Decimal, S::load_decimal128},
        {DataType::type_Bool, S::load_boolean},
    };

    Storanges js_to_mixed_strategies = {
        {"string", S::javascript_value_to_mixed_string},
        {"number", S::javascript_value_to_mixed_int},
        {"null", S::javascript_value_to_mixed_null},
        {"boolean", S::javascript_value_to_mixed_boolean},
    };

    Context context;

   public:
    TypeMixed(Context ctx) : context{ctx} {}

    Value wrap(realm::Mixed mixed) {
        auto mixed_type = mixed.get_type();
        auto strategy = mixed_to_js_strategies[mixed_type];

        if (strategy == nullptr)
            throw std::runtime_error(
                "The " + TypeDeduction::realm_typeof(mixed_type) +
                " value is not supported for the mixed type.");
        return strategy(context, mixed);
    }

    realm::Mixed unwrap(Value const& js_value) {
        auto type = TypeDeduction::typeof(js_value);
        auto js_to_mixed_strategy = js_to_mixed_strategies[type];

        if (js_to_mixed_strategy == nullptr)
            throw std::runtime_error(
                "Mixed conversion not possible for type: " + type);

        return js_to_mixed_strategy(context, js_value);
    }
};

}  // namespace realm
