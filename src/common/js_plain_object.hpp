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

#ifndef REALMJS_JS_PLAIN_OBJECT_HPP
#define REALMJS_JS_PLAIN_OBJECT_HPP

namespace realm {
namespace js {
/*
 *  Specific NodeJS code to make object descriptors.
 *  When working with the JSC version, we just need to extract the NodeJS
 * feature and create a reusable component.
 */
template <typename T, typename Accessor>
struct AccessorsConfiguration {
    using ObjectType = typename T::Object;
    using ContextType = typename T::Context;
    using Value = js::Value<T>;

    ContextType context;
    Accessor accessor;

    AccessorsConfiguration(ContextType _context) : context{_context} {}

    template <class Dictionary>
    void register_new_accessor(const char* key, ObjectType object,
                               Dictionary* dictionary) {
        auto _getter = accessor.make_getter(key, dictionary);
        auto _setter = accessor.make_setter(key, dictionary);

        /*
         * NAPI_enumerable: Enables JSON.stringify(object) and all the good
         * stuff for free... NAPI_configurable: Allow us to modify accessors,
         * IE: Delete fields.
         *
         */
        auto rules = static_cast<napi_property_attributes>(napi_enumerable |
                                                           napi_configurable);
        auto descriptor = Napi::PropertyDescriptor::Accessor(
            context, object, key, _getter, _setter, rules);

        object.DefineProperty(descriptor);
    }

    template <class Dictionary>
    void apply(ObjectType& object, Dictionary* dictionary) {
        for (auto entry_pair : *dictionary) {
            auto key = entry_pair.first.get_string().data();
            register_new_accessor(key, object, dictionary);
        }
    }

    void update(ObjectType& object,
                realm::object_store::Dictionary* dictionary) {
        auto keys = object.GetPropertyNames();
        auto size = keys.Length();

        for (auto index = 0; index < size; index++) {
            std::string key = Value::to_string(context, keys[index]);

            if (!dictionary->contains(key)) {
                object.Delete(key);
            }
        }

        apply(object, dictionary);
    }
};

template <typename VM>
struct IdentityMethods {
    using ContextType = typename VM::Context;
    ContextType context;

    IdentityMethods(ContextType _context) : context{_context} {};
};

template <typename VM, typename GetterSetters,
          typename Methods = IdentityMethods<VM>>
struct JSObject {
   private:
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;
    std::unique_ptr<Methods> methods;
    std::unique_ptr<GetterSetters> getters_setters;
    ContextType context;
    ObjectType object;

   public:
    JSObject(ContextType _context)
        : context{_context}, object{Object::create_empty(_context)} {
        getters_setters = std::make_unique<GetterSetters>(context);
        methods = std::make_unique<Methods>(context);
    }

    JSObject(ContextType _context, ObjectType _object)
        : context{_context}, object{_object} {
        getters_setters = std::make_unique<GetterSetters>(context);
        methods = std::make_unique<Methods>(context);
    }

    ObjectType get_plain_object() { return object; }
    ContextType& get_context() { return context; }

    template <typename Callback>
    void configure_object_destructor(Callback&& callback) {
        object.AddFinalizer(
            [callback](ContextType, void* data_ref) { callback(); }, this);
    }

    template <typename Data>
    void set_methods(Data* data) {
        methods->apply(object, data);
    }

    template <typename Data>
    void set_getter_setters(Data* data) {
        getters_setters->apply(object, data);
    }

    template <typename Data>
    void update_accessors(Data* data) {
        getters_setters->update(object, data);
    }

    ~JSObject() = default;
};
}  // namespace js
}  // namespace realm
#endif  // REALMJS_JS_PLAIN_OBJECT_HPP
