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

#ifndef REALMJS_JS_DICTIONARY_HPP
#define REALMJS_JS_DICTIONARY_HPP

#pragma once

#include <functional>
#include <map>
#include <regex>

#include "realm/object-store/dictionary.hpp"

#include "common/js_plain_object.hpp"
#include "methods/accessors.hpp"
#include "methods/listeners.hpp"

namespace realm {
namespace js {

template <typename T>
class DictionaryAdapter {
   private:
    using ValueType = typename T::Value;
    using Context = typename T::Context;

    using GetterSetters = AccessorsConfiguration<T, AccessorsForDictionary<T>>;
    using Methods = ListenersMethodsForDictionary<T>;
    using JSDictionary = JSObject<T, GetterSetters, Methods>;

   public:
    ValueType wrap(Context context, object_store::Dictionary dictionary) {
        JSDictionary *js_dictionary = new JSDictionary {context};
        object_store::Dictionary *_dictionary = new object_store::Dictionary{dictionary};

        js_dictionary->template configure_object_destructor([=]() {
            /* GC will trigger this function, signaling that...
             * ...we can deallocate the attached C++ object.
             */
            delete js_dictionary;
            delete _dictionary;
        });

        js_dictionary->set_getter_setters(_dictionary);
        js_dictionary->set_methods(_dictionary);

        return js_dictionary->get_plain_object();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
