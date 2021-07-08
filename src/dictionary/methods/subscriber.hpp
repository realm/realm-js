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
#include "common/object/interfaces.hpp"


namespace realm {
namespace js {

template <typename T>
struct DictionaryChangesSubscriber : public Subscriber {
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

    DictionaryChangesSubscriber(ContextType &_context, FunctionType &_fn)
        : fn{_context, _fn},
          context{Context<T>::get_global_context(_context)} {}

    DictionaryChangesSubscriber(DictionaryChangesSubscriber&& _subscriber){}

    DictionaryChangesSubscriber(DictionaryChangesSubscriber& _subscriber){}

    template <typename Collection>
    auto build_array(Collection &collection) const {
        std::vector<ValueType> values;
        for (auto mixed_item : collection) {
            values.push_back(
                TypeMixed<T>::get_instance().wrap(context, mixed_item));
        }

        return Object::create_array(context, values);
    }

    bool operator==(const DictionaryChangesSubscriber<T> &candidate) const {
        return static_cast<FunctionType>(fn) ==
               static_cast<FunctionType>(candidate.fn);
    }

    ObjectType build_changeset_object(DictionaryChangeSet &change_set) const {
        ObjectType object = Object::create_empty(context);
        Object::set_property(context, object, "deletions",
                             build_array(change_set.deletions));
        Object::set_property(context, object, "insertions",
                             build_array(change_set.insertions));
        Object::set_property(context, object, "modifications",
                             build_array(change_set.modifications));

        return object;
    }

    FunctionType callback() const{
        return static_cast<FunctionType>(fn);
    }

    bool equals(std::unique_ptr<Subscriber>& rhs) const{
        return (callback() == rhs->callback());
    }

    void notify(ObjectType object, DictionaryChangeSet& change_set) {
        ValueType arguments[]{object, build_changeset_object(change_set)};
        Function<T>::callback(context, fn, object, 2,
                              arguments);
    }
    ~DictionaryChangesSubscriber(){}
};

}  // namespace js
}  // namespace realm

