#pragma once
#include "napi.h"
#include "realm/data_type.hpp"

namespace realm {
namespace js {

struct TypeDeductionImpl {
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
        return TypeDeductionImpl::is_bson_type(value, "Decimal128");
    }

    static bool is_object_id(Value &value) {
        return TypeDeductionImpl::is_bson_type(value, "ObjectID");
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
        if (TypeDeductionImpl::is_decimal128(value)) {
            return DataType::type_Decimal;
        }
        if (TypeDeductionImpl::is_object_id(value)) {
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

}  // namespace js
}  // namespace realm
