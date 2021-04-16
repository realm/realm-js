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

#include <functional>
#include <map>
#include <regex>

#include "dictionary/collection/collection.hpp"
#include "common/js_plain_object.hpp"
#include "methods/accessors.hpp"
#include "methods/functions.hpp"
#include "realm/object-store/dictionary.hpp"
#include "builder/dictionary_builder.hpp"
namespace realm {
namespace js {

template <typename T>
class DictionaryAdapter {
   private:
    using ContextType = typename T::Context;
    using GetterSetter = DictionaryGetterSetter<T>;
    using Builder = DictionaryObjectBuilder;
    using JSDictionary = JSObject<T, GetterSetter, Builder, CollectionAdapter>;

   public:
    auto wrap(ContextType context, object_store::Dictionary dictionary) {
        auto *js_dictionary = new JSDictionary{context, dictionary};

        js_dictionary->setup_finalizer([=]() {
            delete js_dictionary;
        });

        return js_dictionary->build();
    }
};

}  // namespace js
}  // namespace realm

