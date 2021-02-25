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
}  // namespace js
}  // namespace realm
#endif  // REALMJS_JS_PLAIN_OBJECT_HPP
