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

#ifndef REALMJS_MIXED_ACCESSORS_HPP
#define REALMJS_MIXED_ACCESSORS_HPP

namespace realm {
namespace js {

template <typename T>
struct AccessorsForDictionary {
    using Dictionary = object_store::Dictionary;
    using MixedAPI = TypeMixed<T>;

    template <typename JavascriptObject>
    auto make_getter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary* realm_dictionary = &object->get_data().get_collection();
            auto mixed_value = realm_dictionary->get_any(key_name);
            return MixedAPI::get_instance().wrap(info.Env(), mixed_value);
        };
    }
    template <typename JavascriptObject>
    auto make_setter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary* realm_dictionary = &object->get_data().get_collection();
            auto mixed = MixedAPI::get_instance().unwrap(info.Env(), info[0]);

            realm_dictionary->insert(key_name, mixed);
        };
    }
};
}  // namespace js
}  // namespace realm
#endif  // REALMJS_MIXED_ACCESSORS_HPP
