#include <common/type_deduction.hpp>
#include <iostream>
#include <map>
#include <realm/mixed.hpp>
#include <type_traits>

#pragma once

namespace realm {
namespace js {

template <typename Context, typename Value>
class MixedWrapper {
   public:
    virtual Mixed wrap(Context, Value const &) = 0;
    virtual Value unwrap(Context, Mixed) = 0;
};

template <typename Context, typename Value, typename Utils>
class HandleString : public MixedWrapper<Context, Value> {
   private:
    // we need this <cache> to keep the value life long enough to get into the
    // DB, we do this because the realm::Mixed type is just a reference
    // container.
    std::string cache;

   public:
    Mixed wrap(Context context, Value const &value) {
        cache = Utils::to_string(context, value);
        return Mixed(cache);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_string(context,
                                  mixed.template get<StringData>().data());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleBoolean : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_boolean(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_boolean(context, mixed.get<bool>());
    }
};

template <typename Context, typename Value, typename Utils,
          typename RealmNumberType>
class HandleNumber : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_number(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_number(context, mixed.get<RealmNumberType>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleDecimal128 : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_decimal128(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_decimal128(context, mixed.get<Decimal>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleObjectID : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_object_id(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_object_id(context, mixed.get<ObjectId>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleBinary : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        auto owned_binary_data = Utils::to_binary(context, value);
        return Mixed(owned_binary_data.get());
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_binary(context, mixed.get<BinaryData>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleTimeStamp : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        auto date = Utils::to_date(context, value);

        double milliseconds = Utils::to_number(context, date);
        int64_t seconds = milliseconds / 1000;
        int32_t nanoseconds = ((int64_t)milliseconds % 1000) * 1000000;
        Timestamp ts(seconds, nanoseconds);

        return Mixed(ts);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_timestamp(context, mixed.get<Timestamp>());
    }
};

template <typename JavascriptEngine>
class TypeMixed {
   private:
    using Context = typename JavascriptEngine::Context;
    using Value = typename JavascriptEngine::Value;
    using Utils = js::Value<JavascriptEngine>;
    using Strategy = MixedWrapper<Context, Value> *;
    Context context;

    std::map<DataType, Strategy> strategies = {
        {DataType::type_String, new HandleString<Context, Value, Utils>},
        {DataType::type_Int, new HandleNumber<Context, Value, Utils, Int>},
        {DataType::type_Float, new HandleNumber<Context, Value, Utils, Float>},
        {DataType::type_Double, new HandleNumber<Context, Value, Utils, Double>},
        {DataType::type_Bool, new HandleBoolean<Context, Value, Utils>},
        {DataType::type_Decimal, new HandleDecimal128<Context, Value, Utils>},
        {DataType::type_ObjectId, new HandleObjectID<Context, Value, Utils>},
        {DataType::type_Binary, new HandleBinary<Context, Value, Utils>},
        {DataType::type_Timestamp, new HandleTimeStamp<Context, Value, Utils>},
    };

    Strategy get_strategy(DataType type) { return strategies[type]; }

   public:
    TypeMixed(Context ctx) : context{ctx} {}

    Value wrap(Mixed mixed) {
        auto strategy = get_strategy(mixed.get_type());

        if (strategy == nullptr) {
            throw std::runtime_error(
                "The " + TypeDeduction::realm_typeof(mixed.get_type()) +
                " value is not supported for the mixed type.");
        }
        return strategy->unwrap(context, mixed);
    }

    Mixed unwrap(Value const &js_value) {
        auto type = TypeDeduction::typeof(js_value);
        auto strategy = get_strategy(type);

        if (strategy == nullptr) {
            throw std::runtime_error(
                "Mixed conversion not possible for type: " +
                TypeDeduction::realm_typeof(type));
        }
        return strategy->wrap(context, js_value);
    }
};

}  // namespace js
}  // namespace realm
