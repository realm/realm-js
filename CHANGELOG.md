2.2.4 Release notes (2018-1-18)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] Fixed a bug where errors in `refreshAdminToken` wasn't catched (#1627).
* [Object Server] Added `_getExitingUser` to the Chrome debugging support library.

### Internal
* None.

2.2.3 Release notes (2018-1-17)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] Fixed a bug in upload progress reporting.
* [Object Server] Fixed a bug where any errors which occurred when trying to sync the admin Realm were ignored, which made attempting to add a listener with an invalid admin user silently do nothing.

### Internal
* None.

2.2.2 Release notes (2018-1-16)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] Added missing `Realm.Sync` listener functions.

### Internal
* None.


2.2.1 Release notes (2018-1-13)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] Fixed a bug preventing opening Realms with an admin token without a working ROS directory service (#1615).

### Internal
* None.

2.2.0 Release notes (2018-1-12)
=============================================================
### Breaking changes
* None.

### Enhancements
* Added new query features to support a subset of `NSPredicates` for example `LIKE` for string matches, `@count` and `@sum` in lists. See documentation for more details.
* Potential performance enhancements in cases of many writes between queries.
* [Object Server] Added method `Realm.Sync.User.authenticate` to unify authentication of users.
* [Object Server] Added JWT authenfication (#1548).

### Bug fixes
* Fix a bug where `Realm.open` could unexpectedly raise a "Realm at path ... already opened with different schema version" error.
* `subscribeToObjects` was added as a property for Chrome debugging (#1608).
* Increased request timeout for token refresh requests to 10 seconds. This should help with failing token refreshes on a loaded server (#1586).

### Internal
* Updated to Realm Sync 2.2.9.
* Updated to Realm Core 5.1.2 (see "Enhancements").
* Explicitly send `register: false` when logging in with `Realm.Sync.User.login` to avoid creating the user if they don't exist.

2.1.1 Release notes (2017-12-15)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] Fixed a bug where long reconnection happens when a proxy in front of the sync worker returns one of those.

### Internal
* [Object Server] Updated to Realm Object Server v2.2.0 for testing.
* Updated to Realm Sync 2.1.10 (see "Bug fixes").


2.1.0 Release notes (2017-12-14)
=============================================================
### Breaking changes
* None.

### Enhancements
* Added property `Realm.isClosed` which indicates if a Realm instance is closed or not.
* Added property `disableFormatUpgrade` to the Realm configuration object which disables automatic file format upgrade when opening a Realm file.

### Bug fixes
* None.

### Internal
* Updated to React Native 0.50.4 (test and example apps).

2.0.13 Release notes (2017-12-8)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Object Server] When authentication fails due to a misbehaving server, a proper error is thrown.

### Internal
* [Object Server] Strings can now be assigned to Date columns. When that happens the JavaScript Date constructor will be invoked to parse the string.
* [Object Server] Base64 strings can now be assigned to Data columns.

2.0.12 Release notes (2017-12-1)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug in 3rd party JSON parser: `localeconv()` does not exist on Android API < 21 and should not be called.

### Internal
* Fixed issues in unit tests (`addListener` hangs on Android).
* Upgraded to Realm Sync 2.1.8 (no external effects).

2.0.11 Release notes (2017-11-23)
=============================================================
### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* [Object Server] Fixed a bug where deleted-then-recreated objects with identical primary keys to become empty.
* [Object Server] Fixed a bug in outward partial sync is changed to ensure convergence of partial sync in the case where the client creates a primary key object, that is already present on the server, and subscribes to it in the same transaction.

### Internal
* Updated to Realm Sync 2.1.7 (see under "Bug fixes").

2.0.10 Release notes (2017-11-21)
=============================================================
### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* Fix json parsing in RN debugger.

### Internal
* None.

2.0.9 Release notes (2017-11-20)
=============================================================
### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* Reenable Realm for RN Android (#1506), which was disabled only in 2.0.8 by mistake.

### Internal
* None.

2.0.8 Release notes (2017-11-17)
=============================================================
### Breaking changes
* None.

### Enhancements
* [Object Server] Improving performance of processing large changesets.

### Bug fixes
* [Object Server] Changesets over 16MB in size are now handled correctly.

### Internal
* Updated to Realm Sync 2.1.6.
* Updated to JSON for Modern C++ 2.1.1.

2.0.7 Release notes (2017-11-15)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fixes Realm.open hangs in React Native debugger for iOS and Android

### Internal
* Updated to Realm Sync 2.1.4.


2.0.6 Release notes (2017-11-10)
=============================================================
### Breaking changes
* None.

### Enhancements
* Improved notification performance for objects with no object or list properties.

### Bug fixes
* Fixed a compilation error related to object IDs for React Native on Android (#1480).
* Fixed a race condition where closing and immediately reopening a synchronized
  Realm opened using an admin token user would fail.

### Internal
* None.

2.0.5 Release notes (2017-11-9)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Added support for object IDs.
* Updated to Realm Sync 2.1.2.


2.0.4 Release notes (2017-11-7)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.1.1.


2.0.3 Release notes (2017-11-6)
=============================================================
### Breaking changes
* None.

### Enhancements
* Better support for React Native 0.49 for iOS (#1431).
* Added property `name` to `error` in `Sync.error` callback.
* Sync error handler provides also a property called `name`; `code` is not changed.

### Bug fixed
* Fixed missing Realm constructor in while debugging React Native apps (#1436).
* Removed argument in documentation of `Realm.Sync.Adapter.realmAtPath()`.

### Internal
* None.

2.0.2 Release notes (2017-10-30)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fix several cases where adding collection listeners from within a listener
  callback would produce incorrect results.

### Internal
* None.

2.0.1 Release notes (2017-10-23)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Upgraded to Realm Sync 2.1.0.

2.0.0 Release notes (2017-10-17)
=============================================================
### Breaking changes
* Switch to Sync protocol 2.0, compatible with Realm Object Server 2.0.0. This version does NOT support 1.x.x of Realm Object Server.
* Upgraded to Realm Core 4.0.1, which has a new file format. If older Realm versions are opened, the database will be migrated automatically.
* Deprecate node 4 and node 5 support.
* Renamed `setAccessToken()` to `setFeatureToken()`.
* During iteration (`for ... of`) of `Realm.Results`, the results will be frozen using the `snapshot()` method (#1366).

### Enhancements
* The data model now support arrays of primitive types!
* Added `update` method to `Realm.Results` to support bulk updates (#808).
* Added support for aggregate functions on `Realm.Results` and `Realm.List` of primitive types.
* Handling of the situation when the client has to reset due to mismatching Realm versions (#795).
* Added `Realm.subscribeToObjects()` to listen for changes in partially synced Realms.
* Add support for sorting Lists and Results on values from linked objects.
* Configuration of sync file system is not done on module import but later when actually needed by sync (#1351)
* `Realm.Sync.User.adminUser()` will now throw an exception if either token or server argument is invalid.

### Bug fixes
* Avoid closing then reopening a sync session when using `Realm.open` (#1391).
* Respect custom Realm paths when using `Realm.open` (#1392 and #1393).
* Fixed bug in `Realm.subscribeToObjects()`.
* An issue where access tokens were not refreshed correctly has been addressed.

### Internal
* OpenSSL for Android is distributed in a separate package, and the build system needed updates to accommendate this.
* Added `-fvisibility=hidden` to Android builds (reduces size of `.so` file).
* Add `Session._overrideServer` to force an existing session to connect to a different server.
* Alignment of permission schemas.
* Upgrading to Realm Sync 2.0.2.
* Upgrading to Realm Object Server 2.0.0


1.13.0 Release notes (2017-10-5)
=============================================================
### Breaking changes
* None.

### Enhancements
* Add a callback function used to verify SSL certificates in the sync config.
* Added aggregate functions `min()`, `max()`, `sum()`, and `avg()` to `Realm.Results` and `Realm.List` (#807).
* Added `deleteRealmIfMigrationNeeded` to configuration to delete a Realm if migration needed (#502).

### Bug fixes
* Fixed port conflict between RN >= 0.48 inspector proxy and RPC server used for Chrome debugging (#1294).
* Workaround for RN >= 0.49 metro-bundler check for single string literal argument to `require()` (#1342)

1.12.0 Release notes (2017-9-14)
=============================================================

### Enhancements
* Improve performance of the RPC worker for chrome debugging.
* Added Progress API `realm.syncSession.addProgressNotification` and `realm.syncSession.removeProgressNotification`
* Added additional parameter for `Realm.open` and `Realm.openAsync` for download progress notifications
* Added `Realm.deleteFile` for deleting a Realm (#363).
* Added `Realm.deleteModel` for deleting a Realm model in a migration (#573).
* Added support for in-memory Realms.
* `Realm.Sync.User.login`, `Realm.Sync.User.register`, and `Realm.Sync.User.registerWithProvider` return Promises and deprecate the callback style for them. Callbacks will continue to work for backward compatibility.

### Bug fixes
* Adding missing TypeScript definitions; Permissions (#1283), `setFeatureToken()`, and instructions (#1298).
* Removed `loginWithProvider` from TypeScript definition files. This API never existed and was incorrectly added.

1.11.1 Release notes (2017-9-1)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix accessToken.

1.11.0 Release notes (2017-8-31)
=============================================================
### Breaking changes
* None

### Enhancements
* Added methods `Realm.beginTransaction()`, `Realm.commitTransaction()`, `Realm.cancelTransaction()` to manually control write transactions.
* Added property `Realm.isInTransaction` which indicates if write transaction is in progress.
* Added `shouldCompactOnLaunch` to configuration (#507).
* Added `Realm.compact()` for manually compacting Realm files.
* Added various methods for permission management (#1204).

### Bug fixes
* None


1.10.3 Release notes (2017-8-16)
=============================================================
### Breaking changes
* setAccessToken renamed to setFeatureToken. setAccessToken still works for now.

### Enhancements
* None

### Bug fixes
* None


1.10.2 Release notes (2017-8-16)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* RN 0.47 no longer breaks for Android due to a superfluous @override annotation


1.10.1 Release notes (2017-8-2)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* `Realm.openAsync` will no longer open the realm if a sync error has occured. Previously this resulted in the callback being invoked twice - once with an error and a second time - with the synchronously opened Realm.
* Database adapters will no longer process the sync history of realm files that are not requested by the adapter configuration. Previously this would lead to crashes for realm files that contained schemas that don't define primary keys.

=======
* None

1.10.0 Release notes (2017-7-12)
=============================================================
### Breaking changes
* None

### Enhancements
* Added `Realm.prototype.empty` which is a property that indicates whether or not the realm has any objects in it.

### Bug fixes
* Fix crash on Node.js when a listener callback throws an error.
  The error will now be forwarded to Node's fatal error handling facilities. This means better error reporting,
  the ability to debug such errors in a Node.js debugger, and proper invocation of the `uncaughtError` event on the `process` object.

1.9.0 Release notes (2017-7-10)
=============================================================
### Breaking changes
* None

### Enhancements
* Add support for iOS React Native 0.46. Thanks [@ovr](https://github.com/ovr)!
* Add support for Linking Objects (AKA Backlinks).
* Add support for retrieving user account information.
* Add optional `server` parameter to `Realm.Sync.User.adminUser`
  Specifying the server address the same way as in `Realm.Sync.User.login` allows the admin token user to use the permission realm APIs.

### Bug fixes
* Fix regression where setting a Results or List object to a `list` property would throw.

1.8.3 Release notes (2017-6-27)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix admin users not appearing in `Realm.Sync.User.all`, which broke getting an access token for them.

1.8.2 Release notes (2017-6-26)
=============================================================
### Breaking changes
* None

### Enhancements
* Added `indexOf()` method on `Realm.Results` and `Realm.List` that returns the index of the object in the collection.

### Bug fixes
* Fix opening synced realms with a logged-in admin user.

1.8.1 Release notes (2017-6-20)
=============================================================
### Breaking changes
* None

### Enhancements
* Accessing `Realm.Sync` when sync is not enabled will no longer throw, but return `undefined`.
* Better error messages when creating objects.
* Added bundled TypeScript declarations of the Realm API.
* Added `objectSchema()` method on `Realm.Object` that returns the schema for the object.

### Bug fixes
* Fix `Realm.Sync.User.prototype.isAdmin` returning `false` for logged-in admin users.

1.8.0 Release notes (2017-6-15)
=============================================================
### Breaking changes
* None

### Enhancements
* Updated core and sync dependencies
* Unified packaging

### Bug fixes
* Fix crash when used with the React Native C++ bridge
* Fix `Realm.open` and `Realm.asyncOpen` missing when in the React Native debugger

1.3.1 Release notes (2017-5-18)
=============================================================
### Breaking changes
* None

### Enhancements
* Add Realm open async API support.

### Bug fixes
* None


1.3.0 Release notes (2017-5-11)
=============================================================
### Breaking changes
* Files written by Realm this version cannot be read by earlier versions of Realm.
Old files can still be opened and files open in read-only mode will not be modified.
* The `setVerifyServersSslCertificate` method has been deleted
* The SyncConfig now gets two more optional parameters, `validate_ssl` and `ssl_trust_certificate_path`.

### Enhancements
* None

### Bug fixes
* None

1.2.0 Release notes (2017-3-28)
=============================================================
### Breaking changes
* This version is not compatible with versions of the Realm Object Server lower than 1.3.0.

### Enhancements
* None.

### Bug fixes
* Fixed bug where opening synced realms with an encryption key would fail.

1.1.1 Release notes (2017-3-9)
=============================================================
### Breaking changes
* None

### Enhancements
* Add support for Node.js on Windows (#863).

### Bug fixes
* Fixed an error when installing Realm React Native module on Windows (#799).

### Credits
* Thanks to David Howell (@dbhowell) for adding a fix to Windows install (#849).

1.0.2 Release notes (2017-2-7)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Proactively refresh sync user tokens to avoid a reconnect delay (#840)

1.0.1 Release notes (2017-2-2)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix crash when the sync user token expires (#839)

1.0.0 Release notes (2017-2-2)
=============================================================
### Breaking changes
* None

### Enhancements
* Add the Management Realm accessor on the User class, and its schema (#779)

### Bug fixes
* None

0.15.4 Release notes (2017-1-11)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Always download Node binaries except on Windows, for unit testing (#789)


0.15.3 Release notes (2017-1-10)
=============================================================
### Breaking changes
* None

### Enhancements
* More specific error message when setting a property to a wrong type (#730)

### Bug fixes
* Fix chrome debugging on React Native 0.39 and up (#766)


0.15.2 Release notes (2016-12-29)
=============================================================
### Breaking changes
* None

### Enhancements
* More explicit handling of missing constructor (#742)

### Bugfixes
* Realm open on another thread (#473)
* symbol() variable not found (#761)


0.15.1 Release notes (2016-11-22)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix compile error for collection notification in chrome debug mode

0.15.0 Release notes (2016-11-15)
=============================================================
### Breaking changes
* None

### Enhancements
* Node.js support
* Support for fine grained notifications on `List` and `Results` objects
* Updated test and examples for react-natve v0.37.0

### Bugfixes
* None

0.14.3 Release notes (2016-8-8)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Support for react-native v0.31.0

0.14.2 Release notes (2016-8-3)
=============================================================
### Breaking changes
* Deprecate `Realm.Types`. Please specify the type name as lowercase string instead.

### Enhancements
* None

### Bugfixes
* None

0.14.2 Release notes (2016-7-11)
=============================================================
### Breaking changes
* Please use `rnpm 1.9.0` or later to link your project. Older versions are no longer supported.
* ReactNative versions older than v0.14.0 are no longer supported

### Enhancements
* Support for ReactNative versions v0.28.0+
* Added support for debugging in Visual Studio Code.

### Bugfixes
* None

0.14.1 Release notes (2016-6-28)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix linker error when building for minimum target version of iOS 7.
* Fix for failure in `strip` command when building an archive.

0.14.0 Release notes (2016-6-22)
=============================================================
### Breaking changes
* None

### Enhancements
* Added `isValid()` method to `List` and `Results` to check for deleted or invalidated objects
* Added `objectForPrimaryKey(type, key)` method to `Realm`

### Bugfixes
* Fix for crash when setting object properties to objects from other Realms
* Fix for exception sometimes thrown when reloading in Chrome debug mode

0.13.2 Release notes (2016-5-26)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when updating Realms with optional date properties to the new file format

0.13.1 Release notes (2016-5-24)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when inserting dates from before the epoch
* Fix for crash when using collection snapshot after realm.deleteAll()

0.13.0 Release notes (2016-5-19)
=============================================================
### Breaking changes
* With this release we have switched over to a new cross platform compatible date format.
  This change will only require action from users who are using both the JS and Cocoa or Android
  bindings simultaneously and accessing Realm files from both bindings. In these cases you need to
  open the Realm file with the latest version of the iOS or Android bindings before accessing the
  Realm from JS to prevent an unnecessary conversion.

### Enhancements
* None

### Bugfixes
* Date properties are now stored in a format compatible with the Realm Browser and other bindings.
* Fix for using `class MyObject extends Realm.Object` in a React Native project.
* Fix a memory leak caused by constructing a Realm instance of an already opened Realm.
* Fix for better supporting hot module reloading.
* Fix for some warnings when using `ListView` with React Native 0.25+
* Fix for queries that use a keypath starting with "not".

0.12.0 Release notes (2016-5-4)
=============================================================
### Breaking changes
* None

### Enhancements
* Support for queries comparing optional properties to `null`
* `object.isValid()` has been added to enable checking if an object has been deleted
  - **Note:** Custom object classes can extend `Realm.Object` to inherit this method
* Support opening a Realm as read-only with the `readOnly` configuration option
* Support for providing a custom migration function (please see the docs for details)
* Added `path`, `readOnly`, `schema`, and `schemaVersion` properties to `Realm` instances
* Optional and list properties are no longer required when creating objects

### Bugfixes
* When accessing an empty Results `undefined` is returned rather than throwing an exception
* Accessing a deleted object throws a JS exception rather than crashing
* Accessing an invalidated Results snapshot throws a JS exception rather than crashing
* Fix for error message when specifying properties with invalid object types
* Fix memory leak when reloading an app in debug mode
* Setting non-persisted properties now works as expected

0.11.1 Release notes (2016-3-29)
=============================================================
### Bugfixes
* Fix for using Android Studio to build app using Realm
* Fix for sharing Realm between JS and Objective-C/Swift

0.11.0 Release notes (2016-3-24)
=============================================================
### Breaking changes
* Realm for React Native is now packaged as a static library for iOS
  - Remove the reference to `RealmJS.xcodeproj` from your Xcode project
    (under the `Libraries` group)
  - Make sure `rnpm` is installed and up-to-date: `npm install -g rnpm`
  - Run `rnpm link realm` from your app's root directory

### Enhancements
* Support for encrypted Realms
* List and Results now inherit from Realm.Collection
* List and Results is now iterable (e.g. supports `for...of` loops)
* Add common Array methods to List and Results
* Accept constructor in create() and objects() methods
* Support relative paths when opening Realms
* Support case insensitive queries by adding `[c]` after operators
* Support for indexed `bool`, `string`, and `int` properties
* Added `Realm.schemaVersion` method, which supports unopened Realms

### Bugfixes
* Fix for crash on Android when initializing the Realm module
* Fix for using Chrome debug mode from a device
* Fix for List splice method not accepting a single argument
* Don't download or unpack core libraries unnecessarily


0.10.0 Release notes (2016-2-22)
=============================================================
### Enhancements
* Initial Release
