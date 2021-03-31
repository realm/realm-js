#pragma once
#include <JavaScriptCore/JavaScriptCore.h>

#include <iostream>
#include <vector>
#include "common/object/interfaces.hpp"

namespace realm {
namespace common {

struct PrivateObject{
    void* data;
};

class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSContextRef context;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> accessors;
    std::unique_ptr<PrivateObject> private_object;

    static std::string to_string(JSContextRef context, JSStringRef value){
        std::string str;
        size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(value);
        str.reserve(sizeUTF8);
        JSStringGetUTF8CString(value, str.data(), sizeUTF8);
        return str;
    }

    template <typename T>
    static auto get_accessor(JSObjectRef object){
        PrivateObject *private_object = (PrivateObject*) JSObjectGetPrivate(object);
        T *accessor = (T*) private_object->data;
        return accessor;
    }

    template <void cb(JSContextRef &context,
                      JSValueRef value,
                      ObjectObserver *observer)>
    static JSValueRef function_call(JSContextRef ctx,
                                    JSObjectRef function,
                                    JSObjectRef thisObject,
                                    size_t argumentCount,
                                    const JSValueRef arguments[],
                                    JSValueRef *exception) {
        if (argumentCount > 0) {
            cb(ctx, arguments[0], nullptr);
        }

        return JSValueMakeUndefined(ctx);
    }

    template<class Accessor>
    static JSValueRef _get(JSContextRef ctx, JSObjectRef object,
                           JSStringRef propertyName, JSValueRef *exception) {

        return get_accessor<Accessor>(object)->get(ctx, to_string(ctx, propertyName));
    }

    template<class Accessor>
    static bool _set(JSContextRef ctx, JSObjectRef object,
                     JSStringRef propertyName, JSValueRef value,
                     JSValueRef *exception) {
        get_accessor<Accessor>(object)->set(ctx, to_string(ctx, propertyName), value);
        return true;
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
        private_object = std::make_unique<PrivateObject>();
    }

    void dbg() {
        std::cout << "methods size: " << methods.size() << " \n";
        std::cout << "accessors size: " << accessors.size() << " \n";
    }

    template <class VM,
              void callback(JSContextRef &context,
                      JSValueRef value,
                      ObjectObserver *observer),
              class Data>
    void add_method(std::string name, Data *data) {
        JSStaticFunction tmp{ name.c_str(),
                              function_call<callback>,
                              kJSPropertyAttributeDontEnum };
        methods.push_back(tmp);
    }

    template <typename Accessor, typename Data>
    void add_accessor(std::string key, Data data) {
        JSStaticValue tmp{key.c_str(), _get<Accessor>, _set<Accessor>, kJSPropertyAttributeNone};
        accessors.push_back(tmp);
        if(private_object->data == nullptr) {
            private_object->data = new Accessor{data};
        }
    }

    JSObjectRef get_object() {
        auto class_instance = make_class();
        return JSObjectMake(context, class_instance, &private_object);
    }
};

}  // namespace common
}  // namespace realm
