# Building Realm JS

<!-- TOC generated with https://github.com/ekalinin/github-markdown-toc : gh-md-toc --insert --no-backup --hide-footer contrib/building.md -->

<!--ts-->
- [Building Realm JS](#building-realm-js)
  - [Pre-Requisites](#pre-requisites)
    - [Setup instructions for MacOS](#setup-instructions-for-macos)
      - [All platforms](#all-platforms)
      - [iOS](#ios)
      - [Android](#android)
      - [Optional extras](#optional-extras)
        - [ccache](#ccache)
  - [Cloning the repository](#cloning-the-repository)
    - [Cloning the repository on Windows](#cloning-the-repository-on-windows)
    - [Visual Studio Code setup](#visual-studio-code-setup)
      - [TypeScript](#typescript)
      - [C++](#c)
  - [Building Realm JS](#building-realm-js-1)
    - [Building for iOS](#building-for-ios)
    - [Building for Android](#building-for-android)
    - [Building for Node.js](#building-for-nodejs)
      - [Additional steps for Windows](#additional-steps-for-windows)
      - [Building for ARM/Linux](#building-for-armlinux)
    - [Cleaning up build files](#cleaning-up-build-files)
    - [Building the documentation](#building-the-documentation)
  - [Running the tests](#running-the-tests)
    - [Linting the source code](#linting-the-source-code)
      - [JS/TS](#jsts)
      - [C++](#c-1)
    - [Testing on Windows](#testing-on-windows)
    - [Node version setup](#node-version-setup)
  - [Testing against real apps](#testing-against-real-apps)
  - [Debugging](#debugging)
    - [Debugging failing Github Actions CI tests](#debugging-failing-github-actions-ci-tests)
  - [Updating the Android JNI headers](#updating-the-android-jni-headers)
<!--te-->

## Pre-Requisites

The following dependencies are required. All except Xcode can be installed by following the [setup instructions for MacOS section](#setup-instructions-for-macos).

- [Xcode](https://developer.apple.com/xcode/) latest Xcode with command line tools installed
  - The latest Xcode should work, which can be downloaded from [Mac App Store](https://itunes.apple.com/us/app/xcode/id497799835?mt=12). To install older Xcode versions, [Xcodes.app](https://github.com/RobotsAndPencils/XcodesApp) is highly recommended
- [Node.js](https://nodejs.org/en/) version 16 or later
  - We recommend [fnm](https://github.com/Schniz/fnm) or [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) to enable fast switching between Node.js & NPM versions
- [CMake](https://cmake.org/) 3.21.4 or later
- [ClangFormat](https://clang.llvm.org/docs/ClangFormat.html) Used by the binding generator to format C++ code. You can install it through Homebrew: `brew install clang-format`
- [OpenJDK 8](https://openjdk.java.net/install/)
- [Android SDK 23+](https://developer.android.com/studio/index.html#command-tools)
  - Optionally, you can install [Android Studio](https://developer.android.com/studio)
- [Android NDK 23](https://developer.android.com/ndk/downloads/index.html)
- [Android CMake](https://developer.android.com/ndk/guides/cmake)
- [Docker](https://www.docker.com/) is used for testing. You can install it [as a desktop app](https://www.docker.com/products/docker-desktop/) or through Homebrew: `brew install --cask docker`.
- [Ninja](https://ninja-build.org/) `brew install ninja`

Moreover, in order to avoid introducing false positives in our analytics dataset, it is highly recommended to disable analytics by adding the following to your shell configuration:

```sh
export REALM_DISABLE_ANALYTICS=1
```

### Setup instructions for MacOS

#### All platforms

```sh
# Install brew
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Install nvm and cmake
brew install nvm cmake

# Install the latest LTS version of Node.js and set it as the default
nvm install --lts
```

#### iOS

```sh
# Install cmake
brew install cmake
```

#### Android

First, install OpenJDK and Ninja:

```sh
brew install ninja
brew install --cask temurin

# Check this returns: openjdk version "18.0.1" 2022-04-19
# If not, check if you have a JAVA_HOME environment variable set pointing elsewhere.
java -version
```

Next you need to define some environment variables. The best way to do this is in your shell’s configuration file, e.g. `~/.zshrc`, then open a new terminal window or run `source ~/.zshrc` to reload the config. Add the following:

```sh
# Location of your Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk

# Add the Android SDK tools to your PATH
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools
```

Then you can install the SDK and NDK by running: (you can alternatively do this via **Tools > SDK Manager** in Android Studio)

```sh
sdkmanager --install "platforms;android-31"
sdkmanager --install "ndk;23.1.7779620"
sdkmanager --install "cmake;3.18.1"
```

#### Optional extras

##### ccache

To improve compilation speed. you can use [ccache](https://ccache.dev/):

```sh
# Install ccache
brew install ccache

# check path of ccache
which ccache

# Export the ccache variants of compilation tools
export PATH=<ccache location>/libexec:$PATH
```

## Cloning the repository

To clone the Realm JS repository and install git submodules, dependencies, and subpackage dependencies, run:

```sh
git clone https://github.com/realm/realm-js.git
cd realm-js
git submodule update --init --recursive
npm install
```

In order to improve the accuracy of `git blame` locally by ignoring commits in which the code was reformatted by an automated tool, run the following from inside the repository:

```sh
git config blame.ignoreRevsFile .gitignore-revs
```

### Cloning the repository on Windows

On Windows the Realm JS repo should be cloned with symlinks enabled:

```cmd
# run in elevated command prompt
git clone -c core.symlinks=true https://github.com/realm/realm-js
```

or manually create the symlinks using directory junctions if you already have the repo cloned:

[//]: # "TODO: Needs updating:"
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

> [!NOTE]
> If you have cloned the repo previously make sure you remove your `node_modules` directory, as well as any `node_modules` directory of any sub-directory, since it may contain stale dependencies which may cause the build to fail.

### Visual Studio Code setup

Visual Studio Code is the recommended editor for the best experience working with the Realm JS codebase.

#### TypeScript

You should check that VS Code is using the workspace version of TypeScript rather than the VS Code version. This should be automatically configured but does not always seem to take effect. You can do this by:

1. Open the `realm-js` root directory in VS Code and open any TypeScript file
2. Press <kbd>Shift</kbd>+<kbd>Cmd</kbd>+<kbd>P</kbd> to open the command palette
3. Start typing `select typescript version` to select the `TypeScript: Select TypeScript Version` command
4. Ensure `Use Workspace Version` is selected.

#### C++

If you are using Visual Studio Code as your editor, you can get greatly improved C++ Intellisense by installing the [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension, which should be recommended by VS Code when you open the repository. This should prompt you to disable the built in C++ extensions Intellisense, but if not you should do this in Settings, searching for `cpp intelli`.

This extension picks up the `build/compile_commands.json` file generated by CMake (symlinked in the root directory), enabling full Intellisense.

Other editors should also be able to be configured to use the `compile_commands.json` file.

## Building Realm JS

In most cases, it's not required to build the SDK explicitly. You can either simply download the package from `npm` or run one of the test scripts in either of the `integration-tests/environments` (which will drive the dependent build-scripts automatically). If you want to invoke these scripts manually, see the individual sections below:

### Building the SDK

Most of Realm JS is platform independent code (commonly referred to as the SDK), which is built explicitly by running:

```sh
npm run build:ts --workspace realm
```

### Building for iOS

You can build and bundle for iOS by running the following command from the root directory:

```sh
# Pre-build Realm Core into an XCFramework
npm run prebuild-apple --workspace realm
# Generate the JSI binding code (to be compiled when building the consuming app)
npm run bindgen:jsi  --workspace realm
```

The resulting prebuilt binary is stored in `packages/realm/prebuilds/apple`.

### Building for Android

You can build and bundle for Android by running the following command from the root directory:

```sh
# Pre-build Realm Core into a CPack install directory
npm run prebuild-android --workspace realm
# Generate the JSI binding code (to be compiled when building the consuming app)
npm run bindgen:jsi  --workspace realm
```

The resulting prebuilt binary is stored in `packages/realm/prebuilds/android`.

### Building for Node.js

You can build the native prebuilt binary for Node.js by running the following command from the root directory:

```sh
npm run build:node --workspace realm
```

The resulting prebuilt binary is the `packages/realm/prebuilds/node/realm.node` file.

If you want to produce a prebuild (a OS +arch specific archive meant for distribution alongside the NPM archive):

```sh
npm run prebuild-node --workspace realm
```

The resulting prebuilt binary is stored in a `packages/realm/prebuilds/realm-*.tar.gz` file.

#### Additional steps for Windows

On Windows you will need to set up the environment for node-gyp:

- Option 1: Install `windows-build-tools` Node.js package

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

#### Building for ARM/Linux

You can build Realm JS for ARM/Linux from source and include it in your own project.

The following instructions assume you are using [Debian GNU/Linux](https://www.debian.org) or a derived distribution.

First you need to have your build environment set up:

```sh
apt install build-essential cmake git libssl-dev curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source $HOME/.bashrc
nvm install 16 # you can use any supported node version
```

You can now build and bundle Realm JS from source:

```sh
export REALM_USE_SYSTEM_OPENSSL=1
git clone https://github.com/realm/realm-js
cd realm-js
git submodule update —-init —-recursive
npm install --ignore-scripts
npm run build:node --workspace realm
npm run build:ts --workspace realm
```

Finally, you can use Realm JS in your example project `MyProject`:

```sh
cd MyProject
npm init -y  # skip this if you've already initialised your project
npm install path/to/realm-js/packages/realm
```

> [!TIP]
> To run any of the `"scripts"` commands from one of the `package.json` files directly from the root, use the `"name"` value from the target `package.json` as such: `npm run <command name> --workspace <package.json name>`.

### Cleaning up build files

If you need to clean up build files and other untracked files (except for `node_modules` directories), run the following command from the root directory:

```sh
npm run clean
```

### Building the documentation

API documentation is written using [TypeDoc](https://typedoc.org/). To generate the documentation, run the following command from the root directory:

```sh
npm run docs --workspace realm
```

The generated docs can be found in `packages/realm/docs/index.html`.

## Running the tests

See [the instructions in the `integration-tests`](../integration-tests/README.md) directory.

### Linting the source code

#### JS/TS

To lint JavaScript and TypeScript source code files using `eslint`, run the following command from the root directory:

```sh
npm run lint
```

#### C++

To lint C++ source code files using `clang-format`, run the following command from the root directory:

```sh
npm run lint:cpp
```

We use a `.clang-format` file based on the one from `realm-core`, but feel free to modify if required.

[//]: # "TODO: Update the following section?"
### Testing on Windows

On Windows some of these targets are available as npm commands.

```
npm run eslint
npm run node-tests
npm run test-runners
```

### Node version setup

The tests will spawn a new shell when running, so you need to make sure that new shell instances use the correct version of `npm`. If you have Homebrew correctly installed, this should work. If it is not working, you can add the following to your preferred shell configuration:

```sh
export NVM_DIR="$HOME/.nvm"
. "$(brew --prefix nvm)/nvm.sh"
```

## Testing against real apps

Here's the suggested workflow for testing your changes to Realm JS against real apps:

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

## Updating the Android JNI headers

If you add a new JNI method to [`RealmReactModule.java`](https://github.com/realm/realm-js/blob/main/packages/realm/react-native/android/src/main/java/io/realm/react/RealmReactModule.java), you will need to regenerate the auto-generated [header file](https://github.com/realm/realm-js/blob/main/packages/realm/src/android/io_realm_react_RealmReactModule.h).

1. First you need to find some classpaths required to generate the header. In a terminal, `cd ~/.gradle/caches` and then run:
    1. `find "$(pwd -P)" -name "jetified-react-native-0.69.1-debug" -exec find {} -name "classes.jar" \;`
    2. `find "$(pwd -P)" -name "jetified-soloader-0.10.3" -exec find {} -name "classes.jar" \;`
    3. `find "$(pwd -P)" -name "nanohttpd-2.2.0.jar"`
2. Build up a classpath string (e.g. in the terminal or in a text editor):
    1. Start with `~/Library/Android/sdk/platforms/android-31/android.jar`
    2. Add the first result for each of the above find commands to this string, separated by a `:`.

    You should end up with something like: `~/Library/Android/sdk/platforms/android-31/android.jar:~/.gradle/caches/transforms-3/7d342974325594036ab59618107595df/transformed/jetified-react-native-0.69.1-debug/jars/classes.jar:~/.gradle/caches/transforms-3/6c67d7687cdaa9b6d194c80ea9a580e2/transformed/jetified-soloader-0.10.3/jars/classes.jar:~/.gradle/caches/modules-2/files-2.1/org.nanohttpd/nanohttpd/2.2.0/73a02117620b6cc7683a1ed6ae24c2f36e2a715/nanohttpd-2.2.0.jar`
3. Change to the `react-native/android/src/main/java` directory in your Realm JS checkout
4. Run `javac -h ../../../../../src/android/ -classpath <CLASSPATH_STRING> io/realm/react/RealmReactModule.java`, replacing `<CLASSPATH_STRING>` with the string you built up in step 2
5. Delete the `.class` files that the `javac` command created
