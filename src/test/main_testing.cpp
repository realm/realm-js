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
        auto accessor_name = JSC_VM::s("X");
        auto method_name = JSC_VM::s("hello");

        auto obj = (JSObjectRef)arguments[0];

        bool is_obj = JSValueIsObject(ctx, arguments[0]);
        bool has_method = JSObjectHasProperty(ctx, obj, method_name);
        bool has_accessor = JSObjectHasProperty(ctx, obj, accessor_name);

        REQUIRE(is_obj == true);
        REQUIRE(has_accessor == true);
        REQUIRE(has_method == true);
    }

    return JSValueMakeUndefined(ctx);
}

TEST_CASE("Testing Object creation on JavascriptCore.") {
    JSC_VM jsc_vm;

    auto _test_name = jsc_vm.str("test");
    auto _test = JSObjectMakeFunctionWithCallback(jsc_vm.globalContext,
                                                  _test_name, &Test);

    jsc_vm.set_obj_prop(_test_name, _test);

    /*
     *  JavascriptObject Instantiation and configuration into JSC.
     */

    string NAME = "dictionary";
    JSStringRef str_dict = jsc_vm.str("dictionary");
    JavascriptObject _dict{jsc_vm.globalContext, NAME};

    _dict.template add_accessor<AccessorsTest<int>>("X", 666);
    _dict.template add_method<int, Mth::method>("hello", new int{5});

    // set property of global object
    jsc_vm.set_obj_prop(str_dict, _dict.get_object());

    /*
     *  Testing that an object was created.
     */
    auto script = jsc_vm.str("test(dictionary); dictionary.hello(true)");

    /*
     *
     *  End
     */
    JSEvaluateScript(jsc_vm.globalContext, script, nullptr, nullptr, 1,
                     nullptr);
}
