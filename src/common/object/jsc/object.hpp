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

#include "common/object/error_handling.hpp"
#include "common/object/interfaces.hpp"
#include "realm/object-store/shared_realm.hpp"

namespace realm {
namespace common {

struct PrivateStore {
    void *accessor_data = nullptr;
    ObjectObserver *observer = nullptr;
    IOCollection *collection = nullptr;
    std::function<void()> finalizer = nullptr;
};

struct JSCoreString {
    std::string _str;
    JSStringRef jsc_str;

    JSCoreString(std::string __str) : _str{__str} {}
    JSCoreString(JSContextRef context, JSValueRef __str) {
        jsc_str = JSValueToStringCopy(context, __str, nullptr);
    }
    JSCoreString(JSContextRef context, JSStringRef __str) {
        jsc_str = JSValueToStringCopy(context, (JSValueRef)__str, nullptr);
    }

    operator std::string() {
        std::string str;
        size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(jsc_str);
        str.reserve(sizeUTF8);
        JSStringGetUTF8CString(jsc_str, _str.data(), sizeUTF8);
        return str;
    }

    operator JSStringRef() {
        return JSStringCreateWithUTF8CString(_str.c_str());
    }

    ~JSCoreString() {
        //JSStringRelease(jsc_str);
    }
};

class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSContextRef context;
    JSObjectRef object;
    std::vector<JSStaticFunction> methods;
    std::vector<JSCoreString> accessors;
    PrivateStore *private_object;

    static PrivateStore *get_private(JSObjectRef object) {
        PrivateStore *store =
            static_cast<PrivateStore *>(JSObjectGetPrivate(object));
        return store;
    }

    template <void cb(Args)>
    static JSValueRef function_call(JSContextRef ctx, JSObjectRef function,
                                    JSObjectRef thisObject,
                                    size_t argumentCount,
                                    const JSValueRef _arguments[],
                                    JSValueRef *exception) {
        PrivateStore *_private = get_private(thisObject);
        ObjectObserver *observer = _private->observer;
        IOCollection *collection = _private->collection;

        try {
            cb({ctx, observer, collection, argumentCount, _arguments});
        } catch (InvalidTransactionException &error) {
            *exception = _throw_error(ctx, error.what());
        }

        return JSValueMakeUndefined(ctx);
    }

    static JSValueRef _get(JSContextRef ctx, JSObjectRef object,
                           JSStringRef propertyName, JSValueRef *exception) {
        IOCollection *collection = get_private(object)->collection;
        JSValueRef value =
            collection->get(ctx, JSCoreString{ctx, propertyName});
        return value;
    }

    static bool _set(JSContextRef ctx, JSObjectRef object,
                     JSStringRef propertyName, JSValueRef value,
                     JSValueRef *exception) {
        try {
            std::string key = JSCoreString{ctx, propertyName};
            IOCollection *collection = get_private(object)->collection;
            collection->set(ctx, key, value);
            std::cout << "key -> " << key.c_str() << " \n";
        } catch (InvalidTransactionException &error) {
            *exception = _throw_error(ctx, error.what());
        }

        return true;
    }

    static void dispose(JSObjectRef object) {
        PrivateStore *_private = get_private(object);
        if (_private->finalizer != nullptr) {
            _private->finalizer();
        } else {
            std::cerr << "Warning: No finalizer was specified.";
        }
    }

    static JSValueRef Base_get(JSContextRef ctx, JSObjectRef object,
                               JSStringRef propertyName,
                               JSValueRef *exception) {
        std::string key = JSCoreString{ctx, propertyName};
        printf("%s \n", key.c_str());
        return JSValueMakeNumber(ctx,
                                 1);  // distinguish base get form derived get
    }

   public:
    JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
        : context{_ctx} {
        _class = kJSClassDefinitionEmpty;
        _class.className = name.c_str();
        _class.finalize = dispose;
        _class.getProperty = Base_get;
        private_object = new PrivateStore{nullptr, nullptr, nullptr};
        object = JSObjectMake(context, JSClassCreate(&_class), private_object);
    }

    template <class VM, void callback(Args), class Data>
    void add_method(std::string name, Data *) {
        auto accessor_rules =
            kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete;

        JSStringRef key = JSStringCreateWithUTF8CString(name.c_str());
        JSValueRef method = JSObjectMakeFunctionWithCallback(
            context, key, function_call<callback>);

       // JSObjectSetProperty(context, object, key, method,
         //                   accessor_rules, nullptr);
    }

    void add_accessor(std::string name, IOCollection *) {
        JSObjectSetProperty(context, object, JSCoreString{name},
                            JSValueMakeNull(context), kJSPropertyAttributeNone,
                            nullptr);
    }

    void set_collection(IOCollection *collection) {
        private_object->collection = collection;
        JSObjectSetPrivate(object, private_object);
    }

    void set_observer(ObjectObserver *observer) {
        private_object->observer = observer;
        JSObjectSetPrivate(object, private_object);
        JSObjectSetPrivate(object, private_object);
    }

    JSObjectRef get_object() { return object; }

    template <typename RemovalCallback>
    static void finalize(JSObjectRef object, RemovalCallback &&callback,
                         void *_unused = nullptr) {
        /*
         *  JSObject and Self only apply for NodeJS.
         */
        PrivateStore *store = get_private(object);
        store->finalizer = std::move(callback);
        JSObjectSetPrivate(object, store);
    }
};

}  // namespace common
}  // namespace realm
