# Realm Web

Accessing MongoDB Realm from a web-browser.

## Installation

Via NPM, when used in a project with a bundler, such as Webpack, Parcel or Rollup:

```
npm install realm-web
```

As a script-tag in the head of a browser:

```html
<script src="https://unpkg.com/realm-web@1.0.0-rc.2/dist/bundle.iife.js"></script>
```

## Caveats / limitations

As this is a beta release, it comes with a few caveats:

- Most importantly, the Realm Web project *will not* include a Realm Sync client in any foreseeable future.
- A limited selection of [services](https://docs.mongodb.com/stitch/services/) are implemented at the moment:
  - MongoDB: Read, write and watch MongoDB documents.
  - HTTP: Send requests using the MongoDB service as a proxy.

## Using Realm Web from Node.js

You must install two additional peer dependencies when importing this package from Node.js:

```
npm install node-fetch abort-controller
```
