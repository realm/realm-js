<picture>
    <source srcset="./logo-dark.svg" media="(prefers-color-scheme: dark)" alt="realm by MongoDB">
    <img src="./logo.svg" alt="realm by MongoDB">
</picture>

Realm is a mobile database that runs directly inside phones, tablets or wearables.
This project hosts the JavaScript versions of [Realm](https://realm.io/). Currently we support React Native (JSC & Hermes on iOS & Android), Node.js and Electron (on Windows, MacOS and Linux).

## Features

* **Mobile-first:** Realm is the first database built from the ground up to run directly inside phones, tablets and wearables.
* **Simple:** Data is directly [exposed as objects](https://docs.mongodb.com/realm/node/realms/) and [queryable by code](https://docs.mongodb.com/realm/node/query-engine/), removing the need for ORM's riddled with performance & maintenance issues.
* **Modern:** Realm supports relationships, generics, and vectorization.
* **Fast:** Realm is faster than even raw SQLite on common operations, while maintaining an extremely rich feature set.
* **[Device Sync](https://www.mongodb.com/atlas/app-services/device-sync)**: Makes it simple to keep data in sync across users, devices, and your backend in real-time. [Get started](http://mongodb.com/realm/register?utm_medium=github_atlas_CTA&utm_source=realm_js_github) for free with a template application that includes a cloud backend and Sync.

## Getting Started

Please see the detailed instructions in our docs to use [Realm JavaScript for Node.js](https://www.mongodb.com/docs/realm/sdk/node/) and [Realm JavaScript for React Native](https://www.mongodb.com/docs/realm/sdk/react-native/). Please notice that currently only Node.js version 13 or later is supported. For React Native users, we have a [compatibility matrix](COMPATIBILITY.md) showing which versions are supported.

## Tiers

It is exciting to have users, and we want to support you as good as possible. Our community support (Github issues in this and our related repositories) is divided into three tiers, and below you can see which packages, versions and platforms we consider for the different tiers.

If you want to contribute to any of our packages, you are welcome to do so. We will take the time to review your pull request for any package.

### Tier 1 - fully supported

In tier 1 we will respond to issues in a timely manner during workdays from CET timezone, and we will work on bug fixing and adding new features.

* [Realm JavaScript](https://www.npmjs.com/package/realm) (NPM tag: `latest`) on node.js (LTS) and Electron on Windows, MacOS, and Linux
* [Realm JavaScript](https://www.npmjs.com/package/realm) (NPM tag: `latest`) with latest React Native version on Android and iOS
* [@realm/react](https://www.npmjs.com/package/@realm/react) (NPM tag: `latest`) in conjunction with latest [Realm JavaScript](https://www.npmjs.com/package/realm) release

### Tier 2 - best effort

Some packages are considered to be mature and stable, and we will support them as good as we can when time permits.

* [Realm Web](https://www.npmjs.com/package/realm-web) (NPM tag: `latest`)
* [Realm Studio](https://github.com/realm/realm-studio) ([latest](https://github.com/realm/realm-studio/releases/latest) release) on Windows, MacOS, and Linux
* Any other release of [Realm JavaScript](https://www.npmjs.com/package/realm) not covered by tier 1

### Tier 3 - experimental

The third tier covers our experimental packages. We work on them occasionally, and they are likely to change radically when we do.

* [Realm Babel plugin](https://www.npmjs.com/package/@realm/babel-plugin)
* [Realm Flipper plugins](https://www.npmjs.com/package/realm-flipper-plugin)

## Documentation

### Realm React Native and Node.js

The documentation for the Realm React Native SDK can be found at [mongodb.com/docs/realm/sdk/react-native/](https://www.mongodb.com/docs/realm/sdk/react-native/). The documentation for Realm Node.js SDK can be found at [mongodb.com/docs/realm/sdk/node](https://www.mongodb.com/docs/realm/sdk/node/).

The API reference is located at [docs.mongodb.com/realm-sdks/js/latest/](https://docs.mongodb.com/realm-sdks/js/latest/).

If you are using React Native, please also take a look the README for [@realm/react](https://github.com/realm/realm-js/tree/master/packages/realm-react#readme), which provides React hooks to make working with Realm easier.

### TypeScript models

[TypeScript](https://www.typescriptlang.org/) is a popular alternative to pure JavaScript as it provide static typing. Our TypeScript support consists of two parts

* Accurate TypeScript definitions
  [@realm/babel-plugin](https://www.npmjs.com/package/@realm/babel-plugin) to transform TypeScript classes to Realm schemas. An example of a model class is:

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

Realm is a general SDK which provide you persistence of objects and the capability of perform advanced queries on the objects. You can have a tighter integration with React Native by using [@realm/react](https://www.npmjs.com/package/@realm/react).

Moreover, we have a [Flipper plugin](https://www.npmjs.com/package/realm-flipper-plugin) to help you inspect, query and modify your Realm files while debugging your app on a simulator or a physical device. The plugin is still in an early stage so expect rough edges.

## Template apps

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

* Realm is not compatible with the legacy Chrome Debugger. The following debugging methods are supported:
   * [Flipper](https://fbflipper.com/) has many similar features in relation to the Chrome Debugger.
   * [Safari](https://reactnative.dev/docs/debugging#safari-developer-tools) also has a similar feature set, but requires [some setup](https://blog.nparashuram.com/2019/10/debugging-react-native-ios-apps-with.html) and only supports debugging in iOS.
   * **NOTE:** For the above methods, it is not neccessary to enable `Debug with Chrome` in the Debug Menu.
* Version 10.21.0 accidently [dropped support other Linux versions](https://github.com/realm/realm-js/issues/5006) e.g., RHEL 7.

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

## Feedback

**_If you use Realm and are happy with it, all we ask is that you please consider sending out a tweet mentioning [@realm](https://twitter.com/realm) to share your thoughts_**

**_And if you don't like it, please let us know what you would like improved, so we can fix it!_**

<img style="width: 0px; height: 0px;" src="https://3eaz4mshcd.execute-api.us-east-1.amazonaws.com/prod?s=https://github.com/realm/realm-js/#README.md">

## Contributors

<a href="https://github.com/realm/realm-js/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=realm/realm-js" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
