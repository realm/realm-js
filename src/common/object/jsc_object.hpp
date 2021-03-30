#pragma once
#include <JavaScriptCore/JavaScriptCore.h>

class JavascriptObject {
   private:
    JSClassDefinition _class;
    JSClassRef class_instance;
    JSContextRef context;

    template <typename Callback, typename Data>
    static auto make_callback_method(Callback&& callback, Data *data){
        return [=](const auto& info) mutable {
            callback(info.Env(), info[0], data, data->get_data());
        };
    }

   public:
    JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
        : context{_ctx} {
        _class = kJSClassDefinitionEmpty;
        _class.className = name.c_str();

       // class_instance = JSClassCreate(&_class);
    }

    template <class VM, typename Function, class Data>
    void add_method(std::string&& name, Function&& function, Data *data){
        auto _callback = make_callback_method(function, data);
        auto js_function = Napi::Function::New(context, _callback, name);
        js::Object<VM>::set_property(context, object, name, js_function, PropertyAttributes::DontEnum);
    }

    JSObjectRef create() { return JSObjectMake(context, class_instance, NULL); }
};
