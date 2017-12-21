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

#include "object_accessor.hpp"
#include "object_store.hpp"

#include "js_class.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_schema.hpp"

namespace realm {
namespace js {

template<typename> class NativeAccessor;

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
    using Arguments = js::Arguments<T>;

    static ObjectType create_instance(ContextType, realm::Object);

    static void get_property(ContextType, ObjectType, const String &, ReturnValue &);
    static bool set_property(ContextType, ObjectType, const String &, ValueType);
    static std::vector<String> get_property_names(ContextType, ObjectType);

    static void is_valid(ContextType, FunctionType, ObjectType, size_t, const ValueType [], ReturnValue &);
    static void get_object_schema(ContextType, FunctionType, ObjectType, size_t, const ValueType [], ReturnValue &);
    static void linking_objects(ContextType, FunctionType, ObjectType, size_t, const ValueType [], ReturnValue &);
    static void get_object_id(ContextType, ObjectType, Arguments, ReturnValue &);
    static void is_same_object(ContextType, ObjectType, Arguments, ReturnValue &);

    const std::string name = "RealmObject";

    const StringPropertyType<T> string_accessor = {
        wrap<get_property>,
        wrap<set_property>,
        wrap<get_property_names>,
    };

    MethodMap<T> const methods = {
        {"isValid", wrap<is_valid>},
        {"objectSchema", wrap<get_object_schema>},
        {"linkingObjects", wrap<linking_objects>},
        {"_objectId", wrap<get_object_id>},
        {"_isSameObject", wrap<is_same_object>},
    };
};

template<typename T>
void RealmObjectClass<T>::is_valid(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    return_value.set(get_internal<T, RealmObjectClass<T>>(this_object)->is_valid());
}

template<typename T>
void RealmObjectClass<T>::get_object_schema(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    auto object = get_internal<T, RealmObjectClass<T>>(this_object);
    return_value.set(Schema<T>::object_for_object_schema(ctx, object->get_object_schema()));
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
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
    std::string name = property;
    if (realm_object->get_object_schema().property_for_name(name)) {
        NativeAccessor<T> accessor(ctx, realm_object->realm(), realm_object->get_object_schema());
        auto result = realm_object->template get_property_value<ValueType>(accessor, name);
        return_value.set(result);
    }
}

template<typename T>
bool RealmObjectClass<T>::set_property(ContextType ctx, ObjectType object, const String &property, ValueType value) {
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);

    std::string property_name = property;
    const Property* prop = realm_object->get_object_schema().property_for_name(property_name);
    if (!prop) {
        return false;
    }

    NativeAccessor<T> accessor(ctx, realm_object->realm(), realm_object->get_object_schema());
    if (!Value::is_valid_for_property(ctx, value, *prop)) {
        throw TypeErrorException(accessor, realm_object->get_object_schema().name, *prop, value);
    }

    realm_object->set_property_value(accessor, property_name, value, true);
    return true;
}

template<typename T>
std::vector<String<T>> RealmObjectClass<T>::get_property_names(ContextType ctx, ObjectType object) {
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
    auto &object_schema = realm_object->get_object_schema();

    std::vector<String> names;
    names.reserve(object_schema.persisted_properties.size() + object_schema.computed_properties.size());

    for (auto &prop : object_schema.persisted_properties) {
        names.push_back(prop.name);
    }
    for (auto &prop : object_schema.computed_properties) {
        names.push_back(prop.name);
    }

    return names;
}

template<typename T>
void RealmObjectClass<T>::get_object_id(ContextType ctx, ObjectType object, Arguments args, ReturnValue& return_value) {
    args.validate_maximum(0);

#if REALM_ENABLE_SYNC
    auto realm_object = get_internal<T, RealmObjectClass<T>>(object);
    const Group& group = realm_object->realm()->read_group();
    if (!sync::has_object_ids(group))
        throw std::logic_error("_objectId() can only be used with objects from synced Realms.");

    const Row& row = realm_object->row();
    auto object_id = sync::object_id_for_row(group, *row.get_table(), row.get_index());
    return_value.set(object_id.to_string());
#else
    throw std::logic_error("_objectId() can only be used with objects from synced Realms.");
#endif
}

template<typename T>
void RealmObjectClass<T>::is_same_object(ContextType ctx, ObjectType object, Arguments args, ReturnValue& return_value) {
    args.validate_count(1);

    ObjectType otherObject = Value::validated_to_object(ctx, args[0]);
    if (!Object::template is_instance<RealmObjectClass<T>>(ctx, otherObject)) {
        return_value.set(false);
        return;
    }

    auto self = get_internal<T, RealmObjectClass<T>>(object);
    auto other = get_internal<T, RealmObjectClass<T>>(otherObject);

    if (!self->realm() || self->realm() != other->realm()) {
        return_value.set(false);
        return;
    }

    if (!self->is_valid() || !other->is_valid()) {
        return_value.set(false);
        return;
    }

    return_value.set(self->row().get_table() == other->row().get_table()
                     && self->row().get_index() == other->row().get_index());
}
} // js
} // realm

// move this all the way here because it needs to include "js_results.hpp" which in turn includes this file

#include "js_results.hpp"

template<typename T>
void realm::js::RealmObjectClass<T>::linking_objects(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 2);

    std::string object_type = Value::validated_to_string(ctx, arguments[0], "objectType");
    std::string property_name = Value::validated_to_string(ctx, arguments[1], "property");

    auto object = get_internal<T, RealmObjectClass<T>>(this_object);

    auto target_object_schema = object->realm()->schema().find(object_type);
    if (target_object_schema == object->realm()->schema().end()) {
        throw std::logic_error(util::format("Could not find schema for type '%1'", object_type));
    }

    auto link_property = target_object_schema->property_for_name(property_name);
    if (!link_property) {
        throw std::logic_error(util::format("Type '%1' does not contain property '%2'", object_type, property_name));
    }

    if (link_property->object_type != object->get_object_schema().name) {
        throw std::logic_error(util::format("'%1.%2' is not a relationship to '%3'", object_type, property_name, object->get_object_schema().name));
    }

    realm::TableRef table = ObjectStore::table_for_object_type(object->realm()->read_group(), target_object_schema->name);
    auto row = object->row();
    auto tv = row.get_table()->get_backlink_view(row.get_index(), table.get(), link_property->table_column);

    return_value.set(ResultsClass<T>::create_instance(ctx, realm::Results(object->realm(), std::move(tv))));
}
