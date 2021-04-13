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
#include "realm/dictionary.hpp"
#include "dictionary/collection/collection.hpp"
#include "common/object/interfaces.hpp"

namespace realm {
namespace js {

template <typename T>
struct DictionaryGetterSetter{
    IOCollection *collection;
    using Value = js::Value<T>;
    using JSMixedAPI = TypeMixed<T>;

    void set(accessor::Arguments args){
        auto context = args.context;
        auto key = args.property_name.c_str();
        try{
            auto mixed = JSMixedAPI::get_instance().unwrap(context, args.value);
            collection->set(key, mixed);
        } catch (InvalidTransactionException &error) {
            args.throw_error(error.what());
        }
    }

    auto get(accessor::Arguments args) {
        auto context = args.context;
        auto key = args.property_name.c_str();

        try{
            auto mixed_value = collection->get(key);
            auto value = JSMixedAPI::get_instance().wrap(context, mixed_value);
            return value;
        }catch (realm::KeyNotFound& error){}

        return Value::from_undefined(context);
    }
};

}  // namespace js
}  // namespace realm
