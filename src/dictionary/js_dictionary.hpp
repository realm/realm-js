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

#include "common/js_plain_object.hpp"
#include "common/type_deduction.hpp"
#include "js_mixed.hpp"
#include "realm/object-store/dictionary.hpp"
#include "realm/object-store/property.hpp"
#include "collection/collection.hpp"
#include "collection/notification.hpp"
#include "methods/mixed_accessors.hpp"
#include "methods/listeners.hpp"
#include "methods/callbacks.hpp"

namespace realm {
namespace js {

template <typename VM>
class DictionaryAdapter {
   private:
    using ValueType = typename VM::Value;
    using Context = typename VM::Context;
    using Callbacks = JSPersistentCallback<VM>;
    using Collection = CollectionAdapter<object_store::Dictionary,
                                         DictionaryNotifications<Callbacks>>;
    using JSObjectBuilder = JSObjectBuilder<VM, Collection>;
    using DictionaryGetterSetter =
        AccessorsConfiguration<Context, AccessorsForDictionary<VM>>;

   public:
    ValueType wrap(Context context, object_store::Dictionary dictionary) {
        Collection collection{std::move(dictionary)};
        JSObjectBuilder* js_builder =
            new JSObjectBuilder(context, std::move(collection));

        js_builder->template configure_object_destructor([=]() {
            /* GC will trigger this function, signaling that...
             * ...we can deallocate the attached C++ object.
             */
            delete js_builder;
        });

        js_builder->template add_feature<DictionaryGetterSetter>();
        js_builder->template add_feature<ListenersMethodsForDictionary<VM>>();

        return js_builder->build();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
