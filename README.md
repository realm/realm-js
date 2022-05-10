[![realm by MongoDB](./logo.svg#gh-light-mode-only)](https://realm.io#gh-light-mode-only)
[![realm by MongoDB](./logo-dark.svg#gh-dark-mode-only)](https://realm.io#gh-dark-mode-only)

Realm is a mobile database that runs directly inside phones, tablets or wearables.
This project hosts the JavaScript versions of [Realm](https://realm.io/). Currently we support React Native (both iOS & Android), Node.js and Electron (on Windows, MacOS and Linux).

## Features

* **Mobile-first:** Realm is the first database built from the ground up to run directly inside phones, tablets and wearables.
* **Simple:** Data is directly [exposed as objects](https://docs.mongodb.com/realm/node/realms/) and [queryable by code](https://docs.mongodb.com/realm/node/query-engine/), removing the need for ORM's riddled with performance & maintenance issues.
* **Modern:** Realm supports relationships, generics, and vectorization.
* **Fast:** Realm is faster than even raw SQLite on common operations, while maintaining an extremely rich feature set.

## Getting Started

Please see the detailed instructions in our docs to use [Realm JavaScript for Node.js](https://docs.mongodb.com/realm/sdk/node/) and [Realm JavaScript for React Native](https://docs.mongodb.com/realm/sdk/react-native/). Please notice that currently only Node.js version 10 or later (excluding 11) are supported.
## Documentation

### Realm React Native and Node.js

The documentation for the Realm React Native SDK can be found at [docs.mongodb.com/realm/sdk/react-native/](https://docs.mongodb.com/realm/sdk/react-native/). The documentation for Realm Node.js SDK can be found at [docs.mongodb.com/realm/sdk/node](https://docs.mongodb.com/realm/sdk/node/).

The API reference is located at [docs.mongodb.com/realm-sdks/js/latest/](https://docs.mongodb.com/realm-sdks/js/latest/).

If you are using React Native, please also take a look the README for [@realm/react](https://github.com/realm/realm-js/tree/master/packages/realm-react#readme), which provides React hooks to make working with Realm easier.


## Template apps using Expo for React Native

We have TypeScript and JavaScript templates to help you get started using Realm.  Follow the links to your desired template and follow the instructions there to get up and running fast.
### Using Expo

- [TypeScript](https://github.com/realm/realm-js/tree/master/templates/expo-template-ts#readme)
- [JavaScript](https://github.com/realm/realm-js/tree/master/templates/expo-template-js#readme)

### React Native

- [TypeScript](https://github.com/realm/realm-js/tree/master/templates/react-native-template-realm-ts#readme)
- [JavaScript](https://github.com/realm/realm-js/tree/master/templates/react-native-template-realm-js#readme)
## Getting Help

* **Need help with your code?**: Look for previous questions on the  [#realm tag](https://stackoverflow.com/questions/tagged/realm?sort=newest) — or [ask a new question](https://stackoverflow.com/questions/ask?tags=realm). You can also check out our [Community Forum](https://developer.mongodb.com/community/forums/tags/c/realm/9/realm-sdk) where general questions about how to do something can be discussed.
* **Have a bug to report?** [Open an issue](https://github.com/realm/realm-js/issues/new). If possible, include the version of Realm, a full log, the Realm file, and a project that shows the issue.
* **Have a feature request?** [Open an issue](https://github.com/realm/realm-js/issues/new). Tell us what the feature should do, and why you want the feature.

## Contributing

See [CONTRIBUTING.md](https://github.com/realm/realm-js/blob/master/CONTRIBUTING.md) for more details!

## Known issues

* Realm is not compatible with the Chrome Debugger.  The following debugging methods are supported.
   * [Flipper](https://fbflipper.com/) has many similar features in relation to the Chrome Debugger. Please consider trying out our [Hermes release](https://github.com/realm/realm-js/issues/3940) to use the Hermes Debugger in Flipper and set breakpoints in your code.
   * [Safari](https://reactnative.dev/docs/debugging#safari-developer-tools) also has a similar feature set, but requires [some setup](https://blog.nparashuram.com/2019/10/debugging-react-native-ios-apps-with.html) and only supports debugging in iOS.
   * **NOTE:** For the above methods, it is not neccessary to enable `Debug with Chrome` in the Debug Menu.

## Building Realm JS

For instructions on building Realm JS yourself from source, see the [building.md](contrib/building.md) file.

## Issues with debugging
Some users have reported the Chrome debugging being too slow to use after integrating Realm into their react-native project. This is due to the blocking nature of the RPC calls made through the Realm library. See https://github.com/realm/realm-js/issues/491 for more information. The best workaround is to use Safari instead, as a user has described [here](https://github.com/realm/realm-js/issues/491#issuecomment-404670910).

Moreover, we have a switch to [Flipper](https://fbflipper.com/) in the works as part of our effort to [support Hermes](https://github.com/realm/realm-js/pull/3792). It implies that we envision a near future where the Chrome debugging will be removed, and we currently don't invest much in its maintenance.

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
 * An anonymous machine identifier and hashed application path to aggregate the other information on.

## Code of Conduct

This project adheres to the [MongoDB Code of Conduct](https://www.mongodb.com/community-code-of-conduct).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to [community-conduct@mongodb.com](mailto:community-conduct@mongodb.com).

## License

Realm JS and [Realm Core](https://github.com/realm/realm-core) are published under the Apache License 2.0.

**This product is not being made available to any person located in Cuba, Iran,
North Korea, Sudan, Syria or the Crimea region, or to any other person that is
not eligible to receive the product under U.S. law.**

## Feedback

**_If you use Realm and are happy with it, all we ask is that you please consider sending out a tweet mentioning [@realm](https://twitter.com/realm) to share your thoughts_**

**_And if you don't like it, please let us know what you would like improved, so we can fix it!_**

<img style="width: 0px; height: 0px;" src="https://3eaz4mshcd.execute-api.us-east-1.amazonaws.com/prod?s=https://github.com/realm/realm-js/#README.md">
