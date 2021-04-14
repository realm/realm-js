# How To Test C++ And JS

Usually to test against Javascript Core (JSC) we have to boot up an Android emulator, with all its dependencies (SDK, NDK, etc.) and then
go through the suffering of having to create/load a react-native dummy app. Usually this way of working will require at between `20-40G` of space and lots of patience.

To avoid all that pain we should target JSC directly and avoid the expensive middlemen for all code that aims directly to JSC (roughly 90%) and while 
doing it, we can enjoy the added benefit of also unit test our C++ codebase and improve the overall quality of our SDK. 

>As a *proof of concept* this folder includes Dictionary tests against [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore).

### API's

To achieve this we can use the following libraries:  

* [Catch2](https://github.com/catchorg/Catch2): This is a testing framework for C++.
* [test_bed](https://github.com/realm/realm-js/blob/5264c05d090e6158b33b5bda7e77b2a32c017e5d/src/test/test_bed.hpp)  Here you will find some helper functions to make JSC development less verbose.

We got [Catch2](https://github.com/catchorg/Catch2) for C++ only modules and the `test_bed` module which include nice tools to test C++ code that affects JSC.

### Quick Example

Here we have some C++ code that creates a JS object and we want to test if the object supports ``JSON.stringify``, 
to test this first we make a C++ / JS function that will receive a string resulted from the transformation, 
we can define this assert function like this:


### Assert Function

```cpp
     #include "catch_amalgamated.hpp"
     #include "test_bed.hpp"
     
      /* 
       *  Testing JS object enumeration.
       */
      void TestingEnumeration(std::string& str_param) {
        const char* payload = "{\"x\":666,\"y\":666 }";
        const char* _str = str_param.c_str();
    
        std::string e1{payload};
        std::string e2{_str};
    
        /* Testing that our object support JSON.stringify */
        SECTION("Testing that enumeration works correctly for object {x, y}") {
            REQUIRE(e1 == e2);
        }
      }
  ```

This function receives a string that hopefully will match the `payload` string that represents the object after 
the function `JSON.stringify` has been applied, the we use Catch2 `SECTION/REQUIRE` to assert that this is true. 


### Starting The Javascript VM 

Starting the VM is simple, we can do it as part of another test case so that anything we pass don't crash the VM and if 
it does our tests fails. 


```cpp
   TEST_CASE("Testing Object creation on JavascriptCore.") {
         JSC_VM jsc_vm;

        /*
         *  Helper functions for the JSC VM.
         *
         */
        TestTools::Load(jsc_vm);
        
        /*
         * like this helper function SimpleJSStringFunction which makes: 
         *  fn(string) -> C++ fn(std::string)
         */
   
        jsc_vm.make_gbl_fn("assert_enumerate", &TestTools::SimpleJSStringFunction<TestingEnumeration>);

        jsc_vm.load_into_vm("./jsc_object.js"); 
}
```
> Also is a good opportunity to bind our assert function into the JS function with the name ``assert_enumerate``, for
> this we can use the `SimpleJSStringFunction` that takes a C++ function that takes a string, into a 
> JS function that does the same similar to ``void(std::string) -> (str)=>``.

To pass this test we can to this: 

```c++
 jsc_vm.vm("assert_enumerate(JSON.stringify({x:666, y:666}))");
````
> `jsc_vm.vm` Will run a JS script passed as string.  

### Loading a Script

To test more complicated cases we can load an entire JS file into the VM for example:

   ```js
    /* the my_object is a global object created by C++ (see above) */
    my_object.x = 666;  //testing x accessor
    my_object.y = 666;  //testing y accessor

    /* Here test that our object supports JSON.stringify  */
    let json = JSON.stringify(my_object);
    
    /* We test if this is correct by sending our string to C++ land. */
    assert_enumerate(json);
   ```  
> Let's call this file `main.js`.

Now we can write a test like this:

```cpp
  /*
   *  Previous boilerplate should be here...
   */

   MyJSObject my_obj{ jsc_vm.globalContext }; 
   auto js_object = my_obj->create();
        
  // We add the object to the global scope. 
  jsc_vm.set_obj_prop("my_object", js_object);

  // Run a script on JSC. 
  jsc_vm.load_into_vm("./main.js");
```
> Not bad at all, but the real aim of this is to be able to load in the future and integrate pure JS Frameworks, i.e., 
> [ChaiJS](https://www.chaijs.com/).

## Running

* First [build](https://github.com/realm/realm-js/blob/develop/contrib/how-to-build.md) the main project.
* Then to run the test you should run the ``test.sh`` script included in this folder:

```sh
# To compile the tests
sh test.sh

# To run 
./testing.o


===============================================================================
All tests passed (4 assertions in 2 test cases)
```
