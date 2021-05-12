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
#include "js_links.hpp"


namespace realm {
namespace js {

template <typename T>
struct DictionaryGetterSetter{
    using Value = js::Value<T>;

    IOCollection *collection;
    TypeMixed<T> mixed;

    DictionaryGetterSetter(std::shared_ptr<Realm> _realm, IOCollection *_collection):
    collection{_collection}{
        mixed.register_strategy(types::Object, new MixedLink<T>{_realm});
    }

    void set(accessor::Arguments args){
        auto context = args.context;
        auto key = args.property_name.c_str();
        try{
            auto mixed_value = mixed.unwrap(context, args.value);
            collection->set(key, mixed_value);
        } catch (InvalidTransactionException &error) {
            args.throw_error(error.what());
        }
    }

    auto get(accessor::Arguments args) {
        auto context = args.context;
        auto key = args.property_name.c_str();
        try{
            auto mixed_value = collection->get(key);
            auto js_value = mixed.wrap(context, mixed_value);
            return js_value;
        }catch (realm::KeyNotFound& error){}

        return Value::from_undefined(context);
    }
};

}  // namespace js
}  // namespace realm
