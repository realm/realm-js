## 11.10.2 (2023-08-09)

### Fixed
* Add missing enums for `OpenRealmTimeOutBehavior`.
* Querying with object list arguments does not work. ([realm/realm-core#6688](https://github.com/realm/realm-core/issues/6688), since v10.3.0-rc.1)
* Searching for objects in Results would not always find the requested item. ([realm/realm-core#6695](https://github.com/realm/realm-core/issues/6695), since v10.0.0)
* Rare corruption of files on streaming format (often following compact, convert or copying to a new file). ([realm/realm-core#6807](https://github.com/realm/realm-core/pull/6807), since v11.2.0)
* Sync progress for DOWNLOAD messages from server state was updated wrongly. This may have resulted in an extra round-trip to the server. ([realm/realm-core#6827](https://github.com/realm/realm-core/issues/6827), since v10.22.0)

### Compatibility
* React Native >= v0.71.3
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.14.0 to v13.17.1.

## 11.10.1 (2023-06-16)

### Fixed
* Fixed incorrect Linux build (x86_64) for older Linux distributions, and loading the binary will fail with `Error: /lib64/libc.so.6: version 'GLIBC_2.34' not found`.

### Compatibility
* React Native >= v0.71.3
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v13.14.0.

## 11.10.0 (2023-06-15)

### Enhancements
* Support sort/distinct based on values from a dictionary e.g. `TRUEPREDICATE SORT(meta['age'])`. ([realm/realm-core#5311](https://github.com/realm/realm-core/pull/5311))

### Fixed
* Partition-Based to Flexible Sync Migration for migrating a client app that uses partition based sync to use flexible sync under the hood if the server has been migrated to flexible sync is officially supported with this release. Any clients using an older version of Realm will receive a "switch to flexible sync" error message when trying to sync with the app. ([realm/realm-core#6554](https://github.com/realm/realm-core/issues/6554), since v11.9.0)
* Calling `snapshot()` on a Realm list of primitive types is not supported and now throws.
* Fixed a potential crash when opening the realm after failing to download a fresh FLX realm during an automatic client reset. ([realm/realm-core#6494](https://github.com/realm/realm-core/issues/6494), since v10.19.5)
* Changing parameters for a query after initialization could lead to a crash. ([realm/realm-core#6674](https://github.com/realm/realm-core/pull/6674), since v10.20.0)
*
### Compatibility
* React Native >= v0.71.3
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.10.1 to v13.14.0. ([#5811](https://github.com/realm/realm-js/issues/5811), [#5833](https://github.com/realm/realm-js/issues/5833), and [#5868](https://github.com/realm/realm-js/issues/5868))
* Bump sync protocol to v9 to indicate client has fix for client reset error during async open. ([realm/realm-core#6609](https://github.com/realm/realm-core/issues/6609))
* The sync client's user agent has been changed and has now the form `RealmJS/<sdk version> (<osname> <sysname> <release> <version> <machine>)` where
  * `sdk version` is the version of Realm JavaScript
  * `osname` equivalent to `uname -o`
  * `sysname` equivalent to `uname -s`
  * `release` equivalent to `uname -r`
  * `version` equivalent to `uname -v`
  * `machine` equivalent to `uname -m`
* Aligning analytics with other Realm SDKs. You can still disable the submission by setting environment variable `REALM_DISABLE_ANALYTICS`, and you can print out what is submitted by setting the environment variable `REALM_PRINT_ANALYTICS`.
  
## 11.9.0 (2023-05-11)

### Enhancements
* Improve performance of equality queries on a non-indexed mixed property by about 30%. ([realm/realm-core#6506](https://github.com/realm/realm-core/issues/6506))
* PBS to FLX Migration for migrating a client app that uses partition based sync to use flexible sync under the hood if the server has been migrated to flexible sync. ([realm/realm-core#6554](https://github.com/realm/realm-core/issues/6554))
* New notifiers can now be registered in write transactions until changes have actually been made in the write transaction. This makes it so that new notifications can be registered inside change notifications triggered by beginning a write transaction (unless a previous callback performed writes). ([realm/realm-core#6560](https://github.com/realm/realm-core/p
ull/6560))

### Fixed
* If session multiplexing was enabled in the sync client and multiple realms for multiple users were being synchronized, a connection authenticated for the wrong user could have been used, resulting in a `UserMismatch` error from the server. ([realm/realm-core#6320](https://github.com/realm/realm-core/pull/6320), since v10.0.0).
* If session multiplexing was enabled and an automatic client reset failed, it could cause all sessions to fail with a fatal ProtocolError rather than just the session that failed to client reset. This would mean that no other sync session would be able to be opened for up to an hour without restarting the app. ([realm/realm-core#6320](https://github.com/realm
/realm-core/pull/6320), since v10.10.0)
* Performing a query like `{1, 2, 3, ...} IN list` where the array is longer than 8 and all elements are smaller than some values in list, the app would crash. ([realm/realm-core#1183](https://github.com/realm/realm-kotlin/issues/1183), since v10.20.0)
* Performing a large number of queries without ever performing a write resulted in steadily increasing memory usage, some of which was never fully freed due to an unbounded cache. ([realm/realm-swift#7978](https://github.com/realm/realm-swift/issues/7978), since v10.19.0)

### Compatibility
* React Native >= v0.71.0
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.9.0 to v13.10.1. ([#5784](https://github.com/realm/realm-js/issues/5784) and [#5793](https://github.com/realm/realm-js/issues/5793))
* Bump the sync protocol version to v8. ([realm/realm-core#6549](https://github.com/realm/realm-core/pull/6549))

## 11.8.0 (2023-04-12)
NOTE: Since the file format of the Realm auxiliary files have been changed, it is required to use Realm Studio v14.0.0 to open Realm files produced by this release.

### Enhancements
* Enable multiple processes to operate on an encrypted Realm simultaneously. ([realm/realm-core#1845](https://github.com/realm/realm-core/issues/1845))

### Fixed
* Fix a stack overflow crash when using the query parser with long chains of AND/OR conditions. ([realm/realm-core#6428](https://github.com/realm/realm-core/pull/6428), since v10.11.0)

### Compatibility
* React Native >= v0.71.0
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.8.0 to v13.9.0. ([#5720](https://github.com/realm/realm-js/issues/5720))
* Turning off the new Realm Core logger. A better solution will be provided in version 12.
* Tagging on the release branch early to ensure the tag ends on the correct branch. ([#5674](https://github.com/realm/realm-js/issues/5674))

## 11.7.0 (2023-03-26)

### Deprecations
* `Realm.App.Configuration#baseFilePath` will be renamed in an upcoming major version. ([#5630](https://github.com/realm/realm-js/issues/5630))

### Enhancements
* Performance improvement for the following queries ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376)):
  * Significant (~75%) improvement when counting (`Realm.Results#length`) the number of exact matches (with no other query conditions) on a `string`/`int`/`uuid`/`objectId` property that has an index. This improvement will be especially noticiable if there are a large number of results returned (duplicate values).
  * Significant (~99%) improvement when querying for an exact match on a `date` property that has an index.
  * Significant (~99%) improvement when querying for a case insensitive match on a `mixed` property that has an index.
  * Moderate (~25%) improvement when querying for an exact match on a `bool` property that has an index.
  * Small (~5%) improvement when querying for a case insensitive match on a `mixed` property that does not have an index.
### Fixed
* Added a missing (internal) method on iOS. Building a React Native app will failed with the error `Undefined symbol: realm::set_default_realm_file_directory(std::__1::basic_string<char, std::__1::char_traits<char>
, std::__1::allocator<char> >)`. ([#5633](https://github.com/realm/realm-js/issues/5633), since v11.6.0)
* Fixed a crash when querying a `mixed` property with a string operator (`contains`/`like`/`beginswith`/`endswith`) or with case insensitivity. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/63
76, since v10.5.0)
* Querying for equality of a string on an indexed `mixed` property was returning case insensitive matches. For example querying for `myIndexedMixed == "Foo"` would incorrectly match on values of `"foo"` or `"FOO"`.
 ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* Adding an index to a `mixed` property on a non-empty class/objectType would crash with an assertion. ([realm/realm-core#6376](https://github.com/realm/realm-core/issues/6376), since v10.5.0)
* `Realm.App.Sync#pause()` could hold a reference to the database open after shutting down the sync session, preventing users from being able to delete the Realm. ([realm/realm-core#6372](https://github.com/realm/r
ealm-core/issues/6372), since v11.5.0)
* Fixed a bug that may have resulted in `Realm.Results` and `Realm.List` being in different orders on different devices. Moreover, some cases of the error message `Invalid prior_size` may have be fixed too. ([realm
/realm-core#6191](https://github.com/realm/realm-core/issues/6191), since v10.15.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.6.0 to v13.8.0. ([#5640](https://github.com/realm/realm-js/issues/5640))

## 11.6.0 (2023-03-23)

### Enhancements
* Added configuration option `App.baseFilePath` which controls where synced Realms and metadata is stored.

### Fixed
* Fix type error when using `realm.create` in combination with class base models. (since v11.0.0)

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* None

## 11.5.2 (2023-03-14)

### Fixed
* Suppress omitting `objcMsgsend` stubs to ensure backward compatibility with Xcode 13. It can be observed as `Undefined symbols for architecture arm64: "_objc_msgSend$allBundles", referenced from: realm::copy_bund
led_realm_files() in librealm-js-ios.a(platform.o)` when using a React Native app for iOS. ([#5511](https://github.com/realm/realm-js/issues/5511), since v11.5.1)
* It is not allowed to specify `deleteRealmIfMigrationIsNeeded` and sync. This can lead to error messages like `Schema validation failed due to the following errors`. ([#5548](https://github.com/realm/realm-js/issu
es/5548), v10.12.0)
* Installation will no longer hang when using Node 19. ([#5136](https://github.com/realm/realm-js/issues/5136), since v10.13.0)
* Fixed enums which was accidentally exported on the `Realm` namespace without a backing implementation. ([#5493](https://github.com/realm/realm-js/pull/5493), since v11.0.0)
* Converting local Realm to synced Realm crashes if an embedded object is null. ([#5389](https://github.com/realm/realm-js/issues/5389), since v10.13.0)
* Fixed performance degradation on subqueries. ([realm/realm-core#6327](https://github.com/realm/realm-core/issues/6327), since v6.0.0)
* Fixed crash if secure transport returns an error with a non-zero length. It can be observed as `Reading failed: Premature end of input` in the log. ([realm/realm-core#5435](https://github.com/realm/realm-core/iss
ues/5435), since v10.0.0)
* Creating subscriptions with queries having Unicode parameters causes a server error e.g., `query from client: "{"Product":"(stringQueryField BEGINSWITH B64\"2KzZhdi52Kpz\" )"}" could not be parsed`. ([realm/realm
-core#6350](https://github.com/realm/realm-core/issues/6350), since v10.11.0)

### Compatibility
* React Native >= v0.71.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.4.2 to v13.6.0. ([#5495](https://github.com/realm/realm-js/issues/5495))
* All exceptions thrown out of Realm Core are now of type `Exception`.

## 11.5.1 (2023-02-26)

### Fixed
* Fixed enums which was accidentally exported on the `Realm` namespace without a backing implementation. ([#5493](https://github.com/realm/realm-js/pull/5493), since v11.0.0)
* Fix regression in connection parameters. ([5252#discussion_r1115071101](https://github.com/realm/realm-js/pull/5252#discussion_r1115071101), since v11.5.0)

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
 Using Realm Core v13.4.2.

## 11.5.1-alpha.0 (2023-02-21)

### Fixed
* None

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v13.4.2.

## 11.5.0 (2023-02-19)

### Deprecations
* The ECMAScript Array APIs (such as `map`, `every`, access using indexing operator `[]`, etc.) on the `SubscriptionSet` types were deprecated.
    * The existing methods will continue to work until the next major version.
    * The following will **not** be removed from `BaseSubscriptionSet`:
        * Being iterable (e.g using `for-of` loop).
        * Being able to spread (e.g. `[...realm.subscriptions]`).

### Enhancements
* Converting flexible sync Realms to bundled and local Realms is now supported. ([realm/realm-core#6076](https://github.com/realm/realm-core/pull/6076))
* For client reset mode `onRecoveryOrDiscard`, the `onDiscard` and `onRecovery` callbacks now have simple default values. ([#5288](https://github.com/realm/realm-js/pull/5288), since v11.1.0)

### Fixed
* Fixed possible segfault in sync client where async callback was using object after being deallocated. ([realm/realm-core#6053](https://github.com/realm/realm-core/issues/6053), since v10.11.0)
* Fixed crash when using client reset with recovery and flexible sync with a single subscription ([#6070](https://github.com/realm/realm-core/issues/6070), since v10.19.5)
* If `path` is defined in the configuration, it will used for synced Realms too. Relative paths will be appended to a default prefix (prefix is computed using app id and user id). Absolute paths are left untouched. (since v10.0.0)
* Fixed a bug related to parsing the client reset configuration. ([#5288](https://github.com/realm/realm-js/pull/5288), since v11.1.0)
* Client reset with recovery or discard local could fail if there were dangling links in lists that got ressurected while the list was being transferred from the fresh Realm. ([realm/realm-core#6292](https://github.com/realm/realm-core/issues/6292), since v10.10.0)
* Sharing Realm files between a Catalyst app and Realm Studio did not properly synchronize access to the Realm file. ([realm/realm-core#6258](https://github.com/realm/realm-core/pull/6258), since v6.1.0)
* When client reset with recovery is used and the recovery does not actually result in any new local commits, the sync client may have gotten stuck in a cycle with a `A fatal error occured during client reset: 'A previous 'Recovery' mode reset from <timestamp> did not succeed, giving up on 'Recovery' mode to prevent a cycle'` error message. ([realm/realm-core#6195](https://github.com/realm/realm-core/issues/6195), since v10.18.0)
* Fixed diverging history in flexible sync if writes occur during bootstrap to objects that just came into view. ([realm/realm-core#5804](https://github.com/realm/realm-core/issues/5804), since v10.11.0)
* If a client reset with recovery or discard local is interrupted while the "fresh" Realm is being downloaded, the sync client may crash with a `MultipleSyncAgents` exception ([realm/realm-core#6217](https://github.com/realm/realm-core/issues/6217), since v10.15.0)
* Online compaction may cause a single commit to take a long time. ([realm/realm-core#6245](https://github.com/realm/realm-core/pull/6245), since v11.3.0-rc.0)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgrade Example to use React Native 0.71.1 ([#5438](https://github.com/realm/realm-js/pull/5438))
* Upgraded Realm Core from v13.1.1 to v13.4.2. ([#5174](https://github.com/realm/realm-js/issues/5174), [#5244](https://github.com/realm/realm-js/issues/5244), [#5419](https://github.com/realm/realm-js/issues/5419) and [#5450](https://github.com/realm/realm-js/issues/5450))
* Unpin Xcode version when building locally and upgrade the Xcode version used by Github Actions.
* Enable tests for notifications on dictionary.
* Automate releasing package on Github Actions.
* Upgrade OpenSSL v1.1.1n to v3.0.8. ([realm/realm-core#6097](https://github.com/realm/realm-core/pull/6097) and [realm/realm-core#6305](https://github.com/realm/realm-core/pull/6305))

## 11.4.0 (2023-01-23)

### Fixed
* Fix no notification for write transaction that contains only change to backlink property. ([realm/realm-core#4994](https://github.com/realm/realm-core/issues/4994), since v10.8.0)

### Compatibility
* React Native >= v0.71.0
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.1.1 to v13.1.2. ([#5174](https://github.com/realm/realm-js/issues/5174))
* Switching from NDK 21 to NDK 23 for Android builds, and bumping the required CMake version to 3.21.4. Sizes of binaries are found below. ([#3905](https://github.com/realm/realm-js/issues/3905))

| Architecture | NDK 21      | NDK 23      |
|--------------|-------------|-------------|
| armeabi-v7a  |     5415116 |     5554692 |
| x86          |     9760312 |    10905472 |
| arm64-v8a    |     8883176 |     9547032 |
| x86_64       |     9879208 |    10574368 |

## 11.3.2 (2023-01-16)
## DEPRECATED: Please use 11.3.1 or 11.4.0

## 11.3.1 (2022-12-07)

### Fixed
* Not possible to open an encrypted file on a device with a page size bigger than the one on which the file was produced. ([#8030](https://github.com/realm/realm-swift/issues/8030), since v11.1.0)
* Empty binary values will no longer be treated as null ([#5114](https://github.com/realm/realm-js/issues/5114), since v10.5.0)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.1.0 to v13.1.1. ([#5154](https://github.com/realm/realm-js/issues/5154))

## 11.3.0 (2022-11-25)

### Notes
* The changelog entry for this release includes both v11.3.0-rc.0 and v11.3.0-rc.1.
* File format version bumped. If Realm file contains any objects with set of `mixed` or dictionary properties, the file will go through an upgrade process.
* The layout of the lock-file has changed, the lock file format version is bumped and all participants in a multiprocess scenario needs to be up to date so they expect the same format. ([realm/realm-core#5440](https://github.com/realm/realm-core/pull/5440))
* In order to open Realm files in Realm Studio, you are required to upgrade to Realm Studio v13.0.0 or later.

### Enhancements
* The choice of a faster linker will now automatically be propagated to anything that statically links against Realm Core. ([realm/realm-core#6043](https://github.com/realm/realm-core/pull/6043))
* The realm file will be shrunk if the larger file size is no longer needed. ([realm/realm-core#5754](https://github.com/realm/realm-core/issues/5754))
* Most of the file growth caused by version pinning is eliminated. ([realm/realm-core#5440](https://github.com/realm/realm-core/pull/5440))
* A set of `mixed` consider string and binary data equivalent. This could cause the client to be inconsistent with the server if a string and some binary data with equivalent content was inserted from Atlas. ([realm/realm-core#4860](https://github.com/realm/realm-core/issues/4860), since v10.5.0)

### Fixed
* Fetching a user's profile while the user logs out would result in an assertion failure. ([realm/realm-core#5571](https://github.com/realm/realm-core/issues/5571), since v10.4.1)
* Removed the `.tmp_compaction_space` file being left over after compacting a Realm on Windows. ([#4526](https://github.com/realm/realm-js/issues/4526) and [realm/realm-core#5997](https://github.com/realm/realm-core/issues/5997), since Windows support for compact was added)
* Restore fallback to full barrier when `F_BARRIERSYNC` is not available on Apple platforms. ([realm/realm-core#6033](https://github.com/realm/realm-core/pull/6033), since v11.2.0)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.12.0 to v13.1.0. ([#5120](https://github.com/realm/realm-js/issues/5120 and [#5128](https://github.com/realm/realm-js/issues/5128)

## 11.3.0-rc.1 (2022-11-22)

### Enhancements
* The choice of a faster linker will now automatically be propagated to anything that statically links against Realm Core. ([realm/realm-core#6043](https://github.com/realm/realm-core/pull/6043))

### Fixed
* Corruption might be introduced during compaction. ([realm/realm-core#6054](https://github.com/realm/realm-core/pull/6054), since v11.3.0-rc.0)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v12.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v13.0.0 to v13.1.0. ([#5128](https://github.com/realm/realm-js/issues/5128)

## 11.3.0-rc.0 (2022-11-20)

### Notes
* File format version bumped. If Realm file contains any objects with set of `mixed` or dictionary properties, the file will go through an upgrade process.
* The layout of the lock-file has changed, the lock file format version is bumped and all participants in a multiprocess scenario needs to be up to date so they expect the same format. ([realm/realm-core#5440](https://github.com/realm/realm-core/pull/5440))
* In order to open Realm files in Realm Studio, you are required to upgrade to Realm Studio v13.0.0 or later.

### Enhancements
* The realm file will be shrunk if the larger file size is no longer needed. ([realm/realm-core#5754](https://github.com/realm/realm-core/issues/5754))
* Most of the file growth caused by version pinning is eliminated. ([realm/realm-core#5440](https://github.com/realm/realm-core/pull/5440))
* A set of `mixed` consider string and binary data equivalent. This could cause the client to be inconsistent with the server if a string and some binary data with equivalent content was inserted from Atlas. ([realm/realm-core#4860](https://github.com/realm/realm-core/issues/4860), since v10.5.0)

### Fixed
* Fetching a user's profile while the user logs out would result in an assertion failure. ([realm/realm-core#5571](https://github.com/realm/realm-core/issues/5571), since v10.4.1)
* Removed the `.tmp_compaction_space` file being left over after compacting a Realm on Windows. ([#4526](https://github.com/realm/realm-js/issues/4526) and [realm/realm-core#5997](https://github.com/realm/realm-core/issues/5997), since Windows support for compact was added)
* Restore fallback to full barrier when `F_BARRIERSYNC` is not available on Apple platforms. ([realm/realm-core#6033](https://github.com/realm/realm-core/pull/6033), since v11.2.0)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.12.0 to v13.0.0. ([#5120](https://github.com/realm/realm-js/issues/5120)

## 11.2.0 (2022-11-12)

### Enhancements
* Flexible sync will now wait for the server to have sent all pending history after a bootstrap before marking a subscription as Complete. ([realm/realm-core#5795](https://github.com/realm/realm-core/pull/5795))

### Fixed
* Fix database corruption and encryption issues on apple platforms. ([#5076](https://github.com/realm/realm-js/issues/5076), since v10.12.0)
* Sync bootstraps will not be applied in a single write transaction - they will be applied 1MB of changesets at a time. ([realm/realm-core#5999](https://github.com/realm/realm-core/pull/5999), since v10.19.0).
* Fix a race condition which could result in `operation cancelled` errors being delivered to `Realm#open` rather than the actual sync error which caused things to fail. ([realm/realm-core#5968](https://github.com/realm/realm-core/pull/5968), v1.0.0).

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v12.0.0.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.11.0 to v12.12.0.
* Binaries for Centos/RHEL 7 are included in released. ([#5006](https://github.com/realm/realm-js/issues/5006), since v10.21.0)
* Binaries for Linux/ARMv7 are included in released.

## 11.1.0 (2022-11-01)
### Enhancements
* Add support for using functions as default property values, in order to allow dynamic defaults [#5001](https://github.com/realm/realm-js/pull/5001), [#2393](https://github.com/realm/realm-js/issues/2393)
* All fields of a `Realm.Object` treated as optional by TypeScript when constructing a new class-based model, unless specified in the second type parameter [#5000](https://github.com/realm/realm-js/pull/5000)
* If a sync client sends a message larger than 16 MB, the sync server will request a client reset. ([realm/realm-core#5209](https://github.com/realm/realm-core/issues/5209))
* Add two new modes to client reset: `RecoverUnsyncedChanges` and `RecoverOrDiscardUnsyncedChanges`. The two modes will recover local/unsynced changes with changes from the server if possible. If not possible, `RecoverOrDiscardUnsyncedChanges` will remove the local Realm file and download a fresh file from the server. The mode `DiscardLocal` is duplicated as `DiscardUnsyncedChanges`, and `DiscardLocal` is be removed in a future version. ([#4135](https://github.com/realm/realm-js/issues/4135))

### Fixed
* Fixed a use-after-free if the last external reference to an encrypted Realm was closed between when a client reset error was received and when the download of the new Realm began. ([realm/realm-core#5949](https://github.com/realm/realm-core/pull/5949), since v10.20.0)
* Opening an unencrypted file with an encryption key would sometimes report a misleading error message that indicated that the problem was something other than a decryption failure. ([realm/realm-core#5915](https://github.com/realm/realm-core/pull/5915), since v1.0.0)
* Fixed a rare deadlock which could occur when closing a synchronized Realm immediately after committing a write transaction when the sync worker thread has also just finished processing a changeset from the sync server. ([realm/realm-core#5948](https://github.com/realm/realm-core/pull/5948))

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v12.0.0.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.9.0 to v12.11.0.

## 11.0.0 (2022-10-18)

### Notes
Based on Realm JS v10.22.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.19.5).

### Breaking changes

#### Removed APIs

* Removed all code related to the legacy Chrome Debugger. Please use [Flipper](https://fbflipper.com/) as debugger.

The following deprecated methods have been removed:

  * `Realm#automaticSyncConfiguration`
  * `Realm.Credentials#google` with `authCode` parameter (use `authObject`)
  * The following should be replaced with `Realm.Credentials#apiKey`:
    * `Realm.Credentials#serverApiKey`
    * `Realm.Credentials#userApiKey`
  * The overload of `Realm.Auth.EmailPasswordAuth` methods, taking positional arguments instead of object arguments:
    * `registerUser`
    * `confirmUser`
    * `resendConfirmationEmail`
    * `retryCustomConfirmation`
    * `resetPassword`
    * `sendResetPasswordEmail`
    * `callResetPasswordFunction`
  * Removed `Realm.JsonSerializationReplacer`. Use circular JSON serialization libraries such as [@ungap/structured-clone](https://www.npmjs.com/package/@ungap/structured-clone) and [flatted](https://www.npmjs.com/package/flatted) for stringifying Realm entities that have circular structures. The Realm entities' `toJSON` method returns plain objects and arrays (with circular references if applicable) which makes them compatible with any serialization library that supports stringifying plain JavaScript types. ([#4997](https://github.com/realm/realm-js/pull/4997))

Now the only supported call signature of `Realm.Auth.EmailPasswordAuth` methods is using a single object argument:

```typescript
registerUser({ email, password });
confirmUser({ token, tokenId });
resendConfirmationEmail({ email });
retryCustomConfirmation({ email });
resetPassword({ token, tokenId, password });
sendResetPasswordEmail({ email });
callResetPasswordFunction({ email, password }, ...args);
```

#### Renamed APIs

* Renamed the `RealmInsertionModel<T>` type to `Unmanaged<T>` to simplify and highlight its usage.

The following APIs have been renamed on the `Realm`:

| Before | After |
| ------ | ----- |
| `empty` | `isEmpty` |
| `readOnly` | `isReadOnly` |

The following APIs have been renamed on the `Realm.Config`:

| Before | After |
| ------ | ----- |
| `migration` | `onMigration` |
| `shouldCompactOnLaunch` | `shouldCompact` |

The following APIs have been renamed on the `Realm.SyncConfiguration`:

| Before | After |
| ------ | ----- |
| `error` | `onError`|
| `clientReset.clientResetBefore` | `clientReset.onBefore` |
| `clientReset.clientResetAfter` | `clientReset.onAfter` |
| `ssl.validateCallback` | `ssl.validateCertificates` |

* A typo was fixed in the `SubscriptionsState` enum, in which `SubscriptionsState.Superseded` now returns `superseded` in place of `Superseded`

Here are examples of the use of the APIs after they've been renamed:

``` typescript
// before
Realm.open({ migration:() => {} })
// after
Realm.open({ onMigration:() => {} })
```

``` typescript
// before
Realm.open({
  sync: {
    shouldCompactOnLaunch: /* ... */
    error: /* ... */
    clientReset: {
      clientResetBefore: /* ... */
      clientResetAfter: /* ... */
    }
    ssl:{
      validateCallback: /* ... */
    }
  }
})
// after
Realm.open({
  sync: {
    shouldCompact: /* ... */
    onError: /* ... */
    clientReset: {
      onBefore: /* ... */
      onAfter: /* ... */
    }
    ssl:{
      validateCertificates: /* ... */
    }
  }
})
```

#### Changed APIs

 * Model classes passed as schema to the `Realm` constructor must now extend `Realm.Object` and will no longer have their constructors called when pulling an object of that type from the database. Existing classes already extending `Realm.Object` now need to call the `super` constructor passing two arguments:
  - `realm`: The Realm to create the object in.
  - `values`: Values to pass to the `realm.create` call when creating the object in the database.
 * `Realm#writeCopyTo` now only accepts an output Realm configuration as a parameter.
 * When no object is found calling `Realm#objectForPrimaryKey`, `null` is returned instead of `undefined`,
 * Removed `Object#_objectId`, which is now replaced by `Object#_objectKey`
 * Unified the call signature of `User#callFunction` ([#3733](https://github.com/realm/realm-js/issues/3733))
 * Replaced string unions with enums where it made sense:
  * `Realm.App.Sync.Session#state` is now `SessionState`.
  * `Realm.App.Sync.Session#addProgressNotification` now takes `(direction: ProgressDirection, mode: ProgressMode, progressCallback: ProgressNotificationCallback)`.
 * `"discardLocal"` is now the default client reset mode. ([#4382](https://github.com/realm/realm-js/issues/4382))

This is an example of calling a function with the new signature of `callFunction`:

```typescript
user.callFunction("sum", 1, 2, 3); // Valid
user.callFunction("sum", [1, 2, 3]); // Invalid
user.functions.sum(1, 2, 3); // Still the recommended
```

### Enhancements
* Adding support for Hermes on iOS & Android.
* Class-based models (i.e. user defined classes extending `Realm.Object` and passed through the `schema` when opening a Realm), will now create object when their constructor is called.
* Small improvement to performance by caching JSI property String object [#4863](https://github.com/realm/realm-js/pull/4863)
* Small improvement to performance for `toJSON` which should make it useful for cases where a plain representations of Realm entities are needed, e.g. when inspecting them for debugging purposes through `console.log(realmObj.toJSON())`. ([#4997](https://github.com/realm/realm-js/pull/4997))
* Catching missing libjsi.so when loading the librealm.so and rethrowing a more meaningful error, instructing users to upgrade their version of React Native.

Example of declaring a class-based model in TypeScript:

```typescript
class Person extends Realm.Object<Person> {
  name!: string;

  static schema = {
    name: "Person",
    properties: { name: "string" },
  };
}

const realm = new Realm({ schema: [Person] });
realm.write(() => {
  const alice = new Person(realm, { name: "Alice" });
  // A Person { name: "Alice" } is now persisted in the database
  console.log("Hello " + alice.name);
});
```

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v12.0.0.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal

* Building from source from a package downloaded via NPM is no longer supported, since we removed `src` and `vendor` from the NPM bundle, to reduce size blow-up caused by files recently added to the sub-module. This will force end-users to checkout the Git repository from GitHub when building from source. ([#4060](https://github.com/realm/realm-js/issues/4060))
* Renamed the following internal packages:
   * `@realm.io/common` -> `@realm/common`
   * `realm-network-transport` -> `@realm/network-transport`
   * `realm-app-importer` -> `@realm/app-importer`
   * `realm-example` -> `@realm/example`
   * `realm-electron-tests` -> `@realm/electron-tests`
   * `realm-node-tests` -> `@realm/node-tests`
   * `realm-react-native-tests` -> `@realm/react-native-tests`

## 11.0.0-rc.2 (2022-09-15)

### Breaking change
* Removed deprecated positional arguments to Email/Password authentication functions
    * The following functions now only accept object arguments:
    ```javascript
  Realm.Auth.EmailPasswordAuth.registerUser({email, password});
  Realm.Auth.EmailPasswordAuth.confirmUser({token, tokenId});
  Realm.Auth.EmailPasswordAuth.resendConfirmationEmail({email});
  Realm.Auth.EmailPasswordAuth.retryCustomConfirmation({email});
  Realm.Auth.EmailPasswordAuth.resetPassword({token, tokenId, password});
  Realm.Auth.EmailPasswordAuth.sendResetPasswordEmail({email});
  Realm.Auth.EmailPasswordAuth.callResetPasswordFunction({email, password}, ...args);
* Unify the call signature documentation of `User#callFunction` ([#3733](https://github.com/realm/realm-js/issues/3733))
    * Example:
    ```javascript
    user.callFunction("sum", 1, 2, 3); // Valid
    user.callFunction("sum", [1, 2, 3]); // Invalid
    ```
### Enhancements
* Small improvement to performance by caching JSI property String object [#4863](https://github.com/realm/realm-js/pull/4863)
* Added new package `@realm/babel-plugin` to enable definining your Realm models using standard Typescript syntax [#4938](https://github.com/realm/realm-js/pull/4938)

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

## 11.0.0-rc.1 (2022-7-11)

### Notes
This is primarily a re-release of `11.0.0-rc.0`, which is compatible with React Native v0.69.0 or above.
The release is based on Realm JS v10.19.5.

### Enhancements
* None.

### Fixed
* None.

### Compatibility
* React Native equal to or above `v0.69.0` and above, since we're shipping binaries pre-compiled against the JSI ABI.
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

## 11.0.0-rc.0 (2022-7-7)

### Notes
Based on Realm JS v10.19.5: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.17.0).

### Breaking change
* Removed all code related to the legacy Chrome Debugger. Please use [Flipper](https://fbflipper.com/) as debugger.
* Model classes passed as schema to the `Realm` constructor must now extend `Realm.Object` and will no longer have their constructors called when pulling an object of that type from the database. Existing classes already extending `Realm.Object` now need to call the `super` constructor passing two arguments:
  - `realm`: The Realm to create the object in.
  - `values`: Values to pass to the `realm.create` call when creating the object in the database.
* Renamed the `RealmInsertionModel<T>` type to `Unmanaged<T>` to simplify and highlight its usage.
* Installing via NPM from a `git://` URL is no longer supported, since we removed `src` and `vendor` from the NPM bundle, to reduce size blow-up caused by files recently added to the sub-module. This will force end-users to checkout the Git repository from GitHub when building from source. ([#4060](https://github.com/realm/realm-js/issues/4060))

### Enhancements
* Adding support for Hermes on iOS & Android.
* Class-based models (i.e. user defined classes extending `Realm.Object` and passed through the `schema` when opening a Realm), will now create object when their constructor is called:

```ts
class Person extends Realm.Object<Person> {
  name!: string;

  static schema = {
    name: "Person",
    properties: { name: "string" },
  };
}

const realm = new Realm({ schema: [Person] });
realm.write(() => {
  const alice = new Person(realm, { name: "Alice" });
  // A Person { name: "Alice" } is now persisted in the database
  console.log("Hello " + alice.name);
});
```

### Fixed
* Fixed build error (call to implicitly-deleted copy constructor of 'realm::js::RealmClass<realm::js::realmjsi::Types>::Arguments') (follow up to [#4568](https://github.com/realm/realm-js/pull/4568))

### Compatibility
* React Native equal to or above `v0.66.0` and below `v0.69.0` (not included), since we're shipping binaries pre-compiled against the JSI ABI.
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Remove the previous implementation to the JavaScriptCore engine (in `src/jsc`).
* Upgrade Example to RN v0.68.2
* Upgrade dependencies of the Realm Web integration tests
* Throw instances of `Error` instead of plain objects on app errors.
* Make integration tests on React Native Android connect to host machine by default

## 10.20.0-beta.5 (2022-4-13)

### Notes
Based on Realm JS v10.16.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.15.0).

## 10.20.0-beta.4 (2022-4-11)

### Notes
Based on Realm JS v10.15.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.14.0).

### Fixed
* Changed "react-native" main field to point to a `lib/index.native.js` file to help bundlers pick the right file when loading our library on React Native. ([#4459](https://github.com/realm/realm-js/issues/4459))
* Fixed resolving the "react-native" package when building from source, enabling developers to run the `./scripts/build-ios.sh` script themselves to build our iOS artifacts with the same version of Xcode / LLVM as they're building their app.

## 10.20.0-beta.3 (2022-3-24)

### Notes
Based on Realm JS v10.14.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.13.0).

## 10.20.0-beta.2 Release notes (2022-2-14)

### Notes
Based on Realm JS v10.13.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.12.0).

## 10.20.0-beta.1 (2022-1-27)

### Notes
Based on Realm JS v10.12.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.11.0).

### Breaking change
* Removed all code related to the legacy Chrome Debugger. Please use [Flipper](https://fbflipper.com/) as debugger.

### Enhancements
* None.

### Fixed
* Fixed "JSCRuntime destroyed with a dangling API object" assertion when reloading an app in debug mode while running with Hermes engine disabled. ([#4115](https://github.com/realm/realm-js/issues/4115), since 10.20.0-alpha.0)

### Internal
* Remove the previous implementation to the JavaScriptCore engine (in `src/jsc`).

## 10.20.0-beta.0 (2021-12-21)

### Notes
Based on Realm JS v10.11.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.10.1).

### Enhancements
* Catching missing libjsi.so when loading the librealm.so and rethrowing a more meaningful error, instructing users to upgrade their version of React Native.

### Fixed
* Fixed support of user defined classes that don't extend `Realm.Object`.
* Fixed throwing "Illegal constructor" when `new` constructing anything other than `Realm` and `Realm.Object`.

## 10.20.0-alpha.2 (2021-11-25)

### Notes
NOTE: DO NOT USE THIS RELEASE IN PRODUCTION!
NOTE: This is an early (alpha) release with Hermes/JSI support: We expect crashes and bugs.

Based on Realm JS v10.10.1: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.8.0).

### Enhancements
* None.

### Fixed
* Hot reloading on Android no longer crash the app.

### Internal
* Restructured C++ namespaces and files to reflect that we support JSI, not just Hermes.

## 10.20.0-alpha.1 (2021-9-1)

### Notes
NOTE: DO NOT USE THIS RELEASE IN PRODUCTION!
NOTE: This is an early (alpha) release with Hermes/JSI support. Only iOS is supported and we expect crashes and bugs.

Based on Realm JS v10.8.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.7.0).

### Enhancements
* Adding support for Hermes on Android.

## 10.20.0-alpha.0 (2021-9-1)

### Notes
NOTE: DO NOT USE THIS RELEASE IN PRODUCTION!
NOTE: This is an early (alpha) release with Hermes/JSI support. Only iOS is supported and we expect crashes and bugs.

Based on Realm JS v10.7.0: See changelog below for details on enhancements and fixes introduced by that version.

### Enhancements
* Adding support for Hermes (iOS only).
