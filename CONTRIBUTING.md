# Contributing

## Filing Issues

Whether you find a bug, typo or an API call that could be clarified, please [file an issue](https://github.com/realm/realm-js/issues) on our GitHub repository.

When filing an issue, please provide as much of the following information as possible in order to help others fix it:

1. **Goals**
2. **Expected results**
3. **Actual results**
4. **Steps to reproduce**
5. **Code sample that highlights the issue** (full Xcode / Android Studio projects that we can compile ourselves are ideal)
6. **Version of Realm / Xcode/ Android Studio/ OSX/ WIN**

If you'd like to send us sensitive sample code to help troubleshoot your issue, you can email <help@realm.io> directly.

## Contributing Enhancements

We love contributions to Realm! If you'd like to contribute code, documentation, or any other improvements, please [file a Pull Request](https://github.com/realm/realm-js/pulls) on our GitHub repository. Make sure to accept our [CLA](#cla).

### Commit Messages

Although we don’t enforce a strict format for commit messages, we prefer that you follow the guidelines below, which are common among open source projects. Following these guidelines helps with the review process, searching commit logs and documentation of implementation details. At a high level, the contents of the commit message should convey the rationale of the change, without delving into much detail. For example, `setter names were not set right` leaves the reviewer wondering about which bits and why they weren’t “right”. In contrast, `[RLMProperty] Correctly capitalize setterName` conveys almost all there is to the change.

Below are some guidelines about the format of the commit message itself:

* Separate the commit message into a single-line title and a separate body that describes the change.
* Make the title concise to be easily read within a commit log.
* Make the body concise, while including the complete reasoning. Unless required to understand the change, additional code examples or other details should be left to the pull request.
* If the commit fixes a bug, include the number of the issue in the message.
* Use the first person present tense - for example "Fix …" instead of "Fixes …" or "Fixed …".
* For text formatting and spelling, follow the same rules as documentation and in-code comments — for example, the use of capitalization and periods.
* If the commit is a bug fix on top of another recently committed change, or a revert or reapply of a patch, include the Git revision number of the prior related commit, e.g. `Revert abcd3fg because it caused #1234`.

### CLA

Realm welcomes all contributions! The only requirement we have is that, like many other projects, we need to have a [Contributor License Agreement](https://en.wikipedia.org/wiki/Contributor_License_Agreement) (CLA) in place before we can accept any external code. Our own CLA is a modified version of the Apache Software Foundation’s CLA.

[Please submit your CLA electronically using our Google form](https://docs.google.com/forms/d/1bVp-Wp5nmNFz9Nx-ngTmYBVWVdwTyKj4T0WtfVm0Ozs/viewform?fbzx=4154977190905366979) so we can accept your submissions. The GitHub username you file there will need to match that of your Pull Requests. If you have any questions or cannot file the CLA electronically, you can email <help@realm.io>.

### Guidelines

Adding new functionality to Realm JavaScript requires that you modify a few places in the repository. As an example, consider adding a function `crashOnStart()` to the class `Realm`. The subsections below guides you through where and what to add.

#### Add the function

First, add a prototype of function to `src/js_realm.hpp`; look for a section marked by the comment `// method`. The prototype looks like:

```
static void crashOnStart(ContextType, FunctionType, ObjectType, size_t, const ValueType[], ReturnValue &);
```

You have to implement the function. Find a place in `src/js_realm.hpp` to add it (maybe at the end):

```
template<typename T>
void RealmClass<T>::crashOnStart(ContextType ctx, FunctionType, ObjectType this_object, size_t argc, const ValueType arguments[], ReturnValue &return_value) {
    validate_argument_count(argc, 0); // <- the function doesn't take any arguments

    SharedRealm realm = *get_internal<T, RealmClass<T>>(this_object); // <- unwrap the Realm instance

    // add the actual implement ...
}
```

Testing is important, and in `tests/js/realm-tests.js` you can add the tests you need.

Note: If your new API and/or test cases are not getting picked up when running the Android or iOS tests, remove the corresponding installed package from react-test-app and try again.

```
rm -rf  tests/react-test-app/node_modules/realm
rm -rf  tests/react-test-app/node_modules/realm-tests
```

#### Wrap the function

In order to call the C++ implementation, the JavaScript engine has to know about the function. You must simply add it to the map of methods/functions. Find `MethodMap<T> const methods` declaration in `src/js_realm.hpp` and add your function to it:

```
{"crashOnStart", wrap<crashOnStart>},
```

#### Update the RPC protocol

This is required for the Chrome Debugger to work with React Native. If the method added is a pure Javascript function, 
you can skip this step as it will work automatically. If the method is a C++ method you will
need to manually update the RPC protocol.

If the method is an instance method you need to:

* Add your function to the relevant list of methods in `lib/browser/index.js` or one of the subclasses in `lib/browser/`.

If the method is static method you need to:

* Add function name to `lib/browser/index.js` or the relevant class under `lib/browser/`. It should forward the method
  call to an RPC method, e.g like:
  
```
const Sync = {
    "_myMethod": function(arg) {
        rpc._myMethod(arg);
    },
    // ...
};
```
  
* Add the RPC sender method to `/lib/browser/rpc.js`.
* Add the RPC receiver endpoint in `/src/rpc.cpp`.

#### The final details

To finish adding your new function, you will have to add your function a few places:

* In `lib/index.d.ts` you add the TypeScript declaration
* Documentation is added in `docs/realm.js`
* Add an entry to `CHANGELOG.md` if applicable (Breaking changes/Enhancements/Bug fixes)

### Updating Object Store

Object Store is the cross platform abstraction shared between all language bindings supported by Realm.
It is found [here](https://github.com/realm/realm-object-store).

It is included in Realm JS as a Git submodule under `/src/object-store`.

In order to pull in new versions checkout the appropriate commit and add the commit to the `### Internal`
section of the changelog.

If the Object Store commit contains new files, it is necessary to update some Realm JS files due to how the project
is built. These files are:

* Android: `/react-native/android/src/main/jni/Android.mk`
* iOS: `/Realm.xcodeworkspace`: Open in XCode and add the files to RealmJS under `Build Phases`
* Node: `/realm.gypi`


