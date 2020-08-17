# Realm Web

Accessing MongoDB Realm from a web-browser.

## Installation

Via NPM, when used in a project with a bundler, such as Webpack, Parcel or Rollup:

```
npm install realm-web
```

As a script-tag in the head of a browser:

```html
<script src="https://unpkg.com/realm-web@0.8.0/dist/bundle.iife.js"></script>
```

## Caveats / limitations

As this is a beta release, it comes with a few caveats:

- Most importantly, the Realm Web project *will not* include a Realm Sync client in any foreseeable future.
- A limited selection of [services](https://docs.mongodb.com/stitch/services/) are implemented at the moment:
  - MongoDB (watching a collection is not yet implemented).
  - HTTP: Send requests using the MongoDB service as a proxy.

Some parts of the legacy Stitch SDK is still missing, most notably:
- The ability to link a user to another identity.
- No device information is sent to the service when authenticating a user.

## Using Realm Web from Node.js

You must install two additional peer dependencies when importing this package from Node.js:

```
npm install node-fetch abort-controller
```
