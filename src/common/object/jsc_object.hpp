#pragma once
#include <JavaScriptCore/JavaScriptCore.h>

class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSClassRef class_instance;
    JSContextRef context;

   public:
    JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
        : context{_ctx} {
        _class = kJSClassDefinitionEmpty;
        _class.className = name.c_str();

        class_instance = JSClassCreate(&_class);
    }


    JSObjectRef create() { return JSObjectMake(context, class_instance, NULL); }
};
