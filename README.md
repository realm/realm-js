![Realm](https://github.com/realm/realm-js/raw/master/logo.png)

Realm is a mobile database that runs directly inside phones, tablets or wearables.
This project hosts the JavaScript versions of [Realm](https://realm.io/). Currently we only support React Native (both iOS & Android) and Node.js (on MacOS and Linux) but we are considering adding support for Cordova/PhoneGap/Ionic as well.

## Features

* **Mobile-first:** Realm is the first database built from the ground up to run directly inside phones, tablets and wearables.
* **Simple:** Data is directly [exposed as objects](https://realm.io/docs/javascript/latest/#models) and [queryable by code](https://realm.io/docs/javascript/latest/#queries), removing the need for ORM's riddled with performance & maintenance issues.
* **Modern:** Realm supports relationships, generics, and vectorization.
* **Fast:** Realm is faster than even raw SQLite on common operations, while maintaining an extremely rich feature set.

## Getting Started

Please see the detailed instructions in our docs to use [Realm JavaScript](https://realm.io/docs/javascript/latest/#getting-started). Please notice that currently only node.js version 10 or later are supported.

## Documentation

### Realm React Native and Node.js

The documentation can be found at [realm.io/docs/javascript/latest/](https://realm.io/docs/javascript/latest/).
The API reference is located at [realm.io/docs/javascript/latest/api/](https://realm.io/docs/javascript/latest/api/).

## Getting Help

* **Need help with your code?**: Look for previous questions on the  [#realm tag](https://stackoverflow.com/questions/tagged/realm?sort=newest) — or [ask a new question](https://stackoverflow.com/questions/ask?tags=realm). You can also check out our [Community Forum](https://developer.mongodb.com/community/forums/tags/c/realm/9/realm-sdk) where general questions about how to do something can be discussed.
* **Have a bug to report?** [Open an issue](https://github.com/realm/realm-js/issues/new). If possible, include the version of Realm, a full log, the Realm file, and a project that shows the issue.
* **Have a feature request?** [Open an issue](https://github.com/realm/realm-js/issues/new). Tell us what the feature should do, and why you want the feature.


## Building Realm

In case you don't want to use the precompiled version on npm, you can build Realm yourself from source. You’ll need an Internet connection the first time you build in order to download the core library.

Prerequisites:
* Xcode 9.4+
* node.js version 10 or later
* nvm (on Mac)
* cocoapods (on Mac)
* Android SDK 23+
* [Android NDK 21](https://developer.android.com/ndk/downloads/index.html)

Clone RealmJS repository:

```
git clone https://github.com/realm/realm-js.git
cd realm-js
git submodule update --init --recursive
```

Note: On Windows the RealmJS repo should be cloned with symlinks enabled
```
#run in elevated command prompt
git clone -c core.symlinks=true https://github.com/realm/realm-js
```

or manually create the symlinks using directory junctions if you already have the repo cloned.
```
#run in elevated command prompt
cd realm-js\react-native\android\src\main\jni
#remove src and vendor files
del src
del vendor
mklink /j "src" "../../../../../src/"
mklink /j "vendor" "../../../../../vendor"
cd realm-js\tests\react-test-app\android\app\src\main
#remove assets file
del assets
mklink /j assets "../../../../../data"
```

Note: If you have cloned the repo previously make sure you remove your node_modules directory since it may contain stale dependencies which may cause the build to fail.

### Building for iOS:
* Open `react-native/ios/RealmReact.xcodeproj` in Xcode
* Select `RealmReact` under `Targets`
* Build: `⌘ + B`

### Building for Android:
* `cd react-native/android`
* `./gradlew publishAndroid`
* The compiled version of the Android module is here: `<project-root>/android`

### Building for nodejs:
Be sure you have python2.7 as the default python. 3.x won't work, and it's not enough to use `--python=python2.7` as parameter to npm.
For example you can use Homebrew to install it.
```
brew install python@2
```

```
npm install --build-from-source=realm
```

#### Additional steps for Windows
On Windows you will need to setup the environment for node-gyp:

* Option 1: Install windows-build-tools node package

    ```
    # run in elevated command prompt (as Administrator)
    npm install -g --production windows-build-tools
    ```

* Option 2: Manually install and configure as described in the [node-gyp](https://github.com/nodejs/node-gyp) manual.

    Note you may need to configure the build tools path using npm
    ```
    npm config set msbuild_path "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
    ```

You also need to install openssl libraries with vcpkg:

```
git clone https://github.com/Microsoft/vcpkg
cd vcpkg
bootstrap-vcpkg.bat
vcpkg install openssl:x64-windows-static
mkdir C:\src\vcpkg\installed\x64-windows-static\lib
copy .\packages\openssl-windows_x64-windows-static\lib\libeay32.lib C:\src\vcpkg\installed\x64-windows-static\lib\
copy .\packages\openssl-windows_x64-windows-static\lib\ssleay32.lib C:\src\vcpkg\installed\x64-windows-static\lib
```

### Building docs
API documentation is written using [JSDoc](http://usejsdoc.org/).

* `npm run jsdoc`

The generated docs can be found by opening `docs/output/realm/<version>/index.html`.

## Debugging the node addon

You can use [Visual Studio Code](https://code.visualstudio.com/) to develop and debug. In the `.vscode` folder, configuration for building and debugging has been added for your convience.

VSCode has good support for debugging JavaScript, but to work with C++ code, you are required to install two additional VSCode extensions:

* Microsoft C/C++
* CodeLLDB

To begin, you will need to build the node addon and prepare the test environment:
```
npm install --build-from-source --debug
(cd tests && npm install)
```

Prior to begin debugging, you must start Realm Object Server. In VSCode, under menu *Tasks*/*Run Task*, find *Download and Start Server*.

In the debugging pane, you can find `Debug LLDB + NodeJS` in the dropdown. First select *Start Debugging* in the *Debug* menu.

## Issues with debugging
Some users have reported the Chrome debugging being too slow to use after integrating Realm into their react-native project. This is due to the blocking nature of the RPC calls made through the Realm library. See https://github.com/realm/realm-js/issues/491 for more information. The best workaround is to use Safari instead, as a user has described [here](https://github.com/realm/realm-js/issues/491#issuecomment-404670910).

## Running the tests

The tests will spawn a new shell when running, so you need to make sure that new shell instances use the correct version of `npm`. On Mac you can use Homebrew and you can add the following to your prefered shell setup:

```
export NVM_DIR="$HOME/.nvm"
. "$(brew --prefix nvm)/nvm.sh"
```

Install cocoapods
```
sudo gem install cocoapods
```

You can now use `scripts/test.sh` to run the various tests.
You will need yarn installed on the machine.

`test.sh` options

 * eslint - lints the sources
 * react-tests - runs all React Native tests on iOS Simulator
 * react-tests-android runs all React Native Android tests on Android emulator
 * node - runs all tests for node
 * test-runners - checks supported tests runners are working correctly

If you modify or add a test, please remove `tests/react-test-app/node_modules/realm-tests` before running `test.sh` (of course, only if you are testing with React Native).

### Testing on Windows

On Windows some of these targets are available as npm commands.
```
npm run eslint
npm run node-tests
npm run test-runners
```

## Debugging the tests

You can attach a debugger to react-native tests by passing "Debug" to the `test.sh` script. A Chrome browser will open and connect to the react native application. Use the built-in Chrome Debugger to debug the code.

```
./scripts/tests.sh react-tests Debug
```

Using Visual Studio Code

You can debug node tests using Visual Studio Code. Just use one of the launch configurations.

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](https://realm.io/conduct/).
By participating, you are expected to uphold this code. Please report unacceptable behavior to [info@realm.io](mailto:info+conduct@realm.io).

## Contributing

See [CONTRIBUTING.md](https://github.com/realm/realm-js/blob/master/CONTRIBUTING.md) for more details!

## License

Realm JS is published under a mix of the Apache License 2.0 and the Realm Platform Extensions License.
Realm Core is published under the Apache 2.0 license and is available
[here](https://github.com/realm/realm-core).

**This product is not being made available to any person located in Cuba, Iran,
North Korea, Sudan, Syria or the Crimea region, or to any other person that is
not eligible to receive the product under U.S. law.**

## Feedback

**_If you use Realm and are happy with it, all we ask is that you please consider sending out a tweet mentioning [@realm](https://twitter.com/realm) to share your thoughts_**

**_And if you don't like it, please let us know what you would like improved, so we can fix it!_**

![analytics](https://ga-beacon.appspot.com/UA-50247013-2/realm-js/README?pixel)
