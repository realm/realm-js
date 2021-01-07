#include <iostream>
#include <map>
#include <realm/mixed.hpp>
#include <type_traits>

namespace realm {

#if REALM_PLATFORM_NODE
#include "napi.h"

struct TypeDeduction {
    using Value = const Napi::Value;
    static bool is_bson_type(Value &value, std::string type) {
        if (!value.IsObject()) {
            return false;
        }

        auto object = value.As<Napi::Object>();

        if (object.Has("_bsontype")) {
            auto bsonType = object.Get("_bsontype");
            return bsonType.ToString().Utf8Value() == type;
        }

        return false;
    }
    static bool is_decimal128(Value &value) {
        return TypeDeduction::is_bson_type(value, "Decimal128");
    }

    static bool is_object_id(Value &value) {
        return TypeDeduction::is_bson_type(value, "ObjectID");
    }

    static std::string realm_typeof(DataType value) {
        std::map<DataType, std::string> realm_typeof = {
            {DataType::type_String, "string"},
            {DataType::type_Int, "Int"},
            {DataType::type_Float, "Float"},
            {DataType::type_Double, "Double"},
            {DataType::type_Decimal, "Decimal128"},
            {DataType::type_Bool, "Boolean"},
            {DataType::type_ObjectId, "ObjectId"}};
        return realm_typeof[value];
    }

    static DataType typeof(Value &value) {
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
        if (value.IsDate()) {
            return DataType::type_Timestamp;
        }
        if (value.IsUndefined()) {
            return DataType::type_TypedLink;
        }
        if (value.IsArrayBuffer() || value.IsTypedArray() ||
            value.IsDataView()) {
            return type_Binary;
        }
        if (TypeDeduction::is_decimal128(value)) {
            return DataType::type_Decimal;
        }
        if (TypeDeduction::is_object_id(value)) {
            return DataType::type_ObjectId;
        }
        if (value.IsObject()) {
            return DataType::type_Link;
        }

        return DataType::type_Link;
    }

    static bool is_boolean(Value &value) { return value.IsBoolean(); }

    static bool is_null(Value &value) { return value.IsNull(); }

    static bool is_number(Value &value) { return value.IsNumber(); }

    static bool is_string(Value &value) { return value.IsString(); }

    static bool is_undefined(Value &value) { return value.IsUndefined(); }
};

#else
#include <JavaScriptCore/JSStringRef.h>
#endif

template <typename Context, typename Value>
class MixedWrapper {
   public:
    virtual Mixed wrap(Context, Value const &) = 0;
    virtual Value unwrap(Context, Mixed) = 0;
};

template <typename Context, typename Value, typename Utils>
class HandleString : public MixedWrapper<Context, Value> {
    // we need this <cache> to keep the value life long enough to get into the
    // DB, we do this because the realm::Mixed type is just a reference
    // container.
    std::string cache;

   public:
    Mixed wrap(Context context, Value const &value) {
        cache = Utils::to_string(context, value);
        return realm::Mixed(cache);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_string(
            context, mixed.template get<realm::StringData>().data());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleBoolean : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return realm::Mixed(Utils::to_boolean(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_boolean(context, mixed.get<bool>());
    }
};

template <typename Context, typename Value, typename Utils,
          typename RealmNumberType>
class HandleNumber : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return realm::Mixed(Utils::to_number(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_number(context, mixed.get<RealmNumberType>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleDecimal128 : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return realm::Mixed(Utils::to_decimal128(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_decimal128(context, mixed.get<Decimal>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleObjectID : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return realm::Mixed(Utils::to_object_id(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_object_id(context, mixed.get<ObjectId>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleBinary : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        auto owned_binary_data = Utils::to_binary(context, value);
        return realm::Mixed(owned_binary_data.get());
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_binary(context, mixed.get<BinaryData>());
    }
};

template <typename Context, typename Value, typename Utils>
class HandleTimeStamp : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return realm::Mixed(Utils::validated_to_date(context, value));
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
    using U = js::Value<JavascriptEngine>;
    using Strategy = MixedWrapper<Context, Value> *;
    Context context;

    std::map<DataType, Strategy> strategies = {
        {DataType::type_String, new HandleString<Context, Value, U>},
        {DataType::type_Int, new HandleNumber<Context, Value, U, realm::Int>},
        {DataType::type_Float,
         new HandleNumber<Context, Value, U, realm::Float>},
        {DataType::type_Double,
         new HandleNumber<Context, Value, U, realm::Double>},
        {DataType::type_Bool, new HandleBoolean<Context, Value, U>},
        {DataType::type_Decimal, new HandleDecimal128<Context, Value, U>},
        {DataType::type_ObjectId, new HandleObjectID<Context, Value, U>},
        {DataType::type_Binary, new HandleBinary<Context, Value, U>},
        {DataType::type_Timestamp, new HandleTimeStamp<Context, Value, U>}};

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

    realm::Mixed unwrap(Value const &js_value) {
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
