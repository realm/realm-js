# Building Realm JS

<!-- TOC generated with https://github.com/ekalinin/github-markdown-toc : gh-md-toc --insert --no-backup --hide-footer contrib/building.md -->

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
      * [Visual Studio Code setup](#visual-studio-code-setup)
         * [TypeScript](#typescript)
         * [C++](#c)
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
         * [JS](#js)
         * [C++](#c-1)
         * [Testing on Windows](#testing-on-windows)
         * [Node version setup](#node-version-setup)
   * [Testing against real apps](#testing-against-real-apps)
   * [Debugging](#debugging)
      * [Debugging failing Github Actions CI tests](#debugging-failing-github-actions-ci-tests)
<!--te-->

## Pre-Requisites

The following dependencies are required. All except Xcode can be installed by following the [setup instructions for MacOS section](#setup-instructions-for-macos).

- [Xcode](https://developer.apple.com/xcode/) 13+ with Xcode command line tools installed
  - Newer versions may work but 13.1 is the current recommended version, which can be downloaded from [Apple](https://developer.apple.com/download/all/?q=xcode%2013.1)
- [Node.js](https://nodejs.org/en/) version 10.19 or later
  - Consider [using NVM](https://github.com/nvm-sh/nvm#installing-and-updating) to enable fast switching between Node.js & NPM versions
- [CMake](https://cmake.org/)
- [OpenJDK 8](https://openjdk.java.net/install/)
- [Android SDK 23+](https://developer.android.com/studio/index.html#command-tools)
  - Optionally, you can install [Android Studio](https://developer.android.com/studio)
- [Android NDK 21.0](https://developer.android.com/ndk/downloads/index.html)
- [Android CMake](https://developer.android.com/ndk/guides/cmake)

Moreover, in order to avoid introducing false positives in our analytics dataset, it is highly recommended to disable analytics by adding the following to your shell configuration:

```sh
export REALM_DISABLE_ANALYTICS=1
```

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

In order to improve the accuracy of `git blame` locally by ignoring commits in which the code was reformatted by an automated tool, run: `git config blame.ignoreRevsFile .gitignore-revs` from inside the repository.

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

### Visual Studio Code setup

Visual Studio Code is the recommended editor for the best experience working with the Realm JS codebase.

#### TypeScript

You should check that VS Code is using the workspace version of TypeScript rather than the VS Code version. This should be automatically configured but does not always seem to take effect. You can do this by:

1. Open the `realm-js` root directory in VS Code and open any TypeScript file
2. Press Shift+Cmd+P to open the command palette
3. Start typing `select typescript version` to select the `TypeScript: Select TypeScript Version` command
4. Ensure `Use Workspace Version` is selected.

#### C++

If you are using Visual Studio Code as your editor, you can get greatly improved C++ Intellisense by installing the [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension, which should be recommended by VS Code when you open the repository. This should prompt you to disable the built in C++ extensions Intellisense, but if not you should do this in Settings, searching for `cpp intellisense`.

This extension picks up the `build/compile_commands.json` file generated by CMake (symlinked in the root directory), enabling full Intellisense.

Other editors should also be able to be configured to use the `compile_commands.json` file.

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

We've decided to slowly migrate this repository to a mono-repository containing multiple packages (stored in the `./packages` directory).
To install and link these, run (from the `realm-js` repo root directory):

```sh
npm install
```

Please ensure you run with NPM v8 and familiarise yourself with NPM workspaces: https://docs.npmjs.com/cli/v8/using-npm/workspaces

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

#### JS

Run `npm run lint` to lint the JS source code using `eslint`.

#### C++

Run `npm run lint:cpp` to lint the C++ source code using `clang-format`. We use a `.clang-format` based on the one from `realm-core`, but should feel free to modify if required.

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

## Testing against real apps

There are a couple of suggested workflows for testing your changes to Realm JS against real apps:

- [Guide: Setting up watchman to copy changes from this package to an app](guide-watchman.md)
- [Guide: Testing your changes against sample apps using a script](guide-testing-with-sample-apps.md)

## Debugging

See [Debugging C++](debugging-cpp.md) and [Debugging React Native](debugging-react-native.md).

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

