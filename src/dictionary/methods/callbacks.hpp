////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

namespace realm {
namespace js {

template <typename T>
struct NotificationsCallback {
    using ObjectType = typename T::Object;
    using FunctionType = typename T::Function;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context;
    using PFunction = Protected<FunctionType>;
    using PGlobalContext = Protected<typename T::GlobalContext>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    PFunction fn;
    PGlobalContext context;


    NotificationsCallback(ContextType &_context, FunctionType &_fn)
        : fn{_context, _fn},
          context{Context<T>::get_global_context(_context)} {}


    template <typename Collection>
    auto build_array(Collection &collection) const {
        std::vector<ValueType> values;
        for (auto mixed_item : collection) {
            values.push_back(
                TypeMixed<T>::get_instance().wrap(context, mixed_item));
        }

        return Object::create_array(context, values);
    }

    bool operator==(const NotificationsCallback<T> &candidate) const {
        return static_cast<FunctionType>(fn) ==
               static_cast<FunctionType>(candidate.fn);
    }

    ObjectType build_changeset_object(DictionaryChangeSet &change_set) const {
        ObjectType object = Object::create_empty(context);
        int deleted_fields_size = change_set.deletions.size();
        Object::set_property(context, object, "deletions",
                             Value::from_number(context, deleted_fields_size));
        Object::set_property(context, object, "insertions",
                             build_array(change_set.insertions));
        Object::set_property(context, object, "modifications",
                             build_array(change_set.modifications));

        return object;
    }

    void update_object_with_new_dictionary(object_store::Dictionary *dict) const {

    }

    void operator()(std::shared_ptr<object_store::Dictionary> dict,
                    DictionaryChangeSet change_set, bool has_change) const {
        HANDLESCOPE(context)
/*
        if (has_change) {
            update_object_with_new_dictionary(dict);
        } */

        ValueType arguments[]{Object::create_empty(context), build_changeset_object(change_set)};

        Function<T>::callback(context, fn, Object::create_empty(context), 2, arguments);
    }
};

}  // namespace js
}  // namespace realm

