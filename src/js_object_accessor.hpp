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

namespace realm {
namespace js {

template<typename T>
struct NativeAccessor {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    static bool dict_has_value_for_key(ContextType ctx, ValueType dict, const std::string &prop_name) {
        ObjectType object = Value::validated_to_object(ctx, dict);
        return Object::has_property(ctx, object, prop_name);
    }
    static ValueType dict_value_for_key(ContextType ctx, ValueType dict, const std::string &prop_name) {
        ObjectType object = Value::validated_to_object(ctx, dict);
        return Object::get_property(ctx, object, prop_name);
    }

    static bool has_default_value_for_property(ContextType ctx, realm::Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
        auto defaults = get_delegate<T>(realm)->m_defaults[object_schema.name];
        return defaults.count(prop_name) != 0;
    }
    static ValueType default_value_for_property(ContextType ctx, realm::Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
        auto defaults = get_delegate<T>(realm)->m_defaults[object_schema.name];
        return defaults.at(prop_name);
    }

    // These must be implemented for each JS engine.
    static std::string to_binary(ContextType, ValueType &);
    static ValueType from_binary(ContextType, BinaryData);

    static bool to_bool(ContextType ctx, ValueType &value) {
        return Value::validated_to_boolean(ctx, value, "Property");
    }
    static ValueType from_bool(ContextType ctx, bool boolean) {
        return Value::from_boolean(ctx, boolean);
    }
    static long long to_long(ContextType ctx, ValueType &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static ValueType from_long(ContextType ctx, long long number) {
        return Value::from_number(ctx, number);
    }
    static float to_float(ContextType ctx, ValueType &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static ValueType from_float(ContextType ctx, float number) {
        return Value::from_number(ctx, number);
    }
    static double to_double(ContextType ctx, ValueType &value) {
        return Value::validated_to_number(ctx, value, "Property");
    }
    static ValueType from_double(ContextType ctx, double number) {
        return Value::from_number(ctx, number);
    }
    static std::string to_string(ContextType ctx, ValueType &value) {
        return Value::validated_to_string(ctx, value, "Property");
    }
    static ValueType from_string(ContextType ctx, StringData string) {
        return Value::from_string(ctx, string.data());
    }
    static Timestamp to_timestamp(ContextType ctx, ValueType &value) {
        ObjectType date = Value::validated_to_date(ctx, value, "Property");
        double milliseconds = Value::to_number(ctx, date);
        int64_t seconds = milliseconds / 1000;
        int32_t nanoseconds = ((int64_t)milliseconds % 1000) * 1000000;
        return Timestamp(seconds, nanoseconds);
    }
    static ValueType from_timestamp(ContextType ctx, Timestamp ts) {
        return Object::create_date(ctx, ts.get_seconds() * 1000 + ts.get_nanoseconds() / 1000000);
    }

    static bool is_null(ContextType ctx, ValueType &value) {
        return Value::is_null(ctx, value) || Value::is_undefined(ctx, value);
    }
    static ValueType null_value(ContextType ctx) {
        return Value::from_null(ctx);
    }

    static size_t to_object_index(ContextType ctx, SharedRealm realm, ValueType &value, const std::string &type, bool try_update) {
        ObjectType object = Value::validated_to_object(ctx, value);
        if (Object::template is_instance<RealmObjectClass<T>>(ctx, object)) {
            auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
            if (realm_object->realm() == realm) {
                return realm_object->row().get_index();
            }
        }

        auto object_schema = realm->schema().find(type);
        if (Value::is_array(ctx, object)) {
            object = Schema<T>::dict_for_property_array(ctx, *object_schema, object);
        }

        auto child = realm::Object::create<ValueType>(ctx, realm, *object_schema, static_cast<ValueType>(object), try_update);
        return child.row().get_index();
    }
    static size_t to_existing_object_index(ContextType ctx, SharedRealm realm, ValueType &value) {
        ObjectType object = Value::validated_to_object(ctx, value);
        if (!Object::template is_instance<RealmObjectClass<T>>(ctx, object)) {
            throw std::runtime_error("object is not a Realm Object");
        }
        
        auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
        if (realm_object->realm() != realm) {
            throw std::runtime_error("Realm object is from another Realm");

        }
        return realm_object->row().get_index();
    }
    static ValueType from_object(ContextType ctx, realm::Object realm_object) {
        return RealmObjectClass<T>::create_instance(ctx, std::move(realm_object));
    }

    static size_t list_size(ContextType ctx, ValueType &value) {
        return Object::validated_get_length(ctx, Value::validated_to_object(ctx, value));
    }
    static ValueType list_value_at_index(ContextType ctx, ValueType &value, size_t index) {
        return Object::validated_get_object(ctx, Value::validated_to_object(ctx, value), (uint32_t)index);
    }
    static ValueType from_list(ContextType ctx, realm::List list) {
        return ListClass<T>::create_instance(ctx, std::move(list));
    }
    static ValueType from_results(ContextType ctx, realm::Results results) {
        return ResultsClass<T>::create_instance(ctx, std::move(results));
    }
    static Mixed to_mixed(ContextType ctx, ValueType &val) {
        throw std::runtime_error("'Any' type is unsupported");
    }
};

} // js
} // realm
