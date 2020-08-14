?.?.? Release notes (2020-??-??)
=============================================================

### Enhancements
* None

### Fixed
* Fixed error `"function not found: 'argsTransformation'"` when calling `user.functions.callFunction('functionName', args)` [#3134](https://github.com/realm/realm-js/pull/3134)

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
* None

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
