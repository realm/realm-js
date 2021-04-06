#define CATCH_CONFIG_MAIN
#include <vector>

#include "catch_amalgamated.hpp"
#include "common/object/jsc_object.hpp"
#include "logger.hpp"
#include "test_bed.hpp"

using Catch::Matchers::Contains;
using namespace std;

struct MockedCollection : public IOCollection {
    double N = 1000;
    void set(JSContextRef ctx, std::string _key, JSValueRef value) {
        N = JSValueToNumber(ctx, value, nullptr);
    }

    JSValueRef get(JSContextRef ctx, std::string _key) {
        return JSValueMakeNumber(ctx, N);
    }
};

struct TNull : public ObjectObserver {
    IOCollection* get_collection() { return nullptr; }
};

struct T1 : public ObjectObserver {
    int call_count = 0;
    void subscribe(Subscriber*) { call_count++; }

    void remove_subscription(const Subscriber*) {
        call_count++;
        // Making Sure that unsubscribe_all & subscribe has been successfully
        // invoked.
        REQUIRE(call_count == 3);
    }
    void unsubscribe_all() { call_count++; }

    static void test_for_null_data_method(JSContextRef& context,
                                          JSValueRef value,
                                          ObjectObserver* observer,
                                          IOCollection* collection) {
        SECTION(
            "This callback should have null values for observer and "
            "collection.") {
            REQUIRE(true == JSValueIsBoolean(context, value));
            REQUIRE(collection == nullptr);
            REQUIRE(observer == nullptr);
        }
    }

    static void methods(JSContextRef& context, JSValueRef value,
                        ObjectObserver* observer, IOCollection* collection) {
        SECTION(
            "This callback should have non-null values for observer and "
            "collection.") {
            REQUIRE(collection != nullptr);
            REQUIRE(observer != nullptr);

            observer->subscribe(nullptr);
            observer->unsubscribe_all();
            observer->remove_subscription(nullptr);

            collection->set(context, "test", value);
            JSValueRef _num = collection->get(context, "test");
            double num = JSValueToNumber(context, _num, nullptr);
            /*
             * jsc_object line 11
             * dictionary.doSomething(28850);
             * we test here that we successfully read the argument.
             *
             */
            REQUIRE(num == 28850);
        }
    }

    IOCollection* get_collection() { return new MockedCollection(); }
};

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
        auto method_name = JSC_VM::s("doSomething");

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

/*
    test_accessor(obj, key, number)
    example:

    test_accessor(dictionary, 'X', 666)  // Will look for the field X and 666.
 */
JSValueRef GetterSetter(JSContextRef ctx, JSObjectRef function,
                        JSObjectRef thisObject, size_t argumentCount,
                        const JSValueRef arguments[], JSValueRef* exception) {
    SECTION("Testing object accessors for X value..") {
        auto accessor_name = JSC_VM::s("X");
        REQUIRE(true == JSValueIsObject(ctx, arguments[0]));

        auto obj = (JSObjectRef)arguments[0];
        REQUIRE(true ==
                JSObjectHasProperty(ctx, obj, (JSStringRef)arguments[1]));

        JSValueRef v = JSObjectGetProperty(ctx, obj, accessor_name, NULL);
        REQUIRE(true == JSValueIsNumber(ctx, v));
        double _v = JSValueToNumber(ctx, v, NULL);
        double _match = JSValueToNumber(ctx, arguments[2], NULL);
        REQUIRE(_match == _v);
    }

    return JSValueMakeUndefined(ctx);
}

TEST_CASE("Testing Object creation on JavascriptCore.") {
    JSC_VM jsc_vm;

    jsc_vm.make_gbl_fn("test", &Test);
    jsc_vm.make_gbl_fn("test_accessor", &GetterSetter);

    /*
     *  JavascriptObject Instantiation and configuration into JSC.
     *  With null_dictionary is just a Javascript object without a private C++
     * object.
     */
    common::JavascriptObject* null_dict =
        new common::JavascriptObject{jsc_vm.globalContext, "null_dictionary"};

    TNull* tnull = nullptr;
    null_dict->template add_method<int, T1::test_for_null_data_method>("hello", tnull);
    null_dict->template add_method<int, T1::test_for_null_data_method>("alo", tnull);
    JSObjectRef null_dict_js_object = null_dict->get_object();

    common::JavascriptObject::finalize(null_dict_js_object, [=]() {
        /*
         *  Private object should be deallocated just once.
         */

        REQUIRE(null_dict != nullptr);
        delete null_dict;
    });

    // Adds object to the JS global scope. This way we can call the functions
    // from the VM like this null_dictionary.hello() null_dictionary.alo() for
    // more information look at the jsc_object.js
    jsc_vm.set_obj_prop("null_dictionary", null_dict_js_object);

    /*
     *  Javascript object with private C++ object.
     *  To provide a private object we just need to pass a C++ object that has a
     * IOCollection* get_collection() method and/or ObjectSubscriber.
     */
    common::JavascriptObject* _dict =
        new common::JavascriptObject{jsc_vm.globalContext, "dictionary"};
    _dict->template add_method<int, T1::methods>("doSomething", new T1);
    _dict->template add_accessor<AccessorsTest<int>>("X", 666);
    auto dict_js_object = _dict->get_object();

    common::JavascriptObject::finalize(dict_js_object, [=]() {
        /*
         *  Private object should be deallocated just once.
         */
        REQUIRE(_dict != nullptr);
        delete _dict;
    });

    // Adds object to the JS global scope.
    jsc_vm.set_obj_prop("dictionary", dict_js_object);

    /*
     *
     *  Running a script on the VM.
     *
     *  First we check the object with properties and methods are constructed
     *
     *   test(dictionary)
     *
     *  To test that we added hello method we send a boolean and we check it
     *  above using T1 struct.
     *
     *  dictionary.hello(true)
     *
     */
    jsc_vm.load_into_vm("./jsc_object.js");
}
