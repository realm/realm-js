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
    using GetterSetters = AccessorsConfiguration<T, AccessorsForDictionary<T>>;
    using JSDictionaryUpdate = JSObject<T, GetterSetters>;
    using Value = js::Value<T>;

    PFunction fn;
    PObject plain_object;
    PGlobalContext context;

    NotificationsCallback(ContextType &_context, FunctionType &_fn)
            : fn{_context, _fn},
              plain_object{_context, Object::create_empty(_context)},
              context{Context<T>::get_global_context(_context)} {}

    NotificationsCallback(ContextType &_context, FunctionType &_fn, const ObjectType &obj)
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

    bool operator==(const NotificationsCallback<T> &candidate) const {
        return static_cast<FunctionType>(fn) ==
               static_cast<FunctionType>(candidate.fn);
    }

    ObjectType build_changeset_object(DictionaryChangeSet &change_set) const {
        ObjectType object = Object::create_empty(context);
        int deleted_fields_size = change_set.deletions.size();
        Object::set_property(context, object, "deletions",
                             Value::from_number(context, deleted_fields_size));
        Object::set_property(context, object, "insertions",
                             build_array(change_set.insertions));
        Object::set_property(context, object, "modifications",
                             build_array(change_set.modifications));

        return object;
    }

    void operator()(object_store::Dictionary *dict, DictionaryChangeSet change_set, bool has_change) const {
        HANDLESCOPE(context)
        auto object = static_cast<ObjectType>(plain_object);
        if(has_change) {
            JSDictionaryUpdate dictionary_update {context, object};
            dictionary_update.update_accessors(dict);
            object = dictionary_update.get_plain_object();
        }

        ValueType arguments[]{object,
                              build_changeset_object(change_set)};

        Function<T>::callback(context, fn, plain_object, 2, arguments);
    }
};

}  // namespace js
}  // namespace realm

#endif  // REALMJS_CALLBACKS_HPP
