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

namespace realm {
namespace js {
    template<typename> struct DictionaryClass;
}
}


#include "js_class.hpp"
#include "js_collection.hpp"
#include "js_object_accessor.hpp"
#include "js_realm_object.hpp"
#include "js_results.hpp"
#include "js_types.hpp"
#include "js_util.hpp"

#include <realm/object-store/shared_realm.hpp>
#include <realm/object-store/dictionary.hpp>

namespace realm {
namespace js {

template<typename JSEngine>
class NativeAccessor;

template<typename T>
class Dictionary : public realm::object_store::Dictionary {
public:
    Dictionary(Dictionary const& dictionary) : realm::object_store::Dictionary(dictionary) {}
    Dictionary(const realm::object_store::Dictionary &dictionary) : realm::object_store::Dictionary(dictionary) {}
    Dictionary(Dictionary&&) = default;
    Dictionary& operator=(Dictionary&&) = default;
    Dictionary& operator=(Dictionary const&) = default;

    SharedRealm realm() { return this->get_realm(); }

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
};

template<typename T>
struct DictionaryClass : ClassDefinition<T, realm::js::Dictionary<T>> {
    using Type = T;
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using String = js::String<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

    static ObjectType create_instance(ContextType, realm::object_store::Dictionary);

    // accessors
    static void get_property(ContextType, ObjectType, const String &, ReturnValue &);
    static bool set_property(ContextType, ObjectType, const String &, ValueType);
    static std::vector<String> get_keys(ContextType, ObjectType);

    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue &);

    // methods
    static void put(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void get(ContextType, ObjectType, Arguments &, ReturnValue &);

    // observables
    static void add_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_listener(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void remove_all_listeners(ContextType, ObjectType, Arguments &, ReturnValue &);

    // helpers
    static ValueType create_dictionary_change_set(ContextType, DictionaryChangeSet const &);
    static void validate_value(ContextType, realm::object_store::Dictionary &, ValueType);

    std::string const name = "Dictionary";

    const StringPropertyType<T> string_accessor = {
        wrap<get_property>,
        wrap<set_property>,
        wrap<get_keys>
    };

    MethodMap<T> const methods = {
        {"put", wrap<put>},
        {"get", wrap<get>},
        {"remove", wrap<remove>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };
};

template<typename T>
typename T::Object DictionaryClass<T>::create_instance(ContextType ctx, realm::object_store::Dictionary dictionary) {
    // return create_object<T, DictionaryClass<T>>(ctx, new realm::js::Dictionary<T>(std::move(dictionary)));
    std::vector<std::string> keys;

    for (auto i = 0; i < dictionary.get_keys().size(); ++i) {
        std::string key = dictionary.get_keys().get<StringData>(i);
        keys.push_back(key);
    }

    auto realm_constructor = Value::validated_to_object(ctx, Object::get_global(ctx, "Realm"));
    FunctionType constructor = Value::to_function(ctx, Object::get_property(ctx, realm_constructor, "Dictionary"));
    auto object = create_instance_by_keys<T, DictionaryClass<T>>(ctx, constructor, keys, new realm::js::Dictionary<T>(std::move(dictionary)));
    return object;
}

template<typename T>
void DictionaryClass<T>::validate_value(ContextType ctx, realm::object_store::Dictionary &dictionary, ValueType value) {
    auto type = dictionary.get_type();
    StringData object_type;
    if (type == realm::PropertyType::Object) {
        object_type = dictionary.get_object_schema().name;
    }
    if (!Value::is_valid_for_property_type(ctx, value, type, object_type)) {
        throw TypeErrorException("Property", object_type ? object_type : local_string_for_property_type(type), Value::to_string(ctx, value));
    }
}

template<typename T>
void DictionaryClass<T>::get_property(ContextType ctx, ObjectType this_object, const String &property_name, ReturnValue &return_value) {
    std::string key = property_name;
    std::cout << "FISK 1:" << key << "\n";
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    if (dictionary->contains(key)) {
        std::cout << "FISK 2\n";
        NativeAccessor<T> accessor(ctx, *dictionary);
        return_value.set(dictionary->get(accessor, key));
    }
    else {
        std::cout << "FISK 3\n";
        return_value.set(Value::from_undefined(ctx));
    }
}

template<typename T>
bool DictionaryClass<T>::set_property(ContextType ctx, ObjectType this_object, const String &property_name, ValueType value) {
    std::string key = property_name;
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    validate_value(ctx, *dictionary, value);
    NativeAccessor<T> accessor(ctx, *dictionary);
    dictionary->insert(accessor, key, value);
    return true;
}

template<typename T>
std::vector<String<T>> DictionaryClass<T>::get_keys(ContextType ctx, ObjectType object) {
    std::vector<String> names;
    return names;
}

template<typename T>
void DictionaryClass<T>::put(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(2);

    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    std::string key = Value::validated_to_string(ctx, args[0]);
    validate_value(ctx, *dictionary, args[1]);

    NativeAccessor<T> accessor(ctx, *dictionary);
    dictionary->insert(accessor, key, args[1]);

    return_value.set(this_object);
}

template<typename T>
void DictionaryClass<T>::get(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);

    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    std::string key = Value::validated_to_string(ctx, args[0]);

    NativeAccessor<T> accessor(ctx, *dictionary);
    return_value.set(dictionary->get(accessor, key));
}


template<typename T>
void DictionaryClass<T>::remove(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    args.validate_maximum(1);
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);
    std::string key = Value::validated_to_string(ctx, args[0]);
    dictionary->erase(key);
    return_value.set(this_object);
}

template<typename T>
typename T::Value DictionaryClass<T>::create_dictionary_change_set(ContextType ctx, DictionaryChangeSet const& change_set) {
    ObjectType object = Object::create_empty(ctx);
    std::vector<ValueType> scratch;

    auto make_object_array = [&](auto const& keys) {
        scratch.clear();
        scratch.reserve(keys.size());
        for (auto mixed_item : keys) {
            scratch.push_back(TypeMixed<T>::get_instance().wrap(ctx, mixed_item));
        }
        return Object::create_array(ctx, scratch);
    };

    int deleted_fields_size = static_cast<int>(change_set.deletions.size());
    Object::set_property(ctx, object, "deletions", Value::from_number(ctx, deleted_fields_size));
    Object::set_property(ctx, object, "insertions", make_object_array(change_set.insertions));
    Object::set_property(ctx, object, "modifications", make_object_array(change_set.modifications));

    return object;
}

template<typename T>
void DictionaryClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto dictionary = *get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(1);
    auto callback = Value::validated_to_function(ctx, args[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto token = dictionary.add_key_based_notification_callback([=](DictionaryChangeSet const& change_set, std::exception_ptr exception) {
            HANDLESCOPE(protected_ctx)
            ValueType arguments[] {
                static_cast<ObjectType>(protected_this),
                DictionaryClass<T>::create_dictionary_change_set(protected_ctx, change_set)
            };
            Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
        });
    dictionary.m_notification_tokens.emplace_back(protected_callback, std::move(token));
}

template<typename T>
void DictionaryClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto dictionary = *get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(1);
    auto callback = Value::validated_to_function(ctx, args[0]);
    auto protected_function = Protected<FunctionType>(ctx, callback);

    auto& tokens = dictionary.m_notification_tokens;
    auto compare = [&](auto&& token) {
        return typename Protected<FunctionType>::Comparator()(token.first, protected_function);
    };
    tokens.erase(std::remove_if(tokens.begin(), tokens.end(), compare), tokens.end());
}


template<typename T>
void DictionaryClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments &args, ReturnValue &return_value) {
    auto dictionary = *get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(0);
    dictionary.m_notification_tokens.clear();
}

} // js
} // realm