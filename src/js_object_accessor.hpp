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

#include <realm/keys.hpp>

#include "js_mixed.hpp"
#include "js_list.hpp"
#include "js_realm_object.hpp"
#include "js_schema.hpp"

#if REALM_ENABLE_SYNC
#include <realm/util/base64.hpp>
#endif

namespace realm {
class List;
class Object;
class ObjectSchema;
class Realm;
class Results;
struct Property;

namespace js {
namespace _impl {
template<typename JSEngine, typename T>
struct Unbox;
}

template<typename JSEngine>
class NativeAccessor {
public:
    using ContextType = typename JSEngine::Context;
    using ObjectType = typename JSEngine::Object;
    using ValueType = typename JSEngine::Value;
    using Object = js::Object<JSEngine>;
    using Value = js::Value<JSEngine>;
    using OptionalValue = util::Optional<ValueType>;

    NativeAccessor(ContextType ctx, std::shared_ptr<Realm> realm, const ObjectSchema& object_schema)
    : m_ctx(ctx), m_realm(std::move(realm)), m_object_schema(&object_schema) { }

    template<typename Collection>
    NativeAccessor(ContextType ctx, Collection const& collection)
    : m_ctx(ctx)
    , m_realm(collection.get_realm())
    , m_object_schema(collection.get_type() == realm::PropertyType::Object ? &collection.get_object_schema() : nullptr)
    { }

    NativeAccessor(NativeAccessor& na, Obj parent, Property const& prop)
        : m_ctx(na.m_ctx)
        , m_realm(na.m_realm)
        , m_parent(std::move(parent))
        , m_property(&prop)
        , m_object_schema(nullptr)
    {
        if (prop.type == realm::PropertyType::Object) {
            auto schema = m_realm->schema().find(prop.object_type);
            if (schema != m_realm->schema().end()) {
			    m_object_schema = &*schema;
            }
        }
        else {
            m_object_schema = na.m_object_schema;
        }
    }

    NativeAccessor(NativeAccessor& parent, const Property& prop)
		: m_ctx(parent.m_ctx)
		, m_realm(parent.m_realm)
		, m_object_schema(nullptr)
	{
		auto schema = m_realm->schema().find(prop.object_type);
		if (schema != m_realm->schema().end()) {
			m_object_schema = &*schema;
		}
	}

    OptionalValue value_for_property(ValueType dict, Property const& prop, size_t) {
        ObjectType object = Value::validated_to_object(m_ctx, dict);
        ValueType value = Object::get_property(m_ctx, object, !prop.public_name.empty() ? prop.public_name : prop.name);
        if (Value::is_undefined(m_ctx, value)) {
            return util::none;
        }
        if (!Value::is_valid_for_property(m_ctx, value, prop)) {
            throw TypeErrorException(*this, m_object_schema->name, prop, value);
        }
        return value;
    }

    OptionalValue default_value_for_property(const ObjectSchema &object_schema, const Property &prop) {
        auto defaults = get_delegate<JSEngine>(m_realm.get())->m_defaults[object_schema.name];
        auto it = defaults.find(prop.name);
        return it != defaults.end() ? util::make_optional(ValueType(it->second)) : util::none;
    }

    template<typename T>
    T unbox(ValueType value, realm::CreatePolicy policy = realm::CreatePolicy::Skip, ObjKey current_obj = ObjKey());

    Obj create_embedded_object() {
        if (!m_parent) {
            throw std::runtime_error("Embedded objects cannot be created directly.");
        }

        return m_parent.create_and_set_linked_object(m_property->column_key);
    }

    template<typename T>
    util::Optional<T> unbox_optional(ValueType value) {
        return is_null(value) ? util::none : util::make_optional(unbox<T>(value));
    }




    template<typename T>
    ValueType box(util::Optional<T> v) { return v ? box(*v) : null_value(); }

    ValueType box(bool boolean)      { return Value::from_boolean(m_ctx, boolean); }
    ValueType box(int64_t number)    { return Value::from_number(m_ctx, number); }
    ValueType box(float number)      { return Value::from_number(m_ctx, number); }
    ValueType box(double number)     { return Value::from_number(m_ctx, number); }
    ValueType box(StringData string) { return Value::from_string(m_ctx, string.data()); }
    ValueType box(BinaryData data)   { return Value::from_binary(m_ctx, data); }
    ValueType box(ObjectId objectId) { return Value::from_object_id(m_ctx, objectId); }
    ValueType box(Decimal128 number) { return Value::from_decimal128(m_ctx, number); }
    ValueType box(UUID uuid)         { return Value::from_uuid(m_ctx, uuid); }
    ValueType box(Mixed mixed)       { return TypeMixed<JSEngine>::get_instance().wrap(m_ctx, mixed); }

    ValueType box(Timestamp ts) {
        if (ts.is_null()) {
            return null_value();
        }
        return Object::create_date(m_ctx, ts.get_seconds() * 1000 + ts.get_nanoseconds() / 1000000);
    }
    ValueType box(realm::Object realm_object) {
        return RealmObjectClass<JSEngine>::create_instance(m_ctx, std::move(realm_object));
    }
    ValueType box(Obj obj) {
        if (!obj.is_valid()) {
            return Value::from_null(m_ctx);
        }
        return RealmObjectClass<JSEngine>::create_instance(m_ctx, realm::Object(m_realm, *m_object_schema, obj));
    }
    ValueType box(realm::List list) {
        return ListClass<JSEngine>::create_instance(m_ctx, std::move(list));
    }
    ValueType box(realm::Results results) {
        return ResultsClass<JSEngine>::create_instance(m_ctx, std::move(results));
    }
    ValueType box(realm::object_store::Set set) {
        throw std::runtime_error("'Set' type support is not implemented yet");
    }
    ValueType box(realm::object_store::Dictionary dictionart) {
        throw std::runtime_error("'Dictionary' type support is not implemented yet");
    }

    bool is_null(ValueType const& value) {
        return Value::is_null(m_ctx, value) || Value::is_undefined(m_ctx, value);
    }
    DataType get_type_of(ValueType const& value)
    {
        if (Value::is_number(m_ctx, value)) {
            return type_Double;
        }
        if (Value::is_string(m_ctx, value)) {
            return type_String;
        }
        if (Value::is_date(m_ctx, value)) {
            return type_Timestamp;
        }
        if (Value::is_boolean(m_ctx, value)) {
            return type_Bool;
        }
        if (Value::is_binary(m_ctx, value)) {
            return type_Binary;
        }
        if (Value::is_object_id(m_ctx, value)) {
            return type_ObjectId;
        }
        if (Value::is_uuid(m_ctx, value)) {
            return type_UUID;
        }
        if (Value::is_decimal128(m_ctx, value)) {
            return type_Decimal;
        }
        if (Value::is_object(m_ctx, value)) {
            return type_Link;
        }
        return DataType(-1);
    }

    ValueType null_value() {
        return Value::from_null(m_ctx);
    }

    // called when creating lists and sets
    template<typename Fn>
    void enumerate_collection(ValueType& value, Fn&& func) {
        auto obj = Value::validated_to_object(m_ctx, value);
        uint32_t size = Object::validated_get_length(m_ctx, obj);
        for (uint32_t i = 0; i < size; ++i) {
            func(Object::get_property(m_ctx, obj, i));
        }
    }

    template<typename Fn>
    void enumerate_dictionary(ValueType& value, Fn&& func) {
        throw std::runtime_error("'Dictionary' type support is not implemented yet");
    }

    bool is_same_list(realm::List const& list, ValueType const& value) const noexcept {
        auto object = Value::validated_to_object(m_ctx, value);
        if (js::Object<JSEngine>::template is_instance<ListClass<JSEngine>>(m_ctx, object)) {
            return list == *get_internal<JSEngine, ListClass<JSEngine>>(m_ctx, object);
        }
        return false;
    }

    bool is_same_set(realm::object_store::Set const& set, ValueType const& value) const {
        throw std::runtime_error("'Set' type support is not implemented yet");
    }

    bool is_same_dictionary(realm::object_store::Dictionary const& dictionary, ValueType const& value) const {
        throw std::runtime_error("'Dictionary' type support is not implemented yet");
    }

    bool allow_missing(ValueType const&) const noexcept { return false; }
    void will_change(realm::Object&, realm::Property const&) { }
    void did_change() { }

    std::string print(ValueType const&);
    void print(std::string&, ValueType const&);
    const char *typeof(ValueType const& v) { return Value::typeof(m_ctx, v); }

private:
    ContextType m_ctx;
    std::shared_ptr<Realm> m_realm;
    Obj m_parent;
    const Property* m_property = nullptr;
    const ObjectSchema* m_object_schema;
    std::string m_string_buffer;
    OwnedBinaryData m_owned_binary_data;
    template<typename, typename>
    friend struct _impl::Unbox;
};

namespace _impl {
template<typename JSEngine>
struct Unbox<JSEngine, bool> {
    static bool call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_boolean(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, int64_t> {
    static int64_t call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, float> {
    static float call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, double> {
    static double call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Decimal128> {
    static Decimal128 call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        if (ctx->is_null(value)) {
            return Decimal128(realm::null());
        }
        return js::Value<JSEngine>::validated_to_decimal128(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, ObjectId> {
    static ObjectId call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_object_id(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<bool>> {
    static util::Optional<bool> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<bool>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<int64_t>> {
    static util::Optional<int64_t> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<int64_t>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<float>> {
    static util::Optional<float> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<float>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<double>> {
    static util::Optional<double> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<double>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<ObjectId>> {
    static util::Optional<ObjectId> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<ObjectId>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, StringData> {
    static StringData call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        if (ctx->is_null(value)) {
            return StringData();
        }
        ctx->m_string_buffer = js::Value<JSEngine>::validated_to_string(ctx->m_ctx, value, "Property");
        return ctx->m_string_buffer;
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, BinaryData> {
    static BinaryData call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value value, realm::CreatePolicy, ObjKey) {
        if (ctx->is_null(value)) {
            return BinaryData();
        }
#if REALM_ENABLE_SYNC
        // realm-sync holds the base64-decoding routine
        if (js::Value<JSEngine>::is_string(ctx->m_ctx, value)) {
            // the incoming value might be a base64 string, so let's try to parse it
            std::string str = js::Value<JSEngine>::to_string(ctx->m_ctx, value);
            size_t max_size = util::base64_decoded_size(str.size());
            std::unique_ptr<char[]> data(new char[max_size]);
            if (auto size = util::base64_decode(str, data.get(), max_size)) {
                ctx->m_owned_binary_data = OwnedBinaryData(std::move(data), *size);
                return ctx->m_owned_binary_data.get();
            } else {
                throw std::runtime_error("Attempting to populate BinaryData from string that is not valid base64");
            }
        }
#endif

        ctx->m_owned_binary_data = js::Value<JSEngine>::validated_to_binary(ctx->m_ctx, value);
        return ctx->m_owned_binary_data.get();
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Mixed> {
    static Mixed call(NativeAccessor<JSEngine> *native_accessor, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return TypeMixed<JSEngine>::get_instance().unwrap(native_accessor->m_ctx, value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, UUID> {
    static UUID call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return js::Value<JSEngine>::validated_to_uuid(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<UUID>> {
    static util::Optional<UUID> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        return ctx->template unbox_optional<UUID>(value);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Timestamp> {
    static Timestamp call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy, ObjKey) {
        if (ctx->is_null(value)) {
            return Timestamp();
        }
        typename JSEngine::Value date;
        if (js::Value<JSEngine>::is_string(ctx->m_ctx, value)) {
            // the incoming value might be a date string, so let the Date constructor have at it
            date = js::Value<JSEngine>::to_date(ctx->m_ctx, value);
        } else {
            date = js::Value<JSEngine>::validated_to_date(ctx->m_ctx, value);
        }

        double milliseconds = js::Value<JSEngine>::to_number(ctx->m_ctx, date);
        int64_t seconds = milliseconds / 1000;
        int32_t nanoseconds = ((int64_t)milliseconds % 1000) * 1000000;
        return Timestamp(seconds, nanoseconds);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Obj> {
    static Obj call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy policy, ObjKey current_row) {
        using Value = js::Value<JSEngine>;
        using ValueType = typename JSEngine::Value;

        auto object = Value::validated_to_object(ctx->m_ctx, value);
        if (js::Object<JSEngine>::template is_instance<RealmObjectClass<JSEngine>>(ctx->m_ctx, object)) {
            auto realm_object = get_internal<JSEngine, RealmObjectClass<JSEngine>>(ctx->m_ctx, object);
            if (realm_object->realm() == ctx->m_realm) {
                return realm_object->obj();
            }

            bool updating = policy.copy && policy.update;
            if (!updating && !policy.create) {
                throw std::runtime_error("Realm object is from another Realm");
            }
        }

        if (!policy.create) {
            return Obj();
        }

        if (Value::is_array(ctx->m_ctx, object)) {
            object = Schema<JSEngine>::dict_for_property_array(ctx->m_ctx, *ctx->m_object_schema, object);
        }

        auto child = realm::Object::create<ValueType>(*ctx, ctx->m_realm, *ctx->m_object_schema,
                                                      static_cast<ValueType>(object), policy, current_row);
        return child.obj();
    }
};

// FIXME: Why do we need this? It is required in order to compile and seems to be used by the query builder
template<typename JSEngine>
struct Unbox<JSEngine, ObjKey> {
    static ObjKey call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy policy, ObjKey current_row) {
        return Unbox<JSEngine, Obj>::call(ctx, value, policy, current_row).get_key();
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, ObjLink> {
    static ObjLink call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, realm::CreatePolicy policy, ObjKey current_row) {
        throw std::runtime_error("ObjLink not implemented");
    }
};

} // namespace _impl

template<typename T>
template<typename U>
U NativeAccessor<T>::unbox(ValueType value, realm::CreatePolicy policy, ObjKey current_row) {
    return _impl::Unbox<T, U>::call(this, std::move(value), policy, current_row);
}

template<typename T>
std::string NativeAccessor<T>::print(ValueType const& value) {
    std::string ret;
    print(ret, value);
    return ret;
}

template<typename T>
void NativeAccessor<T>::print(std::string& str, ValueType const& value) {
    if (Value::is_null(m_ctx, value)) {
        str += "null";
    }
    else if (Value::is_undefined(m_ctx, value)) {
        str += "undefined";
    }
    else if (Value::is_array(m_ctx, value)) {
        auto array = Value::to_array(m_ctx, value);
        auto length = Object::validated_get_length(m_ctx, array);

        str += "[";
        for (uint32_t i = 0; i < length; i++) {
            print(str, Object::get_property(m_ctx, array, i));
            if (i + 1 < length) {
                str += ", ";
            }
        }
        str += "]";
    }
    else if (Value::is_object(m_ctx, value)) {
        auto object = Value::to_object(m_ctx, value);
        if (Object::template is_instance<RealmObjectClass<T>>(m_ctx, object)) {
            auto realm_object = get_internal<T, RealmObjectClass<T>>(m_ctx, object);
            if (!realm_object) {
                throw std::runtime_error("Invalid argument 'value'.");
            }
            auto& object_schema = realm_object->get_object_schema();
            str += object_schema.name;
            str += "{";
            for (size_t i = 0, count = object_schema.persisted_properties.size(); i < count; ++i) {
                print(str, realm_object->template get_property_value<ValueType>(*this, object_schema.persisted_properties[i].name));
                if (i + 1 < count) {
                    str += ", ";
                }
            }
            str += "}";
        }
        else {
            str += Value::to_string(m_ctx, value);
        }
    }
    else if (Value::is_string(m_ctx, value)) {
        str += "'";
        str += Value::to_string(m_ctx, value);
        str += "'";
    }
    else {
        str += Value::to_string(m_ctx, value);
    }
}

} // js
} // realm
