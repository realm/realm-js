# RealmJS
Realm is a mobile database that runs directly inside phones, tablets or wearables. This repository holds the source code for Realm's JavaScript bindings for integrating with mobile apps built using ReactNative and PhoneGap.

## Setup
This repository uses submodules so you need to run `git submodule update --init --recursive` in the realm-js root directory before running any examples or including the project in your app.

## ReactNative Example
Make sure your environment is set up to run react native applications. Follow the instructions here https://facebook.github.io/react-native/docs/getting-started.html.

The ReactNative example project is in the `examples/ReactExample` directory. You need to run `npm install` in this directory before running the example for the first time.

## ReactNative Project Setup
- Create a new ReactNative project `react-native init <project-name>` and open the generated XCode project.
- Drag `RealmJS.xcodeproj` into the `Libraries` folder in your project.
- Drag `RealmReact.framework` from the `Products` directory under `RealmJS.xcodeproj` into the `Embedded Libraries` section in the `General` tab for your app's target settings. This bundles the library with your app.
- In the `Build Phases` tab for your app's target settings, add `RealmReact.framework` in the `Target Dependencies` and `Link Binary with Library` build phases.
- In your app's `package.json` file, add the `realm` dependency with a path to the `realm-js/lib` folder like this: `"realm": "file:path/to/realm-js/lib"` (symlinks are not yet supported by the React Native packager, see [issue #637](https://github.com/facebook/react-native/issues/637)).
- You can now `require('realm')` in your app's JS to use Realm!

## Documentation
Currently there is no documentation for the ReactNative apis. You can see examples of how to use the apis in the example app and in the js test files here: https://github.com/realm/realm-js/tree/master/tests

## License
Copyright 2015 Realm Inc - All Rights Reserved
Proprietary and Confidential
