1.2.1 Release notes (2021-02-17)
=============================================================

### Breaking Changes
* None

### Enhancements
* None

### Fixed
* Fixed app hydration to be more robust: Errors are now logged instead of thrown. ([#3549](https://github.com/realm/realm-js/pull/3549))
* Fixed a potential lock, when refreshing an access token or fetching custom user data, failed due to 401/unauthorized. An unauthorized response, during token-refresh, will now clear all the users' tokens. ([#3549](https://github.com/realm/realm-js/pull/3549))
* Fixed user profile type, making less assumptions on the value type of custom profile data (changing from string to unknown). ([#3576](https://github.com/realm/realm-js/pull/3576), since 1.2.0)

### Internal
* None

1.2.0 Release notes (2021-01-11)
=============================================================

### Breaking Changes
* None

### Enhancements
* Adding data from authentication providers, to be included in the `User#profile` object. ([#3268](https://github.com/realm/realm-js/issues/3268) via [#3481](https://github.com/realm/realm-js/pull/3481))
* Exposing the authentication provider used to authenticate a user as a `providerType` property on a `User` instance. ([#3481](https://github.com/realm/realm-js/pull/3481))
* Added an export of the `bson` module on the package, making it possible to access the BSON types via `import Realm from "realm";` followed by `Realm.BSON.ObjectId`, `Realm.BSON.Decimal128`, `Realm.BSON.Binary` etc. ([#3363](https://github.com/realm/realm-js/pull/3363))

### Fixed
* Fixed an error in the types, where elements in the `User#identities` array would have a `userId` which was actually an `id` of the identity. ([#3481](https://github.com/realm/realm-js/pull/3481), since v0.9.0)

### Internal
* None

1.1.0 Release notes (2020-12-08)
### Internal
* None

1.0.0 Release notes (2020-10-16)
=============================================================

### Breaking Changes
* Changed the `allUsers` property into an object keyed by user id. Use `Object.values(app.allUsers)` to retrieve a list of all users. ([#3346](https://github.com/realm/realm-js/pull/3346))

### Enhancements
* None

### Fixed
* None

### Internal
* None

1.0.0-rc.2 Release notes (2020-10-13)
=============================================================

### Breaking Changes
* None

### Enhancements
* None

### Fixed
* Fixed a bug where an error (messaged "Only absolute URLs are supported") was thrown when calling the `resetPassword`, `sendResetPasswordEmail` or `callResetPasswordFunction` methods of the `EmailPasswordAuth` client. ([#3330](https://github.com/realm/realm-js/pull/3330), since v0.9.0)

### Internal
* None

1.0.0-rc.1 Release notes (2020-10-09)
=============================================================

### Breaking Changes
* Removed the `functions` and `services` properties from `App`, use the `functions` property and `mongoClient` method on `User` instances instead. ([#3298](https://github.com/realm/realm-js/pull/3298) and [#3322](https://github.com/realm/realm-js/pull/3322))

### Enhancements
* Changing the behaviour when refreshing an access token fails. With this change, if the refresh token cannot be used to refresh an access token, the user is logged out. ([#3269](https://github.com/realm/realm-js/pull/3269))
* Moved the `getApp` function exported by the package onto the `App` class as a static method. This can be used to get or create an instance from an app-id. ([#3297](https://github.com/realm/realm-js/pull/3297))

### Fixed
* Fixed forgetting the user's access and refresh tokens, even if the request to delete the session fails. ([#3269](https://github.com/realm/realm-js/pull/3269))
* `isLoggedIn` boolean property added to `User`. ([#3294](https://github.com/realm/realm-js/pull/3294))

### Internal
* Sending device information in request body instead of a query parameter. ([#3295](https://github.com/realm/realm-js/pull/3295))

0.9.0 Release notes (2020-09-24)
=============================================================

### Enhancements
* Added support for linking credentials to an existing user. ([#3088](https://github.com/realm/realm-js/pull/3088), [#3239](https://github.com/realm/realm-js/pull/3239) and [#3240](https://github.com/realm/realm-js/pull/3240))
* Added a better toJSON() implementation on User objects. ([#3221](https://github.com/realm/realm-js/pull/3221))
* Added `watch` support to MongoDB Collections. ([#3247](https://github.com/realm/realm-js/pull/3247))

### Fixed
* If the payload for `callFunction` included certain types the request would fail with `"invalid function call request (status 400)"`. All `EJSON` serialization is now done in canonical mode. ([#3157](https://github.com/realm/realm-js/pull/3157))
* Fixed sending device information when authenticating a user. ([#3220](https://github.com/realm/realm-js/pull/3220))
* Fixed an issue where logging an `app` instance could result in a MongoDB Realm function being called. ([#3223](https://github.com/realm/realm-js/pull/3223))

### Internal
* None

0.8.1 Release notes (2020-08-17)
=============================================================

### Enhancements
* None

### Fixed
* Fixed error `"function not found: 'argsTransformation'"` when calling `user.functions.callFunction('functionName', args)`. ([#3134](https://github.com/realm/realm-js/pull/3134))

### Internal
* None

0.8.0 Release notes (2020-07-31)
=============================================================

### Breaking changes
* Renamed `Realm.app` to `Realm.getApp` to make it less conflicting with a local `app` variable.

### Enhancements
* Added an export of the `ObjectId` BSON type on the package namespace. ([#3071](https://github.com/realm/realm-js/pull/3071))
* Added an IIFE bundle enabling users to consume the package from a script-tag. ([#3071](https://github.com/realm/realm-js/pull/3071))
* Upon authenticating with an OAuth 2.0 authentication provider (Google, Facebook or Apple), the promise returned by `logIn` will get rejected with an error, messaged "Window closed". ([#3064](https://github.com/realm/realm-js/pull/3064))

### Fixed
* None

### Internal
* Refactored the concept of base, authenticated, prefixed transports into a single "fetcher" built on-top-of the "realm-network-package". ([#3086](https://github.com/realm/realm-js/pull/3086))

0.7.0 Release notes (2020-07-13)
=============================================================

### Enhancements
* Added `Credentials.userApiKey` and `Credentials.serverApiKey` as aliases for `Credentials.apiKey`.
* Exposed the `ApiKeyAuth` auth provider client on `user.apiKeys`.

### Fixed
* Fixed an issue with reuse of the users in an apps list of users. Logging in with the same user multiple times will now update and reuse the same `Realm.User` object. ([#3052](https://github.com/realm/realm-js/pull/3052))
* Fixed decoding custom data from the access token. The browser's built-in base64 decoder could produce UTF-8 decoding errors for some special characters. ([#3055](https://github.com/realm/realm-js/pull/3055))

### Internal
* None

0.6.0 Release notes (2020-07-01)
=============================================================

### Enhancements
* Added more credentials enabling logins via additional authentication providers: Custom Functions, Custom JWT, Google, Facebook & Apple ID. ([#3019](https://github.com/realm/realm-js/pull/3019))
* Custom data can now be retrieved from an active User. ([#3019](https://github.com/realm/realm-js/pull/3019))

### Fixed
* Fixed an error "Cannot use 'in' operator to search for 'node' in undefined", which could occur when bundling the package without Node.js stubs available. ([#3001](https://github.com/realm/realm-js/pull/3001))
* Fixed refreshing of access tokens upon 401 responses from the server. ([#3020](https://github.com/realm/realm-js/pull/3020))

### Internal
* None

0.5.0 Release notes (2020-06-29)
=============================================================

### Enhancements
* Users are now persisted across refreshes and browser tabs (using the browser's local-storage). ([#2990](https://github.com/realm/realm-js/pull/2990))
* App location metadata is now requested before making any requests towards the app server. This removes the need for users to manually resolve the baseUrl. ([#3000](https://github.com/realm/realm-js/pull/3000))
* MongoDB Realm Functions are now accessable via the `functions` property on an instance of `User`. ([#3001](https://github.com/realm/realm-js/pull/3001))

### Fixed
* None

### Internal
* Renamed the "RemoteMongoDB*" classes to "MongoDB*". Not considered a breaking changes as these types were not exported from the package. ([#3001](https://github.com/realm/realm-js/pull/3001))

0.4.0 Release notes (2020-06-11)
=============================================================

### Enhancements
* None

### Fixed
* Loading Realm Web into a browser would yeild an error with the message "global is not defined". This was due to an issue in the "bson" dependency which got downgraded to the latest stable version. ([#2960](https://github.com/realm/realm-js/pull/2960))

### Internal
* None

0.3.0 Release notes (2020-06-11)
=============================================================

### Enhancements
* None

### Fixed
* Building a TypeScript file which imported from "realm-web" would fail if the "realm" and "realm-network-transport" types were not installed, this is no longer the case. ([#2960](https://github.com/realm/realm-js/pull/2960))

### Internal
* None

0.2.0 Release notes (2020-06-04)
=============================================================

This was the first external release of the Realm Web package.
