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

template <typename JSEngine>
class NativeAccessor;

namespace dictionary {
/**
 * @brief Derive and apply property flags for \ref Dictionary.
 *
 * @param object_name Name of the Dictionary object (for error reporting purposes)
 * @param prop (mutable) Property object that will be changed to be correct for \ref Dictionary
 * @exception std::logic_error Thrown if the the prop argument contains an invalid property configuration
 */
inline static void derive_property_type(StringData const& object_name, Property& prop)
{
    using realm::PropertyType;

    if (prop.object_type == "bool") {
        prop.type |= PropertyType::Bool | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "int") {
        prop.type |= PropertyType::Int | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "float") {
        prop.type |= PropertyType::Float | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "double") {
        prop.type |= PropertyType::Double | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "string") {
        prop.type |= PropertyType::String | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "date") {
        prop.type |= PropertyType::Date | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "data") {
        prop.type |= PropertyType::Data | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "decimal128") {
        prop.type |= PropertyType::Decimal | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "objectId") {
        prop.type |= PropertyType::ObjectId | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "uuid") {
        prop.type |= PropertyType::UUID | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else if (prop.object_type == "mixed") {
        prop.type |= PropertyType::Mixed | PropertyType::Dictionary;
        prop.object_type = "";
    }
    else {
        if (is_nullable(prop.type)) {
            throw std::logic_error(
                util::format("Dictionary property '%1.%2' cannot be optional", object_name, prop.name));
        }
        if (is_array(prop.type)) {
            throw std::logic_error(
                util::format("Dictionary property '%1.%2' must have a non-list value type", object_name, prop.name));
        }
        prop.type = PropertyType::Object | PropertyType::Dictionary | PropertyType::Nullable;
    }
} // derive_property_type()

}; // namespace dictionary


template <typename T>
class Dictionary : public realm::object_store::Dictionary {
public:
    Dictionary(Dictionary const& dictionary)
        : realm::object_store::Dictionary(dictionary)
    {
    }
    Dictionary(const realm::object_store::Dictionary& dictionary)
        : realm::object_store::Dictionary(dictionary)
    {
    }
    Dictionary(Dictionary&&) = default;
    Dictionary& operator=(Dictionary&&) = default;
    Dictionary& operator=(Dictionary const&) = default;

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_listeners;
};

template <typename T>
struct DictionaryClass : ClassDefinition<T, realm::js::Dictionary<T>, CollectionClass<T>> {
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

    // methods
    static void getter(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void setter(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void has(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void keys(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set(ContextType, ObjectType, Arguments&, ReturnValue&);
    // observables
    static void add_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_all_listeners(ContextType, ObjectType, Arguments&, ReturnValue&);

    // helpers
    static ValueType create_dictionary_change_set(ContextType, DictionaryChangeSet const&);
    static void validate_value(ContextType, const realm::object_store::Dictionary&, ValueType);

    std::string const name = "Dictionary";

    MethodMap<T> const methods = {
        {"setter", wrap<setter>},
        {"getter", wrap<getter>},
        {"remove", wrap<remove>},
        {"_has", wrap<has>},
        {"_keys", wrap<keys>},
        {"set", wrap<set>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };
};

template <typename T>
typename T::Object DictionaryClass<T>::create_instance(ContextType ctx, realm::object_store::Dictionary dictionary)
{
    auto object = create_object<T, DictionaryClass<T>>(ctx, new realm::js::Dictionary<T>(std::move(dictionary)));

    ObjectType realm_constructor = Value::validated_to_object(ctx, Object::get_global(ctx, "Realm"));
    FunctionType realm_dictionary_proxy =
        Value::to_function(ctx, Object::get_property(ctx, realm_constructor, "DictionaryProxy"));
    ValueType arguments[] = {object};
    return Value::to_object(ctx, Function<T>::call(ctx, realm_dictionary_proxy, 1, arguments));
}

template <typename T>
void DictionaryClass<T>::validate_value(ContextType ctx, const realm::object_store::Dictionary& dictionary,
                                        ValueType value)
{
    auto type = dictionary.get_type();
    StringData object_type;
    if (type == realm::PropertyType::Object) {
        object_type = dictionary.get_object_schema().name;
    }
    if (!Value::is_valid_for_property_type(ctx, value, type, object_type)) {
        throw TypeErrorException("Property", object_type ? object_type : local_string_for_property_type(type),
                                 Value::to_string(ctx, value));
    }
}

template <typename T>
void DictionaryClass<T>::setter(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(2);

    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    std::string key = Value::validated_to_string(ctx, args[0]);
    validate_value(ctx, *dictionary, args[1]);

    NativeAccessor<T> accessor(ctx, *dictionary);
    dictionary->insert(accessor, key, args[1]);

    return_value.set(this_object);
}

template <typename T>
void DictionaryClass<T>::getter(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);

    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    if (Value::is_string(ctx, args[0])) {
        std::string key = Value::to_string(ctx, args[0]);
        if (dictionary->contains(key)) {
            NativeAccessor<T> accessor(ctx, *dictionary);
            return_value.set(dictionary->get(accessor, key));
        }
        else {
            return_value.set_undefined();
        }
    }
    else {
        return_value.set_undefined();
    }
}

template <typename T>
void DictionaryClass<T>::set(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);

    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    NativeAccessor<T> accessor(ctx, *dictionary);
    dictionary->assign(accessor, Value::validated_to_object(ctx, args[0]));

    return_value.set(this_object);
}

template <typename T>
void DictionaryClass<T>::remove(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);
    if (Value::is_string(ctx, args[0])) {
        std::string key = Value::to_string(ctx, args[0]);
        if (dictionary->contains(key)) {
            dictionary->erase(key);
        }
    }
    else if (Value::is_array(ctx, args[0])) {
        auto keys_as_array = Value::to_array(ctx, args[0]);
        uint32_t length = Object::validated_get_length(ctx, keys_as_array);
        for (uint32_t i = 0; i < length; i++) {
            auto key_as_value = Object::get_property(ctx, keys_as_array, i);
            std::string key = Value::validated_to_string(ctx, key_as_value);
            if (dictionary->contains(key)) {
                dictionary->erase(key);
            }
        }
    }
    else {
        throw std::invalid_argument("Argument must be string or array of strings");
    }

    return_value.set(this_object);
}

template <typename T>
void DictionaryClass<T>::has(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);
    std::string key = Value::validated_to_string(ctx, args[0]);
    return_value.set(dictionary->contains(key));
}

template <typename T>
void DictionaryClass<T>::keys(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(0);
    auto dictionary = *get_internal<T, DictionaryClass<T>>(ctx, this_object);

    std::vector<ValueType> key_vector;
    key_vector.reserve(dictionary.size());

    for (auto&& [k, v] : dictionary) {
        key_vector.push_back(Value::from_string(ctx, k.get_string()));
    }

    auto keys = Object::create_array(ctx, key_vector);
    return_value.set(keys);
}

template <typename T>
typename T::Value DictionaryClass<T>::create_dictionary_change_set(ContextType ctx,
                                                                   DictionaryChangeSet const& change_set)
{
    ObjectType object = Object::create_empty(ctx);
    std::vector<ValueType> scratch;

    scratch.reserve(
        std::max({change_set.deletions.size(), change_set.insertions.size(), change_set.modifications.size()}));
    auto make_object_array = [&](auto const& keys) {
        scratch.clear();
        for (auto mixed_item : keys) {
            scratch.push_back(Value::from_mixed(ctx, nullptr, mixed_item));
        }
        return Object::create_array(ctx, scratch);
    };

    return Object::create_obj(ctx, {
                                       {"deletions", make_object_array(change_set.deletions)},
                                       {"insertions", make_object_array(change_set.insertions)},
                                       {"modifications", make_object_array(change_set.modifications)},
                                   });
}

template <typename T>
void DictionaryClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments& args,
                                      ReturnValue& return_value)
{
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(1);
    auto callback = Value::validated_to_function(ctx, args[0]);
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));
    auto token = dictionary->add_key_based_notification_callback(
        [=](DictionaryChangeSet const& change_set, std::exception_ptr exception) {
            HANDLESCOPE(protected_ctx)

            ValueType arguments[]{DictionaryClass<T>::create_instance(protected_ctx, *dictionary),
                                  DictionaryClass<T>::create_dictionary_change_set(protected_ctx, change_set)};

            Function<T>::callback(protected_ctx, protected_callback, protected_this, 2, arguments);
        });
    dictionary->m_listeners.emplace_back(protected_callback, std::move(token));
}

template <typename T>
void DictionaryClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(1);
    auto callback = Value::validated_to_function(ctx, args[0]);
    auto protected_function =
        Protected<FunctionType>(ctx, callback); // Protecting for comparison, not to extend lifetime.

    auto& listeners = dictionary->m_listeners;
    auto compare = [&](auto&& func_and_tok) {
        return typename Protected<FunctionType>::Comparator()(func_and_tok.first, protected_function);
    };
    listeners.erase(std::remove_if(listeners.begin(), listeners.end(), compare), listeners.end());
}


template <typename T>
void DictionaryClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments& args,
                                              ReturnValue& return_value)
{
    auto dictionary = get_internal<T, DictionaryClass<T>>(ctx, this_object);

    args.validate_maximum(0);
    dictionary->m_listeners.clear();
}

} // namespace js
} // namespace realm
