# Install the React Native SDK
The Realm SDK for React Native enables development of [React Native](https://facebook.github.io/react-native/) applications using the JavaScript
and TypeScript languages. React Native enables you to build cross-platform
iOS and Android apps with a single codebase using the
[React](https://react.dev/) framework.

## Prerequisites
Before getting started, ensure your development environment
meets the following prerequisites. These are required for the latest version
of the React Native SDK:

- Follow the [official React Native CLI Quickstart instructions](https://reactnative.dev/docs/environment-setup)
to set up your environment.
- React Native v0.71.4 or later. Check out the [compatibility chart](https://github.com/realm/realm-js/blob/master/COMPATIBILITY.md)
to determine which version of React Native is compatible with specific
React Native SDK versions.

> **NOTE:**
> For [React Native version 0.64 and below](https://reactnative.dev/versions), you must take additional steps  to
build your application when using Mac Catalyst.
>

### Use the SDK with Expo
You can use the React Native SDK with a bare React Native app or Expo. This page
and the React Native SDK documentation generally assume that you're using a bare
React Native app and not Expo.

If you want to use the React Native SDK with Expo, check out the Bootstrap
with Expo page.

## Install the SDK in a Bare React Native App
Select the tab below that corresponds to your React Native
version. Follow the steps to create a React Native project
and add the React Native SDK to it.

> **TIP:**
> The SDK uses Realm Core database for device data persistence. When you
install the React Native SDK, the package names reflect Realm naming.
>

#### Rn V 60 Plus

##### Create a React Native Project
Create your React Native project with the following
command:

```bash
npx react-native init MyApp
```

Change to the project directory that the previous command
just created:

```bash
cd MyApp
```

##### Install the SDK with npm
In your React Native project directory, add the SDK to your
project with the following command:

```bash
npm install realm
```

##### Enable Hermes
> **NOTE:**
> To use Hermes, your app must use Realm v11 or later and React Native 0.70.0 or later
>

The SDK supports React Native's mobile-optimized JavaScript
engine, Hermes. By default, new apps created with the React
Native CLI already have Hermes enabled.

We recommend that you use Hermes with the SDK. However, the SDK
also supports the [JavaScriptCore (JSC) engine](https://developer.apple.com/documentation/javascriptcore) if your app requires it.

Existing apps that currently use JSC can enable Hermes
separately for Android and iOS. To learn how, see the [Using
Hermes](https://reactnative.dev/docs/hermes) guide in the
React Native docs.

##### Resolve CocoaPods Dependencies
For the iOS app, fetch the CocoaPods dependencies with
the following commands from your React Native project
directory:

```bash
cd ios && pod install && cd ..
```

This downloads the SDK libraries and regenerates the
project `.xcworkspace` file that you can work with in
Xcode to run your application.

##### Extend Android Proguard Configuration
You may need to extend your Proguard configuration to use
it with an Android app.
In your Proguard configuration, add the following:

```text
-keep class io.realm.react.**
```

##### Enable TypeScript (recommended, but optional)
TypeScript is a superset of JavaScript that adds static type
checking and other features intended to make
application-scale development more robust. If you'd like to
use TypeScript in your project, follow the React Native
team's official [TypeScript and React Native guide](https://facebook.github.io/react-native/docs/typescript#adding-typescript-to-an-existing-project).
The SDK supports TypeScript natively and integrates easily
into a TypeScript project.

##### Install the @realm/react Library
[@realm/react](https://www.npmjs.com/package/@realm/react) is an npm package that
streamlines common SDK operations like querying, writing to a
database, and listening for object change notifications. This reduces
boilerplate code, like creating your own listeners and state management.

`@realm/react` provides access to the SDK through a set of providers
that have various hooks. The hooks update React state when the
data changes. This means that components using these hooks rerender
on any changes to data in the database.

> **NOTE:**
> To use [Realm JS version 11.0.0](https://github.com/realm/realm-js/releases/tag/v11.0.0) or later with [@realm/react](https://www.npmjs.com/package/@realm/react), you must use `@realm/react` version
[0.4.0](https://github.com/realm/realm-js/blob/master/packages/realm-react/CHANGELOG.md#040-2022-10-18)
or later.
>

In your React Native project directory, add `@realm/react` to your
project with the following command:

```shell
npm install @realm/react
```

##### Run the App
React Native enables simultaneous development of both an
iOS and Android app that use the same React codebase. You
can edit the `.js` or `.ts` source files in your
project directory to develop your app.

In development, the apps read their React source code as
a bundle from a local bundle server. To run the bundle
server, use the following command in your React Native
project directory:

```bash
npm start
```

With the bundle server running, you can now launch the Android and iOS apps:

- To run the Android app, use Android Studio to open the `android` directory in your project directory and click Run.
- To run the iOS app, use Xcode to open the `.xcworkspace` file in the `ios` directory. If you did not use CocoaPods during setup, open the `.xcodeproj` file in the `ios` directory instead. Once you have opened the project, click Run.

#### Rn Pre V 60

> **NOTE:**
> The [@realm/react](https://www.npmjs.com/package/@realm/react) library requires
react-native version `>= 0.59`. If you are developing using older
versions of React Native, you can use the SDK without `@realm/react`.
Since the React Native SDK documentation makes heavy use of the
`@realm/react` package, you may want to refer to the
Node.js SDK documentation.
>

##### Create a React Native Project
Create your React Native project with the following
command:

```bash
react-native init MyApp
```

Change to the project directory that the previous command
just created:

```bash
cd MyApp
```

##### Install the SDK Using NPM
In your React Native project directory, add the SDK to your
project with the following command:

```bash
npm install realm
```

##### Link the SDK's Native Module
In your React Native project directory, link the SDK's
native module to your project with the following command:

```bash
react-native link realm
```

##### Confirm the Link Step (Android)
For Android development, confirm that the link step
correctly added the SDK module to the Gradle
configuration files. In some versions, React Native has
been known to fail to link the SDK properly. If this
happens, you can link the SDK manually by adding any
missing lines below to the corresponding files.

First, ensure the `android/settings.gradle` file
includes the SDK and specifies the SDK's project directory:

```text
rootProject.name = 'MyApp'
include ':realm'
project(':realm').projectDir = new File(rootProject.projectDir, '../node_modules/realm/android')
apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle"); applyNativeModulesSettingsGradle(settings)
include ':app'
```

Second, ensure the `android/app/build.gradle` file's
`dependencies` section declares the SDK as a dependency:

```text
dependencies {
    implementation project(':realm')
    implementation fileTree(dir: "libs", include: ["*.jar"])
    implementation "com.facebook.react:react-native:+"  // From node_modules
    // ...
}
```

Finally, ensure the `MainApplication.java` file imports
the `RealmReactPackage` and instantiates it in its
packages list.

```java
import io.realm.react.RealmReactPackage; // Add this import.

public class MainApplication extends Application implements ReactApplication {
    @Override
    protected List<ReactPackage> getPackages() {
        return Arrays.<ReactPackage>asList(
            new MainReactPackage(),
            new RealmReactPackage() // Add this line.
        );
    }
    // ...
}
```

##### Enable TypeScript (optional)
TypeScript is a superset of JavaScript that adds static type
checking and other features intended to make
application-scale development more robust. If you'd like to
use TypeScript in your project, follow the React Native
team's official [TypeScript and React Native guide](https://facebook.github.io/react-native/docs/typescript#adding-typescript-to-an-existing-project).
The SDK supports TypeScript natively and integrates easily
into a TypeScript project.

##### Run the App
React Native enables simultaneous development of both an
iOS and Android app that use the same React codebase. You
can edit the `.js` or `.ts` source files in your
project directory to develop your app.

In development, the apps read their React source code as
a bundle from a local bundle server. To run the bundle
server, use the following command in your React Native
project directory:

```bash
npm start
```

With the bundle server running, you can now launch the Android and iOS apps:

- To run the Android app, use Android Studio to open the `android` directory in your project directory and click Run.
- To run the iOS app, use Xcode to open the `.xcworkspace` file in the `ios` directory. If you did not use CocoaPods during setup, open the `.xcodeproj` file in the `ios` directory instead. Once you have opened the project, click Run.

## Import the SDK
Add the following line to the top of your source files where
you want to use the SDK:

```typescript
import Realm from "realm";
```
