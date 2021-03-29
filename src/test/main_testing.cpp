#define CATCH_CONFIG_MAIN
#include "logger.hpp"

#include <vector>

#include "catch.hpp"
#include "common/object/jsc_object.hpp"

using Catch::Matchers::Contains;
using namespace std;

TEST_CASE("Testing Logger#get_level") {
    REQUIRE(realm::common::logger::Logger::get_level("all") ==
            realm::common::logger::LoggerLevel::all);
    REQUIRE(realm::common::logger::Logger::get_level("debug") ==
            realm::common::logger::LoggerLevel::debug);
    REQUIRE_THROWS_WITH(realm::common::logger::Logger::get_level("coffeebabe"),
                        Contains("Bad log level"));
}

JSValueRef Test(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                size_t argumentCount, const JSValueRef arguments[],
                JSValueRef* exception) {
    SECTION("An object should be created.") {
        bool is_boolean = JSValueIsObject(ctx, arguments[0]);

        REQUIRE(is_boolean == true);
    }
    return JSValueMakeUndefined(ctx);
}

TEST_CASE("Testing Object creation on JavascriptCore.") {
    JSContextGroupRef group = JSContextGroupCreate();
    JSGlobalContextRef globalContext =
        JSGlobalContextCreateInGroup(group, nullptr);
    JSObjectRef globalObject = JSContextGetGlobalObject(globalContext);
    JSStringRef test_function = JSStringCreateWithUTF8CString("test");
    JSObjectRef functionObject =
        JSObjectMakeFunctionWithCallback(globalContext, test_function, &Test);

    JSObjectSetProperty(globalContext, globalObject, test_function,
                        functionObject, kJSPropertyAttributeNone, nullptr);

    /*
     *  JavascriptObject Instantiation and configuration into JSC.
     *
     */

    string NAME = "dictionary";
    JSStringRef test_object = JSStringCreateWithUTF8CString(NAME.c_str());
    JavascriptObject js_object{globalContext, NAME};
    auto dictionary_object = js_object.create();

    // set property of global object
    JSObjectSetProperty(globalContext, globalObject, test_object,
                        dictionary_object, kJSPropertyAttributeNone, nullptr);

    /*
     *  Testing that an object was created.
     */

    JSStringRef script = JSStringCreateWithUTF8CString("test(dictionary)");

    /*
     *
     *  End
     */

    JSEvaluateScript(globalContext, script, nullptr, nullptr, 1, nullptr);

    JSGlobalContextRelease(globalContext);
    JSContextGroupRelease(group);
    JSStringRelease(test_object);
    JSStringRelease(test_function);
    JSStringRelease(script);
}
