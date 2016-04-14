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
#include "js_object.hpp"
#include "js_schema.hpp"

namespace realm {
namespace js {

template<typename T>
struct NativeAccessor {
    using TContext = typename T::Context;
    using TObject = typename T::Object;
    using TValue = typename T::Value;
    using Object = Object<T>;
    using Value = Value<T>;

    static bool dict_has_value_for_key(TContext ctx, TValue dict, const std::string &prop_name) {
        TObject object = Value::validated_to_object(ctx, dict);
        return Object::has_property(ctx, object, prop_name);
    }
    static TValue dict_value_for_key(TContext ctx, TValue dict, const std::string &prop_name) {
        TObject object = Value::validated_to_object(ctx, dict);
        return Object::get_property(ctx, object, prop_name);
    }

    static bool has_default_value_for_property(TContext ctx, realm::Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
        auto defaults = get_delegate<T>(realm)->m_defaults[object_schema.name];
        return defaults.count(prop_name) != 0;
    }
    static TValue default_value_for_property(TContext ctx, realm::Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
        auto defaults = get_delegate<T>(realm)->m_defaults[object_schema.name];
        return defaults.at(prop_name);
    }

    // These must be implemented for each JS engine.
    static std::string to_binary(TContext, TValue &);
    static TValue from_binary(TContext, BinaryData);

    static bool to_bool(TContext ctx, TValue &value) {
        return Value::validated_to_boolean(ctx, value, "Property");
    }
    static TValue from_bool(TContext ctx, bool boolean) {
        return Value::from_boolean(ctx, boolean);
    }
    static long long to_long(TContext ctx, TValue &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static TValue from_long(TContext ctx, long long number) {
        return Value::from_number(ctx, number);
    }
    static float to_float(TContext ctx, TValue &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static TValue from_float(TContext ctx, float number) {
        return Value::from_number(ctx, number);
    }
    static double to_double(TContext ctx, TValue &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static TValue from_double(TContext ctx, double number) {
        return Value::from_number(ctx, number);
    }
    static std::string to_string(TContext ctx, TValue &value) {
        return Value::validated_to_string(ctx, value, "Property");
    }
    static TValue from_string(TContext ctx, StringData string) {
        return Value::from_string(ctx, string.data());
    }
    static DateTime to_datetime(TContext ctx, TValue &value) {
        TObject date = Value::validated_to_date(ctx, value, "Property");
        return DateTime(Value::to_number(ctx, date));
    }
    static TValue from_datetime(TContext ctx, DateTime dt) {
        return Object::create_date(ctx, dt.get_datetime());
    }

    static bool is_null(TContext ctx, TValue &value) {
        return Value::is_null(ctx, value) || Value::is_undefined(ctx, value);
    }
    static TValue null_value(TContext ctx) {
        return Value::from_null(ctx);
    }

    static size_t to_object_index(TContext ctx, SharedRealm realm, TValue &value, const std::string &type, bool try_update) {
        TObject object = Value::validated_to_object(ctx, value);
        if (Object::template is_instance<realm::Object>(ctx, object)) {
            return get_internal<T, realm::Object>(object)->row().get_index();
        }

        auto object_schema = realm->config().schema->find(type);
        if (Value::is_array(ctx, object)) {
            object = Schema<T>::dict_for_property_array(ctx, *object_schema, object);
        }

        auto child = realm::Object::create<TValue>(ctx, realm, *object_schema, static_cast<TValue>(object), try_update);
        return child.row().get_index();
    }
    static size_t to_existing_object_index(TContext ctx, TValue &value) {
        TObject object = Value::validated_to_object(ctx, value);
        if (Object::template is_instance<realm::Object>(ctx, object)) {
            return get_internal<T, realm::Object>(object)->row().get_index();
        }
        throw std::runtime_error("object is not a Realm Object");
    }
    static TValue from_object(TContext ctx, realm::Object realm_object) {
        return RealmObject<T>::create_instance(ctx, realm_object);
    }

    static size_t list_size(TContext ctx, TValue &value) {
        return Object::validated_get_length(ctx, Value::validated_to_object(ctx, value));
    }
    static TValue list_value_at_index(TContext ctx, TValue &value, size_t index) {
        return Object::validated_get_object(ctx, Value::validated_to_object(ctx, value), (uint32_t)index);
    }
    static TValue from_list(TContext ctx, realm::List list) {
        return List<T>::create_instance(ctx, list);
    }

    static Mixed to_mixed(TContext ctx, TValue &val) {
        throw std::runtime_error("'Any' type is unsupported");
    }
};

} // js
} // realm
