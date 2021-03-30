#define CATCH_CONFIG_MAIN
#include <vector>

#include "catch_amalgamated.hpp"
#include "common/object/jsc_object.hpp"
#include "logger.hpp"
#include "test_bed.hpp"

using Catch::Matchers::Contains;
using namespace std;

TEST_CASE("Testing Logger#get_level") {
    REQUIRE(realm::common::logger::Logger::get_level("all") ==
            realm::common::logger::LoggerLevel::all);
    REQUIRE(realm::common::logger::Logger::get_level("debug") ==
            realm::common::logger::LoggerLevel::debug);
    REQUIRE_THROWS_WITH(realm::common::logger::Logger::get_level("coffeebabe"),
                        "Bad log level");
}
JSValueRef Test(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                size_t argumentCount, const JSValueRef arguments[],
                JSValueRef* exception) {
    SECTION("An object should be created, should have a method hello.") {
        auto accessor_name = JSStringCreateWithUTF8CString("X");
        auto method_name = JSStringCreateWithUTF8CString("hello");

        bool is_obj = JSValueIsObject(ctx, arguments[0]);
        bool has_method =
            JSObjectHasProperty(ctx, (JSObjectRef)arguments[0], method_name);
        bool has_accessor =
            JSObjectHasProperty(ctx, (JSObjectRef)arguments[0], accessor_name);

        REQUIRE(is_obj == true);
        REQUIRE(has_accessor == true);
        REQUIRE(has_method == true);
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
     */

    string NAME = "dictionary";
    JSStringRef test_object = JSStringCreateWithUTF8CString(NAME.c_str());
    JavascriptObject js_object{globalContext, NAME};

    MethodTest<int> test;

    // js_object.add_accessor<AccessorsTest<int>>("X", 666);
    //js_object.template add_method<int, MethodTest<int>::method>("hello",
     //                                                           new int{5});

    auto dictionary_object = test.apply(&js_object);

    // set property of global object
    JSObjectSetProperty(globalContext, globalObject, test_object,
                        dictionary_object, kJSPropertyAttributeNone, nullptr);

    /*
     *  Testing that an object was created.
     */

    JSStringRef script = JSStringCreateWithUTF8CString(
        "test(dictionary); dictionary.hello(true)");

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
