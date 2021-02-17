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

#include <functional>
#include <map>
#include <regex>

#include "common/type_deduction.hpp"
#include "js_mixed.hpp"
#include "realm/object-store/dictionary.hpp"
#include "realm/object-store/property.hpp"

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
        std::regex dict_schema_regex{DICT_SCHEMA,
                                     std::regex_constants::ECMAScript};
        valid_schema = std::regex_search(_schema, matches, dict_schema_regex);
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
            throw std::runtime_error("Schema type: " + type +
                                     " not supported for Dictionary.");
        }

        auto dictionary_type_value = TypeDeduction::realm_type(type);
        return (realm::PropertyType::Dictionary |
                static_cast<realm::PropertyType>(dictionary_type_value));
    }

    bool is_dictionary() { return valid_schema; }
};

/*
 *  Specific NodeJS code to make object descriptors.
 *
 */
template <typename T>
struct AccessorsConfiguration {
    using Dictionary = realm::object_store::Dictionary;
    template <typename JavascriptPlainObject, typename AccessorsConfiguration>
    static void make_enumerable_accessors(JavascriptPlainObject& object,
                                          AccessorsConfiguration& accessors) {
        auto plain_object = object->get_plain_object();
        auto dictionary = object->get_data();
        auto context= object->get_context();

        std::vector<Napi::PropertyDescriptor> properties;

        for (auto entry_pair : dictionary) {
            auto key = entry_pair.first.get_string().data();
            auto _getter = accessors.produce_getter(key);
            auto _setter = accessors.produce_setter(key);

            auto descriptor = Napi::PropertyDescriptor::Accessor(
                context, plain_object, key, _getter, _setter, napi_enumerable,
                static_cast<void*>(object));
            properties.push_back(descriptor);
        }

        plain_object.DefineProperties(properties);
    }
};



template <typename VM, typename Data>
struct JavascriptPlainObject {
   private:
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using Context = typename VM::Context;

    Data data;
    ObjectType object;
    Context context;

   public:
    JavascriptPlainObject(Context _context, Data _data)
        : data{_data}, context{_context} {
        object = Object::create_empty(context);
    }

    ObjectType& get_plain_object() { return object; }
    Context& get_context() {return context; }
    Data& get_data() { return data; }

    ~JavascriptPlainObject(){}

    template <typename Callback>
    void configure_object_destructor(Callback&& callback) {
        object.AddFinalizer(
            [callback](Context /*env*/, void* data_ref) {
                callback();
            }, this);
    }
};

template <typename VM>
struct Accessor {
    using Dictionary = realm::object_store::Dictionary;
    using JavascriptObject = JavascriptPlainObject<VM, Dictionary>;

    auto produce_getter(std::string key_name) {
        return [=](const Napi::CallbackInfo& info) {
            auto* plain_object = static_cast<JavascriptObject*>(info.Data());
            Dictionary dictionary = plain_object->get_data();

            auto mixed_value = dictionary.get_any(key_name);
            return TypeMixed<VM>::get_instance().wrap(info.Env(), mixed_value);
        };
    }

    auto produce_setter(std::string key_name) {
        return [=](const Napi::CallbackInfo& info) {
            auto* plain_object = static_cast<JavascriptObject*>(info.Data());
            Dictionary dictionary = plain_object->get_data();

            auto mixed = TypeMixed<VM>::get_instance().unwrap(info.Env(), info[0]);
            dictionary.insert(key_name, mixed);
        };
    }
};

template <typename VM>
class DictionaryAdapter {
   private:
    using ValueType = typename VM::Value;
    using Context = typename VM::Context;
    using Dictionary = realm::object_store::Dictionary;
    using JavascriptObject = JavascriptPlainObject<VM, Dictionary>;

   public:
    ValueType wrap(Context context, Dictionary dictionary) {
        Accessor<VM> accessor;
        JavascriptObject* plain_object =
            new JavascriptObject(context, dictionary);

        AccessorsConfiguration<VM>::make_enumerable_accessors(plain_object, accessor);

        plain_object->template configure_object_destructor([=]() {
            /* Capture and free when the C++ object only when the
             * VM dispose the JS Object.
             */
            delete plain_object;
        });

        return plain_object->get_plain_object();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
