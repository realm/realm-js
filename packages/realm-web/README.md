# Realm Web

Accessing MongoDB Realm from a web-browser.

## Installation

```
npm install realm-web
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
