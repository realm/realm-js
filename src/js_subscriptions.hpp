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
#include "realm/sync/subscriptions.hpp"

#include <algorithm>
#include <stdexcept>

namespace realm {
namespace js {

template <typename T>
class Subscription : public realm::sync::Subscription {
public:
    Subscription(const realm::sync::Subscription& s)
        : realm::sync::Subscription(s)
    {
    }
};

template <typename T>
class SubscriptionClass : public ClassDefinition<T, Subscription<T>> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;

public:
    const std::string name = "Subscription";

    static ObjectType create_instance(ContextType, realm::sync::Subscription);

    static void get_created_at(ContextType, ObjectType, ReturnValue&);
    static void get_updated_at(ContextType, ObjectType, ReturnValue&);
    static void get_name(ContextType, ObjectType, ReturnValue&);
    static void get_object_type(ContextType, ObjectType, ReturnValue&);
    static void get_query_string(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"createdAt", {wrap<get_created_at>, nullptr}},
        {"updatedAt", {wrap<get_updated_at>, nullptr}},
        {"name", {wrap<get_name>, nullptr}},
        {"objectType", {wrap<get_object_type>, nullptr}},
        {"queryString", {wrap<get_query_string>, nullptr}},
    };
};

template <typename T>
typename T::Object SubscriptionClass<T>::create_instance(ContextType ctx, realm::sync::Subscription subscription)
{
    return create_object<T, SubscriptionClass<T>>(ctx, new Subscription<T>(std::move(subscription)));
}

/**
 * @brief Get the created date of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a Date containing the created date
 */
template <typename T>
void SubscriptionClass<T>::get_created_at(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(Object::create_date(ctx, sub->created_at().get_nanoseconds()));
}

/**
 * @brief Get the updated date of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a Date containing the updated date
 */
template <typename T>
void SubscriptionClass<T>::get_updated_at(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(Object::create_date(ctx, sub->updated_at().get_nanoseconds()));
}

/**
 * @brief Get the name of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a string containing the name, or null if the name is not set
 */
template <typename T>
void SubscriptionClass<T>::get_name(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    auto name = sub->name();

    if (name == "") {
        return_value.set_null();
    }
    else {
        return_value.set(std::string{name});
    }
}

/**
 * @brief Get the object type of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a string containing the object type
 */
template <typename T>
void SubscriptionClass<T>::get_object_type(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(std::string{sub->object_class_name()});
}

/**
 * @brief Get the query string of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a string containing the query string
 */
template <typename T>
void SubscriptionClass<T>::get_query_string(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(std::string{sub->query_string()});
}

template <typename T>
class Subscriptions : public realm::sync::SubscriptionSet {
public:
    Subscriptions(const realm::sync::SubscriptionSet& s)
        : realm::sync::SubscriptionSet(s)
    {
    }

    // Tracks whether the Subscriptions should be treated as mutable or not.
    // It should only be mutable when inside an `update` callback.
    bool is_mutable = false;
};

template <typename T>
class SubscriptionsClass : public ClassDefinition<T, Subscriptions<T>> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    const std::string name = "Subscriptions";
    using StateChangeHandler = void(StatusWith<realm::sync::SubscriptionSet::State> state);

    static ObjectType create_instance(ContextType, realm::sync::SubscriptionSet);

    static void get_empty(ContextType, ObjectType, ReturnValue&);
    static void get_state(ContextType, ObjectType, ReturnValue&);
    static void get_error(ContextType, ObjectType, ReturnValue&);
    static void get_version(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"empty", {wrap<get_empty>, nullptr}},
        {"state", {wrap<get_state>, nullptr}},
        {"error", {wrap<get_error>, nullptr}},
        {"version", {wrap<get_version>, nullptr}},
    };

    static void snapshot(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void find_by_name(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void find(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void update(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void wait_for_synchronization(ContextType, ObjectType, Arguments&, ReturnValue&);

    // Mutable-only methods
    static void add(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_by_name(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_subscription(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_all(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_by_object_type(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"snapshot", wrap<snapshot>},
        {"findByName", wrap<find_by_name>},
        {"find", wrap<find>},
        {"update", wrap<update>},
        {"_waitForSynchronization", wrap<wait_for_synchronization>},

        // Mutable-only methods
        {"add", wrap<add>},
        {"removeByName", wrap<remove_by_name>},
        {"remove", wrap<remove>},
        {"removeSubscription", wrap<remove_subscription>},
        {"removeAll", wrap<remove_all>},
        {"removeByObjectType", wrap<remove_by_object_type>},
    };
};

template <typename T>
typename T::Object SubscriptionsClass<T>::create_instance(ContextType ctx,
                                                          realm::sync::SubscriptionSet subscriptionSet)
{
    return create_object<T, SubscriptionsClass<T>>(ctx, new Subscriptions<T>(std::move(subscriptionSet)));
}

/**
 * @brief Get whether the subscriptions collection is empty or not
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a boolean containing the empty state
 */
template <typename T>
void SubscriptionsClass<T>::get_empty(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    return_value.set(subs->size() == 0);
}

/**
 * @brief Get the error string for the subscription set if any
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping the error string if any, or null if not
 */
template <typename T>
void SubscriptionsClass<T>::get_error(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    std::string error = subs->error_str();

    if (error == "") {
        return_value.set_null();
    }
    else {
        return_value.set(error);
    }
}

/**
 * @brief Get the current state of the subscription set
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a string representing the current state
 */
template <typename T>
void SubscriptionsClass<T>::get_state(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    switch (subs->state()) {
        case sync::SubscriptionSet::State::Uncommitted:
        case sync::SubscriptionSet::State::Pending:
        case sync::SubscriptionSet::State::Bootstrapping:
            return_value.set("pending");
            break;
        case sync::SubscriptionSet::State::Complete:
            return_value.set("complete");
            break;
        case sync::SubscriptionSet::State::Error:
            return_value.set("error");
            break;
        case sync::SubscriptionSet::State::Superceded:
            return_value.set("superceded");
            break;
        default:
            throw std::runtime_error("Unknown state in get_state()");
    }
}

/**
 * @brief Get the version of the subscription set
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a number representing the version
 */
template <typename T>
void SubscriptionsClass<T>::get_version(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    return_value.set((uint32_t)subs->version());
}

/**
 * @brief Get an array snapshot of the subscriptions in the subscription set
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref None
 * @param return_value \ref ReturnValue wrapping an array of Subscription instances
 */
template <typename T>
void SubscriptionsClass<T>::snapshot(ContextType ctx, ObjectType this_object, Arguments& args,
                                     ReturnValue& return_value)
{
    args.validate_count(0);

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);

    auto js_subs = std::vector<ValueType>();
    for (auto& sub : *subs) {
        js_subs.emplace_back(SubscriptionClass<T>::create_instance(ctx, sub));
    }

    auto subs_array = Object::create_array(ctx, js_subs);
    return_value.set(subs_array);
}

/**
 * @brief Find a subscription by name
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the subscription name to find
 * @param return_value \ref ReturnValue wrapping a Subscription if found, null if not
 */
template <typename T>
void SubscriptionsClass<T>::find_by_name(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
{
    args.validate_count(1);

    std::string name = Value::validated_to_string(ctx, args[0], "name");
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);

    auto it = subs->find(name);

    if (it != subs->end()) {
        auto sub = SubscriptionClass<T>::create_instance(ctx, *it);
        return_value.set(sub);
    }
    else {
        return_value.set_null();
    }
}

/**
 * @brief Find a subscription by query
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the query to find, represented as a Results instance
 * @param return_value \ref ReturnValue wrapping a Subscription if found, null if not
 */
template <typename T>
void SubscriptionsClass<T>::find(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    args.validate_count(1);

    auto results_arg = Value::validated_to_object(ctx, args[0], "query");
    if (!Object::template is_instance<ResultsClass<T>>(ctx, results_arg)) {
        throw std::runtime_error("Argument to 'findByName' must be a collection of Realm objects.");
    }

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    auto it = subs->find(query);

    if (it != subs->end()) {
        auto sub = SubscriptionClass<T>::create_instance(ctx, *it);
        return_value.set(sub);
    }
    else {
        return_value.set_null();
    }
}

/**
 * @brief Perform updates to the subscription set in a callback, returning the updated subscription set
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing a callback which receives a mutable version of
 * the subscription set as its argument, and which updates the subscription set as required
 * @param return_value \ref ReturnValue wrapping a new Subscriptions instance containing the updated
 * subscription set
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is mutable
 */
template <typename T>
void SubscriptionsClass<T>::update(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    args.validate_count(1);

    FunctionType callback = Value::validated_to_function(ctx, args[0], "callback");
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(js::Context<T>::get_global_context(ctx));

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);

    if (subs->is_mutable) {
        throw std::runtime_error("`update` cannot be called on a mutable subscription set.");
    }

    try {
        HANDLESCOPE(protected_ctx);

        // Create a mutable copy of this instance (which copies the original and upgrades
        // its internal transaction to a write transaction, so we can make updates to it -
        // SubscriptionSets are otherwise immutable) and mark it as "is_mutable" (so
        // that we can validate that we are allowed to call the mutable methods on it)
        auto mutable_subs = subs->make_mutable_copy();
        auto mutable_subs_js = SubscriptionsClass<T>::create_instance(ctx, mutable_subs);
        auto mutable_subs_js_internal = get_internal<T, SubscriptionsClass<T>>(ctx, mutable_subs_js);
        mutable_subs_js_internal->is_mutable = true;
        // get_internal<T, SubscriptionsClass<T>>(ctx, mutable_subs_js)->is_mutable = true;

        // Call the provided callback, passing in the mutable copy as an argument
        ValueType arguments[]{mutable_subs_js};
        auto const& callback_return =
            Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, arguments);

        // Commit the mutation, which downgrades its internal transaction to a read transaction
        // so no more changes can be made to it, and mark it as not "is_mutable"
        mutable_subs.commit();
        // get_internal<T, SubscriptionsClass<T>>(ctx, mutable_subs_js)->is_mutable = false;
        mutable_subs_js_internal->is_mutable = false;

        // Update this SubscriptionsClass instance to point to the copy we mutated (which is
        // no longer mutable), so that the JS instance points to the latest subscriptions
        set_internal<T, SubscriptionsClass<T>>(ctx, this_object, new Subscriptions<T>(std::move(mutable_subs)));
    }
    catch (...) {
        throw;
    }
}

/**
 * @brief Invoke a callback when the subscription set's state becomes "Complete". Will invoke it
 * immediately if the state is already "Complete".
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing a callback to be called when the state is "Complete"
 * @param return_value \ref None
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is mutable
 */
template <typename T>
void SubscriptionsClass<T>::wait_for_synchronization(ContextType ctx, ObjectType this_object, Arguments& args,
                                                     ReturnValue& return_value)
{
    args.validate_count(1);

    auto callback_function = Value::validated_to_function(ctx, args[0], "callback");

    Protected<FunctionType> protected_callback(ctx, callback_function);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);

    if (subs->is_mutable) {
        throw std::runtime_error("`waitForSynchronization` cannot be called on a mutable subscription set.");
    }

    std::function<StateChangeHandler> state_change_func;

    util::EventLoopDispatcher<StateChangeHandler> state_change_handler(
        [=](StatusWith<realm::sync::SubscriptionSet::State> state) {
            HANDLESCOPE(protected_ctx)
            ValueType arguments[]{Value::from_undefined(protected_ctx)};

            // TODO CRASH if we don't await
            // auto current_subs = get_internal<T, SubscriptionsClass<T>>(protected_ctx, protected_this);
            auto new_subs = subs->get_subscription_store()->get_by_version(subs->version());

            set_internal<T, SubscriptionsClass<T>>(protected_ctx, protected_this,
                                                   new Subscriptions<T>(std::move(new_subs)));

            Function<T>::callback(protected_ctx, protected_callback, protected_this, 1, arguments);
        });

    state_change_func = std::move(state_change_handler);

    subs->get_state_change_notification(realm::sync::SubscriptionSet::State::Complete).get_async(state_change_func);
}

/**
 * @brief Add a new subscription for a specified query to the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref Arguments structure:
 *   Argument 1: The query to subscribe to, represented as a Results instance
 *   Argument 2: Optional object of options:
 *     - "name" (optional): sets the subscription's name
 *     - "throwOnUpdate" (optional): if true, trying to add a subscription with the same name
 *        but different query will throw
 * @param return_value \ref ReturnValue wrapping a Subscription instance for the added subscription
 * @exception std::runtime_error Thrown if the first argument is not a valid Results instance
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::add(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    auto name_specified = false;
    std::string name;

    auto throw_on_update = false;

    args.validate_between(1, 2);

    auto results_arg = Value::validated_to_object(ctx, args[0], "results");
    if (!Object::template is_instance<ResultsClass<T>>(ctx, results_arg)) {
        throw std::runtime_error("Argument to 'add' must be a collection of Realm objects.");
    }

    if (args.count == 2 && !Value::is_undefined(ctx, args[1])) {
        auto options_arg = Value::validated_to_object(ctx, args[1], "options");

        auto name_option = Object::get_property(ctx, options_arg, "name");
        if (!Value::is_undefined(ctx, name_option)) {
            name = Object::validated_get_string(ctx, options_arg, "name", "name");
            name_specified = true;
        }

        auto throw_on_update_option = Object::get_property(ctx, options_arg, "throwOnUpdate");
        if (Value::is_boolean(ctx, throw_on_update_option)) {
            throw_on_update = Value::to_boolean(ctx, throw_on_update_option);
        }
    }

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be added inside an `update` callback.");
    }

    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    if (throw_on_update && name_specified) {
        auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
        auto existing_sub_it = subs->find(name);
        if (existing_sub_it != subs->end() && !(existing_sub_it->query_string() == query.get_description() &&
                                                existing_sub_it->object_class_name() == results->get_object_type())) {
            throw std::runtime_error(util::format(
                "A subscription with the name '%1' already exists but has a different query. If you meant to update "
                "it, remove `throwOnUpdate: true` from the subscription options.",
                name));
        }
    }

    auto&& [it, result] = name_specified ? subs->insert_or_assign(name, query) : subs->insert_or_assign(query);
    return_value.set(SubscriptionClass<T>::create_instance(ctx, *it));
}

/**
 * @brief Remove the subscription with the specified name from the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the name of the subscription to be removed
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::remove_by_name(ContextType ctx, ObjectType this_object, Arguments& args,
                                           ReturnValue& return_value)
{
    args.validate_count(1);

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be removed inside an `update` callback.");
    }

    args.validate_count(1);
    std::string name = Value::validated_to_string(ctx, args[0], "name");

    if (auto it = subs->find(name); it != subs->end()) {
        subs->erase(it);
        return_value.set(true);
    }
    else {
        return_value.set(false);
    }
}

/**
 * @brief Remove the subscription with the specified query from the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the query of the subscription to be removed, represented
 * as a Results instance
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 * @exception std::runtime_error Thrown if the argument is not a valid Results instance
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::remove(ContextType ctx, ObjectType this_object, Arguments& args,
                                   ReturnValue& return_value)
{
    args.validate_count(1);

    auto results_arg = Value::validated_to_object(ctx, args[0], "results");
    if (!Object::template is_instance<ResultsClass<T>>(ctx, results_arg)) {
        throw std::runtime_error("Argument to 'remove' must be a collection of Realm objects.");
    }

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be removed inside an `update` callback.");
    }

    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    auto it = subs->find(query);
    if (it != subs->end()) {
        subs->erase(it);
        return_value.set(true);
    }
    else {
        return_value.set(false);
    }
}

/**
 * @brief Remove the specified subscription from the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the Subscription instance to be removed
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 * @exception std::runtime_error Thrown if the argument is not a valid Subscription instance
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::remove_subscription(ContextType ctx, ObjectType this_object, Arguments& args,
                                                ReturnValue& return_value)
{
    args.validate_count(1);

    auto sub_arg = Value::validated_to_object(ctx, args[0], "subscription");
    if (!Object::template is_instance<SubscriptionClass<T>>(ctx, sub_arg)) {
        throw std::runtime_error("Argument to 'removeSubscription' must be a subscription.");
    }

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be removed inside an `update` callback.");
    }

    auto sub_to_remove = get_internal<T, SubscriptionClass<T>>(ctx, sub_arg);

    auto it = std::find_if(subs->begin(), subs->end(), [sub_to_remove](auto& sub) {
        return sub.id() == sub_to_remove->id();
    });

    if (it != subs->end()) {
        subs->erase(it);
        return_value.set(true);
    }
    else {
        return_value.set(false);
    }
}

/**
 * @brief Remove all subscriptions from the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref None
 * @param return_value \ref ReturnValue wrapping the number of subscriptions removed.
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::remove_all(ContextType ctx, ObjectType this_object, Arguments& args,
                                       ReturnValue& return_value)
{
    args.validate_count(0);

    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be removed inside an `update` callback.");
    }

    auto size = subs->size();
    subs->clear();
    return_value.set((uint32_t)size);
}

/**
 * @brief Remove all subscriptions with the specified object type from the subscription set.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the string object type to be removed
 * @param return_value \ref ReturnValue wrapping the number of subscriptions removed.
 * @exception std::runtime_error Thrown if the \ref SubscriptionsClass is not mutable (i.e. called outside
 * an `update` callback)
 */
template <typename T>
void SubscriptionsClass<T>::remove_by_object_type(ContextType ctx, ObjectType this_object, Arguments& args,
                                                  ReturnValue& return_value)
{
    args.validate_count(1);

    std::string object_type = Value::validated_to_string(ctx, args[0], "objectType");
    auto subs = get_internal<T, SubscriptionsClass<T>>(ctx, this_object);
    if (!subs->is_mutable) {
        throw std::runtime_error("Subscriptions can only be removed inside an `update` callback.");
    }

    size_t removed = 0;

    for (auto it = subs->begin(); it != subs->end();) {
        if (it->object_class_name() == object_type) {
            it = subs->erase(it);
            removed++;
        }
        else {
            it++;
        }
    }

    return_value.set((uint32_t)removed);
}


} // namespace js
} // namespace realm