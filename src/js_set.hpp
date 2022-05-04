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

#include "js_collection.hpp"
#include "js_object_accessor.hpp"
#include "js_realm_object.hpp"
#include "js_results.hpp"
#include "js_types.hpp"
#include "js_util.hpp"
#include "js_notifications.hpp"

#include <realm/object-store/shared_realm.hpp>
#include <realm/object-store/set.hpp>
#include <realm/object-store/collection_notifications.hpp>

namespace realm {
namespace js {

template <typename JSEngine>
class NativeAccessor;

namespace set {
/**
 * @brief Derive and apply property flags for \ref Set.
 *
 * @param object_name Name of the Set object (for error reporting purposes)
 * @param prop (mutable) Property object that will be changed to be correct for \ref Set
 * @exception std::logic_error Thrown if the the prop argument contains an invalid property configuration
 */
inline static void derive_property_type(StringData const& object_name, Property& prop)
{
    using realm::PropertyType;

    if (prop.object_type == "bool") {
        prop.type |= PropertyType::Bool | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "int") {
        prop.type |= PropertyType::Int | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "float") {
        prop.type |= PropertyType::Float | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "double") {
        prop.type |= PropertyType::Double | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "string") {
        prop.type |= PropertyType::String | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "date") {
        prop.type |= PropertyType::Date | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "data") {
        prop.type |= PropertyType::Data | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "decimal128") {
        prop.type |= PropertyType::Decimal | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "objectId") {
        prop.type |= PropertyType::ObjectId | PropertyType::Set;
        prop.object_type = "";
    }
    else if (prop.object_type == "uuid") {
        prop.type |= PropertyType::UUID | PropertyType::Set;
        prop.object_type = "";
    }
    else {
        if (is_nullable(prop.type)) {
            throw std::logic_error(util::format("Set property '%1.%2' cannot be optional", object_name, prop.name));
        }
        if (is_array(prop.type)) {
            throw std::logic_error(
                util::format("Set property '%1.%2' must have a non-list value type", object_name, prop.name));
        }
        prop.type |= PropertyType::Object | PropertyType::Set;
    }
} // validated_property_type()

}; // namespace set

/**
 * @brief Glue class that provides an interface between \ref SetClass and \ref realm::object_store::Set
 *
 *  The Set class itself is an internal glue that delegates operations from \ref SetClass to
 *  \ref realm::object_store::Set.  It is used by Realm-JS's object management system, and it
 *  not meant to be instantiated directly.
 *
 * @tparam T The type of the elements that the Set will hold.  Inherited from \ref SetClass
 */
template <typename T>
class Set : public realm::object_store::Set {
public:
    Set(const realm::object_store::Set& set)
        : realm::object_store::Set(set)
    {
    }
    void derive_property_type(StringData const& object_name, Property& prop) const;

    notifications::NotificationHandle<T, NotificationToken> m_notification_handle;
};


/**
 * @brief Implementation class for JavaScript's
 * [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) class
 *
 * @tparam T The type of the elements that the SetClass will hold.
 */
template <typename T>
struct SetClass : ClassDefinition<T, realm::js::Set<T>, CollectionClass<T>> {
    using Type = T;                          ///< type of the elements that the SetClass holds
    using ContextType = typename T::Context; ///< JS context type
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using FunctionType = typename T::Function;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;
    using NotificationBucket = notifications::NotificationBucket<T, NotificationToken>;

    static ObjectType create_instance(ContextType, realm::object_store::Set);

    // properties
    static void get_size(ContextType, ObjectType, ReturnValue&);
    static void get_optional(ContextType, ObjectType, ReturnValue&);
    static void get_indexed(ContextType, ObjectType, uint32_t, ReturnValue&);
    static void get_type(ContextType, ObjectType, ReturnValue&);

    // methods
    static void add(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void get(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void clear(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void delete_element(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void has(ContextType, ObjectType, Arguments&, ReturnValue&);


    static void filtered(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void snapshot(ContextType, ObjectType, Arguments&, ReturnValue&);

    // observable
    static void add_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_listener(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_all_listeners(ContextType, ObjectType, Arguments&, ReturnValue&);

    std::string const name = "Set";

    MethodMap<T> const methods = {
        {"add", wrap<add>},
        {"clear", wrap<clear>},
        {"delete", wrap<delete_element>},
        {"has", wrap<has>},
        {"filtered", wrap<filtered>},

        {"min", wrap<compute_aggregate_on_collection<SetClass<T>, AggregateFunc::Min>>},
        {"max", wrap<compute_aggregate_on_collection<SetClass<T>, AggregateFunc::Max>>},
        {"sum", wrap<compute_aggregate_on_collection<SetClass<T>, AggregateFunc::Sum>>},
        {"avg", wrap<compute_aggregate_on_collection<SetClass<T>, AggregateFunc::Avg>>},


        {"snapshot", wrap<snapshot>},
        {"addListener", wrap<add_listener>},
        {"removeListener", wrap<remove_listener>},
        {"removeAllListeners", wrap<remove_all_listeners>},
    };

    PropertyMap<T> const properties = {
        {"size", {wrap<get_size>, nullptr}},
        {"type", {wrap<get_type>, nullptr}},
        {"optional", {wrap<get_optional>, nullptr}},
    };

    IndexPropertyType<T> const index_accessor = {nullptr, nullptr};

private:
    static void validate_value(ContextType, realm::object_store::Set&, ValueType);
};

template <typename T>
typename T::Object SetClass<T>::create_instance(ContextType ctx, realm::object_store::Set set)
{
    return create_object<T, SetClass<T>>(ctx, new realm::js::Set<T>(std::move(set)));
}


/**
 * @brief Implements JavaScript Set's `.size` property
 *
 *  Returns the number of elements in the SetClass.
 *  See [MDN's reference
 * documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/size)
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SetClass itself
 * @param return_value \ref ReturnValue wrapping an integer that gives the number of elements in the set to return to
 * the JS context
 */
template <typename T>
void SetClass<T>::get_size(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto set = get_internal<T, SetClass<T>>(ctx, object);
    return_value.set(static_cast<uint32_t>(set->size()));
}


/**
 * @brief Accessor for elements at a given index in the set.
 *
 *  For internal use only!
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SetClass itself
 * @param index Index of the element to retrieve
 * @param return_value \ref ReturnValue wrapping an integer that gives the number of elements in the set to return to
 * the JS context
 */
template <typename T>
void SetClass<T>::get_indexed(ContextType ctx, ObjectType object, uint32_t index, ReturnValue& return_value)
{
    auto set = get_internal<T, SetClass<T>>(ctx, object);
    NativeAccessor<T> accessor(ctx, *set);
    return_value.set(set->get(accessor, index));
}


/**
 * @brief Check whether the Set's element type is marked as optional (`nullable`)
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SetClass itself
 * @param return_value \ref ReturnValue wrapping a boolean that is true if the Set's element type is nullable, false
 * otherwise
 */
template <typename T>
void SetClass<T>::get_optional(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto set = get_internal<T, SetClass<T>>(ctx, object);
    return_value.set(is_nullable(set->get_type()));
}


/**
 * @brief Implements JavaScript Set's add() method
 *
 *  Adds a single element, `A`, of type `T` to the set.  `A` will not be added if it
 *  already exists within the SetClass.
 *  See [MDN's reference
 * documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/add).
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args \ref Arguments structure containing a single new element of type `T` to add to the Set
 * @param return_value \ref ReturnValue wrapping the Set itself, including the newly added element to return to the JS
 * context
 */
template <typename T>
void SetClass<T>::add(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);

    for (size_t i = 0; i < args.count; i++) {
        validate_value(ctx, *set, args[i]);
    }

    NativeAccessor<T> accessor(ctx, *set);
    for (size_t i = 0; i < args.count; i++) {
        set->insert(accessor, args[i]);
    }

    return_value.set(this_object);
}


/**
 * @brief Index-based accessing to the Set
 *
 *  Returns a single element found at the given index
 *  For internal use only!
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args \ref Arguments structure containing a single integer
 * @param return_value \ref ReturnValue wrapping a `Mixed<T>` object, wrapping the found element to return to the JS
 * context
 */
template <typename T>
void SetClass<T>::get(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);

    if (!Value::is_number(ctx, args[0])) {
        throw std::invalid_argument("Argument to get() must be a number.");
    }

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    NativeAccessor<T> accessor(ctx, *set);
    auto const value_type = set->get_type();

    switch_on_type(value_type, [&](auto const type_indicator) -> void {
        using element_type = std::remove_pointer_t<decltype(type_indicator)>;
        int requested_index = Value::validated_to_number(ctx, args[0]);
        realm::Mixed element_value =
            set->template get<std::remove_pointer_t<decltype(type_indicator)>>(requested_index);
        return_value.set(element_value);
    });
}


/**
 * @brief Implements JavaScript Set's `clear()` method.  Removes all elements from the set.
 *
 *  Empties the set, removing all elements.
 *  Returns `undefined` to the JS context.
 *  See [MDN's reference
 * documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/clear).
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args Empty \ref Arguments structure
 * @param return_value \ref ReturnValue wrapping `undefined` to return to the JS context
 */
template <typename T>
void SetClass<T>::clear(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(0);

    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    set->remove_all();
    return_value.set_undefined();
}


/**
 * @brief Implements JavaScript Set's `delete()` method.  Removes a single element from the set.
 *
 *  Attempts to remove the given element from the set.
 *  Returns `true` if the element was present, `false` otherwise.
 *  See [MDN's reference
 * documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/delete).
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args \ref Arguments structure containing a single element to remove
 * @param return_value \ref ReturnValue wrapping the value to return to the JS context
 */
template <typename T>
void SetClass<T>::delete_element(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);

    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    auto const index = args[0];

    validate_value(ctx, *set, index);
    NativeAccessor<T> accessor(ctx, *set);
    std::pair<size_t, bool> const success = set->remove(accessor, index);

    return_value.set(success.second);
}


/**
 * @brief Implements JavaScript Set's has() method.
 *
 *   has() checks whether the given element exists in the set.
 *   Sets return_value to true if the element is found, false otherwise.
 *   See [MDN's reference
 * documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has).
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args \ref Arguments structure containing a single element of type `T` to search for
 * @param return_value \ref ReturnValue wrapping the value to return to the JS context
 */
template <typename T>
void SetClass<T>::has(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(1);

    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    auto const value = args[0];

    validate_value(ctx, *set, value);
    NativeAccessor<T> accessor(ctx, *set);

    // set->find will return npos if the element is not found
    size_t const index = set->find(accessor, value);
    return_value.set(index != npos);
}


/**
 * @brief Creates a \ref ResultClass containing a subset of the set's elements
 *
 *  Applies a filter to the elements in the SetClass and returns the elements that match the filter.
 *  Filters are only supported for sets of objects.
 *  Will throw `std::runtime_error` if the Set's element type is not objects.
 *
 * @param this_object \ref ObjectType wrapping the SetClass itself
 * @param args \ref Arguments structure containing the filter that will be applied to the SetClass
 * @param return_value \ref ReturnValue wrapping a \ref ResultClass containing matching objects to return to the JS
 * context
 * @exception std::runtime_error Thrown if the \ref SetClass does not contain objects
 */
template <typename T>
void SetClass<T>::filtered(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    auto const set = get_internal<T, SetClass<T>>(ctx, this_object);
    return_value.set(ResultsClass<T>::create_filtered(ctx, *set, args));
}


/**
 * @brief Return a textual description of the value element type for the given set
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SetClass itself
 * @param return_value \ref ReturnValue wrapping a static `const char *` descriping the set's element type
 */
template <typename T>
void SetClass<T>::get_type(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto const set = get_internal<T, ListClass<T>>(ctx, object);
    return_value.set(local_string_for_property_type(set->get_type() & ~realm::PropertyType::Flags));
}


/**
 * @brief Utility function that validates that elements of a given type is eligible for insertion into the set
 *
 *  Checks whether a given value type is legal for the given SetClass.
 *  Throws \ref TypeErrorException if the value is not legal.
 *
 * @param ctx JS context
 * @param set \ref realm::object_store::Set that contains the valid value type
 * @param value \ref ValueType that is to be checked whether it is valid for the set
 * @exception TypeErrorException Thrown if `value` is not valid for the set
 */
template <typename T>
void SetClass<T>::validate_value(ContextType ctx, realm::object_store::Set& set, ValueType value)
{
    auto type = set.get_type();
    StringData object_type;
    if (type == realm::PropertyType::Object) {
        object_type = set.get_object_schema().name;
    }
    if (!Value::is_valid_for_property_type(ctx, value, type, object_type)) {
        throw TypeErrorException("Property", object_type ? object_type : local_string_for_property_type(type),
                                 Value::to_string(ctx, value));
    }
}


/**
 * @brief Create a snapshot of the Set in the Realm database
 *
 * @param ctx JS context
 * @param set \ref realm::object_store::Set that contains the valid value type
 * @param value \ref ValueType that is to be checked whether it is valid for the set
 * @param args None -- must be empty
 * @param return_value \ref ReturnValue wrapping a new Set instance created by the snapshot
 */
template <typename T>
void SetClass<T>::snapshot(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_maximum(0);
    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    return_value.set(ResultsClass<T>::create_instance(ctx, set->snapshot()));
}


/**
 * @brief Add a new listener on the Set
 *
 * @param ctx JS context
 * @param set \ref realm::object_store::Set that contains the valid value type
 * @param args A single argument containing a callback function
 * @param return_value None
 */
template <typename T>
void SetClass<T>::add_listener(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    // args is validated by ResultClass
    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    ResultsClass<T>::add_listener(ctx, *set, this_object, args);
}


/**
 * @brief Remove a listener that was previously registered on the Set
 *
 * @param ctx JS context
 * @param set \ref realm::object_store::Set that contains the valid value type
 * @param args A single argument containing the callback function of the previously-registered listener
 * @param return_value None
 */
template <typename T>
void SetClass<T>::remove_listener(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    // args is validated by ResultClass
    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    ResultsClass<T>::remove_listener(ctx, *set, this_object, args);
}


/**
 * @brief Remove all listeners registered on the Set
 *
 * @param ctx JS context
 * @param set \ref realm::object_store::Set that contains the valid value type
 * @param args None
 * @param return_value None
 */
template <typename T>
void SetClass<T>::remove_all_listeners(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_maximum(0);
    auto set = get_internal<T, SetClass<T>>(ctx, this_object);
    NotificationBucket::erase(set->m_notification_handle);
}

} // namespace js
} // namespace realm
