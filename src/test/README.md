## C++ Testing

This folder is a proof of concept to implement testing on CPP, this way we can tame the growing complexity of the C++ codebase while incentivising the production of modular code. Another advantage of this kind of testing is that we can target JavascriptCore VM directly, thus reducing the complexity of our CI by avoiding having to test our library on Mobile emulators or React Native.

## How to use it.

* First [build](https://github.com/realm/realm-js/blob/develop/contrib/how-to-build.md) the main project.
* Then to run the test you should run:

```sh
sh test.sh

===============================================================================
All tests passed (4 assertions in 2 test cases)
```
