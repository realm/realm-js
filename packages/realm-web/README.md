# Realm Web

Accessing Atlas App Services from a web-browser.

## Documentation

Visit [mongodb.com/docs/atlas/device-sdks/web/](https://www.mongodb.com/docs/atlas/device-sdks/web/) for quick guides on getting started and examples on how to use it.

We're not publishing documentation explicitly for this SDK, but we aim to align names and method signatures identical for the subset of functionality in Realm Web which is also available in the Realm JS SDK. For this reason, the [mongodb.com/docs/realm-sdks/js/latest/](https://www.mongodb.com/docs/realm-sdks/js/latest/) is a great start to learn about the classes and methods provided by the Realm Web SDK.

## Installation

Via NPM, when used in a project with a bundler, such as Webpack, Parcel or Rollup:

```
npm install realm-web
```

As a script-tag in the head of a browser:

```html
<script src="https://unpkg.com/realm-web@2.0.0"></script>
```

## Caveats / limitations

- The Realm Web project *will not* include a Realm Sync client in any foreseeable future. Use the `realm` package to use Realm Sync from a Node.js, ReactNative or Electron environment.
- A limited selection of [app services](https://www.mongodb.com/docs/atlas/app-services/mongodb/) are implemented at the moment:
  - MongoDB: Read, write and watch MongoDB documents.

<!--
## Using Realm Web in a Node.js environment

You must install two additional dependencies when importing this package from Node.js:

```
npm install node-fetch abort-controller
```
-->
