#define CATCH_CONFIG_MAIN
#include <vector>

#include "catch_amalgamated.hpp"
#include "common/object/interfaces.hpp"
#include "logger.hpp"
#include "test_bed.hpp"

using Catch::Matchers::Contains;
using namespace std;
using namespace realm;


struct MockedCollection: public IOCollection{
    double N = 1000;
    MockedCollection(double start): N{start} {}
    realm::Mixed get(std::string) override{
        return realm::Mixed(N);
    }

    void set(std::string key, realm::Mixed val) override{
        N = val.get_double();
    }

    void remove(std::string key) override {
        N = 0;
    }

    bool contains(std::string key) override {
        return true;
    }
};

struct MockedGetterSetter {
    IOCollection *collection{nullptr};

    MockedGetterSetter(IOCollection *_collection): collection{_collection}{}

    void set(accessor::Arguments args) {
        double N = JSValueToNumber(args.context, args.value, nullptr);
        collection->set("N", realm::Mixed(N));

        if(N == -1){
            args.throw_error("Error: No Negative Number Please.");
        }
    }

    JSValueRef get(accessor::Arguments args) {
        return JSValueMakeNumber(args.context, collection->get(args.property_name).get_double());
    }

    ~MockedGetterSetter(){}
};

struct TNull : public ObjectObserver {
    IOCollection* get_collection() { return nullptr; }
};

struct T1 : public ObjectObserver {
    int call_count = 0;
    void subscribe(std::unique_ptr<Subscriber>) { call_count++; }

    void remove_subscription(std::unique_ptr<Subscriber>) {
        call_count++;
        // Making Sure that unsubscribe_all & subscribe has been successfully
        // invoked.
        REQUIRE(call_count == 3);
    }
    void unsubscribe_all() { call_count++; }

    static void test_for_null_data_method(method::Arguments arguments) {
        SECTION(
            "This callback should have null values for observer and "
            "collection.") {
            REQUIRE(true == JSValueIsBoolean(arguments.context, arguments.get(0)));
            REQUIRE(arguments.collection == nullptr);
            REQUIRE(arguments.observer == nullptr);
        }
    }

    static void removeTest(method::Arguments args){

    }

    static void methods(method::Arguments args) {
        SECTION(
            "This callback should have non-null values for observer and "
            "collection.") {

            auto context = args.context;

            REQUIRE(args.collection != nullptr);
            REQUIRE(args.observer != nullptr);

            args.observer->subscribe(nullptr);
            args.observer->unsubscribe_all();
            args.observer->remove_subscription(nullptr);

            double n = JSValueToNumber(context, args.get(0), nullptr);
            args.collection->set("test", n);
            realm::Mixed _num = args.collection->get("test");

            /*
             * jsc_object line 11
             * dictionary.doSomething(28850);
             * we test here that we successfully read the argument.
             *
             */
            REQUIRE(_num.get_double() == 28850);
        }
    }
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
    SECTION("The Object should contain accessor *X* and method *doSomething*") {
        REQUIRE(JSValueIsBoolean(ctx, arguments[0]) == true);
        bool val = JSValueToBoolean(ctx, arguments[0]);
        REQUIRE(val == true);
    }

    return JSValueMakeUndefined(ctx);
}

/*
    test_accessor(obj, key, number)
    example:

    test_accessor(dictionary, 'X', 666)  // Will look for the field X and 666.
 */
JSValueRef TestingGetterSetter(JSContextRef ctx, JSObjectRef function,
                        JSObjectRef thisObject, size_t argumentCount,
                        const JSValueRef arguments[], JSValueRef* exception) {
    SECTION("Testing accessors I/O for input X") {
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

void TestingEnumeration(std::string& str_param) {
    const char* payload = "{\"X\":666,\"A\":666,\"B\":666,\"C\":666}";
    const char* _str = str_param.c_str();

    std::string e1{payload};
    std::string e2{_str};

    /* Testing that our object support JSON.stringify */
    SECTION("Testing that enumeration works correctly for object {X,A,B,C}") {
        REQUIRE(e1 == e2);
    }
}
void TestingExceptionMessage(std::string& str_param) {
    const char* payload = "Error: No Negative Number Please.";
    const char* _str = str_param.c_str();

    std::string e1{payload};
    std::string e2{_str};

    /*
     *  Testing that we can throw errors to the VM instead of crashing the
     *  whole process.
     */
    SECTION("Testing that our JSC object can throw errors to the VM.") {
        REQUIRE(e1 == e2);
    }
}


TEST_CASE("Testing Object creation on JavascriptCore.") {
    JSC_VM jsc_vm;

    /*
     *  Load print and other functions into the JSC VM.
     *
     */
    TestTools::Load(jsc_vm);

    jsc_vm.make_gbl_fn("assert_true", &Test);
    jsc_vm.make_gbl_fn("test_accessor", &TestingGetterSetter);
    jsc_vm.make_gbl_fn("assert_enumerate", &TestTools::SimpleJSStringFunction<TestingEnumeration>);
    jsc_vm.make_gbl_fn("assert_exception", &TestTools::SimpleJSStringFunction<TestingExceptionMessage>);

    /*
     *  JavascriptObject Instantiation and configuration into JSC.
     *  With null_dictionary is just a Javascript object without a private C++
     * object.
     */
    common::JavascriptObject<MockedGetterSetter>* null_dict =
        new common::JavascriptObject<MockedGetterSetter>{jsc_vm.globalContext};

    TNull* tnull = nullptr;
    null_dict->template add_method<int, T1::test_for_null_data_method>("hello");
    null_dict->template add_method<int, T1::test_for_null_data_method>("alo");
    null_dict->set_observer(tnull);
    null_dict->set_accessor(std::make_unique<MockedGetterSetter>(new MockedCollection(666)));
    null_dict->finalize([=]() {
        /*
         *  Private object should be deallocated just once.
         */

        REQUIRE(null_dict != nullptr);
        delete null_dict;
    });

    JSObjectRef null_dict_js_object = null_dict->create();



    // Adds object to the JS global scope. This way we can call the functions
    // from the VM like this null_dictionary.hello() null_dictionary.alo() for
    // more information look at the jsc_object.js
    jsc_vm.set_obj_prop("null_dictionary", null_dict_js_object);

    /*
     *  Javascript object with private C++ object.
     *  To provide a private object we just need to pass a C++ object that has a
     * IOCollection* get_collection() method and/or ObjectSubscriber.
     */
    common::JavascriptObject<MockedGetterSetter>* _dict =
        new common::JavascriptObject<MockedGetterSetter>{jsc_vm.globalContext};
    _dict->template add_method<int, T1::methods>("doSomething");
    _dict->add_key("X");
    _dict->add_key("A");
    _dict->add_key("B");
    _dict->add_key("C");

    _dict->set_collection(new MockedCollection(666));
    _dict->set_observer(new T1);
    _dict->set_accessor(std::make_unique<MockedGetterSetter>(new MockedCollection(666)));
    _dict->finalize([=]() {
        /*
         *  Private object should be deallocated just once.
         */
        REQUIRE(_dict != nullptr);
        delete _dict;
    });

    auto dict_js_object = _dict->create();


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
     *  Finally as part of the test the VM needs to exit in a succeed state, otherwise we mark the test
     *  as unsuccessful.
     *
     */
    jsc_vm.load_into_vm("./jsc_object.js");
}
