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

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"

#include "object_accessor.hpp"
#include "object_store.hpp"

namespace realm {
namespace js {

template<typename T>
struct RealmObject {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = String<T>;
    using Value = Value<T>;
    using Object = Object<T>;
    using Function = Function<T>;
    using ReturnValue = ReturnValue<T>;

    static ObjectType create(ContextType, realm::Object &);

    static void GetProperty(ContextType, ObjectType, const String &, ReturnValue &);
    static bool SetProperty(ContextType, ObjectType, const String &, ValueType, ReturnValue &);
    static std::vector<String> GetPropertyNames(ContextType, ObjectType);
};

template<typename T>
struct ObjectClass<T, realm::Object> : BaseObjectClass<T> {
    using RealmObject = RealmObject<T>;

    const std::string name = "RealmObject";

    const StringPropertyType<T> string_accessor = {
        wrap<RealmObject::GetProperty>,
        wrap<RealmObject::SetProperty>,
        wrap<RealmObject::GetPropertyNames>,
    };
};

template<typename T>
typename T::Object RealmObject<T>::create(ContextType ctx, realm::Object &realm_object) {
    static String s_prototype = "prototype";

    auto delegate = get_delegate<T>(realm_object.realm().get());
    auto name = realm_object.get_object_schema().name;
    auto object = create_object<T, realm::Object>(ctx, new realm::Object(realm_object));

    if (!delegate->m_constructors.count(name)) {
        return object;
    }

    FunctionType constructor = delegate->m_constructors.at(name);
    ObjectType prototype = Object::validated_get_object(ctx, constructor, s_prototype);
    Object::set_prototype(ctx, object, prototype);

    ValueType result = Function::call(ctx, constructor, object, 0, NULL);
    if (result != object && !Value::is_null(ctx, result) && !Value::is_undefined(ctx, result)) {
        throw std::runtime_error("Realm object constructor must not return another value");
    }
    
    return object;
}

template<typename T>
void RealmObject<T>::GetProperty(ContextType ctx, ObjectType object, const String &property, ReturnValue &return_value) {
    try {
        auto realm_object = get_internal<realm::Object>(object);
        auto result = realm_object->template get_property_value<ValueType>(ctx, property);
        return_value.set(result);
    } catch (InvalidPropertyException &ex) {
        // getters for nonexistent properties in JS should always return undefined
    }
}

template<typename T>
bool RealmObject<T>::SetProperty(ContextType ctx, ObjectType object, const String &property, ValueType value, ReturnValue &return_value) {
    auto realm_object = get_internal<realm::Object>(object);
    realm_object->set_property_value(ctx, property, value, true);
    return true;
}

template<typename T>
std::vector<String<T>> RealmObject<T>::GetPropertyNames(ContextType ctx, ObjectType object) {
    auto realm_object = get_internal<realm::Object>(object);
    auto &properties = realm_object->get_object_schema().properties;
    std::vector<String> names(properties.size());
    size_t index = 0;

    for (auto &prop : properties) {
        names[index++] = prop.name;
    }

    return names;
}

} // js
} // realm
