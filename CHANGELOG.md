6.0.3 Release notes (2020-7-15)
=============================================================
### Enhancements
* None.

### Fixed
* Missing `toJSON` TS declaration added for `Realm.Object` ([2903](https://github.com/realm/realm-js/issues/2903))
* Upgrading older Realm files with String indexes was very slow. ([realm/realm-core#3767](https://github.com/realm/realm-core/issues/3767), since v6.0.0)
* Upgrading a Realm file could result in the file getting corrupted. ([realm/realm-core#3734](https://github.com/realm/realm-core/issues/3734), since v6.0.0)
* Using `REALM_USE_FRAMEWORKS` environment variable to override detection of `use_framework!` in Cocoapods. Thanks to @alexeykomov. ([#2839](https://github.com/realm/realm-js/issues/2830))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 3.11 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.6 to v6.0.9.
* Upgraded Realm Sync from v5.0.5 to v5.0.8.

6.0.2 Release notes (2020-06-02)
=============================================================
### Enhancements
* None.

### Fixed
* Fixes crashes on some iOS devices when upgrading realm file to new format ([2902](https://github.com/realm/realm-js/issues/2902))
* Fixes a possible 'NoSuchTable' exception after upgrading of a realm file on some devices ([3701](https://github.com/realm/realm-core/issues/3701))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 3.11 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Fixed compiling without Realm Sync

6.0.1 Release notes (2020-5-18)
=============================================================
### Enhancements
* None.

### Fixed
* Added missing file to Android builds. The bug caused RN Android to crash with error `cannot locate symbol "_ZN5realm4util9Scheduler12make_defaultEv"`. ([#2884](https://github.com/realm/realm-js/issues/2884))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 3.11 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous formats).

### Internal
* None.

6.0.0 Release notes (2020-5-14)
=============================================================
NOTE: This version bumps the Realm file format to version 10. It is not possible to downgrade version 9 or earlier. Moreover, older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 3.11](https://github.com/realm/realm-studio/releases/tag/v3.11.0) or later will be able to open the new file format.

### Breaking changes
* Support of the old timestamp type has been removed, and older files cannot be upgraded. The new timestamp type was introduced in v1.0.0.
* `Realm.delete(Realm.Collection)` will conserve the order i.e., if a `Realm.Results` is [1, 2, 3] (pseudo-notation), `Realm.delete(2)` will produce [1, 3].
* It is only possible to compact a Realm when a single instance is open. Consider to use configuration parameter `shouldCompactOnLaunch` in the future.
* Schemas are not cached but will be reread when opening a Realm. This has an impact on default values as they are not persisted in the Realm files.

### Enhancements
* None.

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 3.11 or later.
* APIs are backwards compatible with all previous release of realm in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous formats).

### Internal
* Updated Realm Core from v5.23.8 to v6.0.4.
* Updated Realm Sync from v4.9.5 to v5.0.3.
* Updated Realm Object Store to commit 820b74e2378f111991877d43068a95d2b7a2e404.

5.0.5 Release notes (2020-05-12)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a crash on Windows and Node.js 10+ when using Sync over HTTPS. ([#2560](https://github.com/realm/realm-js/issues/2560))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

5.0.4 Release notes (2020-4-29)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a bug so `Realm.open()` will reject the promise with an error instead of `Operation canceled` when a manual client resync has occurred. ([#2679](https://github.com/realm/realm-js/pull/2679), since v3.1.0)
* Replaced `decompress` with `node-tar` to avoid using vulnerable dependencies. ([#2773](https://github.com/realm/realm-js/issues/2773))
* Fixed TypeScript definitions, React Native debugger support and added documentation for `Realm.Sync.enableSessionMultiplexing()`. Thanks to @bimusiek. ([#2776](https://github.com/realm/realm-js/issues/2776))
* Fixed `obj.entries()` to return actual key/value pairs. Previously incorrectly returned key/`undefined` for all object keys. ([#2829](https://github.com/realm/realm-js/pull/2829), since v5.0.3)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added a platform independent way of printing to stdout on iOS & Node.js and the log on Android. ([#2789](https://github.com/realm/realm-js/pull/2789))
* Added node 14 (ABI v83) to CI and as a prebuild target.
* Added Electron 7.2.x as a prebuild target. Thanks to @rajivshah3. ([#2833](https://github.com/realm/realm-js/pull/2833))

5.0.3 Release notes (2020-4-01)
=============================================================
### Enhancements
* None.

### Fixed
* Realm Object properties not working when accessed, returning `undefined` on React Native for Android in Realm JS v5.0.2  ([#2763](https://github.com/realm/realm-js/issues/2763))
* Using `obj.keys()` or `obj.entries()` caused TypeScript error "Property 'keys' does not exist on type 'Object'". ([#2778](https://github.com/realm/realm-js/issues/2778), since v5.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

5.0.2 Release notes (2020-3-21)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a bug in how destruction of global objects was handled. This could lead to a segmentation fault on Node.js version 12 and 13 when the application terminated. ([#2759](https://github.com/realm/realm-js/issues/2759))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

5.0.1 Release notes (2020-3-20)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a bug in how the destruction of global objects was handled. This could lead to segfaults on Node.js version 12 and 13. ([#2759](https://github.com/realm/realm-js/issues/2759))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added `fullSynchronization` and `clientResyncMode` to `Realm.Session.config` to generate a more complete configuration.

5.0.0 Release notes (2020-3-18)
=============================================================
NOTE: This version has been pre-released as v3.7.0-alpha.0 and v3.7.0-alpha.2. We have bumped the major version due to removed functionality in this release. We are releasing this as v5.0.0 instead of v4.0.0 as we also have an series of pre-releases of v4.0.0 which are incompatible with this version as the Realm file format is upgraded. We have therefore decided to skip version v4.0.0, make this version 5.0.0 and we will then release the 4.0.0 version as the next major version - v6.0.0.

### Enhancements
* Added support for all Node.js versions from and above version 10. ([#2516](https://github.com/realm/realm-js/issues/2516))
* Helper methods `obj.keys()`, `obj.entries()` are now available to return the properties of that Realm Object, including the Realm properties defined by the schema.
* An instance method `toJSON()` is implemented on every Realm Object class to support `JSON.stringify()` to work as expected on every instance.

### Breaking changes
* Node.js 8 is not supported anymore.
* Realm objects properties are now defined as accessors on the instance prototype. Previously they were defined as values on the instance.
* Due to the accessor properties change above, calling `Object.keys()`, `Object.entries()`, and `Object.getOwnPropertyDescriptors()` on Realm.Object instances (objects from a Realm) will no longer return the Realm schema properties.

### Fixed
* ECMAScript 2015 Class syntax is fully supported by moving all properties to be accessors on the instance prototype allowing Realm JavaScript to invoke class constructors as constructors (using `new` instead of previously calling them as functions with 'call'). ([#998](https://github.com/realm/realm-js/issues/998))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (reads and upgrades all previous formats).

### Internal
* Complete rewrite of Realm JavaScript for Node.js on top of [Node.js N-API](https://nodejs.org/api/n-api.html)
* Realm JavaScript is now binary compatible between Node.js versions (due to NAPI API stability and backward compatibility).

3.6.5 Release notes (2020-3-4)
=============================================================
### Enhancements
* None.

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Fixed a bug which prevent session multiplexing if sync log level is set. ([HELP-14004](https://jira.mongodb.org/browse/HELP-14004)

3.6.4 Release notes (2020-2-14)
=============================================================
### Enhancements
* None.

### Fixed
* Connecting via SSL would crash on iOS 11.x due to an incorrect version availability check around an API introduced in iOS 12. ([realm/realm-sync#3230](https://github.com/realm/realm-sync/pull/3230), since v3.6.2).
* Fix a bug which to lead to a fatal error when deleting a non-existing file. ([realm/realm-object-store#913](https://github.com/realm/realm-object-store/pull/913), since v1.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated Realm Object Store to commit 49458da2447499c370da0000c3b47c76e9ce9421.
* Updated Realm Sync from v4.9.4 to v4.9.5.
* Updated Realm Object Store to commit fda4afdda8f4325766c13a29c73e9e43e361be98.

3.6.3 Release notes (2020-1-17)
=============================================================
### Enhancements
* None.

### Fixed
* Added missing `Realm.Sync.ClientResyncMode` constants. ([#2690](https://github.com/realm/realm-js/issues/2690), since v3.1.0)
* Untrusted SSL certificates were treated as transient rather than fatal errors on Apple platforms. (since v3.6.2)
* On React Native, when using libraries that define the `atob` global, users would experience our library incorrectly assuming it was running via the remote (Chrome) debugger. ([#2294](https://github.com/realm/realm-js/issues/2294), since v2.0.3)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated Realm Sync from v4.9.3 to v4.9.4.

3.6.2 Release notes (2020-1-16)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a bug that prevented `ClientResyncMode.Discard` to discard the local changes. ([#2664](https://github.com/realm/realm-js/issues/2664), since v3.1.0)
* Fixed a bug where properties with float and double values would not be sorted correctly. ([realm/realm-core#3520](https://github.com/realm/realm-core/pull/3520), since v3.6.0)
* Fixed a bug where a `NOT` query on a list would incorrectly match objects which have an object index one less than a correctly matching object which appeared earlier in the list. ([realm/realm-cocoa#6289](https://github.com/realm/realm-cocoa/issues/6289), since v1.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded Realm Core from v5.23.7 to v5.23.8.
* Upgraded Realm Sync from v4.9.1 to v4.9.3.

3.6.0 Release notes (2019-12-11)
=============================================================
### Enhancements
* Improved performance of constructing queries, especially for large schemas. ([ROBJSTORE-58](https://jira.mongodb.org/browse/ROBJSTORE-58))
* Reduce the encrypted page reclaimer's impact on battery life on Apple platforms. ([realm/realm-core#3461](https://github.com/realm/realm-core/pull/3461))

### Fixed
* Fixed a React Native iOS build failure ('realm/util/assert.hpp' file not found) when installing in a repository where CocoaPods (ios/Pods) are committed to repository. ([#2617](https://github.com/realm/realm-js/issues/2617), since v3.4.0)
* When calling `Realm.deleteModel()` on a synced Realm could lead to an error message like `Failed while synchronizing Realm: Bad changeset (DOWNLOAD)`. A better error message (`Cannot delete model for a read-only or a synced Realm.`) is introduced. ([RJS-230](https://jira.mongodb.org/browse/RJS-230), since v1.12.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Fixed download URLs to make it possible to build without sync. ([RJS-355](https://jira.mongodb.org/browse/RJS-355))
* Now explicitly (deleting and re-)creating a "realm-js-integration-tests" simulator when running the React Native iOS integration tests.
* Updated Realm Core from v5.23.6 to v5.23.7.
* Updated Realm Sync from v4.9.0 to v4.9.1.
* Updated Realm Object Store to commit 8c274c2dbb2b6da67cd95707e39da4597993f938.

3.5.0 Release notes (2019-12-2)
=============================================================
NOTE: Including changes from v3.5.0-alpha.1.

### Enhancements
* Improved performance for some queries involving links. ([RJS-350](https://jira.mongodb.org/browse/RJS-340))

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added a test to verify that an exception is thrown when an object schema has no properties.
* Added a test to verify that `Realm.close()` is idempotent.
* Upgraded the React Native integration tests app (now using RN v0.61.3). ([#2603](https://github.com/realm/realm-js/pull/2603) & [#2609](https://github.com/realm/realm-js/pull/2609))
* Upgraded Realm Sync from v4.8.3 to v4.9.0. ([RJS-350](https://jira.mongodb.org/browse/RJS-350))
* Upgraded Realm Object Store to commit eb3b351c9e4d6a5024e442243bfb1fa320d94bfe.
* A new error code is added. When the state is entered, it is often when a client attempt to connect to a server after a long period of being offline.

3.5.0-alpha.1 Release notes (2019-11-27)
=============================================================
### Enhancements
* Improved performance for some queries involving links. ([RJS-350](https://jira.mongodb.org/browse/RJS-340))

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added a test to verify that an exception is thrown when an object schema has no properties.
* Added a test to verify that `Realm.close()` is idempotent.
* Upgraded the React Native integration tests app (now using RN v0.61.3). ([#2603](https://github.com/realm/realm-js/pull/2603) & [#2609](https://github.com/realm/realm-js/pull/2609))
* Upgraded Realm Object Store to commit be469eedfb573024839fd61d69e92933b9c1fc9e. ([RJS-349](https://jira.mongodb.org/browse/RJS-349))
* Upgraded Realm Sync from v4.8.3 to v4.9.0. ([RJS-350](https://jira.mongodb.org/browse/RJS-350))

3.4.2 Release notes (2019-11-14)
=============================================================
### Enhancements
* None.

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgrade from Realm Sync v4.8.2 to v4.8.3.
* Fixed a bug in debug mode which could occasionally lead to the assertion `Assertion failed: m_ct_history->size() == m_ct_history_size`. ([RSYNC-71](https://jira.mongodb.org/browse/RSYNC-71), since v2.0.0)

3.4.1 Release notes (2019-11-12)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed a bug when the sync client reconnect after failing to integrate a changeset. The bug would lead to further corruption of the client's Realm file. ([RSYNC-48](https://jira.mongodb.org/browse/RSYNC-48), since v2.3.0-alpha.1)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgrade from Realm Sync v4.7.12 to v4.8.2.

3.4.0 Release notes (2019-11-11)
=============================================================
### Enhancements
* Support mirroring of binary files. Thanks to @malice00. ([#2501](https://github.com/realm/realm-js/issues/2501))
* Performance significantly improved when making a query on the property of a linked table, when the property is indexed. ([realm/realm-core#3432](https://github.com/realm/realm-core/pull/3432))
* Added a CocoaPod Podspec file, enabling [autolinking](https://github.com/react-native-community/cli/blob/master/docs/autolinking.md) for React Native on iOS. ([#2586](https://github.com/realm/realm-js/pull/2586))

### Fixed
* On Android, the Realm file could be corrupted when using encrypted realms. It has never been reported in this project. ([realm/realm-core#3427](https://github.com/realm/realm-core/pulls/3427))
* Fixed a segmentation fault when calling `Realm.deleteAll()` after `Realm.deleteModel()`. ([#2597](https://github.com/realm/realm-js/issues/2597), since v1.12.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated from Realm Core v5.23.5 to v5.23.6.
* Updated from Realm Sync v4.7.10 to v4.7.12.
* Fixed an out-of-range bug in Windows builds. In debug mode, the exception `can't dereference out of range vector iterator` would be thrown and the process would terminate. ([realm/realm-object-store#832](https://github.com/realm/realm-object-store/issues/832))
* Fixed a couple of flaky tests.
* Upgraded to Xcode 10.3 for building and testing.

3.3.0 Release notes (2019-10-18)
=============================================================
### Enhancements
* Improve performance of changeset scanning when syncing data. This happens on a background thread, so it shouldn't have any visible effect.

### Fixed
* Fixed incorrect return type of `Realm.Sync.addListener()` in API doc and Typescript definition. ([#2566](https://github.com/realm/realm-js/issues/2566), since v2.23.0)
* Added `react-native.config.js` to distribution file. ([#2564](https://github.com/realm/realm-js/issues/2564) and [#2460](https://github.com/realm/realm-js/issues/2460), since v3.2.0)
* Fixed user methods (authentication, etc.) when running on the Electron main process, where `XMLHttpRequest` is `undefined`. ([#2274](https://github.com/realm/realm-js/issues/2274), since v2.24.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Cleaned up the console output produced by `./tests`. ([#2548](https://github.com/realm/realm-js/pull/2548))
* Added a `README.md` to the React Test App directory. ([#2561](https://github.com/realm/realm-js/pull/2561))
* Using the 'deprecated-react-native-listview' instead of `ListView` from the 'react-native' package. Thanks to @Kevin-Lev. ([#2568](https://github.com/realm/realm-js/pull/2568))
* Updated to Realm Sync from 4.7.8 to 4.7.10.

3.2.0 Release notes (2019-9-30)
=============================================================
### Enhancements
* `Realm.Sync.Adapter` can now accept a predicate function filter instead of a regex. ([#2539](https://github.com/realm/realm-js/pull/2539))

### Fixed
* Chained OR equals queries on an unindexed string column failed to match any results if any of the strings were 64 bytes or longer. ([realm/realm-core#3386](https://github.com/realm/realm-core/pull/3386), since v2.27.0-rc.2).
* Fixed serialization of a query which looks for a null timestamp. This only affects query based sync. ([realm/realm-core#3388](https://github.com/realm/realm-core/pull/3388), since v3.0.0)
* Fixed VS Code React Native debugger context. Thanks to @sam-drew. ([#2476)(https://github.com/realm/realm-js/issues/2476))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Realm Core v5.23.5.
* Updated to Realm Sync v4.7.8.


3.1.0 Release notes (2019-9-19)
=============================================================
### Enhancements
* Added support for Client Resync which can automatically recover the local Realm in case the server is rolled back. This largely replaces the Client Reset mechanism. It is configured using `Realm.Sync.Configuration.clientResyncMode`. Three modes are available: `'recover'`, `'discard`', and `'manual'` but currently only `'manual'` is supported for query-based sync. Default is `'recover'` for full sync and `'manual'` for query-based sync. ([#2328](https://github.com/realm/realm-js/issues/2328))

### Fixed
* Fixed check for if the partial sync schema needs to be initialized. ([realm/realm-object-store#843](https://github.com/realm/realm-object-store/pull/843))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.


3.0.0 Release notes (2019-9-11)
=============================================================
### Breaking Changes
* Reworked the internal implementation of the permission API. For the most part, the method signatures haven't changed or where they have changed, the API have remained close to the original (e.g. `Results<T>` has changed to `T[]`).
  * Changed the return type of `User.getGrantedPermissions` from `Results<Permission>` to `Permission[]`. This means that the collection is no longer observable like regular Realm-backed collections. If you need to be notified for changes of this collection, you need to implement a polling-based mechanism yourself.
  * `Permission.mayRead/mayWrite/mayManage` have been deprecated in favor of a more-consistent `AccessLevel` API.
  * Removed the `User.openManagementRealm` method.
  * Changed the return type of `User.applyPermissions` from `Promise<PermissionChange>` to `Promise<void>`.

### Enhancements
* Added `User.getPermissionOffers` API to get a collection of all permission offers the user has created.

### Fixed
* Named pipes on Android are now created with 0666 permissions instead of 0600. This fixes a bug on Huawei devices which caused named pipes to change owners during app upgrades causing subsequent ACCESS DENIED errors. This should have no practical security implications. ([realm/realm-core#3328](https://github.com/realm/realm-core/pull/3328), since v0.10.0)
* fix error screen shown in React Native when refreshAdminToken and refreshAccessToken receive error result

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Realm Core v5.23.2.
* Updated to Realm Sync v4.7.4.
* Add support for direct access to sync workers on Cloud, bypassing the Sync Proxy. [RJS-6](https://jira.mongodb.org/browse/RJS-6)


2.29.2 Release notes (2019-8-14)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed Coop with Jitsi-Meet iOS SDK. Thanks to @djorkaeffalexandre. ([#2193](https://github.com/realm/realm-js/issues/2193))
* Fixed Gradle build error with Android Studio 3.5+. Thanks to @MarcBernstein. ([#2468](https://github.com/realm/realm-js/pull/2468))

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added support for Electron v4.2. ([#2452](https://github.com/realm/realm-js/issues/2452))
* Upgraded to Realm Sync v4.7.3.


2.29.1 Release notes (2019-7-11)
=============================================================
### Enhancements
* None.

### Fixed
* Queries involving an indexed int property which were constrained by a List with an order different from the table's order would give incorrect results. ([realm/realm-core#3307](https://github.com/realm/realm-core/issues/3307), since v2.27.0-rc.2)
* Queries involving an indexed int column had a memory leak if run multiple times. ([realm/realm-cocoa#6186](https://github.com/realm/realm-cocoa/issues/6186), since v2.27.0-rc.2)

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Realm Core v5.23.1.
* Updated to Realm Sync v4.6.3.


2.29.0 Release notes (2019-7-3)
=============================================================
### Enhancements
* For synchronized Realms it is now possible to choose the behavior when opening the Realm. You can either choose to open the local Realm immediately or wait for it to be synchronized with the server first. These options are controlled through `Realm.Sync.SyncConfiguration.newRealmFileBehavior` and `Realm.Sync.SyncConfiguration.existingRealmFileBehavior`. See the [docs](https://realm.io/docs/javascript/2.29.0/api/Realm.Sync.html#~SyncConfiguration) for more information.
* Added support for unicode characters in realm path and filenames for Windows. Thanks to @rajivshah3. ([realm-core#3293](https://github.com/realm/realm-core/pull/3293) and [#2319](https://github.com/realm/realm-js/issues/2319))

### Fixed
* A React Native iOS app could crash on the first launch. Thanks to @max-zu. ([#2400](https://github.com/realm/realm-js/issues/2400), since v1.0.0)
* When creating objects using migration, a native crash could occur if a new optional property was added to the schema. ([#1612](https://github.com/realm/realm-js/issues/1612), since v1.0.0)
* Constructing an `inclusions` made unnecessary table comparisons. This resulted in poor performance for subscriptions using the `includeLinkingObjects` functionality. ([realm/realm-core#3311](https://github.com/realm/realm-core/issues/3311), since v2.27.0-rc.3)

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Object Store commit: 8cd7b40eb294c4292726a6215339742eea5107c9
* Updated to Realm Core v5.23.0
* Updated to Realm Sync v4.6.2


2.28.1 Release notes (2019-6-3)
=============================================================
### Enhancements
* None.

### Fixed
* A bug in instruction cache invalidation could lead to SIGBUS errors on RN Android. ([#2391](https://github.com/realm/realm-js/issues/2391), since v2.28.0)

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.


2.28.0 Release notes (2019-5-22)
=============================================================
### Enhancements
* Improve performance when using Chrome Debugging with React Native by adding caching and reducing the number of RPC calls required. Read-heavy workflows are as much as 10x faster. Write-heavy workflows will see a much smaller improvement, but also had a smaller performance hit to begin with. (Issue: [#491](https://github.com/realm/realm-js/issues/491), PR: [#2373](https://github.com/realm/realm-js/pull/2373)).
* Reduce bundle size for React Native apps. Thanks to @lebedev. ([#2241](https://github.com/realm/realm-js/pull/2241))
* Support 64 bit for React Native Android. ([#2221](https://github.com/realm/realm-js/issues/2221))

### Fixed
* Opening a query-based Realm using `new Realm` did not automatically add the required types to the schema when running in Chrome, resulting in errors when trying to manage subscriptions. (PR: [#2373](https://github.com/realm/realm-js/pull/2373), since v2.15.0).
* The Chrome debugger did not properly enforce read isolation, meaning that reading a property twice in a row could produce different values if another thread performed a write in between the reads. This was typically only relevant to synchronized Realms due to the lack of multithreading support in the supported Javascript environments. (PR: [#2373](https://github.com/realm/realm-js/pull/2373), since v1.0.0).
* The RPC server for Chrome debugging would sometimes deadlock if a notification fired at the same time as a Realm function which takes a callback was called. (PR: [#2373](https://github.com/realm/realm-js/pull/2373), since v1.0.0 in various forms).

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.


2.27.0 Release notes (2019-5-15)
=============================================================
NOTE: The minimum version of Realm Object Server has been increased to 3.21.0 and attempting to connect to older versions will produce protocol mismatch errors. Realm Cloud has already been upgraded to this version, and users using that do not need to worry about this.

Changes since v2.26.1 (including v2.27.0-rc.2 and v2.27.0-rc.3):

### Enhancements
* Add an optional parameter to the `SubscriptionOptions`: `inclusions` which is an array of linkingObjects properties. This tells subscriptions to include objects linked through these relationships as well (links and lists are already included by default). ([#2296](https://github.com/realm/realm-js/pull/2296)
* Added `Realm.Sync.localListenerRealms(regex)` to return the list of local Realms downloaded by the global notifier. ([realm-js-private#521](https://github.com/realm/realm-js-private/issues/521)).
* Encryption now uses hardware optimized functions, which significantly improves the performance of encrypted Realms. ([realm-core#3241](https://github.com/realm/realm-core/pull/3241))
* Improved query performance when using `in` queries. ([realm-core#3241](https://github.com/realm/realm-core/pull/3241))
* Improved query performance when querying integer properties with indexes, e.g. primary key properties. ([realm-core#3272](https://github.com/realm/realm-core/pull/3272))
* Improved write performance when writing changes to disk. ([realm-core#2927](https://github.com/realm/realm-core/pull/2927))

### Fixed
* Making a query that compares two integer properties could cause a segmentation fault in the server or x86 node apps. ([realm-core#3253](https://github.com/realm/realm-core/issues/3253))
* Fix an error in the calculation of the `transferable` value supplied to the progress callback. ([realm-sync#2695](https://github.com/realm/realm-sync/issues/2695), since v1.12.0)
* HTTP requests made by the Sync client now always include a `Host: header`, as required by HTTP/1.1, although its value will be empty if no value is specified by the application. ([realm-sync#2861](https://github.com/realm/realm-sync/pull/2861), since v1.0.0)
* Added `UpdateMode` type to support the three modes of `Realm.create()`. ([#2359](https://github.com/realm/realm-js/pull/2359), since v2.26.1)
* Fixed an issue where calling `user.logout()` would not revoke the refresh token on the server. ([#2348](https://github.com/realm/realm-js/pull/2348), since v2.24.0)
* Fixed types of the `level` argument passed to the callback provided to `Realm.Sync.setLogger`, it was a string type but actually a numeric value is passed. ([#2125](https://github.com/realm/realm-js/issues/2125), since v2.25.0)
* Avoid creating Realm instances on the sync worker thread. ([raas#1539](https://github.com/realm/raas/issues/1539) and [realm-object-store#793](https://github.com/realm/realm-object-store/pull/793))

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats).

### Internal
* Updated to Realm Core v5.19.1.
* Updated to Realm Sync v4.4.2.
* Updated to Object Store commit 3e48b69764c0a2aaaa7a3b947d6d0dae215f9a09.
* Building for node.js using Xcode 10.x supported.
* Fixed the Electron integration tests. ([#2286](https://github.com/realm/realm-js/pull/2286) and [#2320](https://github.com/realm/realm-js/pull/2320))
* Added `Realm.Sync.Adapter` implemetation.


2.27.0-rc.3 Release notes (2019-5-10)
=============================================================
NOTE: This release is only compatible with Realm Object Server 3.21.0 or later.

### Enhancements
* Add an optional parameter to the `SubscriptionOptions`: `inclusions` which is an array of linkingObjects properties. This tells subscriptions to include objects linked through these relationships as well (links and lists are already included by default). ([#2296](https://github.com/realm/realm-js/pull/2296)

### Fixed
* Making a query that compares two integer properties could cause a segmentation fault in the server or x86 node apps. ([realm-core#3253](https://github.com/realm/realm-core/issues/3253))
* Fix an error in the calculation of the downloadable_bytes value supplied to the progress callback. (See sync version 4.0.0)
* HTTP requests made by the Sync client now always include a `Host: header`, as required by HTTP/1.1, although its value will be empty if no value is specified by the application. (sync v4.2.0)
* The server no longer rejects subscriptions based on queries with distinct and/or limit clauses. (sync 4.2.0)
* A bug was fixed where if a user had `canCreate` but not `canUpdate` privileges on a class, the user would be able to create the object, but not actually set any meaningful values on that object, despite the rule that objects created within the same transaction can always be modified. (sync 4.2.0)

### Compatibility
* Realm Object Server: 3.21.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Relm Sync 4.4.2.
* Updated to Object Store commit b96cd7ae5ff531a94fd759bdef9a5bb9e329a332

2.27.0-rc.2 Release notes (2019-5-8)
=============================================================
### Enhancements
* Added `Realm.Sync.localListenerRealms(regex)` to return the list of local Realms downloaded by the global notifier. ([realm-js-private#521](https://github.com/realm/realm-js-private/issues/521)).
* Encryption now uses hardware optimized functions, which significantly improves the performance of encrypted Realms. ([realm-core#3241](https://github.com/realm/realm-core/pull/3241))
* Improved query performance when using `in` queries. ([realm-core#3241](https://github.com/realm/realm-core/pull/3241))
* Improved query performance when querying integer properties with indexes, e.g. primary key properties. ([realm-core#3272](https://github.com/realm/realm-core/pull/3272))
* Improved write performance when writing changes to disk. ([realm-core#2927](https://github.com/realm/realm-core/pull/2927))

### Fixed
* Added `UpdateMode` type. ([#2359](https://github.com/realm/realm-js/pull/2359), since v2.26.1)
* Fixed an issue where calling `user.logout()` would not revoke the refresh token on the server. ([#2348](https://github.com/realm/realm-js/pull/2348), since v2.24.0)
* Fixed types of the `level` argument passed to the callback provided to `Realm.Sync.setLogger`, it was a string type but actually a numeric value is passed. ([#2125](https://github.com/realm/realm-js/issues/2125), since v2.25.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Building for node.js using Xcode 10.x supported.
* Fixed the Electron integration tests. ([#2286](https://github.com/realm/realm-js/pull/2286) and [#2320](https://github.com/realm/realm-js/pull/2320))
* Added `Realm.Sync.Adapter` implemetation.
* Upgraded to Realm Core v5.19.1.
* Upgraded to Realm Sync v4.2.3.
* Upgraded to Object Store commit d4bda636dbfb3926898c6ad5bf7f91f72affeb8d.

2.26.1 Release notes (2019-4-12)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed Xcode 10.2 Build Errors by providing `kJSTypeSymbol` for switch cases. ([#2305](https://github.com/realm/realm-js/issues/2305) and [#2246](https://github.com/realm/realm-js/issues/2246), since v2.25.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

2.26.0 Release notes (2019-4-4)
=============================================================
### Enhancements
* Add 4 new fields to `NamedSubscription` which reprents query-based subscriptions: `createdAt`, `updatedAt`, `expiresAt` and `timeToLive`. These make it possible to better reason about and control current subscriptions. ([#2266](https://github.com/realm/realm-js/issues/2266))
* Add the option of updating the query controlled by a subscription using either `Results.subscribe({name: 'name', update: true})` or the `NamedSubscription.query` property. ([#2266](https://github.com/realm/realm-js/issues/2266))
* Add the option of setting a time-to-live for subscriptions using either `Results.subscribe({name: 'name', timeToLive: <valueInMs>})` or the `NamedSubscription.timeToLive` property. ([#2266](https://github.com/realm/realm-js/issues/2266))
* Add `Realm.Results.description()` which returns a string representation of the query.
* Add support for defining mapped properties in the schema using `name: { type: 'int', mapTo: 'internalName' }`. In that case the mapped name is used internally in the underlying Realm file, while the property key is used for reading/writing the property as well as querying it.
* Add `RealmObject.addListener()`, `RealmObject.removeListener()`, and `RealmObject.removeAllListeners()` to set up and remove object-level notifications. ([#763](https://github.com/realm/realm-js/issues/763))
* Add a new `Realm.UpdateMode` enum with the values: `never`, `modified`, `all`. This replaces the current
  `Realm.create(type, properties, update)` with `Realm.create(type, properties, updateMode)`.
  `Realm.create(type, properties, 'modified')` is a new mode that only update existing properties that actually
  changed, while `Realm.create(type, properties, 'never')` is equal to `Realm.create(type, properties, false)` and
  `Realm.create(type, properties, 'all')` is equal to `Realm.create(type, properties, true)`.
  `Realm.create(type, properties, update)` is now deprecated. ([#2089](https://github.com/realm/realm-js/issues/2089))

### Fixed
* Fixed retrying authentication requests. The issue could be observed as "Cannot read property 'get' of undefined." errors being thrown when the authenticate requests were retried. ([#2297](https://github.com/realm/realm-js/issues/2297), since v2.24.0)
* Due to a rare race condition in some Android devices (including Samsung SM-T111), an app could crash hard. A workaround was introduced but never included in any releases. ([#1895](https://github.com/realm/realm-js/issues/1895), since v2.11.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Updated to Object Store commit: ab91c2bb4a915c0f159291f08caf1dc13e717573
* Fixed adding a property to an existing object schema using the internal `realm._updateSchema`. ([#2283](https://github.com/realm/realm-js/pull/2283), since v2.24.0)

2.25.0 Release notes (2019-3-12)
=============================================================
### Enhancements
* Added `Realm.Sync.setLogger()` to capture the sync client's log. ([#2125](https://github.com/realm/realm-js/issues/2125) and [realm-js-private#517](https://github.com/realm/realm-js-private/issues/517))

### Fixed
* Fixed broken user auth functions when running in electron. ([#2264](https://github.com/realm/realm-js/pull/2264), since v2.24.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Added `Realm.Sync.SyncConfiguration._sessionStopPolicy` for setting the behaviour of the sync session.
* Added `Realm.Sync._hasExistingSessions()` which returns `true` if Realm has a reference to any sync session regardless of its state. ([#2248](https://github.com/realm/realm-js/issues/2248))
* Implemented the integration tests using TypeScript.

2.24.0 Release notes (2019-2-27)
=============================================================
### Enhancements
* Add support for React Native v0.58. ([#2239](https://github.com/realm/realm-js/issues/2239))

### Fixed
* Fixed an assertion failure when using a synchronized Realm and an object was created after another object was created with an int primary key of `null`. ([#3227](https://github.com/realm/realm-core/pull/3227))
* When debugging with React Native, calling `Realm.open()` would crash since `Realm._asyncOpen()` was not available in the debugger. ([#2234](https://github.com/realm/realm-js/pull/2234), since v2.20.0)
* Added several missing functions to the Chrome debugging support library. ([#2242](https://github.com/realm/realm-js/pull/2242), since v2.2.19).
* Fixed incorrect results when reading data from Realm from within a callback function when debugging in Chrome. ([#2242](https://github.com/realm/realm-js/pull/2242)).
* Report the correct user agent to the sync server rather than always "RealmJS/Unknown". ([#2242](https://github.com/realm/realm-js/pull/2242), since v2.23.0).

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Add integration tests running in various environments (Node.js on MacOS and Linux, React Native on iOS and Android & Electron main and renderer processes on Linux). Existing tests should eventually be migrated to this to ensure they pass in all relevant environments. ([#2227](https://github.com/realm/realm-js/pull/2227))
* Add the method `realm._updateSchema` to perform schema manipulation on an open Realm. Specifically creating an object schema and a property on an existing object schema are tested. It's undocumented as it's not fully tested and the API is subject to change. (partly solving [#2216](https://github.com/realm/realm-js/issues/2216))

2.23.0 Release notes (2019-2-1)
=============================================================
### Enhancements
* Added `Realm.copyBundledRealmFiles()` to TypeScript definitions. ([#2176](https://github.com/realm/realm-js/issues/2176))
* The parser now supports readable timestamps with a `T` separator in addition to the originally supported `@` separator. For example: `startDate > 1981-11-01T23:59:59:1`. ([realm/realm-core#3198](https://github.com/realm/realm-core/issues/3198))
* It is now possible to store Realms on Android external storage with React Native by using `Realm.Configuration.fifoFilesFallbackPath`. ([#2062](https://github.com/realm/realm-js/issues/2062))
* New global notifier API introduced though `Realm.Sync.addListener(config, event, callback)`. This also adds support for configuring the SSL connection. The old API `Realm.Sync.AddListener(serverUrl, adminUser, filterRegex, event, event, callback)` is deprecated. ([#2243](https://github.com/realm/realm-js/pull/2243))

### Fixed
* Realm initialized the filesystem when being imported instead of waiting for the first Realm to be opened. ([#2218] (https://github.com/realm/realm-js/issues/2218), since v2.22.0)
* Sync sessions for Realms which were closed while the session was paused would sometimes not be cleaned up correctly. ([realm/realm-object-store#766](https://github.com/realm/realm-object-store/pull/766), since v2.16.0)
* Querying Realm instances obtained from `Realm.Sync.Adapter` would sometimes pin the read transaction version, resulting in the file rapidly growing in size as further transactions were processed. ([realm/realm-object-store#766](https://github.com/realm/realm-object-store/pull/766), since v2.0.2)
* Realm initialized the filesystem when being imported instead of waiting for the first Realm to be opened. ([#2218] (https://github.com/realm/realm-js/issues/2218), since v2.22.0).

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to Object Store commit: 0f2f8347cb32afddef1753a018f70f65972a4679
* Upgraded to Realm Core v5.14.0.
* Upgraded to Realm Sync v3.15.0.
* Stopped including headers from developers JDK when building the Android native module. ([#2223](https://github.com/realm/realm-js/pull/2223))

2.22.0 Release notes (2019-1-10)
=============================================================
This release contains all changes from v2.22.0-beta.1 to v2.22.0-beta.2.

### Enhancements
* Calling `Realm.Sync.User.createConfiguration()` now supports a relative URL which will use the Authentication server as base url. ([#1981](https://github.com/realm/realm-js/issues/1981))
* Updated React Native Android Builds to use Android Build Tools 3.2.1. ([#2103](https://github.com/realm/realm-js/issues/2103))
* Improved performance and memory usage of `Realm.Sync.Adapter`. ([realm/realm-js-private#501](https://github.com/realm/realm-js-private/pull/501))
* When an invalid/corrupt Realm file is opened, the error message will now contain the file name. ([realm/realm-core#3203](https://github.com/realm/realm-core/pull/3203))

### Fixed
* `Realm.Sync.User.createConfiguration()` created an extra `:` if no port was defined.  ([#1980](https://github.com/realm/realm-js/issues/1980), since v2.8.0)
* A slower fallback solution for system which does not support `posix_fallocate()`.
* Fixed building on Android. ([#2189](https://github.com/realm/realm-js/issues/2189), since v2.22.0-beta.2)
* Fix an occasional crash due to an uncaught `realm::IncorrectThreadException` when a client reset error occurs. ([#2193]()https://github.com/realm/realm-js/pull/2193)
* When a sync worker is called with no arguments, a runtime error can occur. Thanks to @radovanstevanovic. ([#2195](https://github.com/realm/realm-js/pull/2195), since v2.2.2)
* Fix an occasional crash due to an uncaught `realm::IncorrectThreadException` when a client reset error occurs. ([#2193](https://github.com/realm/realm-js/pull/2193))
* A crash bug could be triggered in some situations by creating, deleting, then recreating tables with primary keys. This could be seen observed as a crash with the message `Row index out of range.` ([realm/realm-sync#2651](https://github.com/realm/realm-sync/issues/2651), since v2.0.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to Realm Core v5.12.7.
* Upgraded to Realm Sync v3.14.12.
* Upgraded to https://github.com/nlohmann/json 3.4

2.22.0-beta.2 Release notes (2018-12-22)
=============================================================
### Enhancements
* Improved performance and memory usage of `Realm.Sync.Adapter`.

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to https://github.com/nlohmann/json 3.4

2.22.0-beta.1 Release notes (2018-12-15)
=============================================================
### Enhancements
* Calling `Realm.Sync.User.createConfiguration()` now supports a relative URL which will use the Authentication server as base url. ([#1981](https://github.com/realm/realm-js/issues/1981))
* Updated React Native Android Builds to use Android Build Tools 3.2.1. ([#2103](https://github.com/realm/realm-js/issues/2103))

### Fixed
* `Realm.Sync.User.createConfiguration()` creating an extra `:` if no port was defined.  ([#1980](https://github.com/realm/realm-js/issues/1980), since v2.8.0)
* A slower fallback solution for system which does not support `posix_fallocate()`.

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to Realm Core v5.12.6 (`posix_fallocate()` fallback).
* Upgraded to Realm Sync v3.14.6.


2.21.1 Release notes (2018-12-13)
=============================================================
### Enhancements
* None.

### Fixed
* ReactNative for Android no longer uses deprecated methods and can build using Gradle 5.0 and above. ([#1995](https://github.com/realm/realm-js/issues/1995))
* A bug caused loading the binary component of the SDK to hang on Windows. ([#2169](https://github.com/realm/realm-js/issues/2169), since v2.21.0)
* Fix occasional `FATAL ERROR: v8::String::Cast Could not convert to string` crashes when reading a property from a Realm object. ([#2172](https://github.com/realm/realm-js/pull/2172), since v2.19.0)
* Reverted support for `n` as it prevents users to include Realm in iOS apps. We restore the old behaviour as a temporary solution, and we will reenable support of `n` in the near future. ([#2099](https://github.com/realm/realm-js/issues/2099), since v2.19.0-rc.5)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to Realm Core v5.12.5 (hanging on Windows).
* Upgraded to Realm Sync v3.14.3.

2.21.0 Release notes (2018-12-3)
=============================================================
### Enhancements
* Adds support for `Realm.Sync.reconnect()` that  will attempt to reconnect to the server immediately if the device has been offline.

### Fixed
* Fixed a bug that prevented admin token users from being properly deserialized when calling `User.deserialize`. ([#2155](https://github.com/realm/realm-js/issues/2155), since v2.16.0)
* `_initializeSyncManager` missing when debugging React Native in Chrome. Resulted in messages like `realmConstructor.Sync._initializeSyncManager is not a function` ([#2128](https://github.com/realm/realm-js/issues/2128), since v2.20.0)
* The `LIMIT` predicate on query-based sync Realms will now be evaluated after the permission check instead of before. Sometimes the predicates would not get all the objects matched.
* An index out of range error in query-based sync is fixed. The bug would manifest itself with a `list ndx out of range` assertion.
* If encryption was enabled, decrypted pages were not released until the file was closed, causing excessive usage of memory.

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* Upgraded to Realm Core v5.12.3 (releasing decrypted pages).
* Upgraded to Realm Sync v3.14.1 (`LIMIT` and out-of-range).

2.20.1 Release notes (2018-11-28)
=============================================================
### Enhancements
* None.

### Fixed
* Using methods only available for Query-based Realms now throw a better error message if called on the wrong Realm file type. ([#2151](https://github.com/realm/realm-js/pull/2151))

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* None.

2.20.0 Release notes (2018-11-22)
=============================================================
### Enhancements
* Adds support for setting a custom User-Agent string using `Realm.Sync.setUserAgent(...)`. This string will be sent to the server when creating a connection. ([#2102](https://github.com/realm/realm-js/issues/2102))
* Adds support for uploading and downloading changes using `Realm.Sync.Session.uploadAllLocalChanges(timeout)` and `Realm.Sync.Session.downloadAllRemoteChanges(timeout)`. ([#2122](https://github.com/realm/realm-js/issues/2122))

### Fixed
* Tokens are refreshed ahead of time. If the lifetime of the token is lower than the threshold for refreshing it will cause the client to continously refresh, spamming the server with refresh requests. A lower bound of 10 seconds has been introduced. ([#2115](https://github.com/realm/realm-js/issues/2115), since v1.0.2)
* Prevent automatic token refreshes for Realms that have been closed. Previously, these could have resulted in obscure `Unhandled session token refresh error` messages in the logs that were benign. ([#2119](https://github.com/realm/realm-js/pull/2119))
* When trying to debug, users could experience a crash with the message `this._constructor is not a function`.  (https://github.com/realm/realm-js/issues/491#issuecomment-438688937, since v2.19.0-rc.4)
* Check the correct name when automatically adding the permission object schemas to the schema for query-based sync realms so that defining types with the same name works correctly. ([#2121](https://github.com/realm/realm-js/pull/2121), since 2.15.0)
* Fixes a bug where the JS engine might garbage collect an object prematurely leading to a native crash. ([#496](https://github.com/realm/realm-js-private/issues/496), since v2.19.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgrades to Object Store commit: 66eea3994f598a388a775b93acb1c13603cc65c3
* Aligns better with Node 10 by not using deprecated calls. ([#2107](https://github.com/realm/realm-js/issues/2107), since v2.19.0)

2.19.1 Release notes (2018-11-15)
=============================================================
### Enhancements
* None.

### Fixed
* The Typescript definition for `Realm.Permissions.Permission` did not have the correct `role` property defined. This could result in compilation errors like this `error TS2339: Property 'role' does not exist on type 'Permission'`. ([#2106](https://github.com/realm/realm-js/pull/2106), since v2.3.0.)
* Removes calls to `new Buffer()` as this is deprecated with Node 10. ([#2107](https://github.com/realm/realm-js/issues/2107), since v2.19.0)
* Updates the type definitions to be explicit that the return type of the generics `Realm.objects<T>`, `Realm.objectForPrimaryKey<T>`, etc. is an intersection of `T & Realm.Object`. ([#1838](https://github.com/realm/realm-js/issues/1838))
* A set of bugs that could lead to bad changesets have been fixed. An example of error message is `Failed to parse, or apply received changeset: ndx out of range`. (Fixed by Realm Sync v3.13.3)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* Introduces 100 ms delay before submitting analytics so that an app may disable it after importing Realm. ([#2108](https://github.com/realm/realm-js/pull/2108))
* Distinguish between node.js and electron in the `BindingType` field when submitting analytics. ([#2108](https://github.com/realm/realm-js/pull/2108))
* Adds a package to compute the Windows analytics identifier rather than returning `null` which likely accounts for the disproportionally large number of unique Windows users. ([#2108](https://github.com/realm/realm-js/pull/2108))
* Upgrades to Realm Core v5.12.1.
* Upgrades to Realm Sync v3.13.4.

2.19.0 Release notes (2018-11-8)
=============================================================
This release contains all changes from v2.19.0-rc.1 to v2.19.0-rc.5.

### Enhancements
* Adds `SyncConfig.customQueryBasedSyncIdentifier` to allow customizing the identifier appended to the Realm path when opening a query based Realm. This identifier is used to distinguish between query based Realms opened on different devices and by default Realm builds it as a combination of a user's id and a random string, allowing the same user to subscribe to different queries on different devices. In very rare cases, you may want to share query based Realms between devices and specifying the `customQueryBasedSyncIdentifier` allows you to do that.
* Adds `Realm.subscriptions()` to query active query-based sync subscriptions. This method is in beta and might change in future releases. ([#2052](https://github.com/realm/realm-js/issues/2052))
* Adds `Realm.unsubscribe()` to unsubscribe by name an active query-based sync subscription. This method is in beta and might change in future releases. ([#2052](https://github.com/realm/realm-js/issues/2052))
* Improves the proactive token refresh mechanism to make several attempts to refresh the token before it expires and to also ensure that there is only one ongoing refresh timer for a combination of user and realm path. Previously it was possible to end up in a situation where many redundant refreshes were scheduled for the same Realm. ([#2071](https://github.com/realm/realm-js/pull/2071))
* A more meaningful exception will be thrown when trying to refresh the access token for a Realm with an invalid url. Previously, trying to connect to a Realm with an url that lacks the path component (e.g. `realm://foo.com`) would result in errors like `Cannot read property ‘token_data’ of undefined`. Instead, now we'll print out the Realm url and provide a more meaningful exception message. ([#ROS-1310](https://github.com/realm/realm-object-server-private/issues/1310))
* Adds support for Node 10. Pre-gyp'ed binaries are available for Node 6, 8, and 10. ([#1813](https://github.com/realm/realm-js/issues/1813) and [#2087](https://github.com/realm/realm-js/issues/2087))
* Building for iOS can now use the `n` node version manager. Thanks to @SandyChapman! ([#2078](https://github.com/realm/realm-js/pull/2078))

### Fixed
* Fixes the TypeScript definitions for `User.login` to make it explicit in which cases a promise  and in which a `User` is returned. ([#2050](https://github.com/realm/realm-js/pull/2050), since 2.16.0).
* Fixes the exception being thrown when using the deprecated `User.registerWithProvider` API and not providing a value for `userInfo`. ([#2050](https://github.com/realm/realm-js/pull/2050), since 2.16.0).
* Fixes the signature of `user.logout` to return a `Promise<void>` rather than `void`. It has always done asynchronous work, but previously, it was impossible to be notified that the call has completed. Since that is now possible, the superfluous `User is logged out` message printed in the console upon logout has been removed. ([#2071](https://github.com/realm/realm-js/pull/2071), since v2.3.0)
* Fixes opening query-based Realms with a dynamic schema. Previously the schema would always contain only the types present when the Realm was first added and not any types added later. ([#2077](https://github.com/realm/realm-js/pull/2077), since v2.3.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* Upgrades to Realm Core v5.12.0.
* Upgrades to Realm Sync v3.13.1.
* Updates to `package.json` and `README.md`. Thanks to @hyandell.

2.19.0-rc.5 Release notes (2018-11-7)
=============================================================
### Enhancements
* A more meaningful exception will be thrown when trying to refresh the access token for a Realm with an invalid url. Previously, trying to connect to a Realm with a url that lacks the path component (e.g. `realm://foo.com`) would result in errors like `Cannot read property ‘token_data’ of undefined`. Instead, now we'll print out the Realm url and provide a more meaningful exception message. ([#ROS-1310](https://github.com/realm/realm-object-server-private/issues/1310), since v1.0.2)
* Adds support for Node 10. Pre-gyp'ed binaries are available for Node 6, 8, and 10. ([#1813](https://github.com/realm/realm-js/issues/1813) and [#2087](https://github.com/realm/realm-js/issues/2087))

### Fixed
* None.

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* Building for iOS can now use the `n` node version manager. Thanks to @SandyChapman! ([#2078](https://github.com/realm/realm-js/pull/2078))
* Upgrading to Realm Core v5.12.0.
* Upgrading to Realm Sync v3.13.1.

2.19.0-rc.4 Release notes (2018-10-17)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed an incorrect property name returned from `Realm.subscriptions()`. (since v2.19.0-rc.2)
* Fixed opening query-based Realms with a dynamic schema. Previously the schema would always contain only the types present when the Realm was first added and not any types added later. (since v2.3.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

 ### Internal
* Updates to `package.json` and `README.md`. Thanks to @hyandell.

2.19.0-rc.3 Release notes (2018-10-16)
=============================================================
### Enhancements
* Improved the proactive token refresh mechanism to make several attempts to refresh the token before it expires and to also ensure that there is only one ongoing refresh timer for a combination of user and realm path. Previously it was possible to end up in a situation where many redundant refreshes were scheduled for the same Realm. ([#2071](https://github.com/realm/realm-js/pull/2071), since v1.0.2)

### Fixes
* Fixed the signature of `user.logout` to return a `Promise<void>` rather than `void`. It has always done asynchronous work, but previously, it was impossible to be notified that the call has completed. Since that is now possible, the superfluous "User is logged out" message printed in the console upon logout has been removed. ([#2071](https://github.com/realm/realm-js/pull/2071), since v2.3.0)

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats).

### Internal
* None.

2.19.0-rc.2 Release notes (2018-10-10)
=============================================================
### Enhancements
* Added `Realm.subscriptions()` to query active query-based sync subscriptions. This method is in beta and might change in future releases. ([#2052](https://github.com/realm/realm-js/issues/2052))
* Added `Realm.unsubscribe()` to unsubscribe by name an active query-based sync subscription. This method is in beta and might change in future releases. ([#2052](https://github.com/realm/realm-js/issues/2052))

### Fixed
* None.

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

 ### Internal
* None.

2.19.0-rc.1 Release notes (2018-10-9)
=============================================================
### Enhancements
* Added `SyncConfig.customQueryBasedSyncIdentifier` to allow customizing the identifier appended to the realm path when opening a query based Realm. This identifier is used to distinguish between query based Realms opened on different devices and by default Realm builds it as a combination of a user's id and a random string, allowing the same user to subscribe to different queries on different devices. In very rare cases, you may want to share query based Realms between devices and specifying the `customQueryBasedSyncIdentifier` allows you to do that.

### Fixed
* Fixed the typescript definitions for `User.login` to make it explicit in which cases a promise is returned and in which - a `User`. ([#2050](https://github.com/realm/realm-js/pull/2050), since 2.16.0).
* Fixed an exception being thrown when using the deprecated `User.registerWithProvider` API and not providing a value for `userInfo`. ([#2050](https://github.com/realm/realm-js/pull/2050), since 2.16.0).

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

 ### Internal
* None.

2.18.0 Release notes (2018-10-4)
=============================================================
## Enhancements
* Added support for finding Realm-level permissions in Query-based Realms using `realm.getPermissions()`. ([#2036](https://github.com/realm/realm-js/pull/2036))
* Added support for finding Class-level permissions in Query-based Realms using `realm.getPermissions(className)`. ([#2036](https://github.com/realm/realm-js/pull/2036))
* Added `Realm.Permissions.Realm.findOrCreate(roleName)` and `Realm.Permissions.Class.findOrCreate(roleName)` which makes it easier to find or create permissions for a given role when using query-based Realms. ([#2036](https://github.com/realm/realm-js/pull/2036))

### Fixes
* Allow `Realm.deleteFile` to be used with a sync configuration. Previously, only local Realms could be deleted with this API and the `sync` property on the configuration would be ignored. ([#2045](https://github.com/realm/realm-js/pull/2045), since v1.0.0)

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

 ### Internal
* None.

2.17.0 Release notes (2018-9-28)
=============================================================
## Enhancements
* None.

### Fixes
* None.

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* You will need to upgrade your Realm Object Server to at least version 3.11.0 or use [Realm Cloud](https://cloud.realm.io).
If you try to connect to a ROS v3.10.x or previous, you will see an error like `Wrong protocol version in Sync HTTP request, client protocol version = 25, server protocol version = 24`.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

 ### Internal
* None.

2.17.0-rc.1 Release notes (2018-9-25)
=============================================================
### Enhancements
* When using a synced Realm where you only receive updates from the server and never update the realm locally, the client will now report download progress to the server such that it can compact files on the server. This enhancement doesn't affect the client.

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* You will need to upgrade your Realm Object Server to at least version 3.11.0 or use [Realm Cloud](https://cloud.realm.io).
If you try to connect to a ROS v3.10.x or previous, you will see an error like `Wrong protocol version in Sync HTTP request, client protocol version = 25, server protocol version = 24`.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

### Internal
* Upgraded to Realm Core v5.11.1.
* Upgraded to Realm Sync v3.10.0 (with new protocol version 25).


2.16.2 Release notes (2018-9-25)
=============================================================
## Enhancements
* None.

### Fixes
* Fixed a bug where logging in using an admin token returned a promise. The correct behavior is to be synchronous. (related to [#2037](https://github.com/realm/realm-js/issues/2037), since v2.16.1)

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* Realm Object Server: 3.0.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

### Internal
* None.

2.16.1 Release notes (2018-9-21)
=============================================================
## Enhancements
* None.

### Fixes
* Fixed a bug in creating credentials using an admin token. The app would stop saying `then()` is not a function. ([#2037](https://github.com/realm/realm-js/issues/2037), since v2.16.0-rc.2)

### Compatibility
* File format: ver. 9 (upgrades automatically from previous formats)
* Realm Object Server: 3.0.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.

### Internal
* None.

2.16.0 Release notes (2018-9-19)
=============================================================
### Enhancements
* Added support for [ASDF](https://github.com/asdf-vm/asdf-nodejs) nodejs shims. Thanks to @breezeight! ([#2031](https://github.com/realm/realm-js/issues/2031))

### Bug fixes
* Fixed the type definition for `Realm.Permissions.User`. Thanks to @apperside! ([#2012](https://github.com/realm/realm-js/issues/2012), since v2.3.0-beta.2)
* When adding a schema definition (e.g. `let config = user.createConfiguration(); config.schema = [Dog, Person]`) the permission schema would be removed, resulting in an `unknown object type __Permission` if using query based Realm. ([#2017](https://github.com/realm/realm-js/issues/2017), since v2.3.0).
* As part of including the permission schema implicitly when using query based Realm, the schema `Realm.Permissions.Realm` was missing, which may break any query including it. ([#2016](https://github.com/realm/realm-js/issues/2016), since v2.3.0)
* Fixed the type definition for `Realm.getPrivileges()`, `Realm.getPrivileges(className)` and `Realm.getPrivileges(object)`. ([#2030](https://github.com/realm/realm-js/pull/2030), since v2.2.14)

### Enhancements
* None

### Compatibility
* Realm Object Server: 3.0.0 or later
* File format: ver 9. (upgrades from previous formats automatically)


2.16.0-rc.2 Release notes (2018-9-14)
=============================================================
### Breaking changes
* None.

### Enhancements
* The authentication API has been completely revamped. ([#2002](https://github.com/realm/realm-js/pull/2002))
  * The following methods have been deprecated and will be removed at a next major version:
    * `Realm.Sync.User.login`
    * `Realm.Sync.User.register`
    * `Realm.Sync.User.authenticate`
    * `Realm.Sync.User.registerWithProvider`
    * `Realm.Sync.User.adminUser`
  * A new `Realm.Sync.User.login` method has been added that accepts the server url and a credentials object.
  * A new class - `Realm.Sync.Credentials` has been added that contains factory methods to create credentials with all supported providers.
  * Here are some examples on how to transform your old code to use the new API:

  | Old                                                                                                                                                                                                  | New                                                                                                                                                                                                                                                        |
  | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `const user = await Realm.Sync.User.login(serverUrl, 'username', 'password');`                                                                                                                       | `const credentials = Realm.Sync.Credentials.usernamePassword('username', 'password');`<br/> `const user = await Realm.Sync.User.login(serverUrl, credentials);`                                                                                            |
  | `const jwtToken = 'acc3ssT0ken...';`<br>`const user = await Realm.Sync.User.registerWithProvider(serverUrl, 'jwt', jwtToken);`                                                                       | `const jwtToken = 'acc3ssT0ken...';`<br>`const credentials = Realm.Sync.Credentials.jwt(jwtToken);`<br>`const user = await Realm.Sync.User.login(serverUrl, credentials);`                                                                                 |
  | `const customToken = 'acc3ssT0ken...';`<br>`const userInfo = { someValue: true };`<br>`const user = await Realm.Sync.User.registerWithProvider(serverUrl, 'custom/fooauth', customToken, userInfo);` | `const customToken = 'acc3ssT0ken...';`<br>`const userInfo = { someValue: true };`<br>`const credentials = Realm.Sync.Credentials.custom('custom/fooauth', customToken, userInfo);`<br>`const user = await Realm.Sync.User.login(serverUrl, credentials);` |
* Exposed `Realm.Sync.User.serialize()` to create a persistable representation of a user instance, as well as `Realm.Sync.User.deserialize()` to later inflate a `User` instance that can be used to connect to Realm Object Server and open synchronized Realms. ([#1276](https://github.com/realm/realm-js/issues/1276))
* Added `Realm.Sync.Session.pause()` and `Realm.Sync.Session.resume()` to allow controlling when to sync data. ([#2014](https://github.com/realm/realm-js/issues/2014))
* Added support for `LIMIT` in queries to restrict the size of the results set. This is in particular useful for query-based synced Realms. An example of the syntax is `age >= 20 LIMIT(2)`. ([#2008](https://github.com/realm/realm-js/pull/2008))

### Bug fixes
* Fixed the type definition for `User.authenticate()`. ([#2000](https://github.com/realm/realm-js/pull/2000), since v2.2.0)
* Added `Realm.Sync.Subscription.removeAllListeners()` to the `Subscription` proxy class used when debugging a React Native app. ([#474](https://github.com/realm/realm-js-private/issues/474), since v2.3.2)
* Fixed a memory corruption in `writeCopyTo()` when using encryption. This could be experienced as: `Error: Unable to open a realm at path ...`. Thanks to @mandrigin! ([#1748](https://github.com/realm/realm-js/issues/1748), since v2.3.4)
* Fixed the type definitions for `Session.addConnectionNotification()` and `Session.removeConnectionNotification()`. Thanks to @gabro! ([#2003](https://github.com/realm/realm-js/pull/2003), since v2.15.0)
* Removed a false negative warning when using `User.createConfiguration()`. ([#1989](https://github.com/realm/realm-js/issues/1989), since v2.15.3)
* Fixed a bug where `Realm.write()` crashed with segmentation fault when trying to insert a record without providing values for the properties that are optional in the schema. ([#479](https://github.com/realm/realm-js-private/issues/479), since v2.15.3)

### Compatibility
* Realm Object Server: 3.0.0 or later
* File format: ver 9. (upgrades from previous formats automatically)

### Internal
* Upgraded to Realm Core v5.10.0.
* Upgraded to Realm Sync v3.9.9.


2.15.3 Release notes (2018-8-24)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug if `fullSynchronization` is not defined in the configuration used for opening a synced Realm. This could lead to an exception when opening a synced Realm (#1989).

### Internal
* Realm Core v5.7.2.
* Realm Sync v3.9.1.

2.15.2 Release notes (2018-8-24)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug that would cause the Global Notifier to crash with the following error message: `A schema version must be specified when the schema is specified`.

### Internal
* Realm Core v5.7.2.
* Realm Sync v3.9.1.

2.15.0 Release notes (2018-8-24)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* [Sync] Added `Realm.Sync.ConnectionState` representing the states a connection to the server can be in.
* [Sync] Added support for `Session.addConnectionNotification()` and `Session.removeConnectionNotification`.
* [Sync] Added `Session.connectionState`.
* [Sync] Added `Session.isConnected()`.
* [Sync] Added a check to prevent the case where query-based sync is opened without a schema. It is not possible to deduce the schema, and subscribing to a query-based sync will lead to an error if no schema is defined (#1976).

### Bug fixes
* React Native for Android now supports the Android Gradle Plugin 3.0 (#1742).
* [Sync] Fixed a crash in subscription listeners (#1926).
* [Sync] Classes used by the Object-level permission system are now automatically part of the schema for Query-based Realms (#1966).
* [Sync] Fixed distinct queries with query-based sync (broken since v2.11.0).
* Support parallel run of muliple iOS builds with React Native on the same CI machine (contributed by @mandrigin).
* [Sync] Fixed a bug in the client where a session was not properly discarded after a deactivation process ending with the reception of an ERROR message. When this happened, it would lead to corruption of the client's internal datastructures.

### Internals
* Updated to Object Store commit: 97fd03819f398b3c81c8b007feaca8636629050b
* Updated external packages with help from `npm audit`.
* Upgraded to Realm Sync v3.9.1 (to match the devtoolset-6 upgrade).
* Upgraded to devtoolset-6 on Centos for Linux builds.


2.14.2 Release notes (2018-8-8)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a potential memory corruption.

### Internal
* Realm Core v5.7.2.
* Upgraded to Realm Sync v3.8.8.


2.14.1 Release notes (2018-8-7)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] The schema definition for `permissionsSchema.Class` defined a `class_name` property instead of `name` (#1942).

### Internals
* Upgraded to Realm Core v5.7.2.
* Upgraded to Realm Sync v3.8.7.

2.14.0 Release notes (2018-7-24)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Various bugfixes.

### Internals
* Upgraded to Realm Core v5.7.2.
* Upgraded to Realm Sync v3.8.3.

2.13.0 Release notes (2018-7-12)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* [Sync] Improved performance of changeset parsing.

### Bug fixes
* [Sync] Fixed a bug in the build system which prevented OpenSSL to be linked (#1864)
* Fixed a bug in RN Android which prevented apps to specify `minSdkVersion`, etc. (#1914).

### Internals
* Upgraded to Realm Core v5.7.1.
* Upgraded to Realm Sync v3.8.0.


2.12.0 Release notes (2018-7-3)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Improved performance of creating objects with string primary keys.
* Improved memory management to allow larger transactions.
* Improved performance of `realm.create()` when running in node.

### Bug fixes
* Fixed a bug which caused RN Android to fail loading (#1904).

### Internals
* Upgraded to Realm Core v5.6.5.
* Upgraded to Realm Sync v3.7.0.


2.11.0 Release notes (2018-6-28)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Improved performance for devices which can support large address spaces.
* [Sync] Exposed custom HTTP headers in `Realm.Configuration` (#1897).
* Improved performance of `Realm.compact()`.

### Bug fixes
* [RN Android] Ported workaround for crashes in `memmove`/`memcpy` on some old Android devices (#1163 and #1895).

### Internals
* Upgraded to Realm Core v5.6.3.
* Upgraded to Realm Sync v3.5.8.
* Added properties of `Realm.Sync.User` to debugger support.
* Fixed class names in API documentation (wrong names were introduced in v2.6.0).
* Added prebuilding for Electron v2.0 (**Electron is not supported**).


2.10.0 Release notes (2018-6-19)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added `Realm.createTemplateObject(objectSchema)` (#1870).

### Bug fixes
* [Sync] Fixed a bug which could potentially flood Realm Object Server with PING messages.

### Internals
* Upgraded to Realm Sync v3.5.6.
* Realm Core v5.6.2.


2.9.0 Release notes (2018-6-19)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added support for compacting synchronized Realms and allowed setting the `shouldCompactOnLaunch` config property for them.

### Bug fixes
* Fix incorrect documentation of the `shouldCompactOnLaunch` parameters.

### Internals
* Realm Core v5.6.2.
* Realm Sync v3.5.5.


2.8.5 Release notes (2018-6-18)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug that could result in a crash with the message "bad changeset error".

### Internals
* Upgraded to Realm Sync v3.5.5.
* Realm Core v5.6.2.


2.8.4 Release notes (2018-6-15)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a potential corruption.

### Internals
* Upgraded to Realm Core v5.6.2.
* Upgraded to Realm Sync v3.5.4.


2.8.3 Release notes (2018-6-13)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug in how arrays of primitive types are represented. The bug prevented a schema from one Realm to be used when opening another (#1847).
* Added a more readable error message in the query parser when requesting an a bad argument (#1808).

### Internal
* Upgraded to Realm Core v5.6.1.
* Upgraded to Realm Sync v3.5.3.


2.8.2 Release notes (2018-6-12)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a problem which would sometimes cause `bad permission object` and `bad changeset` errors.

### Internal
* Upgraded to Realm Sync v3.5.2.
* Realm Core v5.6.0.


2.8.1 Release notes (2018-6-8)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Add the `oldModifications` and `newModifications` properties to the listener change objects, which report the indices that changed in the collection both before and after the changes being notified for. The `modifications` property is kept as an alias for `oldModifications` but might be removed in a future version.

### Bug fixes
* [Sync] Fixed a bug which crash query-based Realms. A bug in gcc's optimizer will generate code which in some case will lead to a memory violation and eventually a segmentation fault.

### Internal
* Changed download URL for Linux binaries (`scripts/download-realm.js`).
* Upgraded to Realm Sync v3.5.1.
* Realm Core v5.6.0.
* Realm Sync v3.5.1.


2.8.0 Release notes (2018-6-6)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Notes
The feature known as Partial synchronization has been renamed to Query-based synchronization and is now the default mode for synchronized Realms. This has impacted a number of APIs. See below for the details.

### Deprecated
* [Sync] `Realm.Configuration.SyncConfiguration.partial` has been deprecated in favor of `Realm.Configuration.SyncConfiguration.fullSynchronization`.
* [Sync] `Realm.automaticSyncConfiguration()` has been deprecated in favor of `Realm.Sync.User.createConfiguration()`.

### Breaking changes
* None.

### Enhancements
* [Sync] `Realm.Configuration.SyncConfiguration.fullSynchronization` has been added.
* [Sync] `Realm.Sync.User.createConfiguration(config)` has been added for creating default and user defined sync configurations.

### Bug fixes
* Fixed TypeScript definition of `Realm.objects()` and `Realm.objectForPrimaryKey()` (#1803).

### Internal
* [Sync] `Realm.Configuration.SyncConfig._disablePartialSyncUrlChecks` has been renamed to `Realm.Configuration.sync._disableQueryBasedSyncUrlChecks`.
* Realm Sync v3.3.0.
* Realm Core v5.6.0.


2.7.2 Release notes (2018-6-1)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a segfault when the object schema is unknown (realm-js-private #454).

### Internal
* Realm Sync v3.3.0.
* Realm Core v5.6.0.


2.7.1 Release notes (2018-5-31)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a crash when invalid schema cache is used to look up a property (realm-js-private #452).

### Internal
* Realm Sync v3.3.0.
* Realm Core v5.6.0.


2.7.0 Release notes (2018-5-29)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added `isEmpty()` method on `Realm.Results` and `Realm.List`.
* Added schema change listener to `Realm.addListener()` (#1825).

### Bug fixes
* Fixed `Realm.open()` to work without passing a config.
* Fixed a bug in `Realm.open()` to work without passing a config.

### Internal
* Realm Sync v3.3.0.
* Realm Core v5.6.0.


2.6.0 Release notes (2018-5-16)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* [Sync] The SSL configuration options are now grouped in a new config object. (#1465)
* [Sync] The Adapter can accept a new config parameter that specifies SSL settings for spawned sync sessions.
* Added `Object.linkingObjectsCount()` method, that returns total count of incoming links.

### Bug fixes
* Fix a crash when attempting to use the data adaptor or sync event listener introduced in 2.4.1.

### Internal
* Realm Sync v3.3.0.
* Realm Core v5.6.0.

2.5.0 Release notes (2018-5-14)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* [Sync] Emit a `delete` event to the Sync event listener whenever a Realm matching the regex is deleted from the server.

### Bug fixes
* Building React Native Android projects using Java version 9 used deprecated API's (#1779).

### Internal
* None.


2.4.1 Release notes (2018-5-7)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added minimal support for Realm deletions to the Global Notifier (realm-js-private #443).

### Bug fixes
* Fixed TypeScript defintion for `open_ssl_verify_callback` configuration option (#1652).

### Internal
* Updated to Relm Sync 3.3.0.
* Updated to Realm Core 5.6.0.


2.4.0 Release notes (2018-4-26)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added password reset wrappers (#1699).
* Added a certificate validation using Android Keystore for RN (#1761).

### Bug fixes
* Fixed logout error due to fetch body not being stringified (#1731).
* Added `Subscription` import to `browser/index.js` and register type converter (#1711).
* Fixed call to `logout()` when debugging React Native apps (#1744).

### Internal
* Updated `scripts/test.sh` so it doesn't hang forever when the React tests fail to start (#1764).


2.3.4 Release notes (2018-4-12)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed named LinkingObject queries across different classes (#1734).
* Fixed a bug when refreshing admin token due to network errors (realm-js-private #433).

### Internal
* None.

2.3.3 Release notes (2018-3-23)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug where leaking Realms when an error occurs within an event handler (#1725).

### Internal
* Added trace logging to the global notifier (realm-js-private #426).

2.3.2 Release notes (2018-3-21)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0 or later

### Breaking changes
* None.

### Enhancements
* Added `Realm.Sync.Subscription.removeAllListeners()`.

### Internal
* Tested with Realm Object Server 3.0.0.

2.3.1 Release notes (2018-3-16)
=============================================================
### Compatibility
* Sync protocol: 24
* Server-side history format: 4
* File format: 9
* Realm Object Server: 3.0.0-alpha.8 or later

### Breaking changes
* None.

### Enhancements
* Added an optional user as argument to `Realm.automaticSyncConfiguration` (#1708).

### Bug fixes
* [Sync] Avoid hammering the ROS authentication service when large numbers of Realms are opened at once.

### Internal
* Tested with Realm Object Server 3.0.0-rc.1.


2.3.0 Release notes (2018-3-13)
=============================================================
### Breaking changes
* [Sync] Sync protocol changed to version 24.
* [Sync] History schema format for server-side Realm files bumped to version 4. This means that after the server has been upgraded, it cannot be downgraded again without restoring state from backup.
* [Sync] `Realm.subscribeToObjects()` has been removed. Use `Realm.Results.subscribe()` instead.

### Enhancements
* [Sync] Reduced initial download times in Realms with long transaction histories.
* [Sync] Wait for pending notifications to complete when removing a sync listener (#1648).
* Enabled sort and distinct in the query string. If sort or distinct are also applied outside of the query string, the conditions are stacked.
  - Example syntax: `age > 20 SORT(name ASC, age DESC) DISTINCT(name)`
  - The ordering for sorting can be one of the following case insensitive literals: `ASC`, `ASCENDING`, `DESC`, `DESCENDING`.
  - Any number of properties can appear inside the brackets in a comma separated list.
  - Any number of sort/distinct conditions can be indicated, they will be applied in the specified order.
  - Sort or distinct cannot operate independently, these conditions must be attached to at least one query filter.
* Added support for queries over named backlinks (#1498/#1660).
  - Example syntax: `parents.age > 25` and `parents.@count == 2`.
* [Sync] Added `Realm.Results.subscribe()` to subscribe to partial synced Realms.
* [Sync] Added class `Realm.Sync.Subscription` and enum `Realm.Sync.SubscriptionState` to support partial synced Realms.
* [Sync] Added an object-level permission subsystem. It is possible to grant fine-grained priviliges to users.
* Added object-level permissions:
  - Schemas `Realm.Permissions.Realm`, `Realm.Permissions.Class`, `Realm.Permissions.Role`, `Realm.Permissions.User`, and `Realm.Permissions.Permission` to support working with permissions. These schemas can be used in user-defined Realms and schemas.
  - Permissions are enforced by the object server but connectivity is not required.
  - Method `Realm.privilges()` to compute privileges on a Realm, a Realm object schema, or a Realm object. The method returns either a `Realm.Permissions.Realm` or `Realm.Permissions.Class` object.
  - For non-synced Realms, all privileges are always granted.
  - For more details, please read the reference documentation.
* [Sync] Revoke refresh token upon logout (#1354).
* Added `Realm.automaticSyncConfiguration()` which will return the configuration for a default synced Realm (#1688).
* [Sync] Deprecated `Realm.Sync.setFeatureToken` (#1689).

### Bug fixes
* Fixed usage of disk space preallocation which would occasionally fail on recent MacOS running with the APFS filesystem (Realm Core #3005).

### Internal
* Updated to Realm Core 5.4.0.
* Updated to Realm Sync 3.0.0.
* Tested against Realm Object Server 3.0.0-alpha.8.
* Added `_disablePartialSyncUrlChecks` to `Realm.Configuration`.


2.2.20 Release notes (2018-4-13)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.2.17


2.2.19 Release notes (2018-4-10)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Avoid crashing if partial Realms find their way into the admin Realm when using Realm Object Server v3.0.0 or later (realm-js-private #430).

### Internal
* None.


2.2.18 Release notes (2018-3-23)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug where leaking Realms when an error occurs within an event handler (#1725).

### Internal
* Added trace logging to the global notifier (realm-js-private #426).


2.2.17 Release notes (2018-3-21)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Do a better job of not opening the notifier pipe file for global notifier realms.

### Internal
* None.


2.2.16 Release notes (2018-3-16)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Avoid hammering the ROS authentication service when large numbers of Realms are opened at once.

### Internal
* None.


2.2.15 Release notes (2018-3-9)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug that could result in notifications from the global notifier being delayed or not delivered at all when multiple Realms change at once.

### Internal
* None.


2.2.14 Release notes (2018-3-5)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed race condition in handling of session bootstrapping in client.

### Internal
* Updated to Realm Sync 2.2.15.


2.2.13 Release notes (2018-3-2)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed handling of SSL certificates for the sync client.

### Internal
* Updated to Realm Sync 2.2.14.


2.2.12 Release notes (2018-2-23)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Validate that a given type appears at most once in the schema.

### Internal
* None.


2.2.10 Release notes (2018-2-20)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] A use-after-free bug was fixed which could cause arrays of primitives to behave unexpectedly.

### Internal
* Updated to Realm Sync 2.2.12.


2.2.9 Release notes (2018-2-19)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Improved root certificate checking.

### Internal
* Updated to Realm Sync 2.2.11.


2.2.8 Release notes (2018-2-13)
=============================================================
### Breaking changes
* None.

### Enhancements
* [Sync] For OpenSSL, the sync client includes a fixed list of certificates in its SSL certificate verification besides the default trust store in the case where the user is not specifying its own trust certificates or callback.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.2.10.


2.2.7 Release notes (2018-2-6)
=============================================================
### Breaking changes
* None.

### Enhancements
* [Sync] Wait for pending notifications to complete when removing a sync listener (#1648).
* Add schema name to missing primary key error message

### Bug fixes
* [Sync] Fixed a bug causing use-after-free crashes in Global Notifier (realm-js-private #405).

### Internal
* None.


2.2.6 Release notes (2018-1-26)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug where arguments were not transferred when debugging.

### Internal
* None.

2.2.5 Release notes (2018-1-25)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a typing error leading to `_getExistingUser` wasn't defined in the Chrome debugging support library (#1625).
* Fixed a bug in the TypeScript definition of `PermissionCondition` (#1574).
* [Electron] Fixed a `dlopen` error related to OpenSSL that prevented using realm-js on Linux (#1636).

### Internal
* None.

2.2.4 Release notes (2018-1-18)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug where errors in `refreshAdminToken` wasn't catched (#1627).
* [Sync] Added `_getExitingUser` to the Chrome debugging support library.

### Internal
* None.

2.2.3 Release notes (2018-1-17)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug in upload progress reporting.
* [Sync] Fixed a bug where any errors which occurred when trying to sync the admin Realm were ignored, which made attempting to add a listener with an invalid admin user silently do nothing.

### Internal
* None.

2.2.2 Release notes (2018-1-16)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Added missing `Realm.Sync` listener functions.

### Internal
* None.


2.2.1 Release notes (2018-1-13)
=============================================================
### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug preventing opening Realms with an admin token without a working ROS directory service (#1615).

### Internal
* None.

2.2.0 Release notes (2018-1-12)
=============================================================
### Breaking changes
* None.

### Enhancements
* Added new query features to support a subset of `NSPredicates` for example `LIKE` for string matches, `@count` and `@sum` in lists. See documentation for more details.
* Potential performance enhancements in cases of many writes between queries.
* [Sync] Added method `Realm.Sync.User.authenticate` to unify authentication of users.
* [Sync] Added JWT authenfication (#1548).

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
* [Sync] Fixed a bug where long reconnection happens when a proxy in front of the sync worker returns one of those.

### Internal
* [Sync] Updated to Realm Object Server v2.2.0 for testing.
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
* [Sync] When authentication fails due to a misbehaving server, a proper error is thrown.

### Internal
* [Sync] Strings can now be assigned to Date columns. When that happens the JavaScript Date constructor will be invoked to parse the string.
* [Sync] Base64 strings can now be assigned to Data columns.

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
* [Sync] Fixed a bug where deleted-then-recreated objects with identical primary keys to become empty.
* [Sync] Fixed a bug in outward partial sync is changed to ensure convergence of partial sync in the case where the client creates a primary key object, that is already present on the server, and subscribes to it in the same transaction.

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
* [Sync] Improving performance of processing large changesets.

### Bug fixes
* [Sync] Changesets over 16MB in size are now handled correctly.

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
