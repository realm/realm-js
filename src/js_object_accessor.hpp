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

#include "js_list.hpp"
#include "js_realm_object.hpp"
#include "js_schema.hpp"

#include "util/format.hpp"

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
    : m_ctx(ctx), m_realm(std::move(realm)), m_object_schema(object_schema) { }

    NativeAccessor(NativeAccessor& parent, const Property& prop)
    : m_ctx(parent.m_ctx)
    , m_realm(parent.m_realm)
    , m_object_schema(*m_realm->schema().find(prop.object_type))
    { }

    OptionalValue value_for_property(ValueType dict, std::string const& prop_name, size_t prop_index) {
        ObjectType object = Value::validated_to_object(m_ctx, dict);
        if (!Object::has_property(m_ctx, object, prop_name)) {
            return util::none;
        }
        ValueType value = Object::get_property(m_ctx, object, prop_name);
        const auto& prop = m_object_schema.persisted_properties[prop_index];
        if (!Value::is_valid_for_property(m_ctx, value, prop)) {
            throw TypeErrorException(util::format("%1.%2", m_object_schema.name, prop.name),
                                     js_type_name_for_property_type(prop.type));
        }
        return value;
    }

    OptionalValue default_value_for_property(const ObjectSchema &object_schema, const std::string &prop_name) {
        auto defaults = get_delegate<JSEngine>(m_realm.get())->m_defaults[object_schema.name];
        auto it = defaults.find(prop_name);
        return it != defaults.end() ? util::make_optional(ValueType(it->second)) : util::none;
    }

    template<typename T>
    T unbox(ValueType value, bool create = false, bool update = false);

    ValueType box(bool boolean)      { return Value::from_boolean(m_ctx, boolean); }
    ValueType box(int64_t number)    { return Value::from_number(m_ctx, number); }
    ValueType box(float number)      { return Value::from_number(m_ctx, number); }
    ValueType box(double number)     { return Value::from_number(m_ctx, number); }
    ValueType box(StringData string) { return Value::from_string(m_ctx, string.data()); }
    ValueType box(BinaryData data)   { return Value::from_binary(m_ctx, data); }
    ValueType box(Mixed)             { throw std::runtime_error("'Any' type is unsupported"); }

    ValueType box(Timestamp ts) {
        return Object::create_date(m_ctx, ts.get_seconds() * 1000 + ts.get_nanoseconds() / 1000000);
    }
    ValueType box(realm::Object realm_object) {
        return RealmObjectClass<JSEngine>::create_instance(m_ctx, std::move(realm_object));
    }
    ValueType box(realm::List list) {
        return ListClass<JSEngine>::create_instance(m_ctx, std::move(list));
    }
    ValueType box(realm::Results results) {
        return ResultsClass<JSEngine>::create_instance(m_ctx, std::move(results));
    }

    bool is_null(ValueType const& value) {
        return Value::is_null(m_ctx, value) || Value::is_undefined(m_ctx, value);
    }
    ValueType null_value() {
        return Value::from_null(m_ctx);
    }

    template<typename Fn>
    void enumerate_list(ValueType& value, Fn&& func) {
        auto obj = Value::validated_to_object(m_ctx, value);
        uint32_t size = Object::validated_get_length(m_ctx, obj);
        for (uint32_t i = 0; i < size; ++i) {
            func(Object::validated_get_object(m_ctx, obj, i));
        }
    }

    bool allow_missing(ValueType const&) const noexcept { return false; }
    void will_change(realm::Object&, realm::Property const&) { }
    void did_change() { }

    std::string print(ValueType const&) { return "not implemented"; }

private:
    ContextType m_ctx;
    std::shared_ptr<Realm> m_realm;
    const ObjectSchema& m_object_schema;
    std::string m_string_buffer;
    OwnedBinaryData m_owned_binary_data;

    template<typename, typename>
    friend struct _impl::Unbox;
};

namespace _impl {
template<typename JSEngine>
struct Unbox<JSEngine, bool> {
    static bool call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_boolean(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, int64_t> {
    static int64_t call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, float> {
    static float call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, double> {
    static double call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<bool>> {
    static util::Optional<bool> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_boolean(ctx->m_ctx, value, "Property");
}
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<int64_t>> {
    static util::Optional<int64_t> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
}
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<float>> {
    static util::Optional<float> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
}
};

template<typename JSEngine>
struct Unbox<JSEngine, util::Optional<double>> {
    static util::Optional<double> call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        return js::Value<JSEngine>::validated_to_number(ctx->m_ctx, value, "Property");
}
};

template<typename JSEngine>
struct Unbox<JSEngine, StringData> {
    static StringData call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        ctx->m_string_buffer = js::Value<JSEngine>::validated_to_string(ctx->m_ctx, value, "Property");
        return ctx->m_string_buffer;
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, BinaryData> {
    static BinaryData call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value value, bool, bool) {
        ctx->m_owned_binary_data = js::Value<JSEngine>::validated_to_binary(ctx->m_ctx, value, "Property");
        return ctx->m_owned_binary_data.get();
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Mixed> {
    static Mixed call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        throw std::runtime_error("'Any' type is unsupported");
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, Timestamp> {
    static Timestamp call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool, bool) {
        auto date = js::Value<JSEngine>::validated_to_date(ctx->m_ctx, value, "Property");
        double milliseconds = js::Value<JSEngine>::to_number(ctx->m_ctx, date);
        int64_t seconds = milliseconds / 1000;
        int32_t nanoseconds = ((int64_t)milliseconds % 1000) * 1000000;
        return Timestamp(seconds, nanoseconds);
    }
};

template<typename JSEngine>
struct Unbox<JSEngine, RowExpr> {
    static RowExpr call(NativeAccessor<JSEngine> *ctx, typename JSEngine::Value const& value, bool create, bool try_update) {
        using Value = js::Value<JSEngine>;
        using ValueType = typename JSEngine::Value;

        auto object = Value::validated_to_object(ctx->m_ctx, value);
        if (js::Object<JSEngine>::template is_instance<RealmObjectClass<JSEngine>>(ctx->m_ctx, object)) {
            auto realm_object = get_internal<JSEngine, RealmObjectClass<JSEngine>>(object);
            if (realm_object->realm() == ctx->m_realm) {
                return realm_object->row();
            }
            if (!create) {
                throw std::runtime_error("Realm object is from another Realm");
            }
        }
        else if (!create) {
            throw std::runtime_error("object is not a Realm Object");
        }

        if (Value::is_array(ctx->m_ctx, object)) {
            object = Schema<JSEngine>::dict_for_property_array(ctx->m_ctx, ctx->m_object_schema, object);
        }

        auto child = realm::Object::create<ValueType>(*ctx, ctx->m_realm, ctx->m_object_schema,
                                                      static_cast<ValueType>(object), try_update);
        return child.row();
    }
};
} // namespace _impl

template<typename T>
template<typename U>
U NativeAccessor<T>::unbox(ValueType value, bool create, bool update) {
    return _impl::Unbox<T, U>::call(this, std::move(value), create, update);
}


} // js
} // realm
