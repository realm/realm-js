# Realm Web

Accessing MongoDB Realm from a web-browser.

## Installation

Via NPM, when used in a project with a bundler, such as Webpack, Parcel or Rollup:

```
npm install realm-web
```

As a script-tag in the head of a browser:

```html
<script src="https://unpkg.com/realm-web@1.2.1/dist/bundle.iife.js"></script>
```

## Caveats / limitations

- The Realm Web project *will not* include a Realm Sync client in any foreseeable future. Use the `realm` package to use Realm Sync from a Node.js, ReactNative or Electron environment.
- A limited selection of [services](https://docs.mongodb.com/stitch/services/) are implemented at the moment:
  - MongoDB: Read, write and watch MongoDB documents.

## Using Realm Web in a Node.js environment

You must install two additional peer dependencies when importing this package from Node.js:

```
npm install node-fetch abort-controller
```
