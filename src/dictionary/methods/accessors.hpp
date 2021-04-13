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
struct Accessor{
    IOCollection *collection;
    using Value = js::Value<T>;
    using JSMixedAPI = TypeMixed<T>;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context;

    void set(accessor::Arguments args){
        try{
            auto mixed = JSMixedAPI::get_instance().unwrap(args.context, args.value);
            collection->set(args.propert_name.c_str(), mixed);
        } catch (InvalidTransactionException &error) {
            args.throw_error(ctx, error.what());
        }
    }

    auto get(accessors::Arguments args) {
        try{
            auto mixed_value = dictionary.get_any(key.c_str());
            auto value = JSMixedAPI::get_instance().wrap(context, mixed_value);
            return value;
        }catch (realm::KeyNotFound& error){}

        return Value::from_undefined(context);
    }
};


/*
 *  Dictionary accessors for JS Objects.
 */
struct DictionaryAccessors {

    template <class JSObject>
    void apply(common::JavascriptObject& js_object, JSObject* _o) {
        auto *collection = _o->get_collection();

        for (auto entry_pair : *collection) {
            auto key = entry_pair.first.get_string().data();
            js_object.add_key(key);
        }
    }

    template <class JSObject>
    void update(common::JavascriptObject& js_object, JSObject* _o){
        using Dictionary = object_store::Dictionary;
        Dictionary dictionary = _o->get_collection()->data();
        std::vector<std::string> keys = js_object.get_keys();
        bool mutated = false;


        for(std::string& key: keys){
            if(!dictionary.contains(key)){
                std::cout << "removing -> " << key << "\n";
                js_object.remove_accessor(key);
            }
        }

        apply(js_object, _o);
    }

};

}  // namespace js
}  // namespace realm
