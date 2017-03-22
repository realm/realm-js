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

#include "sync/sync_permission.hpp"

namespace realm {
namespace js {

template<typename T>
struct PermissionResultsClass : ClassDefinition<T, PermissionResults, CollectionClass<T>> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;

    static ObjectType create_instance(ContextType, PermissionResults *);

    static void get_length(ContextType, ObjectType, ReturnValue &);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);

    std::string const name = "PermissionResults";

    MethodMap<T> const methods = {
    };
    
    PropertyMap<T> const properties = {
        {"length", {wrap<get_length>, nullptr}},
    };
    
    IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};
};

template<typename T>
typename T::Object PermissionResultsClass<T>::create_instance(ContextType ctx, PermissionResults *results) {
    return create_object<T, PermissionResultsClass<T>>(ctx, results);
}

template<typename T>
void PermissionResultsClass<T>::get_length(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto results = get_internal<T, PermissionResultsClass<T>>(object);
    return_value.set((uint32_t)results->size());
}

template<typename T>
void PermissionResultsClass<T>::get_index(ContextType ctx, ObjectType object, uint32_t index, ReturnValue &return_value) {
    auto results = get_internal<T, PermissionResultsClass>(object);
    auto permission = results->get(index);
    auto js_permission = Object::create_empty(ctx);
    Object::set_property(ctx, js_permission, "path", Value::from_string(ctx, permission.path));
    Object::set_property(ctx, js_permission, "userId", Value::from_string(ctx, permission.condition.user_id));

    if (permission.access == Permission::AccessLevel::Read)
        Object::set_property(ctx, js_permission, "access", Value::from_string(ctx, "Read"));
    else if (permission.access == Permission::AccessLevel::Write)
        Object::set_property(ctx, js_permission, "access", Value::from_string(ctx, "Write"));
    else if (permission.access == Permission::AccessLevel::Admin)
        Object::set_property(ctx, js_permission, "access", Value::from_string(ctx, "Admin"));
    else
        Object::set_property(ctx, js_permission, "access", Value::from_string(ctx, "None"));

    return_value.set(js_permission);
}

} // js
} // realm
