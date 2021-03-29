#pragma once 
#include <JavaScriptCore/JavaScriptCore.h>

template <typename Context>
class JavascriptObject {
private:
    JSClassDefinition _class;

public:
    JavascriptObject(std::string name = "js_object"){
        _class = kJSClassDefinitionEmpty;
        _class.className = "js_object";
    }
};
