# Realm Web

Accessing MongoDB Realm from a web-browser.

## Installing this

In its current form, the package has not been published to NPM, instead its distributed using a direct HTTP URL:

```
npm install https://static.realm.io/downloads/realm-web/realm-web-0.1.0.tgz
```

## Caveats / limitations

As this is a *very early* preview release, it comes with a few caveats:

- Most importantly, the Realm Web project *will not* include a Realm Sync client in any foreseeable future.
- Automatically fetching the location of an app in the production environment, is not yet implemented.
  To get the correct base URL, you must set the `baseUrl` of the app to the value of `hostname` in the response you get from visiting `'https://stitch.mongodb.com/api/client/v2.0/app/<your-app-id>/location` in your browser.
- A limited selection of types of [credentials for authentication providers](https://docs.mongodb.com/stitch/authentication/providers/) are implemented at the moment:
  - Anonymous.
  - API key.
  - Email & password.
- A limited selection of [services](https://docs.mongodb.com/stitch/services/) are implemented at the moment:
  - Remote MongoDB (watching a collection is not yet implemented).
  - HTTP (send requests using the MongoDB service as a proxy).

Some parts of the legacy Stitch SDK is still missing, most notably:
- The ability to link a user to another identity.
- Persistance of the users tokens in the browsers local storage (user must reauthenticate after a page reload).
- The types for the `Realm.Credentials` namespace is not fully implemented.
- No device information is sent to the service when authenticating a user.

## Using Realm Web from Node.js

You must install two additional peer dependencies when importing this package from Node.js:

```
npm install node-fetch abort-controller
```
