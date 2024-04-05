> [!NOTE]
> Realm is now Atlas Device SDK - [Learn More](https://www.mongodb.com/blog/post/realm-now-part-atlas-platform?utm_medium=github_atlas_CTA&utm_source=realm_js_github)

<picture>
    <source srcset="https://raw.githubusercontent.com/realm/realm-js/main/media/logo-dark.svg" media="(prefers-color-scheme: dark)" alt="realm by MongoDB">
    <img src="https://raw.githubusercontent.com/realm/realm-js/main/media/logo.svg" alt="realm by MongoDB">
</picture>

# The Realm Database

Realm is a mobile database that runs directly inside phones, tablets or wearables. This project hosts the JavaScript & TypeScript implementation of Realm. Currently, we support React Native (JSC & Hermes on iOS & Android), Node.js and Electron (on Windows, MacOS and Linux).

## What are the Atlas Device SDKs?

<img align="right" style="min-width:150px;width:20%;" src="https://raw.githubusercontent.com/realm/realm-js/main/media/atlas-device-sync.svg" alt="Atlas Device Sync">

The [Atlas Device SDKs](https://www.mongodb.com/docs/atlas/device-sdks/) are a collection of language and platform specific SDKs, each with a suite of app development tools optimized for data access and persistence on mobile and edge devices. Use the SDKs to build data-driven mobile, edge, web, desktop, and IoT apps.

It might help to think of the Realm database as the persistance layer of the Atlas Device SDKs.

## Features

* **Mobile-first:** Realm is the first database built from the ground up to run directly inside phones, tablets and wearables.
* **Simple:** Data is directly [exposed as objects](https://www.mongodb.com/docs/atlas/device-sdks/sdk/node/realm-files/) and [queryable by code](https://www.mongodb.com/docs/atlas/device-sdks/sdk/node/crud/query-data/), removing the need for ORM's riddled with performance & maintenance issues.
* **Modern:** The database supports relationships, generics, and vectorization.
* **Fast:** It is faster than even raw SQLite on common operations, while maintaining an extremely rich feature set.
* **[MongoDB Atlas Device Sync](https://www.mongodb.com/atlas/app-services/device-sync)**: Makes it simple to keep data in sync across users, devices, and your backend in real time. Get started for free with [a template application](https://github.com/mongodb/template-app-react-native-todo) and [create the cloud backend](http://mongodb.com/realm/register?utm_medium=github_atlas_CTA&utm_source=realm_js_github).

## Getting Started

Please see the detailed instructions in our docs to use [Atlas Device SDK for Node.js](https://www.mongodb.com/docs/atlas/device-sdks/sdk/node/) and [Atlas Device SDK for React Native](https://www.mongodb.com/docs/atlas/device-sdks/sdk/react-native/). Please notice that currently only Node.js version 18 or later is supported. For React Native users, we have a [compatibility matrix](https://github.com/realm/realm-js/blob/HEAD/COMPATIBILITY.md) showing which versions are supported.

## Documentation

### Atlas Device SDKs for React Native and Node.js

The documentation for the Atlas Device SDK for React Native can be found at [mongodb.com/docs/atlas/device-sdks/sdk/react-native/](https://www.mongodb.com/docs/atlas/device-sdks/sdk/react-native/). The documentation for the Atlas Device SDK for Node.js can be found at [mongodb.com/docs/atlas/device-sdks/sdk/node/](https://www.mongodb.com/docs/atlas/device-sdks/sdk/node/).

The API reference is located at [docs.mongodb.com/realm-sdks/js/latest/](https://docs.mongodb.com/realm-sdks/js/latest/).

If you are using React Native, please also take a look the README for [`@realm/react`](https://github.com/realm/realm-js/tree/main/packages/realm-react#readme), which provides React hooks to make working with Realm easier.

### TypeScript models

[TypeScript](https://www.typescriptlang.org/) is a popular alternative to pure JavaScript as it provide static typing. Our TypeScript support consists of two parts

* Accurate TypeScript definitions
  [`@realm/babel-plugin`](https://www.npmjs.com/package/@realm/babel-plugin) to transform TypeScript classes to Realm schemas. An example of a model class is:

```typescript
class Task extends Realm.Object<Task, "description"> {
  _id = new Realm.BSON.ObjectId();
  description!: string;
  @index
  isComplete = false;

  static primaryKey = "_id";

  constructor(realm, description: string) {
    super(realm, { description });
  }
}
```

### Integration with React Native

The Atlas Device SDK for React Native provides persistence of objects and advanced queries for persisted objects. You can have easier integration with React Native by using [`@realm/react`](https://www.npmjs.com/package/@realm/react).

## Template apps

We have TypeScript templates to help you get started using Realm.  Follow the links to your desired template and follow the instructions there to get up and running fast.

- [Expo](https://github.com/realm/realm-js/tree/main/templates/expo-template#readme)
- [React Native](https://github.com/realm/realm-js/tree/main/templates/react-native-template#readme)
## Getting Help

* **Need help with your code?**: Look for previous questions on the  [#realm tag](https://stackoverflow.com/questions/tagged/realm?sort=newest) — or [ask a new question](https://stackoverflow.com/questions/ask?tags=realm). You can also check out our [Community Forum](https://developer.mongodb.com/community/forums/tags/c/realm/9/realm-sdk) where general questions about how to do something can be discussed.
* **Have a bug to report?** [Open an issue](https://github.com/realm/realm-js/issues/new). If possible, include the version of Realm, a full log, the Realm file, and a project that shows the issue.
* **Have a feature request?** [Open an issue](https://github.com/realm/realm-js/issues/new). Tell us what the feature should do, and why you want the feature.

## Contributing

See [CONTRIBUTING.md](https://github.com/realm/realm-js/blob/HEAD/CONTRIBUTING.md) for more details!

## Known issues

* Realm is not compatible with the legacy Chrome Debugger. The following debugging methods are supported:
   * [Hermes Debugger](https://reactnative.dev/docs/debugging#opening-the-debugger) is the recommended way for debugging modern React Native apps.
   * [Safari](https://reactnative.dev/docs/debugging#safari-developer-tools) also has a similar feature set, but requires [some setup](https://blog.nparashuram.com/2019/10/debugging-react-native-ios-apps-with.html) and only supports debugging in iOS.
   * **NOTE:** For the above methods, it is not necessary to enable `Debug with Chrome` in the Debug Menu.

## Building the SDK

For instructions on building the SDK from the source, see the [building.md](https://github.com/realm/realm-js/blob/HEAD/contrib/building.md) file.

## Troubleshooting missing binary
It's possible after installing and running Realm that one encounters the error `Could not find the Realm binary`.  Here are are some tips to help with this.

### Compatibility
Consult our [`COMPATIBILITY.md`](https://github.com/realm/realm-js/blob/HEAD/COMPATIBILITY.md) to ensure you are running compatible version of `realm` with the supported versions of `node`, `react-native` or `expo`.

### React Native

#### iOS
Typically this error occurs when the pod dependencies haven't been updating.  Try running the following command
```
npx pod-install
```
If that still doesn't help it's possible there are some caching errors with your build or your pod dependencies.  The following commands can be used to safely clear these caches:
```
rm -rf ios/Pods
rm ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData
```
Afterwards, reinstall pods and try again.  If this still doesn't work, ensure that `node_modules/realm/react-native/ios/realm-js-ios.xcframework` exists and contains a binary for your architecture.  If this is missing, try reinstalling the `realm`` npm package.

#### Android
This can occur when installing `realm` and not performing a clean build.  The following commands can be used to clear your cache:
```
cd android
./gradlew clean
```

Afterwards, try and rebuild for Android.  If you are still encountering problems, ensure that `node_moduels/realm/react-native/android/src/main/jniLibs` contains a realm binary for your architecture.  If this is missing, try reinstalling the `realm` npm package.

### Expo
If you are using Expo, a common pitfall is not installing the `expo-dev-client` and using the Development Client specific scripts to build and run your React Native project in Expo.  The Development Client allows you to create a local version of Expo Go which includes 3rd party libraries such as Realm.  If you would like to use `realm` in an Expo project, the following steps can help.

- install the `expo-dev-client`:
  ```
  npm install expo-dev-client
  ```
- build the dev client for iOS
  ```
  npx expo run:ios
  ```
- build the dev client for Android
  ```
  npx expo run:android
  ```
- start the bundler without building
  ```
  npx expo start --dev-client
  ```

### Node/Electron
When running `npm install realm` the realm binaries for the detected architecture are downloaded into `node_modules/realm/prebuilds`.  If this directory is missing or empty, ensure that there weren't any network issues reported on installation.

## Analytics

Asynchronously submits install information to Realm.

Why are we doing this? In short, because it helps us build a better product
for you. None of the data personally identifies you, your employer or your
app, but it *will* help us understand what language you use, what Node.js
versions you target, etc. Having this info will help prioritizing our time,
adding new features and deprecating old features. Collecting an anonymized
application path & anonymized machine identifier is the only way for us to
count actual usage of the other metrics accurately. If we don’t have a way to
deduplicate the info reported, it will be useless, as a single developer
`npm install`-ing the same app 10 times would report 10 times more than another
developer that only installs once, making the data all but useless.
No one likes sharing data unless it’s necessary, we get it, and we’ve
debated adding this for a long long time. If you truly, absolutely
feel compelled to not send this data back to Realm, then you can set an env
variable named `REALM_DISABLE_ANALYTICS`.

Currently the following information is reported:

 * What version of Realm is being installed.
 * The OS platform and version which is being used.
 * If a JavaScript framework (currently React Native and Electron) is used and its version.
 * Which JavaScript engine is being used.
 * Node.js version number.
 * TypeScript version if used.
 * An anonymous machine identifier and hashed application name to aggregate the other information on.

Moreover, we unconditionally write various constants to a file which we might use at runtime.

## Code of Conduct

This project adheres to the [MongoDB Code of Conduct](https://www.mongodb.com/community-code-of-conduct).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to [community-conduct@mongodb.com](mailto:community-conduct@mongodb.com).

## License

Realm JS and [Realm Core](https://github.com/realm/realm-core) are published under the Apache License 2.0.

## Feedback

**_If you use Realm and are happy with it, all we ask is that you please consider sending out a tweet mentioning [@realm](https://twitter.com/realm) to share your thoughts_**

**_And if you don't like it, please let us know what you would like improved, so we can fix it!_**

<img style="width: 0px; height: 0px;" src="https://3eaz4mshcd.execute-api.us-east-1.amazonaws.com/prod?s=https://github.com/realm/realm-js/#README.md">

## Contributors

<a href="https://github.com/realm/realm-js/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=realm/realm-js" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
