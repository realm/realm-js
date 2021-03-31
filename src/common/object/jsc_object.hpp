#pragma once
#include <JavaScriptCore/JavaScriptCore.h>

#include <iostream>
#include <vector>
#include "common/object/interfaces.hpp"

namespace realm {
namespace common {

class JavascriptObject {
   private:
    using Method = std::function<void(JSContextRef &context, JSValueRef value)>;
    JSClassDefinition _class;
    JSContextRef context;
    std::vector<JSStaticFunction> methods;
    std::vector<JSStaticValue> accessors;
    void *accessors_data = nullptr;


    template <void cb(JSContextRef &context, JSValueRef value,
                      ObjectMutationObserver *observer)>
    static JSValueRef function_call(JSContextRef ctx, JSObjectRef function,
                                    JSObjectRef thisObject,
                                    size_t argumentCount,
                                    const JSValueRef arguments[],
                                    JSValueRef *exception) {
        if (argumentCount > 0) {
            cb(ctx, arguments[0], nullptr);
        }
        return JSValueMakeNumber(ctx, 1);
    }

    static JSValueRef _get(JSContextRef ctx, JSObjectRef object,
                           JSStringRef propertyName, JSValueRef *exception) {
        return JSValueMakeNumber(ctx, 1);
    }

    static bool _set(JSContextRef ctx, JSObjectRef object,
                     JSStringRef propertyName, JSValueRef value,
                     JSValueRef *exception) {
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
    }

    void dbg() {
        std::cout << "methods size: " << methods.size() << " \n";
        std::cout << "accessors size: " << accessors.size() << " \n";
    }

    template <class VM,
              void cb(JSContextRef &context, JSValueRef value,
                      ObjectMutationObserver *observer),
              class Data>
    void add_method(std::string name, Data *data) {
        JSStaticFunction tmp{name.c_str(), function_call<cb>,
                             kJSPropertyAttributeDontEnum};
        methods.push_back(tmp);
    }

    template <typename Accessor, typename Data>
    void add_accessor(std::string key, Data) {
        JSStaticValue tmp{key.c_str(), _get, _set, kJSPropertyAttributeNone};
        accessors.push_back(tmp);
    }

    template <typename Data>
    void add_data(Data data) {
        accessors_data = static_cast<void *>(new Data{data});
    }

    JSObjectRef get_object() {
        auto class_instance = make_class();
        return JSObjectMake(context, class_instance, accessors_data);
    }
};

}  // namespace common
}  // namespace realm
