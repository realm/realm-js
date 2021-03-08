//
// Created by Cesar Valdez on 08/03/2021.
//

#ifndef REALMJS_DICT_HPP
#define REALMJS_DICT_HPP

#include <functional>
#include <map>
#include <regex>

#include "common/js_plain_object.hpp"
#include "common/type_deduction.hpp"
#include "js_mixed.hpp"
#include "realm/object-store/dictionary.hpp"
#include "realm/object-store/property.hpp"
#include "dictionary/collection/collection.hpp"
#include "dictionary/collection/notification.hpp"
#include "dictionary/methods/accessors.hpp"
#include "dictionary/methods/listeners.hpp"
#include "dictionary/methods/callbacks.hpp"

namespace realm {
    namespace js {

        template <typename T>
        class A{
        private:
            T t;
        public:
            A(T _t): t{_t} {}
        };

        template <typename VM>
        class Dict {
        private:
            using ValueType = typename VM::Value;
            using Context = typename VM::Context;
            using Collection = CollectionAdapter<object_store::Dictionary, A<object_store::Dictionary>>;
            using JSObjectBuilder = JSObjectBuilder<VM, Collection>;
            using DictionaryGetterSetter = AccessorsConfiguration<AccessorsForDictionary<VM>>;

        public:
            ValueType wrap(Context context, object_store::Dictionary dictionary) {
                Collection collection{std::move(dictionary)};
                JSObjectBuilder* js_builder =
                        new JSObjectBuilder(context, std::move(collection));

                js_builder->template configure_object_destructor([=]() {
                    /* GC will trigger this function, signaling that...
                     * ...we can deallocate the attached C++ object.
                     */
                    delete js_builder;
                });

                js_builder->template add_feature<DictionaryGetterSetter>();

                return js_builder->build();
            }
        };

    }  // namespace js
}  // namespace realm

#endif //REALMJS_DICT_HPP
