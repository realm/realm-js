# Building Realm JS

<!--ts-->
  * [Pre-requisites](#pre-requisites)
    * [Setup instructions for MacOS](#setup-instructions-for-macos)
  * [Cloning the repository](#cloning-the-repository)
  * [Building Realm JS](#building-realm-js-1)
    * [Building for iOS](#building-for-ios)
    * [Building for Android](#building-for-android)
    * [Building for Node.js](#building-for-nodejs)
    * [Building the documentation](#building-the-documentation)
  * [Running the tests](#running-the-tests)
  * [Debugging the tests](#debugging-the-tests)
  * [Sample projects for testing changes](#sample-projects-for-testing-changes)
  * [Testing workflow suggestion with sample apps](#testing-workflow-suggestion-with-sample-apps)
<!--te-->

## Pre-Requisites

The following dependencies are required (all except Xcode can be installed by following the [setup instructions for MacOS](#setup-instructions-for-macos)):

* Xcode 12+ with Xcode command line tools installed
  - Newer versions may work but 12.2 is the current recommended version, which can be downloaded from [Apple](https://developer.apple.com/download/all/?q=xcode%2012.2)
* [Node.js](https://nodejs.org/en/) version 10.19 or later
  - Consider [using NVM](https://github.com/nvm-sh/nvm#installing-and-updating) to enable fast switching between Node.js & NPM versions
* CMake
* OpenJDK 8
* Android SDK 23+
  -  Optionally, you can install [Android Studio](https://developer.android.com/studio)
* [Android NDK 21.0](https://developer.android.com/ndk/downloads/index.html)
* [Android CMake](https://developer.android.com/ndk/guides/cmake)

### Setup instructions for MacOS

#### All platforms

```sh
# Install brew
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Install nvm
brew install nvm

# Install the latest LTS version of Node.js and set it as the default
nvm install --lts
```

#### iOS

```sh
# Install cocoapods and cmake
brew install cocoapods cmake
```

#### Android

First, install OpenJDK 8 (later versions are not compatible with the project and with Android's `sdkmanager` tool):

```sh
brew tap AdoptOpenJDK/openjdk
brew install --cask adoptopenjdk8

# Check this returns: openjdk version "1.8.0_292".
# If not, check if you have a JAVA_HOME environment variable set pointing elsewhere.
java -version
```

Next you need to define some environment variables. The best way to do this is in your shell’s configuration file, e.g. `~/.zshrc`, then open a new terminal window or `source ~/.zshrc` to reload the config. Add the following:

```sh
# Location of your Android SDK
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

# Location of your Android NDK
export ANDROID_NDK_HOME=$ANDROID_SDK_ROOT/ndk/21.0.6113669
export ANDROID_NDK=$ANDROID_NDK_HOME

# Other required locations
export ANDROID_SDK_HOME=$HOME/.android
export ANDROID_EMULATOR_HOME=$HOME/.android
export ANDROID_AVD_HOME=$HOME/.android/avd

# Add the Android SDK tools to your PATH
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
```

Then you can install the SDK, NDK and CMake by running: (you can alternatively do this via **Tools > SDK Manager** in Android Studio)

```sh
sdkmanager --install "platforms;android-31"
sdkmanager --install "ndk;21.0.6113669"
sdkmanager --install "cmake;3.18.1"
```

#### Optional extras

##### ccache

To improve compilation speed. you can use [ccache](https://ccache.dev/):

```sh
# Install ccache
brew install ccache

# Export the ccache variants of compilation tools
export PATH=/usr/local/opt/ccache/libexec:$PATH
```

## Cloning the repository

To clone the RealmJS repository and install git submodules:

```sh
git clone https://github.com/realm/realm-js.git
cd realm-js
git submodule update --init --recursive
```

### Installing the project's sub-packages

We've decided to slowly migrate this repository to a mono-repository containing multiple packages (stored in the `./packages` directory). To install and link these, run (from the `realm-js` repo root directory):

```sh
npx lerna bootstrap
```

Please familiarise yourself with [Lerna](https://github.com/lerna/lerna) to learn how to add dependencies to these packages.

### Cloning the repository on Windows

On Windows the RealmJS repo should be cloned with symlinks enabled:

```cmd
# run in elevated command prompt
git clone -c core.symlinks=true https://github.com/realm/realm-js
```

or manually create the symlinks using directory junctions if you already have the repo cloned:

```cmd
# run in elevated command prompt
cd realm-js\react-native\android\src\main\jni
# remove src and vendor files
del src
del vendor
mklink /j "src" "../../../../../src/"
mklink /j "vendor" "../../../../../vendor"
cd realm-js\tests\ReactTestApp\android\app\src\main
# remove assets file
del assets
mklink /j assets "../../../../../data"
```

Note: If you have cloned the repo previously make sure you remove your `node_modules` directory since it may contain stale dependencies which may cause the build to fail.

## Building Realm JS

### Building for iOS

* Run `./scripts/build-ios.sh` from the `realm-js` root directory

### Building for Android

* Run `node scripts/build-android.js` from the `realm-js` root directory
  -  The compiled version of the Android module is output to `<project-root>/android`

### Building for Node.js

You can build for Node.js by running the command:

```sh
npm run build
```

If you want to build for Apple Silicon on an Intel based Mac, you can use the following command instead:

```sh
 npm run build-m1
 ```

#### Additional steps for Windows

On Windows you will need to setup the environment for node-gyp:

* Option 1: Install windows-build-tools Node.js package

    ```cmd
    # run in elevated command prompt (as Administrator)
    npm install -g --production windows-build-tools
    ```

* Option 2: Manually install and configure as described in the [node-gyp](https://github.com/nodejs/node-gyp) manual.

    Note you may need to configure the build tools path using npm

    ```cmd
    npm config set msbuild_path "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
    ```

You also need to install openssl libraries with vcpkg:

```cmd
git clone https://github.com/Microsoft/vcpkg
cd vcpkg
bootstrap-vcpkg.bat
vcpkg install openssl:x64-windows-static
mkdir C:\src\vcpkg\installed\x64-windows-static\lib
copy .\packages\openssl-windows_x64-windows-static\lib\libeay32.lib C:\src\vcpkg\installed\x64-windows-static\lib\
copy .\packages\openssl-windows_x64-windows-static\lib\ssleay32.lib C:\src\vcpkg\installed\x64-windows-static\lib
```

### Building the documentation

API documentation is written using [JSDoc](http://usejsdoc.org/). To generate the documentation, run:

```npm run jsdoc```

The generated docs can be found in `docs/output/realm/<version>/index.html`.

## Running the tests

To run the the tests, run the `scripts/test.sh` script, passing an argument for which tests you would like to execute. The following options are available:

* `eslint` - lints the sources
* `react-tests` - runs all React Native tests on iOS Simulator
* `react-tests-android` - runs all React Native Android tests on Android emulator
* `node` - runs all tests for Node.js
* `test-runners` - checks supported tests runners are working correctly

For example:

```sh
scripts/test.sh node
```

### Testing on Windows

On Windows some of these targets are available as npm commands.
```
npm run eslint
npm run node-tests
npm run test-runners
```

### Node version setup

The tests will spawn a new shell when running, so you need to make sure that new shell instances use the correct version of `npm`. If you have Homebrew correctly installed, this should work – if it is not working, you can add the following to your preferred shell configuration:

```sh
export NVM_DIR="$HOME/.nvm"
. "$(brew --prefix nvm)/nvm.sh"
```

## Debugging the tests

### Debugging React Native tests

You can attach a debugger to the React Native tests by passing "Debug" to the `test.sh` script. A Chrome browser will open and connect to the react native application. Use the built-in Chrome Debugger to debug the code.

```sh
./scripts/tests.sh react-tests Debug
```

### Debugging Node.js tests using Visual Studio Code

You can use [Visual Studio Code](https://code.visualstudio.com/) to develop and debug for Node.js. In the `.vscode` folder, configuration for building and debugging has been added for your convience.

VSCode has good support for debugging JavaScript, but to work with C++ code, you are required to install two additional VSCode extensions:

* Microsoft C/C++
* CodeLLDB

To begin, you will need to build the Node addon and prepare the test environment:
```sh
npm install --build-from-source --debug
(cd tests && npm install)
```

Prior to begin debugging, you must start Realm Object Server. In VSCode, under menu *Tasks*/*Run Task*, find *Download and Start Server*.

In the debugging pane, you can find `Debug LLDB + Node.js` in the dropdown. First select *Start Debugging* in the *Debug* menu.

## Sample projects for testing changes

To test your changes on React Native you can clone this sample project:

```sh
git clone https://github.com/cesarvr/react-native-realm sample-rn-project
cd sample-rn-project
npm install
```

To test your changes on Node.js you can clone this sample project:

```sh
git clone https://github.com/cesarvr/hello-world-realm-js hello-sync
cd hello-sync
npm install
```

## Testing workflow suggestion with sample apps

This is one suggested workflow for testing your changes against the two sample apps, making use of a script to automatically copy any changes from the `realm-js` project into the two sample projects.

### Deploying Changes

Right now you should have three folders:

```sh
  realm-js  # realm-js source code.

  hello-sync # Node.js project using realm.
  sample-rn-project # the sample react-native project.
```

What you want to do is to do all your work on the `realm-js` project and use the other two projects to test and deploy any new changes.

To do that you can use the help of this tool:

```sh
  cd realm-js  # Jump to the realm-js root folder.
  curl https://raw.githubusercontent.com/cesarvr/dev-lnk/master/index.js -o nlk.js # Download the file in there.
```

You can configure this tool to watch some sections of your ``realm-js`` and deploy those changes automatically to any of those projects.

Once you have the script you just need to go to the bottom and configure the files/folder you want to watch and update in your target, something similar to this:

```js
syncByAppend(
  '<source-folder>', // Source folder...
  '<target-folder>', // Target folder...
  <RegExp> /* Regular expression to match and update */
)
```

### Android

First let's configure the ```nlk.js``` tool to watch for Android changes and deploy this into the React Native project.

Open ```nlk.js``` with your favourite text editor like ``vim``, go to the bottom and add:

```js
syncByAppend(
  './react-native/android/build/realm-react-ndk/all', // Source folder...
  '../sample-rn-project/node_modules/realm/android/src/main/jniLibs', // Target folder...
  RegExp('librealmreact.so'))  // copy librealmreact.so if a change has been detected...
```

> As you can see this is just a dumb script that copy files anytime they change... you can use [Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to handle more complex scenarios.


After adding that you can run it by doing:

```sh
node nlk.js # it will sleep and wait for changes...
```

#### Building for Android

Open a new terminal tab and start doing your changes on the ``realm-js/src`` folder for example and once your are ready you can build an Android binary by doing:

```sh
# from the realm-js root folder...

cd react-native/android/ # enter the React Native Android project.
./gradlew publishAndroid # Take a coffee...
```

As soon as the compilation finish this module will be deployed into the React Native project (``sample-rn-project``).


If you visit the script tab you will see the files that have been sync:

```sh
sync done for: librealmreact.so.  11:54:30   # arm
sync done for: librealmreact.so.  11:54:30   # x86
sync done for: librealmreact.so.  11:54:30   # x64 ...
sync done for: librealmreact.so.  11:54:30

```
> This will trigger any time a new binary object is created...

Now you can just can navigate to the React Native project and do:

```sh
npx react-native run-android
```

### iOS

For iOS the things is a bit different as per today we don't ship a pre-compiled binary like we do on Android.

But we can keep the source files in sync between the main source of truth the ``realm-js`` folder against the iOS project embedded in the React Native project (```sample-rn-project```).

First as we did with the Android project we add a new entry to the script:

```js
// Android
syncByAppend('./react-native/android/build/realm-react-ndk/all',
            '../sample-rn-project/node_modules/realm/android/src/main/jniLibs',
            RegExp('librealmreact.so'))

// iOS
syncByAppend('./src',
             '../sample-rn-project/node_modules/realm/src',
             RegExp('.*'))
```

Now if make a change in the ```realm-js/src``` folder you will see this change propagate to your React Native project.

```sh
sync done for: js_logger.hpp.  12:54:26
sync done for: js_logger.hpp.  12:54:26
```

#### Building for iOS

Now you can just open the xcode project in ```sample-rn-project``` by doing:

```sh
cd sample-rn-project/ios/
pod install # Install iOS dependencies

open sample-rn-project/ios/MyAwesomeRealmApp.xcworkspace
#or just open MyAwesomeRealmApp.xcworkspace if you are inside the folder
```

After that you can press ```CMD + B``` and see your changes compiled, then you do ```CMD + R``` and you run the new code on the emulator.

### Node.js

In Node.js, we need to sync the module generated using the included Node.js [GYP](https://gyp.gsrc.io/).

Assuming we have the same folder structure:

```sh
  realm-js  # realm-js source code.

  hello-sync # Node.js project using realm.
  sample-rn-project # the sample react-native project.
```

We jump to the ``realm-js`` root folder and open the ```nlk.js``` script, jump to the bottom and add:

```js
// Android
syncByAppend('./react-native/android/build/realm-react-ndk/all',
            '../sample-rn-project/node_modules/realm/android/src/main/jniLibs',
            RegExp('librealmreact.so'))

// iOS
syncByAppend('./src',
             '../sample-rn-project/node_modules/realm/src',
             RegExp('.*'))


// Node.js  [ New ]
syncByAppend('./compiled',
          '../hello-sync/node_modules/realm/compiled',
          RegExp('realm.node'))

```

That's it run the script to start watching/sync for files:

```sh
node nlk.js
```

#### Building for Node.js

Then once you are fine with changes, you just need to compile the Node.js module using:

```sh
npm install --build-from-source=realm  # Take a coffee...

#... events from nlk ...
#sync done for: realm.node.  13:8:26
#sync done for: realm.node.  13:8:26

```

Once that finish you can go to your Node.js project (``hello-sync``) and try your changes.
