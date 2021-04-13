## C++ Testing

This folder is a *proof of concept* to implement testing on CPP, at the moment is being use to test Dictionary works for [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore). Testing this in isolation
can provide a way to simplify the complex C++ codebase while at the same time provides incentives to write more modular code. 

Another advantage of this kind of testing is that we can target [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore) VM directly reducing the need of complicated setups and increasing the development speed.

## Whats Included
* [Catch2 v3](https://github.com/catchorg/Catch2). This is a testing framework for C++.
* **test_bed.hpp**  Here you will find some helper functions to make JSC development less verbose. 
* **test.sh** This script compiles and run the tests, the test can be found in main.cpp 
  in the root folder.  
  
  #### Example
    ```cpp
     #include "catch_amalgamated.hpp"
     #include "test_bed.hpp"
  
     TEST_CASE("Testing Object creation on JavascriptCore.") {
        // Start JSC framework.  
        JSC_VM jsc_vm;
  
        // Classes that do some some JSC work.
        MyModule module{jsc_vm.globalContext};
    
        // Adding a field to the global object.
        jsc_vm.set_obj_prop("my_object", module.field());
  
        // Run a script on JSC. 
        jsc_vm.vm("function() { my_object() }();");
      }

    ```

## How to use it.

* First [build](https://github.com/realm/realm-js/blob/develop/contrib/how-to-build.md) the main project.
* Then to run the test you should run:

```sh
# To compile the tests
sh test.sh

# To run 
./testing.o


===============================================================================
All tests passed (4 assertions in 2 test cases)
```
