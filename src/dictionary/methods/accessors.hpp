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

namespace realm {
namespace js {

/*
 *  Dictionary accessors for JS Objects.
 */
struct DictionaryAccessors {

    template <class JSObject>
    void apply(common::JavascriptObject& js_object, JSObject* _o) {
        auto *collection = _o->get_collection();

        for (auto entry_pair : *collection) {
            auto key = entry_pair.first.get_string().data();
            js_object.add_accessor(key, collection);
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
