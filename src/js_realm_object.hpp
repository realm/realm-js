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
struct RealmObjectClass : ClassDefinition<T, realm::Object> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;

    static ObjectType create_instance(ContextType, realm::Object);

    static void get_property(ContextType, ObjectType, const String &, ReturnValue &);
    static bool set_property(ContextType, ObjectType, const String &, ValueType);
    static std::vector<String> get_property_names(ContextType, ObjectType);
    
    static void is_valid(ContextType, FunctionType, ObjectType, size_t, const ValueType [], ReturnValue &);

    const std::string name = "RealmObject";

    const StringPropertyType<T> string_accessor = {
        wrap<get_property>,
        wrap<set_property>,
        wrap<get_property_names>,
    };

    MethodMap<T> const methods = {
        {"isValid", wrap<is_valid>},
    };
};

template<typename T>
void RealmObjectClass<T>::is_valid(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmObjectClass<T>>(this_object)->is_valid());
}
    
template<typename T>
typename T::Object RealmObjectClass<T>::create_instance(ContextType ctx, realm::Object realm_object) {
    static String prototype_string = "prototype";

    auto delegate = get_delegate<T>(realm_object.realm().get());
    auto name = realm_object.get_object_schema().name;
    auto object = create_object<T, RealmObjectClass<T>>(ctx, new realm::Object(std::move(realm_object)));

    if (!delegate || !delegate->m_constructors.count(name)) {
        return object;
    }

    FunctionType constructor = delegate->m_constructors.at(name);
    ObjectType prototype = Object::validated_get_object(ctx, constructor, prototype_string);
    Object::set_prototype(ctx, object, prototype);

    ValueType result = Function::call(ctx, constructor, object, 0, NULL);
    if (result != object && !Value::is_null(ctx, result) && !Value::is_undefined(ctx, result)) {
        throw std::runtime_error("Realm object constructor must not return another value");
    }
    
    return object;
}

template<typename T>
void RealmObjectClass<T>::get_property(ContextType ctx, ObjectType object, const String &property, ReturnValue &return_value) {
    try {
        auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
        auto result = realm_object->template get_property_value<ValueType>(ctx, property);
        return_value.set(result);
    } catch (InvalidPropertyException &ex) {
        // getters for nonexistent properties in JS should always return undefined
    }
}

template<typename T>
bool RealmObjectClass<T>::set_property(ContextType ctx, ObjectType object, const String &property, ValueType value) {
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
    try {
        realm_object->set_property_value(ctx, property, value, true);
    }
    catch (TypeErrorException &ex) {
        throw TypeErrorException(realm_object->get_object_schema().name + "." + std::string(property), ex.type());
    }
    catch (InvalidPropertyException &ex) {
        return false;
    }
    return true;
}

template<typename T>
std::vector<String<T>> RealmObjectClass<T>::get_property_names(ContextType ctx, ObjectType object) {
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
    auto &properties = realm_object->get_object_schema().persisted_properties;

    std::vector<String> names;
    names.reserve(properties.size());

    for (auto &prop : properties) {
        names.push_back(prop.name);
    }

    return names;
}

} // js
} // realm
