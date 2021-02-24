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
 *  When working with the JSC version, we just need to extract the NodeJS
 * feature and create a reusable component.
 */
template <typename VM, typename GetterSetterComponent>
struct AccessorsConfiguration {
    using Dictionary = realm::object_store::Dictionary;
    using Context = typename VM::Context;
    Context context;
    GetterSetterComponent accessor;
    AccessorsConfiguration(Context _context) : context{_context} {}

    template <typename JavascriptPlainObject>
    void apply(JavascriptPlainObject* object) {
        auto dictionary = object->get_data().get_collection();
        auto plain_object = object->get_plain_object();
        for (auto entry_pair : dictionary) {
            auto key = entry_pair.first.get_string().data();
            auto _getter = accessor.make_getter(key, object);
            auto _setter = accessor.make_setter(key, object);

            auto descriptor = Napi::PropertyDescriptor::Accessor(
                context, plain_object, key, _getter, _setter, napi_enumerable,
                static_cast<void*>(object));

            object->register_accessor(descriptor);
        }
    }
};

template <typename Collection, typename Function>
class CollectionAdapter {
   private:
    Collection collection;
    using TokensMap =
        std::vector<std::pair<Protected<Function>, NotificationToken>>;

   public:
    CollectionAdapter(Collection _collection) : collection{_collection} {}
    CollectionAdapter(CollectionAdapter&& collection_adapter) {
        m_notification_tokens.swap(collection_adapter.m_notification_tokens);
        collection = collection_adapter.get_collection();
    }

    template <typename... Arguments>
    auto add_notification_callback(Arguments... arguments) {
        return collection.add_notification_callback(arguments...);
    }

    Collection& get_collection() { return collection; }
    void remove_all_listeners(){
        m_notification_tokens.clear();
    }
    TokensMap m_notification_tokens;
};

template <typename VM, typename Data>
struct JavascriptPlainObject {
   private:
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using Context = typename VM::Context;
    using ObjectProperties = std::vector<Napi::PropertyDescriptor>;

    Data data;
    ObjectType object;
    Context context;
    ObjectProperties properties;

   public:
    JavascriptPlainObject(Context _context, Data _data)
        : data{std::move(_data)}, context{_context} {
        object = Object::create_empty(context);
    }

    ObjectType& get_plain_object() { return object; }
    Context& get_context() { return context; }
    Data& get_data() { return data; }

    ~JavascriptPlainObject() {}

    template <typename Callback>
    void configure_object_destructor(Callback&& callback) {
        object.AddFinalizer([callback](Context, void* data_ref) { callback(); },
                            this);
    }

    template <typename Feature>
    void add_feature() {
        Feature feature{context};
        feature.apply(this);
    }

    template <typename Property>
    void register_accessor(Property property) {
        properties.push_back(property);
    }

    ObjectType& get_object_with_accessors() {
        if (properties.size() > 0) {
            object.DefineProperties(properties);
            return object;
        }

        return object;
    }
};

template <typename VM>
struct AccessorsForDictionary {
    using Dictionary = realm::object_store::Dictionary;

    template <typename JavascriptObject>
    auto make_getter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary realm_dictionary = object->get_data().get_collection();
            auto mixed_value = realm_dictionary.get_any(key_name);

            return TypeMixed<VM>::get_instance().wrap(info.Env(), mixed_value);
        };
    }
    template <typename JavascriptObject>
    auto make_setter(std::string key_name, JavascriptObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Dictionary realm_dictionary = object->get_data().get_collection();
            auto mixed =
                TypeMixed<VM>::get_instance().unwrap(info.Env(), info[0]);

            realm_dictionary.insert(key_name, mixed);
        };
    }
};

template <typename VM>
class ListenersForDictionary {
   private:
    using Context = typename VM::Context;
    using Value = js::Value<VM>;
    Context context;

    template <typename Fn, typename JavascriptPlainObject>
    auto add_javascript_function(std::string&& name, Fn&& function,
                                 JavascriptPlainObject* object) {
        auto plain_object = object->get_plain_object();

        auto fn = Napi::Function::New(context, function, name,
                                      static_cast<void*>(object));
        js::Object<VM>::set_property(context, plain_object, name, fn,
                                     PropertyAttributes::DontEnum);
    }

   public:
    ListenersForDictionary(Context _context) : context{_context} {}

    template <typename JavascriptPlainObject>
    void apply(JavascriptPlainObject* object) {
        add_javascript_function("addListener", add_listener(object), object);
        add_javascript_function("removeListener", remove_listener(), object);
        add_javascript_function("removeAllListeners", remove_all_listeners(object),
                                object);
    }
    template <typename JavascriptPlainObject>
    auto add_listener(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Context context = info.Env();
            auto collection = &object->get_data();
            auto plain_object = object->get_plain_object();

            ResultsClass<VM>::add_listener_v2(context, collection, plain_object,
                                              info);
            return Value::from_boolean(context, true);
        };
    }
    auto remove_listener() {
        return [](const Napi::CallbackInfo& info) {
            Context env = info.Env();
            return Value::from_boolean(env, true);
        };
    }
    template <typename JavascriptPlainObject>
    auto remove_all_listeners(JavascriptPlainObject* object) {
        return [=](const Napi::CallbackInfo& info) {
            Context env = info.Env();
            auto collection = &object->get_data();
            collection->remove_all_listeners();
            return Value::from_undefined(env);
        };
    }
};

template <typename VM>
class DictionaryAdapter {
   private:
    using ValueType = typename VM::Value;
    using Context = typename VM::Context;
    using Collection = CollectionAdapter<realm::object_store::Dictionary,
                                         typename VM::Function>;
    using JavascriptObject = JavascriptPlainObject<VM, Collection>;
    using DictionaryGetterSetter =
        AccessorsConfiguration<VM, AccessorsForDictionary<VM>>;

   public:
    ValueType wrap(Context context,
                   realm::object_store::Dictionary dictionary) {
        Collection collection{dictionary};
        JavascriptObject* javascript_object =
            new JavascriptObject(context, std::move(collection));

        javascript_object->template configure_object_destructor([=]() {
            /* GC will trigger this function, signaling that...
             * ...we can deallocate the attached C++ object.
             */
            delete javascript_object;
        });

        javascript_object->template add_feature<DictionaryGetterSetter>();
        javascript_object->template add_feature<ListenersForDictionary<VM>>();

        return javascript_object->get_object_with_accessors();
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_JS_DICTIONARY_HPP
