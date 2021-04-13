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
#include "common/object/interfaces.hpp"
#include "../methods/functions.hpp"

namespace realm {
    namespace js {

        struct DictionaryObjectBuilder {
            using Dictionary = object_store::Dictionary;
            template<typename VM, typename JSObject>
            void add_methods(JSObject& object) {
                using Functions = MethodsForDictionary<VM>;
                object.template add_method<VM, Functions::add_listener>("addListener");
                object.template add_method<VM, Functions::remove_listener>("removeListener");
                object.template add_method<VM, Functions::remove_all_listeners>("removeAllListeners");
                object.template add_method<VM, Functions::put>("put");
                object.template add_method<VM, Functions::remove>("remove");
            }

            template <class JSObject>
            void add_accessors(JSObject& js_object,  Dictionary& dictionary) {
                for (auto entry_pair : dictionary) {
                    auto key = entry_pair.first.get_string().data();
                    js_object.add_key(key);
                }
            }

            template <class JSObject>
            void remove_accessors(JSObject& js_object, IOCollection* collection){
                std::vector<std::string> properties = js_object.get_properties();
                for(std::string& key: properties){
                    if(!collection->contains(key)){
                        js_object.remove_accessor(key);
                    }
                }
            }
        };

    }  // namespace js
}  // namespace realm
