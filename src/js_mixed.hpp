#include <iostream>
#include <map>
#include <realm/mixed.hpp>

namespace realm {

#if REALM_PLATFORM_NODE
#include "napi.h"

struct TypeValidation {
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

template <typename ContextType, typename ValueType, typename JS_API>
class MixedValue {
   private:
    using ToJavascript = std::function<ValueType(ContextType, realm::Mixed)>;
    ContextType context;

    std::map<DataType, ToJavascript> mixed_to_js_strategies = {
        {DataType::type_String, mixed_to_string},
        {DataType::type_Int, mixed_to_number<realm::Int>},
        {DataType::type_Float, mixed_to_number<realm::Float>},
        {DataType::type_Double, mixed_to_number<realm::Double>},
        {DataType::type_Decimal, mixed_to_decimal},
        {DataType::type_Bool, mixed_to_boolean},
    };

    using ToMixed = std::function<realm::Mixed(ContextType, ValueType const&)>;
    std::map<std::string, ToMixed> js_to_mixed_strategies = {
        {"number", javascript_value_to_mixed_int},
        {"string", javascript_value_to_mixed_string},
        {"null", javascript_value_to_mixed_null},
        {"boolean", javascript_value_to_mixed_boolean},
    };

    static auto javascript_value_to_mixed_string(ContextType context,
                                                 ValueType const& value) {
        std::string str = JS_API::to_string(context, value);
        std::cout << "javascript_value_to_mixed_string: " << str << std::endl;
        return realm::Mixed(str);
    };

    static auto javascript_value_to_mixed_int(ContextType context,
                                              ValueType const& value) {
        return realm::Mixed(JS_API::to_number(context, value));
    };

    static auto javascript_value_to_mixed_boolean(ContextType context,
                                                  ValueType const& value) {
        return realm::Mixed(JS_API::to_boolean(context, value));
    };

    static auto javascript_value_to_mixed_null(ContextType context,
                                               ValueType const& value) {
        return realm::Mixed();
    };

    static ValueType mixed_to_boolean(ContextType context, realm::Mixed mixed) {
        return JS_API::from_boolean(context, mixed.get<bool>());
    }

    static ValueType mixed_to_string(ContextType context, realm::Mixed mixed) {
        std::cout << "extracting yyy: " << mixed.get<realm::StringData>()
                  << " type: " << mixed.get_type() << std::endl;
        return JS_API::from_string(context,
                                   mixed.get<realm::StringData>().data());
    }

    template <typename NumberType>
    static ValueType mixed_to_number(ContextType context, realm::Mixed mixed) {
        return JS_API::from_number(context, mixed.get<NumberType>());
    }

    static ValueType mixed_to_decimal(ContextType context, realm::Mixed mixed) {
        return JS_API::from_decimal128(context, mixed.get<Decimal128>());
    }

   public:
    MixedValue(ContextType ctx) : context{ctx} {}

    ValueType to_javascript(realm::Mixed mixed) {
        auto mixed_type = mixed.get_type();
        auto strategy = mixed_to_js_strategies[mixed_type];

        if (strategy == nullptr)
            throw std::runtime_error(
                "Conversion from Javascript value to Realm mixed not "
                "possible.");
        return strategy(context, mixed);
    }

    realm::Mixed to_mixed(ValueType const& js_value) {
        auto type = TypeValidation::typeof(js_value);
        auto js_to_mixed_strategy = js_to_mixed_strategies[type];
        std::cout << "type: " << type << std::endl;

        if (js_to_mixed_strategy == nullptr)
            throw std::runtime_error(
                "Mixed conversion not possible for type: " + type);

        return js_to_mixed_strategy(context, js_value);
    }
};

template <typename ValueType>
struct MixedValidation {
    bool is_valid(ValueType const& js_value) {
        std::cout << "MixedType validation " << std::endl;

        if (js_value.IsString()) {
            return true;
        } else {
            throw std::runtime_error("'Mixed' only supported for strings");
        }

        return false;
    }
};

template <typename JavascriptEngine>
class TypeMixed {
   private:
    using ContextType = typename JavascriptEngine::Context;
    using ValueType = typename JavascriptEngine::Value;
    using JSValue = js::Value<JavascriptEngine>;

    ContextType context;
    MixedValue<ContextType, ValueType, JSValue> mixed_value;

   public:
    TypeMixed(ContextType ctx) : context{ctx}, mixed_value{ctx} {}

    ValueType wrap(realm::Mixed mixed) {
        std::cout << "MixedType Value Retrieval" << std::endl;
        return mixed_value.to_javascript(mixed);
    }

    realm::Mixed unwrap(ValueType const& js_value) {
        std::cout << "Unwrapping JS_MIXED: " << std::endl;
        return mixed_value.to_mixed(js_value);
    }
};

}  // namespace realm
