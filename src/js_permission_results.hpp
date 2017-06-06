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
        class PermissionResults : public realm::PermissionResults {
        public:
            PermissionResults(realm::PermissionResults&& r) : realm::PermissionResults(std::move(r)) {}
            std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
            realm::Results& get_results() { return m_results; }
        };

        template<typename T>
        struct PermissionResultsClass : ClassDefinition<T, PermissionResults<T>, CollectionClass<T>> {
            using ContextType = typename T::Context;
            using ObjectType = typename T::Object;
            using ValueType = typename T::Value;
            using FunctionType = typename T::Function;
            using Object = js::Object<T>;
            using Value = js::Value<T>;
            using ReturnValue = js::ReturnValue<T>;

            static ObjectType create_instance(ContextType, PermissionResults<T> *);

            static void get_length(ContextType, ObjectType, ReturnValue &);
            static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);

            // observable
            static void add_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
            static void remove_listener(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
            static void remove_all_listeners(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);

            std::string const name = "PermissionResults";

            MethodMap<T> const methods = {
                {"addListener", wrap<add_listener>},
                {"removeListener", wrap<remove_listener>},
                {"removeAllListeners", wrap<remove_all_listeners>},
            };

            PropertyMap<T> const properties = {
                {"length", {wrap<get_length>, nullptr}},
            };

            IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};
        };

        template<typename T>
        typename T::Object PermissionResultsClass<T>::create_instance(ContextType ctx, PermissionResults<T> *results) {
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

        template<typename T>
        void PermissionResultsClass<T>::add_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
            validate_argument_count(argc, 1);

            auto results = get_internal<T, PermissionResultsClass<T>>(this_object);
            auto callback = Value::validated_to_function(ctx, arguments[0]);
            Protected<FunctionType> protected_callback(ctx, callback);
            Protected<ObjectType> protected_this(ctx, this_object);
            Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

            auto token = results->get_results().add_notification_callback([=](CollectionChangeSet change_set, std::exception_ptr exception) {
                HANDLESCOPE

                ValueType arguments[2];
                arguments[0] = static_cast<ObjectType>(protected_this);
                arguments[1] = CollectionClass<T>::create_collection_change_set(protected_ctx, change_set);
                Function<T>::call(protected_ctx, protected_callback, protected_this, 2, arguments);
            });
            results->m_notification_tokens.emplace_back(protected_callback, std::move(token));
        }

        template<typename T>
        void PermissionResultsClass<T>::remove_listener(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
            validate_argument_count(argc, 1);

            auto results = get_internal<T, PermissionResultsClass<T>>(this_object);
            auto callback = Value::validated_to_function(ctx, arguments[0]);
            auto protected_function = Protected<FunctionType>(ctx, callback);
            
            auto iter = results->m_notification_tokens.begin();
            typename Protected<FunctionType>::Comparator compare;
            while (iter != results->m_notification_tokens.end()) {
                if(compare(iter->first, protected_function)) {
                    iter = results->m_notification_tokens.erase(iter);
                }
                else {
                    iter++;
                }
            }
        }
        
        template<typename T>
        void PermissionResultsClass<T>::remove_all_listeners(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
            validate_argument_count(argc, 0);
            
            auto results = get_internal<T, PermissionResultsClass<T>>(this_object);
            results->m_notification_tokens.clear();
        }
        
    } // js
} // realm
