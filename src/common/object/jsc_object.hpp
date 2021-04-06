#pragma once

// This allow us to run the JSC tests on our Mac's locally.
#if __APPLE__
#include <JavaScriptCore/JavaScriptCore.h>
#endif

#include <iostream>
#include <vector>

#include "common/object/interfaces.hpp"

namespace common {

struct PrivateStore {
    void *accessor_data = nullptr;
    ObjectObserver *observer = nullptr;
    IOCollection *collection = nullptr;
    std::function<void()> finalizer = nullptr;
};

class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSContextRef context;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> accessors;
    PrivateStore *private_object;

    static std::string to_string(JSContextRef context, JSStringRef value) {
        std::string str;
        size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(value);
        str.reserve(sizeUTF8);
        JSStringGetUTF8CString(value, str.data(), sizeUTF8);
        return str;
    }

    static PrivateStore *get_private(JSObjectRef object) {
        PrivateStore *store = (PrivateStore *)JSObjectGetPrivate(object);
        if (store == nullptr) {
            std::cout << "Store is empty!! \n";
        }
        return store;
    }

    template <void cb(JSContextRef context, JSValueRef value,
                      ObjectObserver *observer, IOCollection *collection)>
    static JSValueRef function_call(JSContextRef ctx, JSObjectRef function,
                                    JSObjectRef thisObject,
                                    size_t argumentCount,
                                    const JSValueRef arguments[],
                                    JSValueRef *exception) {
        if (argumentCount > 0) {
            PrivateStore *_private = get_private(thisObject);
            ObjectObserver *observer = _private->observer;
            IOCollection *collection = _private->collection;
            cb(ctx, arguments[0], observer, collection);
        }

        return JSValueMakeUndefined(ctx);
    }

    template <class Accessor>
    static JSValueRef _get(JSContextRef ctx, JSObjectRef object,
                           JSStringRef propertyName, JSValueRef *exception) {
        Accessor *accessor = (Accessor *)get_private(object)->accessor_data;
        return accessor->get(ctx, to_string(ctx, propertyName));
    }

    template <class Accessor>
    static bool _set(JSContextRef ctx, JSObjectRef object,
                     JSStringRef propertyName, JSValueRef value,
                     JSValueRef *exception) {
        Accessor *accessor = (Accessor *)get_private(object)->accessor_data;
        accessor->set(ctx, to_string(ctx, propertyName), value);
        return true;
    }

    static void dispose(JSObjectRef object) {
        PrivateStore *_private = get_private(object);
        if (_private->finalizer != nullptr) {
            _private->finalizer();
        } else {
            std::cout << "Warning: No finalizer was specified.";
        }
    }

    JSClassRef make_class() {
        methods.push_back({0});
        accessors.push_back({0});

        _class.staticValues = accessors.data();
        _class.staticFunctions = methods.data();

        return JSClassCreate(&_class);
    }

   public:
    JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
        : context{_ctx} {
        _class = kJSClassDefinitionEmpty;
        _class.className = name.c_str();
        _class.finalize = dispose;
        private_object = new PrivateStore{nullptr, nullptr, nullptr};
    }

    void dbg() {
        std::cout << "methods size: " << methods.size() << " \n";
        std::cout << "accessors size: " << accessors.size() << " \n";
    }

    template <class VM,
              void callback(JSContextRef context, JSValueRef value,
                            ObjectObserver *observer, IOCollection *collection),
              class Data>
    void add_method(std::string name, Data *data) {
        JSStaticFunction tmp{name.c_str(), function_call<callback>,
                             kJSPropertyAttributeDontEnum};
        methods.push_back(tmp);

        if (private_object->observer == nullptr &&
            private_object->collection == nullptr) {
            private_object->observer = data;
            private_object->collection = data->get_collection();
        }
    }

    template <typename Accessor, typename Data>
    void add_accessor(std::string key, Data data) {
        JSStaticValue tmp{key.c_str(), _get<Accessor>, _set<Accessor>,
                          kJSPropertyAttributeNone};
        accessors.push_back(tmp);
        if (private_object->accessor_data == nullptr) {
            private_object->accessor_data = new Accessor{data};
        }
    }

    JSObjectRef get_object() {
        auto class_instance = make_class();
        return JSObjectMake(context, class_instance, private_object);
    }

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
