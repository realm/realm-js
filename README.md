![Realm](https://github.com/realm/realm-js/raw/master/logo.png)

Realm is a mobile database that runs directly inside phones, tablets or wearables.
This project hosts the JavaScript versions of [Realm](https://realm.io/). Currently we only support React Native (both iOS & Android) but we are considering adding support for Cordova/PhoneGap/Ionic as well as Node.js (V8) soon.

## Features

* **Mobile-first:** Realm is the first database built from the ground up to run directly inside phones, tablets and wearables.
* **Simple:** Data is directly [exposed as objects](https://realm.io/docs/react-native/latest/#models) and [queryable by code](https://realm.io/docs/react-native/latest/#queries), removing the need for ORM's riddled with performance & maintenance issues.
* **Modern:** Realm supports relationships, generics, and vectorization.
* **Fast:** Realm is faster than even raw SQLite on common operations, while maintaining an extremely rich feature set.

## Getting Started

Please see the detailed instructions in our docs to use [Realm React Native](https://realm.io/docs/react-native/latest/#getting-started).

## Documentation

### Realm React Native

The documentation can be found at [realm.io/docs/react-native/latest](https://realm.io/docs/react-native/latest).  
The API reference is located at [realm.io/docs/react-native/latest/api](https://realm.io/docs/react-native/latest/api).

## Getting Help

- **Need help with your code?**: Look for previous questions on the  [#realm tag](https://stackoverflow.com/questions/tagged/realm?sort=newest) — or [ask a new question](https://stackoverflow.com/questions/ask?tags=realm). We actively monitor and answer questions on SO!
- **Have a bug to report?** [Open an issue](https://github.com/realm/realm-js/issues/new). If possible, include the version of Realm, a full log, the Realm file, and a project that shows the issue.
- **Have a feature request?** [Open an issue](https://github.com/realm/realm-js/issues/new). Tell us what the feature should do, and why you want the feature.
- Sign up for our [**Community Newsletter**](http://eepurl.com/VEKCn) to get regular tips, learn about other use-cases and get alerted of blog posts and tutorials about Realm.

## Building Realm

In case you don't want to use the precompiled version on npm, you can build Realm yourself from source. You’ll need an Internet connection the first time you build in order to download the core library.

Prerequisites:
- Node 4.0+
- Xcode 7.2+
- Android SDK 23+
- Android NDK 10e+

First clone this repository:

```
git clone https://github.com/realm/realm-js.git
```

Then in the cloned directory:

```
git submodule update --init --recursive
```

To build for iOS:
- Open `RealmJS.xcodeproj`
- Select `RealmReact.framework` as the build target
- Build

To build for Android:
- `cd react-native/android`
- `./gradlew publishAndroid`
- The compiled version of the Android module is here: `<project-root>/android`

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](https://realm.io/conduct/).
By participating, you are expected to uphold this code. Please report unacceptable behavior to [info@realm.io](mailto:info+conduct@realm.io).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details!

## License

Realm JS is published under the Apache 2.0 license.
The underlying core is available under the [Realm Core Binary License](https://github.com/realm/realm-cocoa/blob/master/LICENSE#L210-L243) while we [work to open-source it under the Apache 2.0 license](https://realm.io/docs/react-native/latest/#faq).

**This product is not being made available to any person located in Cuba, Iran,
North Korea, Sudan, Syria or the Crimea region, or to any other person that is
not eligible to receive the product under U.S. law.**

## Feedback

**_If you use Realm and are happy with it, all we ask is that you please consider sending out a tweet mentioning [@realm](https://twitter.com/realm), or email [help@realm.io](mailto:help@realm.io) about your great apps!_**

**_And if you don't like it, please let us know what you would like improved, so we can fix it!_**

