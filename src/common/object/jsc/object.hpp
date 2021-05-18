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

// This allow us to run the JSC tests on our Mac's locally.
#if __APPLE__
#include <JavaScriptCore/JavaScriptCore.h>
#endif

#include <iostream>
#include <vector>

#include "common/object/interfaces.hpp"
#include "realm/object-store/shared_realm.hpp"
#include "private_store.hpp"
#include "common/utils.h"

namespace realm {
namespace common {


template <typename GetterSetter>
class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSContextRef context;
    JSObjectRef object{nullptr};
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> values;

    std::vector<std::string> accessors;
    PrivateStore<GetterSetter> *private_object;

    static std::string to_string(JSStringRef value) {
        std::string str;
        size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(value);
        str.reserve(sizeUTF8);
        JSStringGetUTF8CString(value, str.data(), sizeUTF8);
        return str;
    }

    static PrivateStore<GetterSetter> *get_private(JSObjectRef object) {
        auto *store =
            static_cast<PrivateStore<GetterSetter> *>(JSObjectGetPrivate(object));
        return store;
    }

    static void dispose(JSObjectRef object) {
        auto *_private = get_private(object);
        if (_private->finalizer != nullptr) {
            _private->finalizer();
        } else {
            js::utility::Logs::info("Object::finalize", "%s", "Warning: No finalizer was specified.");
        }
    }

    static bool contains_key(JSObjectRef object,
                             std::string key) {
        auto keys = get_private(object)->keys;
        return keys[key.c_str()] == true;
    }

    static void get_property_names(JSContextRef ctx, JSObjectRef object,
                                   JSPropertyNameAccumulatorRef propertyNames) {
        auto keys = get_private(object)->keys;
        for (const auto &pair : keys) {
            if (pair.second) {
                auto entry = JSStringCreateWithUTF8CString(pair.first.c_str());
                JSPropertyNameAccumulatorAddName(propertyNames, entry);
                js::utility::Logs::info("Object::get_property_names::accumulator ", pair.first);
            }
        }
    }

    template <void callback(method::Arguments, accessor::IAccessor*)>
    static JSValueRef function_call(JSContextRef ctx, JSObjectRef,
                                    JSObjectRef thisObject,
                                    size_t argumentCount,
                                    const JSValueRef _arguments[],
                                    JSValueRef *exception) {
        auto *_private = get_private(thisObject);
        ObjectObserver *observer = _private->observer;
        IOCollection *collection = _private->collection;
        accessor::IAccessor *accessor = _private->getter_setter.get();

        callback({ctx, observer, collection, argumentCount, _arguments, exception}, accessor);
        return JSValueMakeUndefined(ctx);
    }

    static JSValueRef getter(JSContextRef ctx, JSObjectRef object,
                             JSStringRef propertyName, JSValueRef *exception) {
        std::string key = to_string(propertyName);

        if (!contains_key(object, key)) {
            return JSValueMakeNull(ctx);
        }

        js::utility::Logs::info("Object::Get", key);
        auto accessor = get_private(object)->getter_setter.get();
        return accessor->get(accessor::Arguments{ctx, object, key.c_str(), 0, exception});
    }

    static bool setter(JSContextRef ctx, JSObjectRef object,
                       JSStringRef propertyName, JSValueRef value,
                       JSValueRef *exception) {
        std::string key = to_string(propertyName);

        if (!contains_key(object, key)) {
            return false;
        }
        js::utility::Logs::info("Object::Set", key);
        auto accessor = get_private(object)->getter_setter.get();
        accessor->set(accessor::Arguments{ctx, object, key, value, exception});
        return true;
    }

    static bool has_property(JSContextRef ctx, JSObjectRef object,
                             JSStringRef propertyName) {
        auto key = to_string(propertyName);
        js::utility::Logs::info("Object::Has", "%s -> %s", key.c_str(), contains_key(object, key)?"true":"false");
        return contains_key(object, key);
    }

    JSClassRef make_class() {
        methods.push_back({0});
        _class.staticFunctions = methods.data();

        return JSClassCreate(&_class);
    }

    JSObjectRef lazily_build_object() {
        if (object == nullptr) {
            auto class_instance = make_class();
            return JSObjectMake(context, class_instance, private_object);
        } else {
            return object;
        }
    }

   public:
    JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
        : context{_ctx} {
        _class = kJSClassDefinitionEmpty;
        _class.attributes = kJSClassAttributeNone;
        _class.className = name.c_str();
        _class.finalize = dispose;
        _class.getProperty = getter;
        _class.setProperty = setter;
        _class.hasProperty = has_property;
        _class.getPropertyNames = get_property_names;

        private_object = new PrivateStore<GetterSetter>{nullptr, nullptr, nullptr};
    }

    void dbg() {
        std::cout << "methods size: " << methods.size() << " \n";
        std::cout << "accessors size: " << accessors.size() << " \n";
    }

    template <class VM, void callback(method::Arguments, accessor::IAccessor*)>
    void add_method(std::string &&name) {
        std::string *leak = new std::string{name};

        JSStaticFunction method_definition{leak->c_str(),
                                           function_call<callback>,
                                           kJSPropertyAttributeDontEnum};

        methods.push_back(method_definition);
    }

    void add_key(std::string name) {
        private_object->keys[name.c_str()] = true;
        values.push_back({name.c_str(), getter, setter, kJSPropertyAttributeNone});
        accessors.push_back(name);
    }

    std::vector<std::string> &get_properties() { return accessors; }

    void remove_accessor(std::string property_name) {
        private_object->keys[property_name.c_str()] = false;
    }

    void set_collection(IOCollection *collection) {
        private_object->collection = collection;
    }

    void set_observer(ObjectObserver *observer) {
        private_object->observer = observer;
    }

    void set_accessor(std::unique_ptr<GetterSetter>&& gs){
        private_object->getter_setter = std::move(gs);
    }

    bool is_alive(){
        return object != nullptr;
    }

    JSObjectRef get() { return object; }

    JSObjectRef create() {
        object = lazily_build_object();
        return object;
    }

    template <typename RemovalCallback>
    void finalize(RemovalCallback &&callback, void * unused = nullptr) {
        /*
         *  JSObject and Self only apply for NodeJS.
         */
        private_object->finalizer = std::move(callback);
    }
};

}  // namespace common
}  // namespace realm
