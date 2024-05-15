## vNext (TBD)

### Deprecations
* None

### Enhancements
* None

### Fixed
* Fixed a crash experienced on React Native when accessing `Realm.deleteFile`, `Realm.exists`, `Realm.schemaVersion`, `Realm.determinePath`, `Realm.transformConfig` and `User#isLoggedIn`. ([#6662](https://github.com/realm/realm-js/pull/6662), since v12.8.0)
* Accessing `Realm.App#currentUser` from within a notification produced by `Realm.App.switchUser` (which includes notifications for a newly logged in user) would deadlock. ([realm/realm-core#7670](https://github.com/realm/realm-core/issues/7670), since v12.8.0)
* Fixed a bug when running an `IN` query on a `string`/`int`/`uuid`/`objectId` property that was indexed. ([realm/realm-core#7642](https://github.com/realm/realm-core/issues/7642) since v12.8.0)
* Fixed a bug when running an `IN` query on an `int` property where `double`/`float` parameters were ignored. ([realm/realm-core#7642](https://github.com/realm/realm-core/issues/7642) since v12.8.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10.

### Internal
* Upgraded Realm Core from v14.6.1 to v14.6.2 + commits `5ba02142131efa3d97eda770ce33a85a2a085202` and `5462d47998b86459d328648c8057790a7b92af20`.

## 12.8.0 (2024-05-01)

### Deprecations
* `MetadataMode.NoMetadata` is deprecated and will be removed. The new name is `MetadataMode.InMemory`.

### Enhancements
* Experimental feature: The new instance members `App.baseUrl` and `App.updateBaseUrl()` allow for retrieving and updating the base URL currently used for requests sent to Atlas App Services. These APIs are only available after importing `"realm/experimental/base-url"`. ([#6518](https://github.com/realm/realm-js/pull/6518))
* Improved performance of "chained OR equality" queries for `uuid`/`objectId` types and RQL parsed `IN` queries on `string`/`int`/`uuid`/`objectId` types. ([realm/realm-dotnet#3566](https://github.com/realm/realm-dotnet/issues/3566), since the introduction of these types)

### Fixed
* Fixed a bug when running an `IN` query (or a query of the pattern `x == 1 OR x == 2 OR x == 3`) when evaluating on a string property with an empty string in the search condition. Matches with an empty string would have been evaluated as if searching for a null string instead. ([realm/realm-core#7628](https://github.com/realm/realm-core/pull/7628), since v10.0.0)
* `App.allUsers()` included logged out users only if they were logged out while the `App` instance existed. It now always includes all logged out users. ([realm/realm-core#7300](https://github.com/realm/realm-core/pull/7300))
* Deleting the active user left the active user unset rather than selecting another logged-in user as the active user like logging out and removing users did. ([realm/realm-core#7300](https://github.com/realm/realm-core/pull/7300))
* Fixed several issues around encrypted file portability (copying a "bundled" encrypted Realm from one device to another):
  * Fixed `Assertion failed: new_size % (1ULL << m_page_shift) == 0` when opening an encrypted Realm less than 64Mb that was generated on a platform with a different page size than the current platform. ([#realm/realm-core#7322](https://github.com/realm/realm-core/issues/7322), since v12.0.0-rc.3)
  * Fixed an exception thrown when opening a small (<4k of data) Realm generated on a device with a page size of 4k if it was bundled and opened on a device with a larger page size. (since v1.0.0)
  * Fixed an issue during a subsequent open of an encrypted Realm for some rare allocation patterns when the top ref was within ~50 bytes of the end of a page. This could manifest as an exception or as an assertion `encrypted_file_mapping.hpp:183: Assertion failed: local_ndx < m_page_state.size()`. ([realm/realm-core#7319](https://github.com/realm/realm-core/issues/7319))
* Schema initialization could hit an assertion failure if the sync client applied a downloaded changeset while the Realm file was in the process of being opened. ([realm/realm-core#7041](https://github.com/realm/realm-core/issues/7041), since v10.8.0)
* Queries using query paths on `mixed` values returns inconsistent results. ([realm/realm-core#7587](https://github.com/realm/realm-core/issues/7587), since v12.7.0-rc.0)

### Known issues
* Missing initial download progress notification when there is no active downloads. ([realm/realm-core#7627](https://github.com/realm/realm-core/issues/7627))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10.

### Internal
* Upgraded Realm Core from v14.5.1 to v14.6.1.
* The metadata disabled mode (`MetadataMode.NoMetadata`) has been replaced with an in-memory metadata mode (`MetadataMode.InMemory`) which performs similarly and doesn't work weirdly differently from the normal mode. The new mode is intended for testing purposes, but should be suitable for production usage if there is a scenario where metadata persistence is not needed. ([realm/realm-core#7300](https://github.com/realm/realm-core/pull/7300))

## 12.7.1 (2024-04-19)

### Fixed
* Fixed a crash when integrating removal of already removed dictionary key. ([realm/realm-core#7488](https://github.com/realm/realm-core/issues/7488), since v10.0.0)
* Removed incorrect privacy manifest for iOS. ([#6624](https://github.com/realm/realm-js/issues/6624), since v12.7.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10 or later).

### Internal
* Upgraded Realm Core from v14.5.1 to v14.5.2. ([#6628](https://github.com/realm/realm-js/issues/6628))
* Update URLs to documentation.

## 12.7.0 (2024-04-17)

> [!NOTE]
> This version bumps the Realm file format to version 24. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v6.0.0, might not be upgradeable. **Only Realm Studio 15.0.0 or later** will be able to open the new file format.

> [!NOTE]
> This version communicates with Atlas Device Services through a different URL (https://services.cloud.mongodb.com). While we consider this an internal detail of the SDK, you might need to update rules in firewalls or other configuration that you've used to limit connections made by your app.

### Enhancements
* Added [iOS Privacy Manifest](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files?language=objc). ([#6547](https://github.com/realm/realm-js/issues/6547)
* Updated bundled OpenSSL version to 3.2.0. ([realm/realm-core#7303](https://github.com/realm/realm-core/pull/7303))
* Improved performance of object notifiers with complex schemas by ~20%. ([realm/realm-core#7424](https://github.com/realm/realm-core/pull/7424))
* Improved performance with very large number of notifiers by ~75%. ([realm/realm-core#7424](https://github.com/realm/realm-core/pull/7424))
* Improved performance of aggregate operations on Dictionaries of objects, particularly when the dictionaries are empty. ([realm/realm-core#7418](https://github.com/realm/realm-core/pull/7418)
* Property keypath in RQL can be substituted with value given as argument. Use `$P<i>` in query string. ([realm/realm-core#7033](https://github.com/realm/realm-core/issues/7033))
* You can now use query substitution for the `@type` argument. ([realm/realm-core#7289](https://github.com/realm/realm-core/issues/7289))
* Storage of `Decimal128` properties has been optimized so that the individual values will take up 0 bits (if all nulls), 32 bits, 64 bits or 128 bits depending on what is needed. ([realm/realm-core#6111]https://github.com/realm/realm-core/pull/6111))
* Querying a specific entry in a collection (in particular 'first and 'last') is supported. ([realm/realm-core#4269](https://github.com/realm/realm-core/issues/4269))
* Index on list of strings property now supported ([realm/realm-core#7142](https://github.com/realm/realm-core/pull/7142))
* You can set the threshold levels for trace output on individual categories. ([realm/realm-core#7004](https://github.com/realm/realm-core/pull/7004))
* Improved performance of RQL queries on a non-linked string property using `>`, `>=`, `<`, `<=` operators and fixed behavior that a null string should be evaluated as less than everything, previously nulls were not matched. ([realm/realm-core#3939](https://github.com/realm/realm-core/issues/3939))
* Added support for using aggregate operations on Mixed properties in queries. ([realm/realm-core#7398](https://github.com/realm/realm-core/pull/7398))
* Improved file compaction performance on platforms with page sizes greater than 4k (for example arm64 Apple platforms) for files less than 256 pages in size. ([realm/realm-core#7492](https://github.com/realm/realm-core/pull/7492))
* Added the ability to set the log level for one or more categories via `Realm.setLogLevel`. ([#6560](https://github.com/realm/realm-js/issues/6560))
* Added detection and better instructions when imported from the Expo Go app. ([#6523](https://github.com/realm/realm-js/pull/6523))

### Fixed
* Aligned Dictionaries to Lists and Sets when they get cleared. ([#6205](https://github.com/realm/realm-core/issues/6205), since v10.3.0-rc.1)
* Fixed equality queries on a `Mixed` property with an index possibly returning the wrong result if values of different types happened to have the same StringIndex hash. ([realm/realm-core#6407](https://github.com/realm/realm-core/issues/6407), since v10.5.0-beta.1)
* `@count`/`@size` is now supported for `Mixed` properties. ([realm/realm-core#7280](https://github.com/realm/realm-core/issues/7280), since v10.0.0)
* Fixed queries like `indexed_property == NONE {x}` which mistakenly matched on only `x` instead of not `x`. This only applies when an indexed property with equality (`==`, or `IN`) matches with `NONE` on a list of one item. If the constant list contained more than one value then it was working correctly. ([realm/realm-java#7862](https://github.com/realm/realm-java/issues/7862), since v10.20.0)
* Uploading the changesets recovered during an automatic client reset recovery may lead to `Bad server version` errors and a new client reset. ([realm/realm-core#7279](https://github.com/realm/realm-core/issues/7279), since v12.5.0)
* Fixed crash in full text index using prefix search with no matches ([realm/realm-core#7309](https://github.com/realm/realm-core/issues/7309), since v12.2.0)
* Fixed a race condition when backing up Realm files before a client reset which could have lead to overwriting an existing file. ([realm/realm-core#7341](https://github.com/realm/realm-core/pull/7341))
* Fixed a bug when removing items from a list that could result in invalidated links becoming visible which could cause crashes or exceptions when accessing those list items later on. This affects synced Realms where another client had previously removed a list with over 1000 items in it, and then further local removals from the same list caused the list to have fewer than 1000 items. ([#7414](https://github.com/realm/realm-core/pull/7414), since v10.0.0)
* Fixed opening a Realm with cached user while offline results in fatal error and session does not retry connection. ([#6554](https://github.com/realm/realm-js/issues/6554) and [#6558](https://github.com/realm/realm-js/issues/6558), since v12.6.0)
* Fixed sorting order of strings to use standard unicode codepoint order instead of grouping similar English letters together. A noticeable change will be from "aAbBzZ" to "ABZabz". ([realm/realm-core#2573](https://github.com/realm/realm-core/issues/2573))
* `data` and `string` are now strongly typed for comparisons and queries. This change is especially relevant when querying for a string constant on a Mixed property, as now only strings will be returned. If searching for `data` is desired, then that type must be specified by the constant. In RQL the new way to specify a binary constant is to use `mixed = bin('xyz')` or `mixed = binary('xyz')`. ([realm/realm-core#6407](https://github.com/realm/realm-core/issues/6407))
* Fixed diverging history due to a bug in the replication code when setting default null values (embedded objects included). ([realm/realm-core#7536](https://github.com/realm/realm-core/issues/7536))
* Null pointer exception may be triggered when logging out and async commits callbacks not executed. ([realm/realm-core#7434](https://github.com/realm/realm-core/issues/7434), since v12.6.0)
* Fixed a bug which caused crashes when reloading React Native apps. ([#6579](https://github.com/realm/realm-js/issues/6579), since v12.0.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10 or later).

### Internal
* The base URL used to communicate with the Atlas App Services was changed from "https://realm.mongodb.com" to "https://services.cloud.mongodb.com". ([realm/realm-core#7534](https://github.com/realm/realm-core/pull/7534)).
* Upgraded Realm Core from v13.26.0 to v14.5.1. ([#6499](https://github.com/realm/realm-js/issues/6499), [#6541](https://github.com/realm/realm-js/issues/6541), [#6568](https://github.com/realm/realm-js/issues/6568), [#6572](https://github.com/realm/realm-js/issues/6572), [#6599](https://github.com/realm/realm-js/issues/6599), and [#6610](https://github.com/realm/realm-js/issues/6610))
* Publish releases with [provenance statements](https://docs.npmjs.com/generating-provenance-statements).
* Use CMake v3.29.2 and Node v20.11.1 on Github Actions.

## 12.7.0-rc.0 (2024-03-26)

> [!NOTE]
> This version bumps the Realm file format to version 24. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v6.0.0, might not be upgradeable. **Only Realm Studio 15.0.0 or later** will be able to open the new file format.

> [!NOTE]
> This release doesn't include the changes previously released as [v12.7.0-alpha.0](https://github.com/realm/realm-js/releases/tag/v12.7.0-alpha.0) and is a pre-release because we plan on updating the `setLogLevel` API before releasing this as `v12.7.0`: https://github.com/realm/realm-js/issues/6560 and we just wanted to get this out for Realm Studio `v15.0.0`.

### Enhancements
* Updated bundled OpenSSL version to 3.2.0. ([realm/realm-core#7303](https://github.com/realm/realm-core/pull/7303))
* Improved performance of object notifiers with complex schemas by ~20%. ([realm/realm-core#7424](https://github.com/realm/realm-core/pull/7424))
* Improved performance with very large number of notifiers by ~75%. ([realm/realm-core#7424](https://github.com/realm/realm-core/pull/7424))
* Improved performance of aggregate operations on Dictionaries of objects, particularly when the dictionaries are empty. ([realm/realm-core#7418](https://github.com/realm/realm-core/pull/7418)
* Property keypath in RQL can be substituted with value given as argument. Use `$P<i>` in query string. ([realm/realm-core#7033](https://github.com/realm/realm-core/issues/7033))
* You can now use query substitution for the `@type` argument. ([realm/realm-core#7289](https://github.com/realm/realm-core/issues/7289))
* Storage of `Decimal128` properties has been optimized so that the individual values will take up 0 bits (if all nulls), 32 bits, 64 bits or 128 bits depending on what is needed. ([realm/realm-core#6111]https://github.com/realm/realm-core/pull/6111))
* Querying a specific entry in a collection (in particular 'first and 'last') is supported. ([realm/realm-core#4269](https://github.com/realm/realm-core/issues/4269))
* Index on list of strings property now supported ([realm/realm-core#7142](https://github.com/realm/realm-core/pull/7142))
* You can set the threshold levels for trace output on individual categories. ([realm/realm-core#7004](https://github.com/realm/realm-core/pull/7004))
* Improved performance of RQL queries on a non-linked string property using `>`, `>=`, `<`, `<=` operators and fixed behavior that a null string should be evaluated as less than everything, previously nulls were not matched. ([realm/realm-core#3939](https://github.com/realm/realm-core/issues/3939))
* Added support for using aggregate operations on Mixed properties in queries. ([realm/realm-core#7398](https://github.com/realm/realm-core/pull/7398))
* Improved file compaction performance on platforms with page sizes greater than 4k (for example arm64 Apple platforms) for files less than 256 pages in size. ([realm/realm-core#7492](https://github.com/realm/realm-core/pull/7492))
* Added a static `Realm.shutdown()` method, which closes all Realms, cancels all pending `Realm.open` calls, clears internal caches, resets the logger and collects garbage. Call this method to free up the event loop and allow Node.js to perform a graceful exit. ([#6571](https://github.com/realm/realm-js/pull/6571), since v12.0.0)

### Fixed
* Aligned Dictionaries to Lists and Sets when they get cleared. ([#6205](https://github.com/realm/realm-core/issues/6205), since v10.3.0-rc.1)
* Fixed equality queries on a `Mixed` property with an index possibly returning the wrong result if values of different types happened to have the same StringIndex hash. ([realm/realm-core#6407](https://github.com/realm/realm-core/issues/6407), since v10.5.0-beta.1)
* `@count`/`@size` is now supported for `Mixed` properties. ([realm/realm-core#7280](https://github.com/realm/realm-core/issues/7280), since v10.0.0)
* Fixed queries like `indexed_property == NONE {x}` which mistakenly matched on only `x` instead of not `x`. This only applies when an indexed property with equality (`==`, or `IN`) matches with `NONE` on a list of one item. If the constant list contained more than one value then it was working correctly. ([realm/realm-java#7862](https://github.com/realm/realm-java/issues/7862), since v10.20.0)
* Uploading the changesets recovered during an automatic client reset recovery may lead to `Bad server version` errors and a new client reset. ([realm/realm-core#7279](https://github.com/realm/realm-core/issues/7279), since v12.5.0)
* Fixed crash in full text index using prefix search with no matches ([realm/realm-core#7309](https://github.com/realm/realm-core/issues/7309), since v12.2.0)
* Fixed a race condition when backing up Realm files before a client reset which could have lead to overwriting an existing file. ([realm/realm-core#7341](https://github.com/realm/realm-core/pull/7341))
* Fixed a bug when removing items from a list that could result in invalidated links becoming visible which could cause crashes or exceptions when accessing those list items later on. This affects synced Realms where another client had previously removed a list with over 1000 items in it, and then further local removals from the same list caused the list to have fewer than 1000 items. ([#7414](https://github.com/realm/realm-core/pull/7414), since v10.0.0)
* Fixed opening a Realm with cached user while offline results in fatal error and session does not retry connection. ([#6554](https://github.com/realm/realm-js/issues/6554) and [#6558](https://github.com/realm/realm-js/issues/6558), since v12.6.0)
* Fixed sorting order of strings to use standard unicode codepoint order instead of grouping similar English letters together. A noticeable change will be from "aAbBzZ" to "ABZabz". ([realm/realm-core#2573](https://github.com/realm/realm-core/issues/2573))
* `data` and `string` are now strongly typed for comparisons and queries. This change is especially relevant when querying for a string constant on a Mixed property, as now only strings will be returned. If searching for `data` is desired, then that type must be specified by the constant. In RQL the new way to specify a binary constant is to use `mixed = bin('xyz')` or `mixed = binary('xyz')`. ([realm/realm-core#6407](https://github.com/realm/realm-core/issues/6407))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10 or later).

### Internal
* Upgraded Realm Core from v13.26.0 to v14.4.1. ([#6499](https://github.com/realm/realm-js/issues/6499), [#6541](https://github.com/realm/realm-js/issues/6541), [#6568](https://github.com/realm/realm-js/issues/6568), and [#6572](https://github.com/realm/realm-js/issues/6572))

## 12.6.2 (2024-03-04)

### Fixed
* Fixed binding abstraction to allow access of certain properties (`$$typeof` for now) prior to its injection. ([#6522](https://github.com/realm/realm-js/issues/6522), since v12.6.1)
* Added a missing dependency on `path-browserify`. ([#6522](https://github.com/realm/realm-js/issues/6522), since v12.6.1)

### Internal
* Using Realm Core v13.26.0.

## 12.6.1 (2024-02-26)

### Fixed
* Fixed `User#callFunction` to correctly pass arguments to the server. Previously they would be sent as an array, so if your server-side function used to handle the unwrapping of arguments, it would need an update too. The "functions factory" pattern of calling `user.functions.sum(1, 2, 3)` wasn't affected by this bug. Thanks to @deckyfx for finding this and suggesting the fix! ([#6447](https://github.com/realm/realm-js/issues/6447), since v12.0.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Fix Cocoapods to version 1.14.3 on Github Actions.
* Migrated bingen from `util::Optional` to `std::optional`.
* Upgrading `@realm/fetch` to the newly released v0.1.1 and no longer bundling it into the SDK package.
* SDK package is no longer using Rollup, but instead using bare `tsc` utilizing TypeScript project references. ([#6492](https://github.com/realm/realm-js/pull/6492))

## 12.6.0 (2024-01-29)

### Enhancements
* Added an optional `fetch` parameter to the `AppConfiguration`. Use this to specify a custom implementation of the `fetch` function used by the app to perform network requests.

### Fixed
* Handle `EOPNOTSUPP` when using `posix_fallocate()` and fallback to manually consume space. This should enable android users to open a Realm on restrictive file systems. ([#6349](https://github.com/realm/realm-js/issues/6349), since v12.2.0)
* Application may crash with `incoming_changesets.size() != 0` when a download message is mistaken for a bootstrap message. This can happen if the synchronization session is paused and resumed at a specific time. ([realm/realm-core#7238](https://github.com/realm/realm-core/pull/7238), since v10.12.0)
* Fixed errors complaining about missing symbols such as `__atomic_is_lock_free` on ARMv7 Linux. ([realm/realm-core#7257](https://github.com/realm/realm-core/pull/7257))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.25.1 to v13.26.0. ([#6403](https://github.com/realm/realm-js/issues/6403))
* Bumping the required MacOS version to 10.13.

## 12.5.1 (2024-01-03)

### Fixed
* Accessing the `providerType` on a `UserIdentity` via `User.identities` always yielded `undefined`. Thanks to [@joelowry96](https://github.com/joelowry96) for pinpointing the fix.
* Bad performance of initial Sync download involving many backlinks. ([realm/realm-core#7217](https://github.com/realm/realm-core/issues/7217), since v10.0.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.25.0 to v13.25.1. ([#6335](https://github.com/realm/realm-js/issues/6335))

## 12.5.0 (2023-12-19)

### Enhancements
* Added an optional third `keyPaths` argument to the `addListener` methods of `Collection` and `Object`. Use this to indicate a lower bound on the changes relevant for the listener. This is a lower bound, since if multiple listeners are added (each with their own "key paths") the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the object or collection. In other words: A listener might fire more than the key-paths specify, if other listeners with different key-paths are present. ([#6285](https://github.com/realm/realm-js/issues/6285))
  ```ts
  // Adding a listener that will fire only on changes to the `location` property (if no other key-path listeners are added to the collection).
  cars.addListener((collection, changes) => {
    console.log("A car location changed");
  }, ["location"]);
  ```
* Exceptions thrown during bootstrap application will now be surfaced to the user via the sync error handler rather than terminating the program with an unhandled exception. ([realm/realm-core#7197](https://github.com/realm/realm-core/pull/7197))

### Fixed
* Exceptions thrown during bootstrap application could crash the sync client with an `!m_sess` assertion. ([realm/realm-core#7196](https://github.com/realm/realm-core/issues/7196), since v10.18.0)
* If a `SyncSession` was explicitly resumed via `reconnect()` while it was waiting to auto-resume after a non-fatal error and then another non-fatal error was received, the sync client could crash with a `!m_try_again_activation_timer` assertion. ([realm/realm-core#6961](https://github.com/realm/realm-core/issues/6961), since device sync was introduced)
* Adding the same callback function as a listener on a `Collection` or `Object` used to be undefined behavior. Now it throws, which results in runtime errors that can be resolved by ensuring that the callback is only added once per object. ([#6310](https://github.com/realm/realm-js/pull/6310))


### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.24.1 to v13.25.0. ([#6324](https://github.com/realm/realm-js/issues/6324))

## 12.4.0 (2023-12-13)

### Enhancements
* Exporting a `RealmEventName` type. ([#6300](https://github.com/realm/realm-js/pull/6300))
* Automatic client reset recovery now preserves the original division of changesets, rather than combining all unsynchronized changes into a single changeset. ([realm/realm-core#7161](https://github.com/realm/realm-core/pull/7161))
* Automatic client reset recovery now does a better job of recovering changes when changesets were downloaded from the server after the unuploaded local changes were committed. If the local Realm happened to be fully up to date with the server prior to the client reset, automatic recovery should now always produce exactly the same state as if no client reset was involved. ([realm/realm-core#7161](https://github.com/realm/realm-core/pull/7161))
* Improved the experience of logging `Realm.Object` and `Realm.Collection` objects on Node.js, by providing a custom "inspect" symbol. ([#2758](https://github.com/realm/realm-js/pull/2758))

### Fixed
* When mapTo is used on a property of type List, an error like `Property 'test_list' does not exist on 'Task' objects` occurs when trying to access the property. ([#6268](https://github.com/realm/realm-js/issues/6268), since v12.0.0)
* Fixed bug where apps running under JavaScriptCore on Android will terminate with the error message `No identifiers allowed directly after numeric literal`. ([#6194](https://github.com/realm/realm-js/issues/6194), since v12.2.0)
* When an object had an embedded object as one of its properties, updating that property to `null` or `undefined` did not update the property in the database. ([#6280](https://github.com/realm/realm-js/issues/6280), since v12.0.0)
* Fixed download of platform + arch specific prebuilt binaries when building an Electron app using `electron-builder`. ([#3828](https://github.com/realm/realm-js/issues/3828))
* Notification listeners on a `Dictionary` would only fire when the dictionary itself changed (via inserts or deletions) but not when changes were made to the underlying objects. ([#6310](https://github.com/realm/realm-js/pull/6310), since v12.0.0)

* Fixed deadlock which occurred when accessing the current user from the `App` from within a callback from the `User` listener. ([realm/realm-core#7183](https://github.com/realm/realm-core/issues/7183), since v12.2.1)
* Errors encountered while reapplying local changes for client reset recovery on partition-based sync Realms would result in the client reset attempt not being recorded, possibly resulting in an endless loop of attempting and failing to automatically recover the client reset. Flexible sync and errors from the server after completing the local recovery were handled correctly. ([realm/realm-core#7149](https://github.com/realm/realm-core/pull/7149), since v10.3.0-rc.1)
* During a client reset with recovery when recovering a move or set operation on a `List<Object>` or `List<Mixed>` that operated on indices that were not also added in the recovery, links to an object which had been deleted by another client while offline would be recreated by the recovering client. But the objects of these links would only have the primary key populated and all other fields would be default values. Now, instead of creating these zombie objects, the lists being recovered skip such deleted links. ([realm/realm-core#7112](https://github.com/realm/realm-core/issues/7112) since the beginning of client reset with recovery in v10.18.0)
* During a client reset recovery a Set of links could be missing items, or an exception could be thrown that prevents recovery e.g., `Requested index 1 calling get() on set 'source.collection' when max is 0`. ([realm/realm-core#7112](https://github.com/realm/realm-core/issues/7112), since the beginning of client reset with recovery in v10.18.0)
* Calling `sort()` or `distinct()` on a `LnkSet` that had unresolved links in it would produce duplicate indices. ([realm/realm-core#7112](https://github.com/realm/realm-core/issues/7112), since the beginning of client reset with recovery in v10.18.0)
* Automatic client reset recovery would duplicate insertions in a list when recovering a write which made an unrecoverable change to a list (i.e. modifying or deleting a pre-existing entry), followed by a subscription change, followed by a write which added an entry to the list. ([realm/realm-core#7155](https://github.com/realm/realm-core/pull/7155), since v10.19.4)
* Fixed several causes of "decryption failed" exceptions that could happen when opening multiple encrypted Realm files in the same process while using Apple/linux and storing the Realms on an exFAT file system. ([realm/realm-core#7156](https://github.com/realm/realm-core/issues/7156), since v1.0.0)
* If the very first open of a flexible sync Realm triggered a client reset, the configuration had an initial subscriptions callback, both before and after reset callbacks, and the initial subscription callback began a read transaction without ending it (which is normally going to be the case), opening the frozen Realm for the after reset callback would trigger a BadVersion exception. ([realm/realm-core#7161](https://github.com/realm/realm-core/pull/7161), since v10.19.4)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.23.4 to v13.24.1. ([#6311](https://github.com/realm/realm-js/pull/6311))

## 12.3.1 (2023-11-23)

### Fixed
* Fixed FLX subscriptions not being sent to the server if the session was interrupted during bootstrapping. ([realm/realm-core#7077](https://github.com/realm/realm-core/issues/7077), since v10.12.0)
* Fixed FLX subscriptions not being sent to the server if an upload message was sent immediately after a subscription was committed. ([realm/realm-core#7076](https://github.com/realm/realm-core/issues/7076), since v12.3.0)
* Fixed application crash with `KeyNotFound` exception when subscriptions are marked complete after a client reset. ([realm/realm-core#7090](https://github.com/realm/realm-core/issues/7090), since v10.19.0)
* Fixed a crash at a very specific time during a `DiscardLocal` client reset on a FLX Realm could leave subscriptions in an invalid state. ([realm/realm-core#7110](https://github.com/realm/realm-core/pull/7110), since v10.19.4)
* Fixed an error "Invalid schema change (UPLOAD): cannot process AddColumn instruction for non-existent table" when using automatic client reset with recovery in dev mode to recover schema changes made locally while offline. ([realm/realm-core#7042](https://github.com/realm/realm-core/pull/7042))
* When place an embedded object would create a new object and keep the original object too. ([#6239](https://github.com/realm/realm-js/issues/6239), since v12.0.0)
* When setting an embedded object in a `Realm.List` by index, the new object would be inserted at the end rather than replacing the existing object at the given index. ([#6239](https://github.com/realm/realm-js/issues/6239), since v12.0.0)
* When `SyncConfiguration.clientReset` was `undefined`, no client reset mode was set which could lead to an app crash with the message `m_mode != ClientResyncMode::Manual`. The default mode is now `RecoverUnsyncedChanges` and no callbacks are defined. ([#6260](https://github.com/realm/realm-js/issues/6260), since v12.0.0)
* Fixed writing the `realm-constants.json` file used for analytics / telemetry, which used to cause errors such as `Unable to resolve module ../realm-constants.json` for users installing the package into a mono-repo. We're now storing this information in the `realm/package.json` file instead. ([#6144](https://github.com/realm/realm-js/issues/6144), since v12.0.0-rc.2)


### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.23.2 to v13.23.4. ([#6234](https://github.com/realm/realm-js/issues/6234) and [#6253](https://github.com/realm/realm-js/issues/6253))

## 12.3.0 (2023-11-03)

### Enhancements
* Allow asymmetric objects to contain fields with non-embedded (top-level) links (rather than only embedded links). ([realm/realm-core#7003](https://github.com/realm/realm-core/pull/7003))

### Fixed
* The `onBefore`, `onAfter`, and `onFallback` client reset callbacks were not called. ([#6201](https://github.com/realm/realm-js/issues/6201), since v12.0.0)
* `Symbol.unscopables` has been implemented on the base class of `Realm.Results`, `Realm.List`, and `Realm.Set`. ([#6215](https://github.com/realm/realm-js/pull/6215))
* Deleting an object in an asymmetric table would cause a crash. ([realm/realm-kotlin#1537](https://github.com/realm/realm-kotlin/issues/1537), since v10.19.0)
* Updating subscriptions did not trigger Realm auto-refreshes, sometimes resulting in async refresh hanging until another write was performed by something else. ([realm/realm-core#7031](https://github.com/realm/realm-core/pull/7031))
* Fix inter-process locking for concurrent Realm file access resulting in an inter-process deadlock on FAT32/exFAT file systems. ([realm/realm-core#6959](https://github.com/realm/realm-core/pull/6959))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Some disabled tests for client reset (partition based sync) have been enabled. ([#6201](https://github.com/realm/realm-js/issues/6201)
* Upgraded Realm Core from v13.22.0 to v13.23.2. ([#6220](https://github.com/realm/realm-js/issues/6220))

## 12.2.1 (2023-10-05)

### Deprecations
* `Realm.User.providerType` is deprecated, and will be remove in next major version. Use `Realm.User.identities` instead.

### Fixed
* Outside migration functions, it is not possible to change the value of a primary key. ([#6161](https://github.com/realm/realm-js/issues/6161), since v12.0.0)
* Receiving a `write_not_allowed` error from the server would have led to a crash. ([realm/realm-core#6978](https://github.com/realm/realm-core/issues/6978), since v11.5.0)
* If querying over a geospatial dataset that had some objects with a type property set to something other than `Point` (case insensitive) an exception would have been thrown. Instead of disrupting the query, those objects are now just ignored. ([realm/realm-core#6989](https://github.com/realm/realm-core/issues/6989), since v12.0.0)
* If a user was logged out while an access token refresh was in progress, the refresh completing would mark the user as logged in again and the user would be in an inconsistent state. ([realm/realm-core#6837](https://github.com/realm/realm-core/pull/6837), since v10.0.0)
* Logging in a single user using multiple auth providers created a separate `Realm.User` per auth provider. This mostly worked, but had some quirks:
  - Sync sessions would not necessarily be associated with the specific `Realm.User` used to create them. As a result, querying a user for its sessions could give incorrect results, and logging one user out could close the wrong sessions.
  - Existing local synchronized Realm files created using version of Realm from August - November 2020 would sometimes not be opened correctly and would instead be redownloaded.
  - Removing one of the `Realm.User`s would delete all local Realm files for all `Realm.User`s for that user.
  - Deleting the server-side user via one of the `Realm.User`s left the other `Realm.User`s in an invalid state.
  - A `Realm.User` which was originally created via anonymous login and then linked to an identity would still be treated as an anonymous users and removed entirely on logout.
  - [realm/realm-core#6837](https://github.com/realm/realm-core/pull/6837), since v10.0.0

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.20.1 to v13.22.0. ([#6158](https://github.com/realm/realm-js/issues/6158))

## 12.2.0 (2023-09-24)

### Deprecations
* `Realm.App.Sync.reconnect(app)` has been deprecated and will be removed in the next major version. You can use `Realm.App.Sync.Session.reconnect()` instead.

### Enhancements
* Added `Realm.Sync.Session.reconnect()` to help force a reconnection to Atlas Device Sync. ([#6123](https://github.com/realm/realm-js/issues/6123))
* Added `Realm.App.AppConfiguration.metaData` which will make it possible to encrypt metadata used by the `Realm.App`. ([#6147](https://github.com/realm/realm-js/issues/6147))

### Fixed
* Fixed values of properties being replaced by default value when updating. ([#6129](https://github.com/realm/realm-js/issues/6129), since v12.0.0)
* Fixed that value for `Realm.schemaVersion` wasn't propagated correctly for non-existing files. ([#6119](https://github.com/realm/realm-js/issues/6119), since v12.0.0)
* Full text search supports searching for prefix only e.g., `description TEXT 'alex*'`. ([realm/realm-core#6860](https://github.com/realm/realm-core/issues/6860))
* Unknown protocol errors received from the Altas Device Sync server will no longer cause the app to crash if a valid error action is also received. Unknown error actions will cause device sync to fail with an error via the sync error handler. ([realm/realm-core#6885](https://github.com/realm/realm-core/pull/6885))
* Allow arguments to Realm Query Language to be a string representation of a geospatial object for `GEOWITHIN` queries. ([realm/realm-core#6934](https://github.com/realm/realm-core/issues/6934))
* Crash when querying the size of a Object property through a link chain. ([realm/realm-core#6915](https://github.com/realm/realm-core/issues/6915), since v12.0.0)
* Throw an exception when some limitation on the OS filesystem is reached, instead of crashing the application. The same file locking logic is now also used for all the platforms. ([realm/realm-core#6926](https://github.com/realm/realm-core/pull/6926))
* Fixed crash that generated the error message `Assertion failed: ref + size <= next->first`. ([realm/realm-core#6340](https://github.com/realm/realm-core/issues/6340), since v11.3.0)
* When using OpenSSL (i.e. on non-Apple platforms) a TLS handshake error would never be reported and instead TLS errors would be reported as a sync connection failure. When using SecureTransport (i.e. on Apple platforms) only some TLS handshake errors would be reported, but most were reported as a sync connection failure. Additionally, reported sync errors originating from OpenSSL have been improved. ([realm/realm-core#6938](https://github.com/realm/realm-core/pull/6938)).
* Fixed `Bad server version` errors and client reset which sometimes occurred when updating a subscription's query. ([realm/realm-core#6966](https://github.com/realm/realm-core/issues/6966), since v10.12.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.17.2 to v13.20.1. ([#6077](https://github.com/realm/realm-js/issues/6077) & [#6134](https://github.com/realm/realm-js/issues/6134))
* Sync protocol version bumped to 10. ([realm/realm-core#6902](https://github.com/realm/realm-core/pull/6902))
* Error code reported in the sync error handling for compensating writes is reported as 1033 (previously 231). ([#6077](https://github.com/realm/realm-js/issues/6077))

## 12.1.0 (2023-08-30)

### Enhancements
* Added configuration option `migrationOptions.resolveEmbeddedConstraints` to support for automatic resolution of embedded object constraints during migration. ([#6073](https://github.com/realm/realm-js/issues/6073))

### Fixed
* Fixed toolchain on Linux. On older Linux installations, the error `GLIBC_2.34' not found (required by /home/user/MyProject/node_modules/realm/generated/ts/realm.node)` could be observed. ([#6082](https://github.com/realm/realm-js/issues/6082), since v12.0.0)
* Fixed accessing `Realm.Object.linkingObjects()` when the origin and target are of different object types. ([#6108](https://github.com/realm/realm-js/pull/6108), since v12.0.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v13.17.2.
* Removed pre-v12 source code.
* Added API documentation for `Realm.Configuration`. ([#6081](https://github.com/realm/realm-js/issues/6081), since v12.0.0)
* Added [typedoc-plugin-missing-exports](https://www.npmjs.com/package/typedoc-plugin-missing-exports) to resolved missing exports.

## 12.0.0 (2023-08-17)
NOTE: This combines all changelog entries for prereleases of v12.0.0.

### Breaking changes
Although this is a complete rewrite of our SDK, we've strived to keep breakages to a minimum and expect our users to upgrade from v11 without any significant changes to their code-base.

* The entire BSON package used to be re-exported as `Realm.BSON`, to simplify the new SDK we want to export only the BSON types that our SDK database component supports (ObjectId, Decimal128 and UUID). See [#4934](https://github.com/realm/realm-js/issues/4934).
* As a part of migrating to [NAPI](https://nodejs.org/api/n-api.html) (since ~ v6), we saw no performant way to support getting property names of a `Realm.Object` via the standard `Object.keys(obj)`. As a side-effect we stopped supporting the object spread operator `{...obj}` and introduced `Realm.Object#keys()`, `Realm.Object#entries()` and `Realm.Object#toJSON()` methods were introduced as a workaround. The new SDK wraps its accessor objects in a Proxy trapping the ownKeys operation which enables calls to the standard `Object.keys(obj)` and the spread operator `{...obj}` to work correctly, with minimal performance impact on normal accesses. Therefore, we are deprecating the APIs with the @deprecation annotation and a `console.warn` when calling `RealmObject#keys()` and `RealmObject#entries()`. `RealmObject#toJSON` still serves the purpose of producing a circularly referencing object graph. We would love the community's feedback on this!
* We're now reusing code to perform assertions and although this is strictly not a breaking change, since we haven't historically documented error messages, you should probably revisit any code in your app which relies on matching on specific error messages.
* `Results`, `List` and `Set` used to inherit directly from `Collection` but now inherits from an abstract `OrderedCollection`, which extends `Collection`.
* In order to better guide users toward correct usage and understanding of the Realm property types, users must now be explicit about the property type when declaring object schemas. Additionally, mixing shorthand (string) and object representation for the property type is no longer permitted. (See the `PropertySchema` and `PropertySchemaShorthand` types.)

```javascript
// Example object schema
const TaskSchema = {
  name: "Task",
  properties: {
    description: /* property schema (shorthand or object form) */,
  },
};

// Explicitness
"[]"          // Bad (previously parsed as implicit "mixed")
"mixed[]"     // Good

{ type: "list" }                              // Bad
{ type: "list", objectType: "mixed" }         // Good

// Mixing shorthand and object form
{ type: "int[]" }                             // Bad
"int[]"                                       // Good
{ type: "list", objectType: "int" }           // Good

{ type: "int?" }                              // Bad
"int?"                                        // Good
{ type: "int", optional: true }               // Good

// Specifying object types
{ type: "SomeType" }                          // Bad
"SomeType"                                    // Good
{ type: "object", objectType: "SomeType" }    // Good

{ type: "object[]", objectType: "SomeType" }  // Bad
"SomeType[]"                                  // Good
{ type: "list", objectType: "SomeType" }      // Good

{ type: "linkingObjects", objectType: "SomeType", property: "someProperty" } // Good
```

* To prevent modifying end-users' class-based model classes, we’re now creating and injecting a class in front of the class provided by the user. Objects will still pass `instanceof SomeClass` checks, however, code which is directly using prototype or constructor comparisons will fail:

```javascript
Object.getPrototypeOf(object) == CustomObject.prototype // No longer works
object.constructor == CustomObject // No longer works
```

* Symbols used to be accepted as keys in a dictionary, where they were coerced to strings prior to performing lookup. This was undocumented behavior that makes little sense in practice (and arguably defeats the main purpose of the JS `Symbol` type). In the new SDK, using a Symbol as a key in a dictionary will throw.
* The [push service](https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/) has already been deprecated on the Atlas server. We've deprecated this on v11 and removed it from v12.
* We’ve decided to remove numeric indexing and “array methods” from the `SubscriptionSet`, since (a) the team saw little actual use-case for it, (b) it would bloat our SDK code, and (c) there is a simple workaround if needed (spreading into an array `[...realm.subscriptions]`). (The property `length` is available.) Again, something we would love feedback on.
* No longer exporting the `ObjectPropsType`, `UserMap`, `UserType`, `BaseFunctionsFactory`, `AuthProviders`, `PropertyType`, `HTTP`, `*Details` interfaces of the `EmailPasswordAuthClient` and `AuthError` types, since they weren't  used internally and not expected to be used by users. Moreover, most of these are very simple to type out for any user relying on it. Similarly, the `DictionaryBase` type was introduced to help work around an issue (declaring string index accessors on a class with methods) in our declarations. We consider it an internal detail that got introduced as part of our public API by accident; thus, we ask users to use the `Dictionary` type directly. We also decided to rename the `Session` class to `SyncSession` since it’s now exported directly on the package namespace. `Session` will still be available (but deprecated) as `Realm.Sync.Session`. We’re no longer using the `*Payload` types (they were only used by Realm Web) and we don’t expect end-users to be relying directly on these, hence they were deleted.
* The return values of Object#getPropertyType was changed to return `"list"` instead of `"array"`.
* On v11, if the C++ object had been destroyed already, we would often return `undefined` or some other default value when calling methods or accessing properties on the JS `SyncSession` object, even if that would violate our declared TS types. Now, in v12, we will throw from all methods and property accessors in this case.

### Deprecations
* Deprecated the `SubscriptionsState` enum (will be removed in v13) in favor of the now-named `SubscriptionSetState`. ([#5773](https://github.com/realm/realm-js/issues/5773))

### Notable new features
* Added `Realm.setLogger`, that allows to setup a single static logger for the duration of the app lifetime. Differently from the now deprecated sync logger (that was setup with `Sync.setLogger`), this new one will emit messages coming also from the local database, and not only from sync. It is also possible to change the log level during the whole duration of the app lifetime with `Realm.setLogLevel`. ([#2546](https://github.com/realm/realm-js/issues/2546))
* Added a new error class `CompensatingWriteError` which indicates that one or more object changes have been reverted by the server.
This can happen when the client creates/updates objects that do not match any subscription, or performs writes on an object it didn't have permission to access. ([#5599](https://github.com/realm/realm-js/pull/5599))
* Added **experimental** APIs to facilitate adding and removing subscriptions by subscribing and unsubscribing directly to and from a `Results` instance via `Results.subscribe()` (asynchronous) and `Results.unsubscribe()` (synchronous). ([#5772](https://github.com/realm/realm-js/pull/5772))
  * Added a `WaitForSync` enum specifying whether to wait or not wait for subscribed objects to be downloaded before resolving the promise returned from `Results.subscribe()`.
  * Extended `SubscriptionOptions` to take a `WaitForSync` behavior and a maximum waiting timeout before returning from `Results.subscribe()`.
  * Added the instance method `MutableSubscriptionSet.removeUnnamed()` for removing only unnamed subscriptions.
  ```javascript
  const peopleOver20 = await realm
    .objects("Person")
    .filtered("age > 20")
    .subscribe({
      name: "peopleOver20",
      behavior: WaitForSync.FirstTime, // Default
      timeout: 2000,
    });
  // ...
  peopleOver20.unsubscribe();
  ```
* Added initial support for geospatial queries, with the possibility of querying points. No new data type has been added in this phase, but every embedded object property that conforms to `CanonicalGeoPoint` can be queried. ([#5850](https://github.com/realm/realm-js/pull/5850))
  * The queries can be used to filter objects whose points lie within a certain area following spherical geometry, using the `geoWithin` operator in the query string to `Results.filtered()`.
  * The following shapes are supported in geospatial queries: circle (`GeoCircle` type, defined by its center and radius in radians), box (`GeoBox` type, defined by its bottom left and upper right corners) and polygon (`GeoPolygon` type, defined by its vertices).
  * Additionally, two new functions have been added, `kmToRadians()` and `miToRadians()`, that can be used to convert kilometers and miles to radians respectively, simplifying conversion of a circle's radius.
  ```typescript
  import Realm, {
    ObjectSchema,
    GeoCircle,
    CanonicalGeoPoint,
    GeoPosition,
    kmToRadians,
  } from "realm";

  // Example of a user-defined point class that can be queried using geospatial queries
  class MyGeoPoint extends Realm.Object implements CanonicalGeoPoint {
    coordinates!: GeoPosition;
    type = "Point" as const;

    static schema: ObjectSchema = {
      name: "MyGeoPoint",
      embedded: true,
      properties: {
        type: "string",
        coordinates: "double[]",
      },
    };
  }

  class PointOfInterest extends Realm.Object {
    name!: string;
    location!: MyGeoPoint;

    static schema: ObjectSchema = {
      name: "PointOfInterest",
      properties: {
        name: "string",
        location: "MyGeoPoint",
      },
    };
  }

  realm.write(() => {
    realm.create(PointOfInterest, {
      name: "Copenhagen",
      location: {
        coordinates: [12.558892784045568, 55.66717839648401],
        type: "Point",
      } as MyGeoPoint
    });
    realm.create(PointOfInterest, {
      name: "New York",
      location: {
        coordinates: [-73.92474936213434, 40.700090994927415],
        type: "Point",
      } as MyGeoPoint
    });
  });

  const pois = realm.objects(PointOfInterest);

  const berlinCoordinates: GeoPoint = [13.397255909303222, 52.51174463251085];
  const radius = kmToRadians(500); //500 km = 0.0783932519 rad

  // Circle with a radius of 500kms centered in Berlin
  const circleShape: GeoCircle = {
    center: berlinCoordinates,
    distance: radius,
  };

  // All points of interest in a 500kms radius from Berlin
  let result = pois.filtered("location geoWithin $0", circleShape);

  // Equivalent string query without arguments
  result = pois.filtered("location geoWithin geoCircle([13.397255909303222, 52.51174463251085], 0.0783932519)");
  ```

### Enhancements
* Added support for building with the new React Native architecture enabled on Android. Thanks to
Nikolai Samorodov / [@zabutok](https://github.com/zabutok) for contributing the fix. ([#5032](https://github.com/realm/realm-js/issues/5032))
* Opening a Realm with invalid schemas will throw a `SchemaParseError` (or one of its subtypes `ObjectSchemaParseError` and `PropertySchemaParseError`) rather than an `AssertionError` or `Error`. ([#5198](https://github.com/realm/realm-js/issues/5198))
* Enable multiple processes to operate on an encrypted Realm simultaneously. ([realm/realm-core#1845](https://github.com/realm/realm-core/issues/1845))
* Added support for a sync configuration option to provide an `SSLConfiguration` with a custom function for validating the server's SSL certificate. ([#5485](https://github.com/realm/realm-js/issues/5485))
* Improve performance of equality queries on a non-indexed mixed property by about 30%. ([realm/realm-core#6506](https://github.com/realm/realm-core/pull/6506))
* Improve performance of rolling back write transactions after making changes.  ([realm/realm-core#6513](https://github.com/realm/realm-core/pull/6513))
* Extended `PropertySchema.indexed` with the `full-text` option, that allows to create an index for full-text search queries. ([#5755](https://github.com/realm/realm-js/issues/5755))
* Access token refresh for websockets was not updating the location metadata. ([realm/realm-core#6630](https://github.com/realm/realm-core/issues/6630), since v11.9.0)
* Using both synchronous and asynchronous transactions on the same thread or scheduler could hit an assertion failure if one of the callbacks for an asynchronous transaction happened to be scheduled during a synchronous transaction ([realm/realm-core#6659](https://github.com/realm/realm-core/pull/6649), since v10.12.0)
* Support sort/distinct based on values from a dictionary e.g. `TRUEPREDICATE SORT(meta['age'])`. ([realm/realm-core#5311](https://github.com/realm/realm-core/pull/5311))
* Exposed `SyncError.logUrl` which contains the URL to the server log related to the sync error. ([#5609](https://github.com/realm/realm-js/issues/5609))
* Performance improvement for the following queries ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376)):
  * Significant (~75%) improvement when counting (`Realm.Results#length`) the number of exact matches (with no other query conditions) on a `string`/`int`/`uuid`/`objectId` property that has an index. This improvement will be especially noticeable if there are a large number of results returned (duplicate values).
  * Significant (~99%) improvement when querying for an exact match on a `date` property that has an index.
  * Significant (~99%) improvement when querying for a case insensitive match on a `mixed` property that has an index.
  * Moderate (~25%) improvement when querying for an exact match on a `bool` property that has an index.
  * Small (~5%) improvement when querying for a case insensitive match on a `mixed` property that does not have an index.
* Added a `THROW_ON_GLOBAL_REALM` which will enable throwing when the app is accessing the `Realm` without first importing it from the Realm package.


### Fixed
* Fix broken spread operator. ([#2844](https://github.com/realm/realm-js/issues/2844), since v6.0.0)
* Fix issues with `yarn` and the `bson` dependency. ([#6040](https://github.com/realm/realm-js/issues/6040))
* Report helpful errors if the `realm` binary is missing and provide guidance in the `README.md`. ([#5981](https://github.com/realm/realm-js/issues/6040))
* Fixed crashes on refresh of the React Native application. ([#5904](https://github.com/realm/realm-js/issues/5904), since v11.7.0)
* Fixed applying `UpdateMode` recursively to all objects when passed to `Realm.create()`. ([#5933](https://github.com/realm/realm-js/issues/5933))
* Fix a stack overflow crash when using the query parser with long chains of AND/OR conditions. ([realm/realm-core#6428](https://github.com/realm/realm-core/pull/6428), since v10.11.0)
* Fixed an issue that could have resulted in a client reset action being reported as successful when it actually failed on windows if the `Realm` was still open ([realm/realm-core#6050](https://github.com/realm/realm-core/issues/6050)).
* Fix a data race that could cause a reading thread to read from a no-longer-valid memory mapping ([realm/realm-core#6411](https://github.com/realm/realm-core/pull/6411), since v11.3.0-rc.0).
* Added missing implementation of `User.state` and changed the `UserState` enum values to use pascal case to conform to the v11 implementation (except for `UserState.Active` that we now deprecate in favor of `UserState.LoggedIn`). ([#5686](https://github.com/realm/realm-js/issues/5686))
* Fixed `App.currentUser()` when being called on a new instance of `App` ([#5790](https://github.com/realm/realm-js/pull/5790))
* Fixed an error where performing a query like "{1, 2, 3, ...} IN list" where the array is longer than 8 and all elements are smaller than some values in list, the program would crash. ([realm/realm-core#6545](https://github.com/realm/realm-core/pull/6545), since v10.20.0)
* Performing a large number of queries without ever performing a write resulted in steadily increasing memory usage, some of which was never fully freed due to an unbounded cache. ([realm/realm-core#6530](https://github.com/realm/realm-core/pull/6530), since v10.19.0)
* Partition-Based to Flexible Sync Migration for migrating a client app that uses partition based sync to use flexible sync under the hood if the server has been migrated to flexible sync is officially supported with this release. Any clients using an older version of Realm will receive a "switch to flexible sync" error message when trying to sync with the app. ([realm/realm-core#6554](https://github.com/realm/realm-core/issues/6554), since v11.9.0)
* Fix deprecated namespace method warning when building for Android ([#5646](https://github.com/realm/realm-js/issues/5646))
* Fixed a potential crash when opening the realm after failing to download a fresh FLX realm during an automatic client reset. ([realm/realm-core#6494](https://github.com/realm/realm-core/issues/6494), since v10.19.5)
* Changing parameters for a query after initialization could lead to a crash. ([realm/realm-core#6674](https://github.com/realm/realm-core/pull/6674), since v10.20.0)
* Querying with object list arguments now works as expected. ([realm/realm-core#6688](https://github.com/realm/realm-core/pull/6688), since v10.3.3)
* Fixed a crash when querying a `mixed` property with a string operator (`contains`/`like`/`beginswith`/`endswith`) or with case insensitivity. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376, since v10.5.0)
* Querying for equality of a string on an indexed `mixed` property was returning case insensitive matches. For example querying for `myIndexedMixed == "Foo"` would incorrectly match on values of `"foo"` or `"FOO"`. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* Adding an index to a `mixed` property on a non-empty class/objectType would crash with an assertion. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* `Realm.App.Sync#pause()` could hold a reference to the database open after shutting down the sync session, preventing users from being able to delete the Realm. ([realm/realm-core#6372](https://github.com/realm/realm-core/issues/6372), since v11.5.0)
* Fixed a bug that may have resulted in `Realm.Results` and `Realm.List` being in different orders on different devices. Moreover, some cases of the error message `Invalid prior_size` may have be fixed too. ([realm/realm-core#6191](https://github.com/realm/realm-core/issues/6191), since v10.15.0)
* Exposed `Sync` as named export. [#5649](https://github.com/realm/realm-js/issues/5649)
* Fixed the return value of `App.allUsers` to return a record with the `User.id` as the key and the `User` as the value. [#5671](https://github.com/realm/realm-js/issues/5671)
* Running a query on `@keys` in a Dictionary would throw an exception. ([realm/realm-core#6831](https://github.com/realm/realm-core/issues/6831), since v12.0.0-rc.3)
* Testing the size of a collection of links against zero would sometimes fail. ([realm/realm-core#6850](https://github.com/realm/realm-core/issues/6850), since v12.0.0-rc.3)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v13.17.2.
* Re-implemented the entire SDK leveraging code generation for the binding between NAPI / JSI and Realm Core.
* Aligning analytics with other Realm SDKs. You can still disable the submission by setting environment variable `REALM_DISABLE_ANALYTICS`, and you can print out what is submitted by setting the environment variable `REALM_PRINT_ANALYTICS`.
* Enabling sync session multiplexing by default in the SDK. ([#5831](https://github.com/realm/realm-js/pull/5831) & [#5912](https://github.com/realm/realm-js/pull/5912))
* Fix types in integration tests and added type checking to the lint command.
* Upgraded Realm Core from v13.17.1 to v13.17.2

## 12.0.0-rc.3 (2023-08-03)

### Fixed
* Fix Jest issues when testing against Realm. ([#6003](https://github.com/realm/realm-js/issues/6003))
* Fix Date and ObjectId arguments being empty objects in MongoDB client. ([#6030](https://github.com/realm/realm-js/issues/6030))
* Rare corruption of files on streaming format (often following compact, convert or copying to a new file). ([#6807](https://github.com/realm/realm-core/issues/6807), since realm-core v12.12.0)
* Trying to search a full-text indexes created as a result of an additive schema change (i.e. applying the differences between the local schema and a synchronized realm's schema) could have resulted in an IllegalOperation error with the error code Column has no fulltext index. (PR [#6823](https://github.com/realm/realm-core/issues/6823), since realm-core v13.2.0).
* Sync progress for DOWNLOAD messages from server state was updated wrongly. This may have resulted in an extra round-trip to the server. ([#6827](https://github.com/realm/realm-core/issues/6827), since realm-core v12.9.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
Using Realm Core from v13.15.1 to v13.17.1

## 12.0.0-rc.2 (2023-07-14)

### Fixed
* Fixed updating helpers (the `ClassMap`) used by `Realm` before notifying schema change listeners when the schema is changed during runtime. ([#5574](https://github.com/realm/realm-js/issues/5574))
* Fixed crashes on refresh of the React Native application. ([#5904](https://github.com/realm/realm-js/issues/5904))
* Fixed applying `UpdateMode` recursively to all objects when passed to `Realm.create()`. ([#5933](https://github.com/realm/realm-js/issues/5933))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Installation failed due to missing dependency (`fs-extra`), and the post-install script has been refactored to use `fs` instead.

## 12.0.0-rc.1 (2023-06-30)

### Fixed
* Include CJS index files in the packaged source for Realm. ([#5893](https://github.com/realm/realm-js/issues/5893))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

## 12.0.0-rc.0 (2023-06-29)

### Breaking changes
* Now exporting only as CommonJS, to align with the way we exported from v11 in an attempt to keep breakage across the major version to an absolute minimum. This is a breaking change compared to the previous pre-releases of v12, since users have to update code which is doing named import of `Realm` to use default or `* as Realm` imports of the `Realm` constructor. ([#5882](https://github.com/realm/realm-js/pull/5882))
* `SyncSession` JS objects no longer keep their associated C++ objects, and therefore the sync network connection, alive. This was causing issues because JS garbage collection is lazy so the `SyncSession` may survive much longer than the last reference held to it. We now use the same technique as v11 to avoid keeping the C++ object alive (`std::weak_ptr`). ([#5815](https://github.com/realm/realm-js/pull/5815), since v12.0.0-alpha.0)
  * Breaking change: On v11, if the C++ object had been destroyed already, we would often return `undefined` or some other default value when calling methods or accessing properties on the JS `SyncSession` object, even if that would violate our declared TS types. Now, in v12, we will throw from all methods and property accessors in this case.

### Deprecations
* Deprecated the `SubscriptionsState` enum (will be removed in v13) in favor of the now-named `SubscriptionSetState`. ([#5773](https://github.com/realm/realm-js/issues/5773))
* Removed deprecation of the `Realm` namespace, to align with v11 and ease the adoption of this major version. ([#5883](https://github.com/realm/realm-js/pull/5883))

### Enhancements
* Opening a Realm with invalid schemas will throw a `SchemaParseError` (or one of its subtypes `ObjectSchemaParseError` and `PropertySchemaParseError`) rather than an `AssertionError` or `Error`. ([#5198](https://github.com/realm/realm-js/issues/5198))
* Enable multiple processes to operate on an encrypted Realm simultaneously. ([realm/realm-core#1845](https://github.com/realm/realm-core/issues/1845))
* Added `Realm.setLogger`, that allows to setup a single static logger for the duration of the app lifetime. Differently from the now deprecated sync logger (that was setup with `Sync.setLogger`), this new one will emit messages coming also from the local database, and not only from sync. It is also possible to change the log level during the whole duration of the app lifetime with `Realm.setLogLevel`. ([#2546](https://github.com/realm/realm-js/issues/2546))
* Added support for a sync configuration option to provide an `SSLConfiguration` with a custom function for validating the server's SSL certificate. ([#5485](https://github.com/realm/realm-js/issues/5485))
* Improve performance of equality queries on a non-indexed mixed property by about 30%. ([realm/realm-core#6506](https://github.com/realm/realm-core/pull/6506))
* Improve performance of rolling back write transactions after making changes.  ([realm/realm-core#6513](https://github.com/realm/realm-core/pull/6513))
* Extended `PropertySchema.indexed` with the `full-text` option, that allows to create an index for full-text search queries.  ([#5755](https://github.com/realm/realm-js/issues/5755))
* Access token refresh for websockets was not updating the location metadata. ([realm/realm-core#6630](https://github.com/realm/realm-core/issues/6630), since v11.9.0)
* Fix several UBSan failures which did not appear to result in functional bugs. ([realm/realm-core#6649](https://github.com/realm/realm-core/pull/6649)).
* Using both synchronous and asynchronous transactions on the same thread or scheduler could hit an assertion failure if one of the callbacks for an asynchronous transaction happened to be scheduled during a synchronous transaction ([realm/realm-core#6659](https://github.com/realm/realm-core/pull/6649), since v10.12.0)
* Added APIs to facilitate adding and removing subscriptions. ([#5772](https://github.com/realm/realm-js/pull/5772))
  * Experimental APIs: Enabled subscribing and unsubscribing directly to and from a `Results` instance via `Results.subscribe()` (asynchronous) and `Results.unsubscribe()` (synchronous).
    * Added a `WaitForSync` enum specifying whether to wait or not wait for subscribed objects to be downloaded before resolving the promise returned from `Results.subscribe()`.
    * Extended `SubscriptionOptions` to take a `WaitForSync` behavior and a maximum waiting timeout before returning from `Results.subscribe()`.
  * Added the instance method `MutableSubscriptionSet.removeUnnamed()` for removing only unnamed subscriptions.
  ```javascript
  const peopleOver20 = await realm
    .objects("Person")
    .filtered("age > 20")
    .subscribe({
      name: "peopleOver20",
      behavior: WaitForSync.FirstTime, // Default
      timeout: 2000,
    });
  // ...
  peopleOver20.unsubscribe();
  ```

* Added initial support for geospatial queries, with the possibility of querying points. No new data type has been added in this phase, but every embedded object property that conforms to `CanonicalGeoPoint` can be queried. ([#5850](https://github.com/realm/realm-js/pull/5850))
  * The queries can be used to filter objects whose points lie within a certain area following spherical geometry, using the `geoWithin` operator in the query string to `Results.filtered()`.
  * The following shapes are supported in geospatial queries: circle (`GeoCircle` type, defined by its center and radius in radians), box (`GeoBox` type, defined by its bottom left and upper right corners) and polygon (`GeoPolygon` type, defined by its vertices).
  * Additionally, two new functions have been added, `kmToRadians()` and `miToRadians()`, that can be used to convert kilometers and miles to radians respectively, simplifying conversion of a circle's radius.
  ```typescript
  import Realm, {
    ObjectSchema,
    GeoCircle,
    CanonicalGeoPoint,
    GeoPosition,
    kmToRadians,
  } from "realm";

  // Example of a user-defined point class that can be queried using geospatial queries
  class MyGeoPoint extends Realm.Object implements CanonicalGeoPoint {
    coordinates!: GeoPosition;
    type = "Point" as const;

    static schema: ObjectSchema = {
      name: "MyGeoPoint",
      embedded: true,
      properties: {
        type: "string",
        coordinates: "double[]",
      },
    };
  }

  class PointOfInterest extends Realm.Object {
    name!: string;
    location!: MyGeoPoint;

    static schema: ObjectSchema = {
      name: "PointOfInterest",
      properties: {
        name: "string",
        location: "MyGeoPoint",
      },
    };
  }

  realm.write(() => {
    realm.create(PointOfInterest, {
      name: "Copenhagen",
      location: {
        coordinates: [12.558892784045568, 55.66717839648401],
        type: "Point",
      } as MyGeoPoint
    });
    realm.create(PointOfInterest, {
      name: "New York",
      location: {
        coordinates: [-73.92474936213434, 40.700090994927415],
        type: "Point",
      } as MyGeoPoint
    });
  });

  const pois = realm.objects(PointOfInterest);

  const berlinCoordinates: GeoPoint = [13.397255909303222, 52.51174463251085];
  const radius = kmToRadians(500); //500 km = 0.0783932519 rad

  // Circle with a radius of 500kms centered in Berlin
  const circleShape: GeoCircle = {
    center: berlinCoordinates,
    distance: radius,
  };

  // All points of interest in a 500kms radius from Berlin
  let result = pois.filtered("location geoWithin $0", circleShape);

  // Equivalent string query without arguments
  result = pois.filtered("location geoWithin geoCircle([13.397255909303222, 52.51174463251085], 0.0783932519)");
  ```
* Support sort/distinct based on values from a dictionary e.g. `TRUEPREDICATE SORT(meta['age'])`. ([realm/realm-core#5311](https://github.com/realm/realm-core/pull/5311))
* Support for HTTP proxy settings in the Realm configuration by adding `proxyConfig` to the sync configuration. You can continue to use environment variable `HTTPS_PROXY`. HTTP proxies are only supported for node.js and Electron. ([#5816](https://github.com/realm/realm-js/issues/5816))
```javascript
proxyConfig: {
  address: "127.0.0.1",
  port: 9876,
  type: ProxyType.HTTP,
}
```

### Fixed
* Fix a stack overflow crash when using the query parser with long chains of AND/OR conditions. ([realm/realm-core#6428](https://github.com/realm/realm-core/pull/6428), since v10.11.0)
* Fixed an issue that could have resulted in a client reset action being reported as successful when it actually failed on windows if the `Realm` was still open ([realm/realm-core#6050](https://github.com/realm/realm-core/issues/6050)).
* Fix a data race that could cause a reading thread to read from a no-longer-valid memory mapping ([realm/realm-core#6411](https://github.com/realm/realm-core/pull/6411), since v11.3.0-rc.0).
* Fixed an issue that could cause a crash when performing count() on an undefined query. ([realm/realm-core#6443](https://github.com/realm/realm-core/issues/6443), since v12.0.0-alpha.2)
* Added missing implementation of `User.state` and changed the `UserState` enum values to use pascal case to conform to the v11 implementation (except for `UserState.Active` that we now deprecate in favor of `UserState.LoggedIn`). ([#5686](https://github.com/realm/realm-js/issues/5686))
* Getting the `indexOf` a missing value will no longer return `4294967295` instead of `-1` and the `Set#has` will no longer return `true` when missing. Caused by an incorrect conversion of `size_t` to `Number` on x86 (32bit) architectures. ([#5746](https://github.com/realm/realm-js/pull/5746), since 12.0.0-alpha.0)
* Fixed `App.currentUser()` when being called on a new instance of `App` ([#5790](https://github.com/realm/realm-js/pull/5790))
* Fixed an error where performing a query like "{1, 2, 3, ...} IN list" where the array is longer than 8 and all elements are smaller than some values in list, the program would crash. ([realm/realm-core#6545](https://github.com/realm/realm-core/pull/6545), since v10.20.0)
* Performing a large number of queries without ever performing a write resulted in steadily increasing memory usage, some of which was never fully freed due to an unbounded cache. ([realm/realm-core#6530](https://github.com/realm/realm-core/pull/6530), since v10.19.0)
* Partition-Based to Flexible Sync Migration for migrating a client app that uses partition based sync to use flexible sync under the hood if the server has been migrated to flexible sync is officially supported with this release. Any clients using an older version of Realm will receive a "switch to flexible sync" error message when trying to sync with the app. ([realm/realm-core#6554](https://github.com/realm/realm-core/issues/6554), since v11.9.0)
* Fix deprecated namespace method warning when building for Android ([#5646](https://github.com/realm/realm-js/issues/5646))
* Fixed a potential crash when opening the realm after failing to download a fresh FLX realm during an automatic client reset. ([realm/realm-core#6494](https://github.com/realm/realm-core/issues/6494), since v10.19.5)
* Changing parameters for a query after initialization could lead to a crash. ([realm/realm-core#6674](https://github.com/realm/realm-core/pull/6674), since v10.20.0)
* Querying with object list arguments now works as expected. ([realm/realm-core#6688](https://github.com/realm/realm-core/pull/6688), since v10.3.3)
* Fixed a crash when session multiplexing was enabled, caused by a use-after-free in SessionWrapper when tearing down sessions. ([realm/realm-core#6656](https://github.com/realm/realm-core/pull/6656), since v13.9.3)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).
* Lock file format: New format introduced for multiprocess encryption. All processes accessing the file must be upgraded to the new format.

### Internal
* Upgraded Realm Core from v13.8.0 to v13.10.1. ([#5739](https://github.com/realm/realm-js/pull/5739) & [#5796](https://github.com/realm/realm-js/pull/5796))
* Upgraded React Native from 0.71.4 to 0.71.7. ([#5761](https://github.com/realm/realm-js/pull/5761))
* Upgraded Realm Core from v13.10.1 to v13.11.0. ([#5811](https://github.com/realm/realm-js/issues/5811))
* Bump sync protocol to v9 to indicate client has fix for client reset error during async open. ([realm/realm-core#6609](https://github.com/realm/realm-core/issues/6609))
* Aligning analytics with other Realm SDKs. You can still disable the submission by setting environment variable `REALM_DISABLE_ANALYTICS`, and you can print out what is submitted by setting the environment variable `REALM_PRINT_ANALYTICS`.
* Enabling sync session multiplexing by default in the SDK. ([#5831](https://github.com/realm/realm-js/pull/5831) & [#5912](https://github.com/realm/realm-js/pull/5912))
* Applied use of an opt-in list for Bindgen. ([#5820](https://github.com/realm/realm-js/pull/5820))
* Upgraded Realm Core from v13.11.1 to v13.15.1. ([#5873](https://github.com/realm/realm-js/pull/5873) & [#5909](https://github.com/realm/realm-js/pull/5909))

## 12.0.0-alpha.2 (2023-04-05)

### Enhancements
* Added support for building with the new React Native architecture enabled on Android. Thanks to
Nikolai Samorodov / [@zabutok](https://github.com/zabutok) for contributing the fix. ([#5032](https://github.com/realm/realm-js/issues/5032))
* Exposed `SyncError.logUrl` which contains the URL to the server log related to the sync error. ([#5609](https://github.com/realm/realm-js/issues/5609))
* Added a new error class `CompensatingWriteError` which indicates that one or more object changes have been reverted by the server.
This can happen when the client creates/updates objects that do not match any subscription, or performs writes on an object it didn't have permission to access. ([#5599](https://github.com/realm/realm-js/pull/5599))
* Performance improvement for the following queries ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376)):
  * Significant (~75%) improvement when counting (`Realm.Results#length`) the number of exact matches (with no other query conditions) on a `string`/`int`/`uuid`/`objectId` property that has an index. This improvement will be especially noticeable if there are a large number of results returned (duplicate values).
  * Significant (~99%) improvement when querying for an exact match on a `date` property that has an index.
  * Significant (~99%) improvement when querying for a case insensitive match on a `mixed` property that has an index.
  * Moderate (~25%) improvement when querying for an exact match on a `bool` property that has an index.
  * Small (~5%) improvement when querying for a case insensitive match on a `mixed` property that does not have an index.
* Added a `THROW_ON_GLOBAL_REALM` which will enable throwing when the app is accessing the `Realm` without first importing it from the Realm package.

### Fixed
* Fixed bootstrapping the native module on Android. Seen as Exception in HostObject::get for prop 'Realm': java.lang.NoClassDefFoundError: io.realm.react.RealmReactModule. ([#5666](https://github.com/realm/realm-js/issues/5666), since v12.0.0-alpha.0)
* Fixed passing RealmObject instances between shared Realms. ([#5634](https://github.com/realm/realm-js/pull/5634), since v12.0.0-alpha.0)
* Fixed a crash when querying a `mixed` property with a string operator (`contains`/`like`/`beginswith`/`endswith`) or with case insensitivity. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376, since v10.5.0)
* Querying for equality of a string on an indexed `mixed` property was returning case insensitive matches. For example querying for `myIndexedMixed == "Foo"` would incorrectly match on values of `"foo"` or `"FOO"`. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* Adding an index to a `mixed` property on a non-empty class/objectType would crash with an assertion. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* `Realm.App.Sync#pause()` could hold a reference to the database open after shutting down the sync session, preventing users from being able to delete the Realm. ([realm/realm-core#6372](https://github.com/realm/realm-core/issues/6372), since v11.5.0)
* Fixed a bug that may have resulted in `Realm.Results` and `Realm.List` being in different orders on different devices. Moreover, some cases of the error message `Invalid prior_size` may have be fixed too. ([realm/realm-core#6191](https://github.com/realm/realm-core/issues/6191), since v10.15.0)
* Exposed `Sync` as named export. [#5649](https://github.com/realm/realm-js/issues/5649)
* Fixed the return value of `App.allUsers` to return a record with the `User.id` as the key and the `User` as the value. [#5671](https://github.com/realm/realm-js/issues/5671)

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Enabled all tests from v11 and fixed all remaining failures. ([#5595](https://github.com/realm/realm-js/pull/5595))
* Fixed linting issues and running linting on CI.
* Upgraded Realm Core from v13.6.0 to v13.8.0. ([#5638](https://github.com/realm/realm-js/pull/5638))
* Build iOS prebuilt binaries in release mode by default. ([#5709](https://github.com/realm/realm-js/pull/5709))

## 12.0.0-alpha.1 (2023-03-22)

This is a pre-release of the next major version of our SDK.
Please read more and discuss in the dedicated discussion: https://github.com/realm/realm-js/discussions/5416
See the release notes of previous pre-releases below for a complete picture of the changes introduced since v11.

### Fixed
* Importing using `require` from Node.js would throw because it would accidentally import the ESM bundle. ([#5607](https://github.com/realm/realm-js/issues/5607), since v12.0.0-alpha.0)


### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

## 12.0.0-alpha.0 (2023-03-21)

This is the first pre-release of the next major version of our SDK.
Please read more and discuss in the dedicated discussion: https://github.com/realm/realm-js/discussions/5416

### Breaking changes

Although this is a complete rewrite of our SDK, we've strived to keep breakages to a minimum and expect our users to upgrade from v11 without any significant changes to their code-base.

* In an effort to align with EcmaScript modules, we’re adopting a pattern of named exports on the "root" of the package namespace. This change also affects how our library is imported on CommonJS / Node.js: Before, we exported our constructor directly from the package (`module.export = Realm` style), which would allow CommonJS runtimes like Node.js to import us using a simple assignment:
```javascript
const Realm = require("realm"); // this commonjs style - won’t work anymore
```

From now on, users need to consume us using a named import, like this:

```javascript
const { Realm } = require("realm"); // commonjs style

import { Realm } from "realm"; // esm style
import * as realm from "realm"; // esm namespaced style for more explicit usage like realm.List and realm.Object
import Realm from "realm"; // esm style - consuming our "default" export
```
* Similarly we’re deprecating our namespaced API (the long chaining of identifiers, such as Realm.App.Sync.setLogLevel) in favor of the shorter named exports. Our main motivation is that it has proven very verbose and hard to maintain in our new SDK. Also, since the inception of the Realm JS API (which predates ES Modules), we believe the community has moved towards a preference for simple named exports. We would love your feedback on this decision - please comment on [the discussion](https://github.com/realm/realm-js/discussions/5416) for the v12 release.
* The entire BSON package used to be re-exported as Realm.BSON, to simplify the new SDK we want to export only the BSON types that our SDK database component supports (ObjectId, Decimal128 and UUID). See [#4934](https://github.com/realm/realm-js/issues/4934).
* We're now reusing code to perform assertions and although this is strictly not a breaking change, since we haven't historically documented error messages, you should probably revisit any code in your app which relies on matching on specific error messages.
* `Results`, `List` and `Set` used to inherit directly from `Collection` but now inherits from an abstract `OrderedCollection`, which extends `Collection`.
* In order to better guide users toward correct usage and understanding of the Realm property types, users must now be explicit about the property type when declaring object schemas. Additionally, mixing shorthand (string) and object representation for the property type is no longer permitted. (See the `PropertySchema` and `PropertySchemaShorthand` types.)
```javascript
// Example object schema
const TaskSchema = {
  name: "Task",
  properties: {
    description: /* property schema (shorthand or object form) */,
  },
};

// Explicitness
"[]"          // Bad (previously parsed as implicit "mixed")
"mixed[]"     // Good

{ type: "list" }                              // Bad
{ type: "list", objectType: "mixed" }         // Good

// Mixing shorthand and object form
{ type: "int[]" }                             // Bad
"int[]"                                       // Good
{ type: "list", objectType: "int" }           // Good

{ type: "int?" }                              // Bad
"int?"                                        // Good
{ type: "int", optional: true }               // Good

// Specifying object types
{ type: "SomeType" }                          // Bad
"SomeType"                                    // Good
{ type: "object", objectType: "SomeType" }    // Good

{ type: "object[]", objectType: "SomeType" }  // Bad
"SomeType[]"                                  // Good
{ type: "list", objectType: "SomeType" }      // Good

{ type: "linkingObjects", objectType: "SomeType", property: "someProperty" } // Good
```
* To prevent modifying end-users' class-based model classes, we’re now wrapping class-based models in our own model. Objects will still pass `instanceof SomeClass` checks, however, code which is directly using prototype or constructor comparisons will fail:
```javascript
Object.getPrototypeOf(object) == CustomObject.prototype // No longer works
object.constructor == CustomObject // No longer works
```
* Symbols used to be accepted as keys in a dictionary, where they were coerced to strings prior to performing lookup. This was undocumented behaviour that makes little sense in practice (and arguably defeats the main purpose of the JS `Symbol` type). In the new SDK, using a Symbol as a key in a dictionary will throw.
* As a part of migrating to NAPI (since ~ v6), we saw no performant way to support getting property names of a Realm.Object via the standard Object.keys(obj). As a side-effect we stopped supporting the object spread operator `{...obj}` and introduced `Realm.Object#keys()`, `Realm.Object#entries()` and `Realm.Object#toJSON()` methods were introduced as a workaround. The new SDK wraps its accessor objects in a Proxy trapping the ownKeys operation which enables calls to the standard `Object.keys(obj)` and the spread operator `{...obj}` to work correctly, with minimal performance impact on normal accesses. Therefore, we are deprecating the APIs with the @deprecation annotation and a `console.warn` when calling RealmObject#keys() and RealmObject#entries(). RealmObject#toJSON still serves the purpose of producing a circularly referencing object graph. We would love the community's feedback on this!
* The [push service](https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/) has already been deprecated on the Atlas server. We've deprecated this on v11 and removed it from v12.
* We’ve decided to remove numeric indexing and “array methods” from the SubscriptionSet, since (a) the team saw little actual use-case for it, (b) it would bloat our SDK code, and (c) there is a simple workaround if needed (spreading into an array `[...realm.subscriptions]`). (The property `length` is available.) Again, something we would love feedback on.
* No longer exporting the `ObjectPropsType`, `UserMap`, `UserType`, `BaseFunctionsFactory`, `AuthProviders`, `PropertyType`, `HTTP`, `*Details` interfaces of the `EmailPasswordAuthClient` and `AuthError` types, since they weren't  used internally and not expected to be used by users. Moreover, most of these are very simple to type out for any user relying on it. Similarly, the `DictionaryBase` type was introduced to help work around an issue (declaring string index accessors on a class with methods) in our declarations. We consider it an internal detail that got introduced as part of our public API by accident; thus, we ask users to use the `Dictionary` type directly. We also decided to rename the `Session` class to `SyncSession` since it’s now exported directly on the package namespace. `Session` will still be available (but deprecated) as `Realm.Sync.Session`. We’re no longer using the `*Payload` types (they were only used by Realm Web) and we don’t expect end-users to be relying directly on these, hence they will be deleted.
* The return values of Object#getPropertyType was changed to return `"list"` instead of `"array"`.

### Enhancements
* The new SDK supports operations like `Object.keys(obj)` and the spread operator `{...obj}` on `RealmObject`s. We still recommend explicitly only accessing the fields you need rather than using spreads. Spreads eagerly access all fields in the object, which can have significant performance costs if some fields are not actually needed. ([#1299](https://github.com/realm/realm-js/issues/1299), [#2640](https://github.com/realm/realm-js/issues/2640), [#2844](https://github.com/realm/realm-js/issues/2844))
* Added configuration option `SyncConfiguration.cancelWaitsOnNonFatalError`, which defaults to false. When set to true, all async operations (such as opening the Realm using `Realm.open()`) will fail when a non-fatal error, such as a timeout, occurs.
* Added an overload to `Object.linkingObjects` method that takes type of the linking object as an input instead of its string name ([#5326](https://github.com/realm/realm-js/issues/5326))
Example usage:
```typescript
let linkedObjects = john.linkingObjects(Person, "friends");
```
* Added an overload to `Dictionary.set` method that takes two arguments, a `key` and a `value`. ([#4286](https://github.com/realm/realm-js/issues/4286))
Example usage:
```typescript
realm.write(() => {
  item.dictionary.set("key", "value");
});
```
* Added 3 new methods on lists ([#3324](https://github.com/realm/realm-js/issues/3324)):
  * `list.remove(index)`: removes the element of the list at the specified index.
  * `list.move(from, to)`: moves one element of the list from one index to another.
  * `list.swap(index1, index2)`: swaps the positions of the elements of the list at two indexes.

### Fixed
* None

### Compatibility
* React Native >= v0.71.4
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Re-implemented the entire SDK leveraging code generation for the binding between NAPI / JSI and Realm Core.
* Renamed our `master` branch to `main`.
