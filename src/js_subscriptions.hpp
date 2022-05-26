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
#include "js_util.hpp"
#include "realm/object-store/sync/sync_session.hpp"
#include "realm/sync/subscriptions.hpp"

#include <algorithm>
#include <memory>
#include <stdexcept>

namespace realm {
namespace js {


/**
 * @brief Wrapper class for a single flexible sync subscription
 */
template <typename T>
class Subscription : public realm::sync::Subscription {
public:
    Subscription(const realm::sync::Subscription& s)
        : realm::sync::Subscription(s)
    {
    }
};

/**
 * @brief Class representing a single flexible sync subscription
 */
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

    static void get_id(ContextType, ObjectType, ReturnValue&);
    static void get_created_at(ContextType, ObjectType, ReturnValue&);
    static void get_updated_at(ContextType, ObjectType, ReturnValue&);
    static void get_name(ContextType, ObjectType, ReturnValue&);
    static void get_object_type(ContextType, ObjectType, ReturnValue&);
    static void get_query_string(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"id", {wrap<get_id>, nullptr}},
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
 * @brief Get the ID of the subscription
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a ObjectId containing the ID
 */
template <typename T>
void SubscriptionClass<T>::get_id(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(sub->id());
}

/**
 * @brief Get the created date of the subscription
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the Subscription
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
 * @param this_object \ref ObjectType wrapping the Subscription
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
 * @param this_object \ref ObjectType wrapping the Subscription
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
 * @param this_object \ref ObjectType wrapping the Subscription
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
 * @param this_object \ref ObjectType wrapping the Subscription
 * @param return_value \ref ReturnValue wrapping a string containing the query string
 */
template <typename T>
void SubscriptionClass<T>::get_query_string(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, this_object);
    return_value.set(std::string{sub->query_string()});
}

/**
 * @brief Wrapper class for a flexible sync SubscriptionSet
 */
template <typename T>
class SubscriptionSet : public realm::sync::SubscriptionSet {
public:
    SubscriptionSet(const realm::sync::SubscriptionSet& s, const std::weak_ptr<SyncSession> ss)
        : realm::sync::SubscriptionSet(s)
        , sync_session(ss)
    {
    }

    // Hold a weak_ptr to the SyncSession so we can check if it still exists in the
    // wait_for_synchronization callback
    std::weak_ptr<SyncSession> sync_session;
};

/**
 * @brief Class representing a flexible sync SubcriptionSet
 */
template <typename T>
class SubscriptionSetClass : public ClassDefinition<T, SubscriptionSet<T>> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    const std::string name = "SubscriptionSet";
    using StateChangeHandler = void(StatusWith<realm::sync::SubscriptionSet::State> state);

    static ObjectType create_instance(ContextType, realm::sync::SubscriptionSet, std::shared_ptr<SyncSession>);

    static void get_empty(ContextType, ObjectType, ReturnValue&);
    static void get_state(ContextType, ObjectType, ReturnValue&);
    static void get_error(ContextType, ObjectType, ReturnValue&);
    static void get_version(ContextType, ObjectType, ReturnValue&);
    static void get_index(ContextType, ObjectType, uint32_t, ReturnValue&);
    static void get_length(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"isEmpty", {wrap<get_empty>, nullptr}}, {"state", {wrap<get_state>, nullptr}},
        {"error", {wrap<get_error>, nullptr}},   {"version", {wrap<get_version>, nullptr}},
        {"length", {wrap<get_length>, nullptr}},
    };

    static void find_by_name(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void find_by_query(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void update(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void wait_for_synchronization(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"findByName", wrap<find_by_name>},
        {"findByQuery", wrap<find_by_query>},
        {"_update", wrap<update>},
        {"_waitForSynchronization", wrap<wait_for_synchronization>},
    };

    IndexPropertyType<T> const index_accessor = {wrap<get_index>, nullptr};

private:
    static void wait_for_synchronization_impl(ContextType, ObjectType, FunctionType);
};

template <typename T>
typename T::Object SubscriptionSetClass<T>::create_instance(ContextType ctx,
                                                            realm::sync::SubscriptionSet subscription_set,
                                                            std::shared_ptr<SyncSession> sync_session)
{
    return create_object<T, SubscriptionSetClass<T>>(
        ctx, new SubscriptionSet<T>(std::move(subscription_set), sync_session));
}

/**
 * @brief Get whether the SubscriptionSet is empty or not
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a boolean containing the empty state
 */
template <typename T>
void SubscriptionSetClass<T>::get_empty(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    return_value.set(subs->size() == 0);
}

/**
 * @brief Get the error string for the SubscriptionSet, if any
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping the error string if it exists, or null if not
 */
template <typename T>
void SubscriptionSetClass<T>::get_error(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    std::string error = subs->error_str();

    if (error == "") {
        return_value.set_null();
    }
    else {
        return_value.set(error);
    }
}

/**
 * @brief Get the current state of the SubscriptionSet
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a string representing the current state
 * @exception abnormal program termination (std::abort) if an unknown state is encountered
 */
template <typename T>
void SubscriptionSetClass<T>::get_state(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
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
        case sync::SubscriptionSet::State::Superseded:
            return_value.set("superseded");
            break;
        default:
            REALM_UNREACHABLE();
    }
}

/**
 * @brief Get the version of the SubscriptionSet
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping a number representing the version
 */
template <typename T>
void SubscriptionSetClass<T>::get_version(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    return_value.set((uint32_t)subs->version());
}

/**
 * @brief
 *
 * @tparam T
 * @param ctx
 * @param this_object
 * @param index
 * @param return_value
 */
template <typename T>
void SubscriptionSetClass<T>::get_index(ContextType ctx, ObjectType this_object, uint32_t index,
                                        ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    return_value.set(SubscriptionClass<T>::create_instance(ctx, subs->at(index)));
}

/**
 * @brief
 *
 * @tparam T
 * @param ctx
 * @param this_object
 * @param return_value
 */
template <typename T>
void SubscriptionSetClass<T>::get_length(ContextType ctx, ObjectType this_object, ReturnValue& return_value)
{
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    return_value.set((uint32_t)subs->size());
}

/**
 * @brief Find a subscription by name
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the subscription name to find
 * @param return_value \ref ReturnValue wrapping a Subscription if found, null if not
 */
template <typename T>
void SubscriptionSetClass<T>::find_by_name(ContextType ctx, ObjectType this_object, Arguments& args,
                                           ReturnValue& return_value)
{
    args.validate_count(1);

    std::string name = Value::validated_to_string(ctx, args[0], "name");
    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);

    auto it = subs->find(name);

    if (it == subs->end()) {
        return_value.set_null();
    }
    else {
        auto sub = SubscriptionClass<T>::create_instance(ctx, *it);
        return_value.set(sub);
    }
}

/**
 * @brief Find a subscription by query
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing the query to find, represented as a Results instance
 * @param return_value \ref ReturnValue wrapping a Subscription if found, null if not
 * @exception std::runtime_error if the argument is not a Results instance
 */
template <typename T>
void SubscriptionSetClass<T>::find_by_query(ContextType ctx, ObjectType this_object, Arguments& args,
                                            ReturnValue& return_value)
{
    args.validate_count(1);

    auto results_arg = Value::validated_to_object(ctx, args[0], "query");
    if (!Object::template is_instance<ResultsClass<T>>(ctx, results_arg)) {
        throw std::runtime_error("Argument to 'findByName' must be a collection of Realm objects.");
    }

    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);
    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    auto it = subs->find(query);

    if (it == subs->end()) {
        return_value.set_null();
    }
    else {
        auto sub = SubscriptionClass<T>::create_instance(ctx, *it);
        return_value.set(sub);
    }
}

/**
 * @brief See `wait_for_synchronization_impl`
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref A single argument containing a callback to be called when the state is "Complete" or "Error"
 * @param return_value \ref None
 */
template <typename T>
void SubscriptionSetClass<T>::wait_for_synchronization(ContextType ctx, ObjectType this_object, Arguments& args,
                                                       ReturnValue& return_value)
{
    args.validate_count(1);
    auto callback = Value::validated_to_function(ctx, args[0], "callback");

    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(Context<T>::get_global_context(ctx));

    SubscriptionSetClass<T>::wait_for_synchronization_impl(protected_ctx, protected_this, protected_callback);
}

/**
 * @brief Invoke a callback when the SubscriptionSet's state becomes "Complete" or "Error".
 * Will invoke it immediately if the state is already "Complete". Will return an error to
 * the callback if the state is or becomes "Error", or if it is called on before creating
 * any subscriptions.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param callback \ref Callback function to be invoked when the state is "Complete" or "Error"
 */
template <typename T>
void SubscriptionSetClass<T>::wait_for_synchronization_impl(ContextType ctx, ObjectType this_object,
                                                            FunctionType callback)
{
    Protected<FunctionType> protected_callback(ctx, callback);
    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(js::Context<T>::get_global_context(ctx));

    auto subs = get_internal<T, SubscriptionSetClass<T>>(protected_ctx, protected_this);

    // Hold a weak_ptr to the SyncSession, so we can check if it still exists when our callback fires
    // – if the Realm has gone out of scope and been garbage collected by the time the callback fires
    // (which happens in tests), we get a crash otherwise
    std::weak_ptr<SyncSession> sync_session = subs->sync_session;

    std::function<StateChangeHandler> state_change_func;

    util::EventLoopDispatcher<StateChangeHandler> state_change_handler(
        [=](StatusWith<realm::sync::SubscriptionSet::State> state) {
            HANDLESCOPE(protected_ctx)

            // If the SyncSession has already closed, don't do anything as we will crash
            if (sync_session.lock()) {
                auto current_subs = get_internal<T, SubscriptionSetClass<T>>(protected_ctx, protected_this);
                current_subs->refresh();

                auto result = state.is_ok() ? Value::from_undefined(protected_ctx)
                                            : make_js_error<T>(protected_ctx, state.get_status().reason());

                Function<T>::callback(protected_ctx, protected_callback, protected_this, {result});
            }
            else {
                auto error = make_js_error<T>(
                    protected_ctx, "`waitForSynchronisation` resolved after the `subscriptions` went out of scope");
                Function<T>::callback(protected_ctx, protected_callback, protected_this, {error});
            }
        });

    state_change_func = std::move(state_change_handler);

    try {
        subs->get_state_change_notification(realm::sync::SubscriptionSet::State::Complete)
            .get_async(state_change_func);
    }
    catch (KeyNotFound const& ex) {
        // TODO Waiting on https://github.com/realm/realm-core/issues/5165 to remove this
        auto error = make_js_error<T>(
            ctx, "`waitForSynchronisation` cannot be called before creating a SubscriptionSet using `update`");
        Function<T>::callback(protected_ctx, protected_callback, protected_this, {error});
    }
}

/**
 * @brief Class wrapping a MutableSubscriptionSet.
 */
template <typename T>
class MutableSubscriptionSet : public realm::sync::MutableSubscriptionSet {
public:
    MutableSubscriptionSet(const realm::sync::MutableSubscriptionSet s)
        : realm::sync::MutableSubscriptionSet(s)
    {
    }
};

/**
 * @brief Class representing mutable version of a given SubscriptionSet.
 *
 * @note This is not modelled as an inheritance relationship in JS (using the third
 * ClassDefinition template arg to set the parent), because we are not exposing all
 * the methods of SubscriptionSet, so it is not strictly inheritance.
 */
template <typename T>
class MutableSubscriptionSetClass : public ClassDefinition<T, MutableSubscriptionSet<T>> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    const std::string name = "MutableSubscriptionSet";

    static ObjectType create_instance(ContextType, realm::sync::MutableSubscriptionSet);

    PropertyMap<T> const properties = {
        {"empty", {wrap<SubscriptionSetClass<T>::get_empty>, nullptr}},
        {"state", {wrap<SubscriptionSetClass<T>::get_state>, nullptr}},
        {"error", {wrap<SubscriptionSetClass<T>::get_error>, nullptr}},
        {"version", {wrap<SubscriptionSetClass<T>::get_version>, nullptr}},
        {"length", {wrap<SubscriptionSetClass<T>::get_length>, nullptr}},
    };

    static void add(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_by_name(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_subscription(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_all(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void remove_by_object_type(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const methods = {
        {"findByName", wrap<SubscriptionSetClass<T>::find_by_name>},
        {"findByQuery", wrap<SubscriptionSetClass<T>::find_by_query>},

        // Mutable-only methods
        {"_add", wrap<add>},
        {"removeByName", wrap<remove_by_name>},
        {"_remove", wrap<remove>},
        {"removeSubscription", wrap<remove_subscription>},
        {"removeAll", wrap<remove_all>},
        {"removeByObjectType", wrap<remove_by_object_type>},
    };

    IndexPropertyType<T> const index_accessor = {wrap<SubscriptionSetClass<T>::get_index>, nullptr};
};

template <typename T>
typename T::Object
MutableSubscriptionSetClass<T>::create_instance(ContextType ctx, realm::sync::MutableSubscriptionSet subscriptionSet)
{
    return create_object<T, MutableSubscriptionSetClass<T>>(
        ctx, new MutableSubscriptionSet<T>(std::move(subscriptionSet)));
}

/**
 * @brief Perform updates to the SubscriptionSet in a callback, then update this instance
 * to point to the updated SubscriptionSet.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the SubscriptionSet
 * @param args \ref Arguments structure:
 *   Argument 1: A callback which receives a mutable version of the SubscriptionSet as its
 *     argument, and which updates the SubscriptionSet as required
 *   Argument 2: A callback to be called when the state of the SubscriptionSet is "Complete"
 *      or "Error" after the update has been applied (see `wait_for_synchronization_impl`).
 * @param return_value \ref Returns the return value of the update callback
 *
 * TODO handle async callbacks
 */
template <typename T>
void SubscriptionSetClass<T>::update(ContextType ctx, ObjectType this_object, Arguments& args,
                                     ReturnValue& return_value)
{
    args.validate_count(2);

    FunctionType update_callback = Value::validated_to_function(ctx, args[0], "update callback");
    FunctionType completion_callback = Value::validated_to_function(ctx, args[1], "completion callback");

    Protected<FunctionType> protected_update_callback(ctx, update_callback);
    Protected<FunctionType> protected_completion_callback(ctx, completion_callback);

    Protected<ObjectType> protected_this(ctx, this_object);
    Protected<typename T::GlobalContext> protected_ctx(js::Context<T>::get_global_context(ctx));

    auto subs = get_internal<T, SubscriptionSetClass<T>>(ctx, this_object);

    // Create a mutable copy of this instance (which copies the original and upgrades
    // its internal transaction to a write transaction, so we can make updates to it -
    // SubscriptionSets are otherwise immutable)
    auto mutable_subs_js = MutableSubscriptionSetClass<T>::create_instance(ctx, subs->make_mutable_copy());
    auto mutable_subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, mutable_subs_js);

    // Call the provided callback, passing in the mutable copy as an argument,
    // and return its return value
    ValueType arguments[]{mutable_subs_js};
    auto const& callback_return =
        Function<T>::callback(protected_ctx, protected_update_callback, protected_this, 1, arguments);

    // Commit the mutation, which downgrades its internal transaction to a read transaction
    // so no more changes can be made to it, and returns a new (immutable) SubscriptionSet
    // with the changes we made
    auto new_sub_set = std::move(*mutable_subs).commit();

    // Update this SubscriptionSetClass instance to point to the updated version
    set_internal<T, SubscriptionSetClass<T>>(ctx, this_object,
                                             new SubscriptionSet<T>(std::move(new_sub_set), subs->sync_session));

    // Asynchronously wait for the SubscriptionSet to be synchronised
    SubscriptionSetClass<T>::wait_for_synchronization_impl(protected_ctx, protected_this,
                                                           protected_completion_callback);
}

/**
 * @brief Add a new subscription for a specified query to the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref Arguments structure:
 *   Argument 1: The query to subscribe to, represented as a Results instance
 *   Argument 2: Optional object of options:
 *     - "name" (optional): sets the subscription's name
 *     - "throwOnUpdate" (optional): if true, trying to add a subscription with the same name
 *        but different query will throw
 * @param return_value \ref ReturnValue wrapping a Subscription instance for the added subscription
 * @exception std::runtime_error Thrown if the first argument is not a valid Results instance
 */
template <typename T>
void MutableSubscriptionSetClass<T>::add(ContextType ctx, ObjectType this_object, Arguments& args,
                                         ReturnValue& return_value)
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

    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    if (throw_on_update && name_specified) {
        auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);
        auto existing_sub_it = subs->find(name);
        if (existing_sub_it != subs->end() && !(existing_sub_it->query_string() == query.get_description() &&
                                                existing_sub_it->object_class_name() == results->get_object_type())) {
            throw std::runtime_error(
                util::format("A subscription with the name '%1' already exists but has a different query. If you "
                             "meant to update it, remove `throwOnUpdate: true` from the subscription options.",
                             name));
        }
    }

    auto&& [it, result] = name_specified ? subs->insert_or_assign(name, query) : subs->insert_or_assign(query);
    return_value.set(SubscriptionClass<T>::create_instance(ctx, *it));
}

/**
 * @brief Remove the subscription with the specified name from the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref A single argument containing the name of the subscription to be removed
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 */
template <typename T>
void MutableSubscriptionSetClass<T>::remove_by_name(ContextType ctx, ObjectType this_object, Arguments& args,
                                                    ReturnValue& return_value)
{
    args.validate_count(1);

    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

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
 * @brief Remove the subscription with the specified query from the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref A single argument containing the query of the subscription to be removed, represented
 * as a Results instance
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 * @exception std::runtime_error Thrown if the argument is not a valid Results instance
 */
template <typename T>
void MutableSubscriptionSetClass<T>::remove(ContextType ctx, ObjectType this_object, Arguments& args,
                                            ReturnValue& return_value)
{
    args.validate_count(1);

    auto results_arg = Value::validated_to_object(ctx, args[0], "results");
    if (!Object::template is_instance<ResultsClass<T>>(ctx, results_arg)) {
        throw std::runtime_error("Argument to 'remove' must be a collection of Realm objects.");
    }

    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

    auto results = get_internal<T, ResultsClass<T>>(ctx, results_arg);
    auto query = results->get_query();

    auto it = subs->find(query);
    if (it == subs->end()) {
        return_value.set(false);
    }
    else {
        subs->erase(it);
        return_value.set(true);
    }
}

/**
 * @brief Remove the specified subscription from the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref A single argument containing the Subscription instance to be removed
 * @param return_value \ref ReturnValue wrapping a boolean, true if the subscription was found
 * and removed, false otherwise
 * @exception std::runtime_error Thrown if the argument is not a valid Subscription instance
 */
template <typename T>
void MutableSubscriptionSetClass<T>::remove_subscription(ContextType ctx, ObjectType this_object, Arguments& args,
                                                         ReturnValue& return_value)
{
    args.validate_count(1);

    auto sub_arg = Value::validated_to_object(ctx, args[0], "subscription");
    if (!Object::template is_instance<SubscriptionClass<T>>(ctx, sub_arg)) {
        throw std::runtime_error("Argument to 'removeSubscription' must be a subscription.");
    }

    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

    auto sub_to_remove = get_internal<T, SubscriptionClass<T>>(ctx, sub_arg);

    auto it = std::find_if(subs->begin(), subs->end(), [sub_to_remove](auto& sub) {
        return sub.id() == sub_to_remove->id();
    });

    if (it == subs->end()) {
        return_value.set(false);
    }
    else {
        subs->erase(it);
        return_value.set(true);
    }
}

/**
 * @brief Remove all subscriptions from the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref None
 * @param return_value \ref ReturnValue wrapping the number of subscriptions removed.
 */
template <typename T>
void MutableSubscriptionSetClass<T>::remove_all(ContextType ctx, ObjectType this_object, Arguments& args,
                                                ReturnValue& return_value)
{
    args.validate_count(0);

    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

    auto size = subs->size();
    subs->clear();
    return_value.set((uint32_t)size);
}

/**
 * @brief Remove all subscriptions with the specified object type from the MutableSubscriptionSet.
 * Can only be called inside an `update` callback.
 *
 * @param ctx JS context
 * @param this_object \ref ObjectType wrapping the MutableSubscriptionSet
 * @param args \ref A single argument containing the string object type to be removed
 * @param return_value \ref ReturnValue wrapping the number of subscriptions removed.
 */
template <typename T>
void MutableSubscriptionSetClass<T>::remove_by_object_type(ContextType ctx, ObjectType this_object, Arguments& args,
                                                           ReturnValue& return_value)
{
    args.validate_count(1);

    std::string object_type = Value::validated_to_string(ctx, args[0], "objectType");
    auto subs = get_internal<T, MutableSubscriptionSetClass<T>>(ctx, this_object);

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