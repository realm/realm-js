////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include <map>
#include <regex>


#include "realm/object-store/property.hpp"
#include "realm/object-store/dictionary.hpp"
#include "common/type_deduction.hpp"
#include "js_mixed.hpp"

namespace realm {
namespace js {

class DictionarySchema {
private:
    const std::string DICT_SCHEMA = R"((\w+)?(\{\}))";

    std::string type;
    std::smatch matches;
    bool valid_schema;
public:

    DictionarySchema(std::string _schema) {
        std::regex dict_schm_regex{DICT_SCHEMA, std::regex_constants::ECMAScript};
        valid_schema = std::regex_search(_schema, matches, dict_schm_regex);
        if (valid_schema) {
            type = matches[1];
        }
    }

    realm::PropertyType make_generic() {
        return realm::PropertyType::Dictionary | realm::PropertyType::Mixed;
    }

    realm::PropertyType schema() {
        if (type.empty()) {
            return make_generic();
        }

        if (TypeDeduction::realm_type_exist(type)) {
            throw std::runtime_error("Schema type: " + type + " not supported for Dictionary.");
        }

        auto dictionary_type_value = TypeDeduction::realm_type(type);
        return (realm::PropertyType::Dictionary | static_cast<realm::PropertyType>(dictionary_type_value));
    }

    bool is_dictionary() { return valid_schema; }
};


template <typename T>
struct DictionaryAccessController {
    std::string key_name;
    realm::object_store::Dictionary dictionary;
    DictionaryAccessController(std::string name, realm::object_store::Dictionary dict): key_name{name}, dictionary{dict} {}

    void set(realm::Mixed mixed) {
        dictionary.insert(key_name, mixed);
    }

    template <typename Context>
    auto get(const Context context) {
        auto mixed_value = dictionary.get_any(key_name);
        return TypeMixed<T>::get_instance().wrap(context, mixed_value);
    }
};

template <typename T>
class DictionaryAdapter {
private:
    using Object = js::Object<T>;
    using ValueType = typename T::Value;
    using Context = typename T::Context;

    static ValueType getter(const Napi::CallbackInfo& info) {
        auto* controller = static_cast<DictionaryAccessController<T>*>(info.Data());
        return controller->get(info.Env());
    }

    static void setter(const Napi::CallbackInfo& info) {
        auto* controller = static_cast<DictionaryAccessController<T>*>(info.Data());
        auto mixed = TypeMixed<T>::get_instance().unwrap(info.Env(), info[0]);
        controller->set(mixed);
    }

public:
    ValueType wrap(Context context, realm::object_store::Dictionary dictionary){
        auto empty_object = Napi::Object::New(context);
        std::vector<Napi::PropertyDescriptor> properties;

        for(auto entry_pair: dictionary){
            auto key = entry_pair.first.get_string().data();
            auto *access_controller = new DictionaryAccessController<T>(key, dictionary);

            auto prop = Napi::PropertyDescriptor::Accessor(context, empty_object, key, getter, setter, napi_enumerable, static_cast<void*>(access_controller));

            properties.push_back(prop);
        }

        empty_object.DefineProperties(properties);

        empty_object.AddFinalizer([](Napi::Env /*env*/, void* ref) {
            std::cout << "deleted ???? " << std::endl;
           // delete ref;
        }, new int{5});
        return empty_object;
    }

};



}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
