//
// Created by Cesar Valdez on 07/03/2021.
//

#ifndef REALMJS_CALLBACKS_HPP
#define REALMJS_CALLBACKS_HPP

namespace realm {
namespace js {

template <typename T>
struct NotificationsCallback {
    using ObjectType = typename T::Object;
    using FunctionType = typename T::Function;
    using ValueType = typename T::Value;
    using ContextType = typename T::Context;
    using PFunction = Protected<FunctionType>;
    using PObject = Protected<ObjectType>;
    using PGlobalContext = Protected<typename T::GlobalContext>;

    using Object = js::Object<T>;

    PFunction fn;
    PObject plain_object;
    PGlobalContext context;

    NotificationsCallback(ContextType &_context, FunctionType &_fn)
        : fn{_context, _fn},
          plain_object{_context, Object::create_empty(_context)},
          context{Context<T>::get_global_context(_context)} {}

    NotificationsCallback(FunctionType &_fn, ObjectType &obj,
                         ContextType &_context)
        : fn{_context, _fn},
          plain_object{_context, obj},
          context{Context<T>::get_global_context(_context)} {}

    template <typename Collection>
    auto build_array(Collection &collection) const {
        std::vector<ValueType> values;
        for (auto mixed_item : collection) {
            values.push_back(
                TypeMixed<T>::get_instance().wrap(context, mixed_item));
        }

        return Object::create_array(context, values);
    }

    bool operator==(const NotificationsCallback<T> &candidate) {
        return static_cast<FunctionType>(fn) ==
               static_cast<FunctionType>(candidate.fn);
    }

    ObjectType build_changeset_object(DictionaryChangeSet &change_set) const {
        ObjectType object = Object::create_empty(context);
        Object::set_property(context, object, "insertions",
                             build_array(change_set.insertions));
        Object::set_property(context, object, "modifications",
                             build_array(change_set.modifications));

        return object;
    }

    void operator()(DictionaryChangeSet change_set) const {
        HANDLESCOPE(context)
        ValueType arguments[]{static_cast<ObjectType>(plain_object),
                              build_changeset_object(change_set)};

        Function<T>::callback(context, fn, plain_object, 2, arguments);
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_CALLBACKS_HPP
