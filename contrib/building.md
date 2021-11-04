# Building Realm JS

<!-- TOC generated with https://github.com/ekalinin/github-markdown-toc: gh-md-toc --insert contrib/building.md -->

<!--ts-->
* [Building Realm JS](#building-realm-js)
   * [Pre-Requisites](#pre-requisites)
      * [Setup instructions for MacOS](#setup-instructions-for-macos)
         * [All platforms](#all-platforms)
         * [iOS](#ios)
         * [Android](#android)
         * [Optional extras](#optional-extras)
            * [ccache](#ccache)
   * [Cloning the repository](#cloning-the-repository)
      * [Cloning the repository on Windows](#cloning-the-repository-on-windows)
   * [Building Realm JS](#building-realm-js-1)
      * [Building for iOS](#building-for-ios)
      * [Building for Android](#building-for-android)
      * [Building for Node.js](#building-for-nodejs)
         * [Additional steps for Windows](#additional-steps-for-windows)
      * [Building the documentation](#building-the-documentation)
   * [Installing the project's sub-packages](#installing-the-projects-sub-packages)
   * [Running the tests](#running-the-tests)
      * [Modern tests](#modern-tests)
      * [Legacy tests](#legacy-tests)
      * [Linting the source code](#linting-the-source-code)
         * [Testing on Windows](#testing-on-windows)
         * [Node version setup](#node-version-setup)
   * [Debugging the tests](#debugging-the-tests)
      * [Debugging React Native tests](#debugging-react-native-tests)
      * [Debugging Node.js tests using Visual Studio Code](#debugging-nodejs-tests-using-visual-studio-code)
      * [Debugging failing Github Actions CI tests](#debugging-failing-github-actions-ci-tests)
   * [Testing against real apps](#testing-against-real-apps)

<!-- Added by: tom.duncalf, at: Thu  4 Nov 2021 12:06:47 GMT -->

<!--te-->

## Pre-Requisites

The following dependencies are required. All except Xcode can be installed by following the [setup instructions for MacOS section](#setup-instructions-for-macos).

- [Xcode](https://developer.apple.com/xcode/) 12+ with Xcode command line tools installed
  - Newer versions may work but 12.2 is the current recommended version, which can be downloaded from [Apple](https://developer.apple.com/download/all/?q=xcode%2012.2)
- [Node.js](https://nodejs.org/en/) version 10.19 or later
  - Consider [using NVM](https://github.com/nvm-sh/nvm#installing-and-updating) to enable fast switching between Node.js & NPM versions
- [CMake](https://cmake.org/)
- [OpenJDK 8](https://openjdk.java.net/install/)
- [Android SDK 23+](https://developer.android.com/studio/index.html#command-tools)
  - Optionally, you can install [Android Studio](https://developer.android.com/studio)
- [Android NDK 21.0](https://developer.android.com/ndk/downloads/index.html)
- [Android CMake](https://developer.android.com/ndk/guides/cmake)

### Setup instructions for MacOS

#### All platforms

```sh
# Install brew
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Install nvm
brew install nvm

# Install the latest LTS version of Node.js and set it as the default
nvm install --lts

# Install the project's JavaScript dependencies
npm install
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

- Run `./scripts/build-ios.sh` from the `realm-js` root directory

### Building for Android

- Run `node scripts/build-android.js` from the `realm-js` root directory
  - The compiled version of the Android module is output to `<project-root>/android`

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

- Option 1: Install windows-build-tools Node.js package

  ```cmd
  # run in elevated command prompt (as Administrator)
  npm install -g --production windows-build-tools
  ```

- Option 2: Manually install and configure as described in the [node-gyp](https://github.com/nodejs/node-gyp) manual.

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

`npm run jsdoc`

The generated docs can be found in `docs/output/realm/<version>/index.html`.

## Installing the project's sub-packages

We've decided to slowly migrate this repository to a mono-repository containing multiple packages (stored in the `./packages` directory). To install and link these, run (from the `realm-js` repo root directory):

```sh
npx lerna bootstrap
```

Note: you must successfuly build Realm JS for [iOS](#building-for-ios) and [Android](#building-for-android) before running `lerna`, or the command may fail.

Please familiarise yourself with [Lerna](https://github.com/lerna/lerna) to learn how to add dependencies to these packages.

## Running the tests

There are two sets of tests for Realm JS, one legacy and one modern. The intention is to move all tests over to the modern set, but for now you will need to execute both sets of tests.

### Modern tests

See [the instructions in the `integration-tests`](../integration-tests/README.md) directory.

### Legacy tests

To run the the tests, run the `scripts/test.sh` script, passing an argument for which tests you would like to execute. The following options are available:

- `react-tests` - runs all React Native tests on iOS Simulator
- `react-tests-android` - runs all React Native Android tests on Android emulator
- `node` - runs all tests for Node.js
- `test-runners` - checks supported tests runners are working correctly

For example:

```sh
scripts/test.sh node
```

### Linting the source code

Run `npm run lint` to lint the source code using `eslint`.

#### Testing on Windows

On Windows some of these targets are available as npm commands.

```
npm run eslint
npm run node-tests
npm run test-runners
```

#### Node version setup

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

- Microsoft C/C++
- CodeLLDB

To begin, you will need to build the Node addon and prepare the test environment:

```sh
npm install --build-from-source --debug
(cd tests && npm install)
```

Prior to begin debugging, you must start Realm Object Server. In VSCode, under menu _Tasks_/_Run Task_, find _Download and Start Server_.

In the debugging pane, you can find `Debug LLDB + Node.js` in the dropdown. First select _Start Debugging_ in the _Debug_ menu.

### Debugging failing Github Actions CI tests

To debug failing Github Actions CI tests, it can be helpful to `ssh` into the runner and test out the CI commands manually. This Github Action can be used to add a step into the workflow which pauses it and outputs details to `ssh` into it: https://github.com/marketplace/actions/debugging-with-tmate

The relevant snippet is:

```
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
  with:
      limit-access-to-actor: true
  timeout-minutes: 30
```

## Testing against real apps

There are a couple of suggested workflows for testing your changes to Realm JS against real apps:

- [Guide: Setting up watchman to copy changes from this package to an app](guide-watchman.md)
- [Guide: Testing your changes against sample apps using a script](guide-testing-with-sample-apps.md)
