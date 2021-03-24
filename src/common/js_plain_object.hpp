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

#if REALM_PLATFORM_NODE

class JSLifeCycle {
public:
    template <typename ObjectType, typename Callback, typename Self>
    static void finalize(ObjectType object, Callback&& callback, Self *self) {
      object.AddFinalizer(
            [callback](auto, void* data_ref) {
                callback();
            }, self);
    }
};

template <typename JSObject>
void delete_key(JSObject& object, std::string& key) {
        object.Delete(key);
}

template <typename JSObject, typename Callback>
void keys(JSObject& object, Callback&& callback) {
  auto keys = object.GetPropertyNames();
  auto size = keys.Length();

    for (auto index = 0; index < size; index++) {
        callback(keys[index]);
    }

}

#else

class JSCDealloc {
private:
    std::function<void()> _delegated = NULL;
public:
    JSCDealloc(std::function<void()>&& _d): _delegated{_d} {}
    void delegated() {
        if(_delegated != nullptr){
            _delegated();
        }else{
            cout << "Warning: RemovalCallback not configured."
        }
    }
};

class JSLifeCycle {
public:
    static void gc_finalizer(OpaqueJSValue* object){
        JSCDealloc *remove_action = static_cast<JSCDealloc*>(JSObjectGetPrivate(object));
        if(remove_action != nullptr) {
            remove_action->delegated();
        }
    }

    template <typename ObjectType, typename Callback, typename Self>
    static void finalize(ObjectType object, Callback&& callback, Self*) {
        bool success = JSObjectSetPrivate(object, new JSCDealloc{callback});

        if(!success){
            cout << "Cannot save private data" << '\n';
        }
    }
};

#endif



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

    Accessor accessor;

    template <typename Data>
    void register_new_accessor(ContextType context, const char* key, ObjectType object,
                               Data dictionary) {
        auto _getter = accessor.make_getter(key, dictionary);
        auto _setter = accessor.make_setter(key, dictionary);

        /*
         * NAPI_enumerable: Enables JSON.stringify(object) and all the good
         * stuff for free... 
         * 
         * NAPI_configurable: Allow us to modify accessors, for example: Delete fields, very
         * handy to reflect object-dictionary mutations. 
         *
         */
        auto rules = static_cast<napi_property_attributes>(napi_enumerable |
                                                           napi_configurable);
        auto descriptor = Napi::PropertyDescriptor::Accessor(
            context, object, key, _getter, _setter, rules);

        object.DefineProperty(descriptor);
    }

    template <class JSObject>
    void apply(ContextType context, ObjectType object, JSObject *_o) {
        auto dictionary = _o->get_data();
        for (auto entry_pair : *dictionary) {
            auto key = entry_pair.first.get_string().data();
            register_new_accessor(context, key, object, dictionary);
        }
    }

//    void update(ObjectType& object,
//                realm::object_store::Dictionary* dictionary) {
//         keys(object, [=](auto _key) mutable{
//             std::string key = Value::to_string(context, _key);
//            if (!dictionary->contains(key)) {
//                delete_key(object, key);
//            }
//        });
//    }
};

template <typename VM>
struct IdentityMethods {
    using ContextType = typename VM::Context;
    ContextType context;

    IdentityMethods(ContextType _context) : context{_context} {};
};

template <typename VM,
          typename GetterSetters,
          typename Methods = IdentityMethods<VM>,
          typename Data = object_store::Dictionary>
struct JSObject {
   private:
    using Object = js::Object<VM>;
    using ObjectType = typename VM::Object;
    using ContextType = typename VM::Context;

    std::unique_ptr<Methods> methods;
    std::unique_ptr<GetterSetters> getters_setters;
    std::shared_ptr<Data> data;

    void setup_finalizer(ObjectType object){
        JSLifeCycle::finalize(object, [this](){
            // This method gets called when GC dispose the JS Object.
            //https://isocpp.org/wiki/faq/freestore-mgmt#delete-this
            delete this;
        }, this);
    }

   public:
    JSObject(Data _data) {
        data = std::make_shared<Data>(_data);
        getters_setters = std::make_unique<GetterSetters>();
        methods = std::make_unique<Methods>();
    };

    std::shared_ptr<Data> get_data() { return data; }

    template <typename ContextType>
    ObjectType build(ContextType context){
        auto obj = Object::create_empty(context);
        methods->apply(context, obj, this);
        getters_setters->apply(context, obj, this);
        setup_finalizer(obj);

        return obj;
    }

    ~JSObject() = default;
};
}  // namespace js
}  // namespace realm
