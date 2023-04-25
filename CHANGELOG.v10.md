## 10.22.0 (2022-10-17)

### Enhancements
* Prioritize integration of local changes over remote changes. This shortens the time users may have to wait when committing local changes. Stop storing downloaded changesets in history. ([realm/realm-core#5844](https://github.com/realm/realm-core/pull/5844))
* Greatly improve the performance of sorting or distincting a Dictionary's keys or values. The most expensive operation is now performed O(log N) rather than O(N log N) times, and large Dictionaries can see upwards of 99% reduction in time to sort. ([realm/realm-core#5166](https://github.com/realm/realm-core/pulls/5166))
* Cut the runtime of aggregate operations on large dictionaries in half. ([realm/realm-core#5864](https://github.com/realm/realm-core/pull/5864))
* Improve performance of aggregate operations on collections of objects by 2x to 10x. ([realm/realm-core#5864](https://github.com/realm/realm-core/pull/5864))

### Fixed
* If a case insensitive query searched for a string including an 4-byte UTF8 character, the program would crash. ([realm/realm-core#5825](https://github.com/realm/realm-core/issues/5825), since v1.0.0)
* `Realm#writeCopyTo()` doesn't support flexible sync, and an exception is thrown. ([realm/realm-core#5798](https://github.com/realm/realm-core/issues/5798), since v10.10.0)
* Asymmetric object types/classes cannot be used with partition-based sync, and an exception is thrown. ([realm/realm-core#5691](https://github.com/realm/realm-core/issues/5691), since v10.19.0)
* If you set a subscription on a link in flexible sync, the server would not know how to handle it. ([realm/realm-core#5409](https://github.com/realm/realm-core/issues/5409), since v10.10.1)
* Fixed type declarations for aggregation methods (min, max, sum, avg) to reflect implementation. ([4994](https://github.com/realm/realm-js/issues/4994), since v2.0.0)

### Compatibility
* React Native >= v0.64.0
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.6.0 to v12.9.0. ([#4932](https://github.com/realm/realm-js/issues/4932) and [#4983](https://github.com/realm/realm-js/issues/4983))
* Added ARM/Linux build guide.

## 10.21.1 (2022-09-15)

### Fixed
* Fixed pinning of the NDK used to build our prebuilt binaries for Android. Our previous version, Realm JS v10.21.0 was compiled with NDK 25.1.8937393, which could result in unpredictable crashes, since this needs to match the one being used by React Native. ((#4910)[https://github.com/realm/realm-js/pull/4910], since v10.21.0)

### Compatibility
* React Native >= v0.64.0
* Atlas App Services.
* Realm Studio v12.0.0.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v12.6.0.

## 10.21.0 (2022-09-09)

### Enhancements
* Automatic handling backlinks for schema migrations where a class/object type changes to being embedded. ([realm/realm-core#5737](https://github.com/realm/realm-core/pull/5737))
* Improve performance when a new Realm file connects to the server for the first time, especially when significant amounts of data has been written while offline.
* Improve the performance of the sync changeset parser, which speeds up applying changesets from the server.

### Fixed
* Fixed dangling pointer in binary datatype handling in Node ([#3781](https://github.com/realm/realm-js/issues/3781), since v10.5.0)
* Fixed undefined behaviour on queries involving a constant and an indexed property on some property types like UUID and Date. ([realm/realm-core#5753](https://github.com/realm/realm-core/issues/5753), since v10.20.0)
* Fixed an exception `fcntl() with F_BARRIERFSYNC failed: Inappropriate ioctl for device` when running with MacOS on an exFAT drive. ([realm/realm-core#5789](https://github.com/realm/realm-core/issues/5789), since v10.18.0)
* Syncing of a Decimal128 with big significand could result in a crash. ([realm/realm-core#5728](https://github.com/realm/realm-core/issues/5728), since v10.0.0)
* `discardLocal` client reset mode will now wait for flexible sync Realms to be fully synchronized before beginning recovery operations. ([realm/realm-core#5705](https://github.com/realm/realm-core/issues/5705), since v10.11.0)

### Compatibility
* React Native >= v0.64.0
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.5.1 to v12.6.0. ([#4865](https://github.com/realm/realm-js/issues/4865))
* Updated C++ `clang-format` version to match newer MacOS default ([#4869](https://github.com/realm/realm-js/pull/4869))

## 10.20.0 (2022-8-23)

### Enhancements
* Introducing query support for constant list expressions such as `fruit IN {'apple', 'orange'}`. This also includes general query support for list vs list matching such as `NONE fruits IN {'apple', 'orange'}`. ([#2781](https://github.com/realm/realm-js/issues/2781) and [#4596](https://github.com/realm/realm-js/issues/4596))
* Allow multiple anonymous sessions. ([realm/realm-core#4607](https://github.com/realm/realm-core/issues/4607))

### Fixed
* Fixed issue where React Native apps on Android would sometimes show stale Realm data until the user interacted with the app UI. ([#4389](https://github.com/realm/realm-js/issues/4389), since v10.0.0)
* Reduced use of memory mappings and virtual address space. ([realm/realm-core#5645](https://github.com/realm/realm-core/pull/5645))
* Fixed a data race when committing a transaction while multiple threads are waiting for the write lock on platforms using emulated interprocess condition variables (most platforms other than non-Android Linux). ([realm/realm-core#5643](https://github.com/realm/realm-core/pull/5643))
* Fixed a data race when writing audit events which could occur if the sync client thread was busy with other work when the event Realm was opened. ([realm/realm-core#5643](https://github.com/realm/realm-core/pull/5643))
* Fixed some cases of running out of virtual address space (seen/reported as mmap failures). ([realm/realm-core#5645](https://github.com/realm/realm-core/pull/5645))
* Fixed the client reset callbacks not populating the Realm instance arguments correctly in some cases. ([#5654](https://github.com/realm/realm-core/pull/5654), since v10.11.0)
* Decimal128 values with more than 110 significant bits were not synchronized correctly with the server. ([realm/realm-swift#7868](https://github.com/realm/realm-swift/issues/7868), since v10.0.0)
* Fixed an incorrect git merge in the Xcode project from RN iOS. ([#4756](https://github.com/realm/realm-js/issues/4756), since v10.19.5)
* Fixed detection of emulator environments to be more robust.  Thanks to [Ferry Kranenburg](https://github.com/fkranenburg) for identifying the issue and supplying a PR. ([#4784](https://github.com/realm/realm-js/issues/4784))
* Opening a read-only synced Realm for the first time could lead to `m_schema_version != ObjectStore::NotVersioned` assertion.
* Fixed an offset error in Node buffer handling ([#3781](https://github.com/realm/realm-js/issues/3781), since v10.0.0)

### Compatibility
* React Native >= v0.64.0
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Updated ccache build scripts to be location agnostic. ([#4764](https://github.com/realm/realm-js/pull/4764))
* Upgraded Realm Core from v12.3.0 to v12.5.1. ([#4753](https://github.com/realm/realm-js/issues/4753) and [[#4763](https://github.com/realm/realm-js/issues/4763))
* Upgraded React Native integration tests app to React Native v0.68.2. ([#4583](https://github.com/realm/realm-js/pull/4583))
* Upgrading `react-native-fs` to avoid a peer dependency failure. ([#4709](https://github.com/realm/realm-js/pull/4709))
* Upgraded React Native integration tests app to React Native v0.69.1. ([#4713](https://github.com/realm/realm-js/pull/4713))
* Upgraded Realm Example app to React Native v0.69.1. ([#4722](https://github.com/realm/realm-js/pull/4722))
* Fixed a crash on Android when an error was thrown from the flexible sync `initialSubscriptions` call. ([#4710](https://github.com/realm/realm-js/pull/4710), since v10.18.0)
* Added a default sync logger for integration tests. ([#4730](https://github.com/realm/realm-js/pull/4730))
* Fixed an issue starting the integration test runner on iOS. ([#4742](https://github.com/realm/realm-js/pull/4742]))
* Fixed dark mode logo in README.md. ([#4780](https://github.com/realm/realm-js/pull/4780))
* Migrated to `std::optional` and `std::nullopt`.
* Disabled testing on iOS and Catalyst on legacy CI system.

## 10.19.5 (2022-7-6)
### Enhancements
* None.

### Fixed
* Fixed inadvertent change to minimum Android Gradle plugin version. ([#4706](https://github.com/realm/realm-js/issues/4706), since v10.19.4)

### Compatibility
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v12.3.0.

## 10.19.4 (2022-7-5)

### Enhancements
* Allow flexible sync with discard local client resets. ([realm/realm-core#5404](https://github.com/realm/realm-core/pull/5404))

### Fixed
* Setting up a `clientResetAfter` callback could lead to a fatal error with the message `Realm accessed from incorrect thread`. ([#4410](https://github.com/realm/realm-js/issues/4410), since v10.11.0)
* Improved performance of sync clients during integration of changesets with many small strings (totalling > 1024 bytes per changeset) on iOS 14, and devices which have restrictive or fragmented memory. ([realm/realm-core#5614](https://github.com/realm/realm-core/issues/5614))
* Fixed a bug that prevented the detection of tables being changed to or from asymmetric during migrations. ([realm/realm-core#5603](https://github.com/realm/realm-core/pull/5603), since v10.19.3)
* Fixed a bug with handling `null` values in `toJSON`. ([[#4682](https://github.com/realm/realm-js/issues/4682), since 10.19.3)

### Compatibility
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.2.0 to v12.3.0. ([#4689](https://github.com/realm/realm-js/issues/4689))
* Fixed analytics tests to reflect the fact that framework versions are read from node_modules, not package.json. ([#4687](https://github.com/realm/realm-js/pull/4687))
* Adding response type checking to the realm-app-importer. ([#4688](https://github.com/realm/realm-js/pull/4688))
* Updated integration test app to target Android SDK 31. ([#4686](https://github.com/realm/realm-js/pull/4686))
* Enabled debugging Realm C++ code in integration test app. ([#4696](https://github.com/realm/realm-js/pull/4696))
* Fixed types for flexible sync client reset and added a test. ([#4702](https://github.com/realm/realm-js/pull/4702))

## 10.19.3 (2022-6-27)

### Enhancements
* None.

### Fixed
* Realm JS can now be installed in environments using npm binary mirroring ([#4672](https://github.com/realm/realm-js/pull/4672), since v10.0.0).
* Asymmetric sync now works with embedded objects. ([realm/realm-core#5565](https://github.com/realm/realm-core/issues/5565), since 10.19.0)
* Fixed an issue on Windows that would cause high CPU usage by the sync client when there are no active sync sessions. ([realm/realm-core#5591](https://github.com/realm/realm-core/issues/5591), since v1.1.1)
* Fixed an issue setting a `Mixed` from an object to `null` or any other non-link value. Users may have seen exception of `key not found` or assertion failures such as `mixed.hpp:165: [realm-core-12.1.0] Assertion failed: m_type` when removing the destination link object. ([realm/realm-core#5574](https://github.com/realm/realm-core/pull/5573), since v10.5.0)
* Fixed a data race when opening a flexible sync Realm. ([realm/realm-core#5573](https://github.com/realm/realm-core/pull/5573), since v10.19.0)

### Compatibility
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.1.0 to v12.2.0. ([#4679](https://github.com/realm/realm-js/issues/4679))
* Enabled `testNoMigrationOnSync`. ([#3312](https://github.com/realm/realm-js/issues/3312))

## 10.19.2 (2022-6-20)

### Enhancements
* None.

### Fixed
* Fixed incorrect `@realm.io/common` version in `package.json` causing install issues for users upgrading from older version of the `realm` npm package ([[#4657](https://github.com/realm/realm-js/issues/4657), since v10.18.0])

### Compatibility
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgrade Example to RN v0.68.2
* Upgrade dependencies of the Realm Web integration tests
* Throw instances of `Error` instead of plain objects on app errors.
* Make integration tests on React Native Android connect to host machine by default

## 10.19.1 (2022-6-7)

### Enhancements
* None.

### Fixed
* None.

### Compatibility
* Atlas App Services.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Removed support for node.js v12 and earlier versions and bumped to Node-API v5.
* Fix FLX error scenario tests.
* Fixed a bug preventing opening a synced Realm as a local Realm. (since v10.18.0)

## 10.19.0 (2022-6-2)

### Enhancements
* Creating an object for a class that has no subscriptions opened for it will throw an exception. ([realm/realm-core#5488](https://github.com/realm/realm-core/pull/5488))
* Added support asymmetric sync. Object schemas can be marked as `asymmetric` when opening the Realm. Upon creation, asymmetric objects are sync'd unidirectionally and cannot be accessed locally. Asymmetric sync is compatible with flexible sync. ([#4503](https://github.com/realm/realm-js/issues/4503))

```js
const Person = {
  name: "Person",
  asymmetric: true, // this marks "Person" as asymmetric
  primaryKey: "id",
  properties: {
    id: "objectId",
    name: "string",
    age: "int",
  },
};
```

### Fixed
* Add canonical schema type for returned schemas. ([#4580](https://github.com/realm/realm-js/pull/4580))
* Fixed invalid type for schema properties. ([#4577](https://github.com/realm/realm-js/pull/4577))
* FLX sync subscription state changes will now correctly be reported after sync progress is reported. ([realm/realm-core#5553](https://github.com/realm/realm-core/pull/5553), since v10.18.0)

### Compatibility
* Atlas Device Sync.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v12.0.0 to v12.1.0.
* Fix for updated FLX sync error message. ([#4611](https://github.com/realm/realm-js/pull/4611))
* Updated build script to use Xcode 13.1 to match latest Apple App Store compatibility. ([#4605](https://github.com/realm/realm-js/issues/4605))
* Removed unused scripts `scripts/download-realm.js`, `scripts/find-ios-device.rb`, `scripts/find-ios-runtime.rb`, `scripts/test-android.js` and `scripts/xcode-download-realm.sh`. ([#4402](https://github.com/realm/realm-js/issues/4402))

## 10.18.0 (2022-5-29)

### Enhancements
* Switch to building xcframeworks with Xcode 13.1. Xcode 12 is no longer supported.
* Added an `initialSubscriptions` option to the `sync` config, which allows users to specify a subscription update function to bootstrap a set of flexible sync subscriptions when the Realm is first opened (or every time the app runs, using the `rerunOnOpen` flag). (#4561[https://github.com/realm/realm-js/pull/4561])

    Example usage:
    ```ts
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    const config = {
      // ...
      sync: {
        flexible: true,
        user,
        initialSubscriptions: {
          update: (realm) => {
            realm.subscriptions.update((subs) => {
              subs.add(
                realm.objects("Person").filtered("dateOfBirth > $0", thirtyDaysAgo),
                // This is a named subscription, so will replace any existing subscription with the same name
                { name: "People30Days" }
              );
            });
          },
          rerunOnStartup: true,
        },
      },
    };
    ```

### Fixed
* Flexible sync would not correctly resume syncing if a bootstrap was interrupted. ([realm/realm-core#5466](https://github.com/realm/realm-core/pull/5466), since v10.12.0)
* The sync client may upload corrupted internal data leading to a fatal error from the sync server. ([realm/realm-core#5460](https://github.com/realm/realm-core/pull/5460), since v10.16.0)
* Proxied `Realm.Results` (e.g. as returned from `useQuery` in `@realm/react`) could not be used with `MutableSubscriptionSet.add`/`remove` ([#4507](https://github.com/realm/realm-js/issues/4507), since v10.12.0)
* In queries `NONE x BETWEEN ...` and `ANY x BETWEEN ...` had incorrect behavior, so it is now disallowed. ([realm/realm-core#5508](https://github.com/realm/realm-core/issues/5508), since v10.15.0)
* Partially fix a performance regression in write performance on Apple platforms, but still slower than pre-10.12.0 due to using more crash-safe file synchronization. ([#4383](https://github.com/realm/realm-js/issues/4383) and [realm/realm-swift#7740](https://github.com/realm/realm-swift/issues/7740), since v10.12.0).
* FLX sync will now ensure that a bootstrap from the server will only be applied if the entire bootstrap is received - ensuring there are no orphaned objects as a result of changing the read snapshot on the server. ([realm/realm-core#5331](https://github.com/realm/realm-core/pull/5331))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v12.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.15.0 to v12.0.0.
* Upgraded BAAS image to 2022-05-23.
* Fixed an intermittent issue with flexible sync test suite. ([#4590](https://github.com/realm/realm-js/pull/4590), since v10.12.0)
* Bump the version number for the lockfile used for interprocess synchronization. This has no effect on persistent data, but means that versions of Realm which use pre-12.0.0 Realm Core cannot open Realm files at the same time as they are opened by this version. Notably this includes Realm Studio, and Realm Core v11.1.2/Realm JavaScript v10.17.0 (the latest at the time of this release) cannot open Realm files which are simultaneously open in the iOS simulator.

## 10.17.0 (2022-5-10)

### Enhancements
* Add ability to listen to changes to `Realm.App` and `Realm.User`. ([#4455](https://github.com/realm/realm-js/issues/4455))

### Fixed
* Fixed issue where React Native apps would sometimes show stale Realm data until the user interacted with the app UI. ([#4389](https://github.com/realm/realm-js/issues/4389), since v10.0.0)
* Fixed race condition leading to potential crash when hot reloading an app using Realm Sync. ([4509](https://github.com/realm/realm-js/pull/4509), since v10.12.0)
* Updated build script to use Xcode 12.4 to ensure xcframework is Bitcode compatibile with older versions. ([#4462](https://github.com/realm/realm-js/issues/4462), since v10.0.0)
* Added missing type definitions for `newRealmFileBehavior` and `existingRealmFileBehavior` when opening a flexible sync Realm ([#4467](https://github.com/realm/realm-js/issues/4467), since v10.12.0)
* Adding an object to a Set, deleting the parent object, and then deleting the previously mentioned object causes crash ([#5387](https://github.com/realm/realm-core/issues/5387), since v10.5.0)
* Synchronized Realm files which were first created using SDK version released in the second half of August 2020 would be redownloaded instead of using the existing file, possibly resulting in the loss of any unsynchronized data in those filesi. (since v10.10.1)
* Fixed buildtime error where our package would be ignored due to use of the deprecated `podspecPath` and `sharedLibraries` keys in the `react-native.config.js`. ([#4553](https://github.com/realm/realm-js/issues/4553))
* Fixed flexible sync configuration types to be compatible with Typescript when `strict` mode is disabled. ([#4552](https://github.com/realm/realm-js/issues/4552))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Improved documentation for `Realm.copyBundledRealmFiles`.
* Refactored notifications to use a `NotificationBucket` API, enabling JS objects to be garbage collected on teardown of the JS engine. ([#4550](https://github.com/realm/realm-js/pull/4550))
* Updated a test to be ready for node 18.
* Fixed a typo in the `testRealmConversions` test which prevented some test scenarios from executing.
* Upgraded Realm Core from v11.14.0 to v11.15.0.

## 10.16.0 (2022-4-12)

### Enhancements
* None.

### Fixed
* Fixed various corruption bugs in Realm Core when encryption is used. ([#5360](https://github.com/realm/realm-core/issues/5360), since v11.8.0)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.13.0 to v11.14.0.

## 10.15.0 (2022-4-11)
### Enhancements
* None.

### Fixed
* Logging out too quickly can cause an error if the timeout behavior is set to `openLocalRealm` ([#4453](https://github.com/realm/realm-js/issues/4453), since v10.0.0)
* Released `realm-network-transport` to adopt the changes published to fix `globalThis` undefined issue for older devices. ([#4350](https://github.com/realm/realm-js/issues/4350), since v10.0.0)
* Fixed flexible sync crash when updating subscriptions after token expiry. ([#4421](https://github.com/realm/realm-js/issues/4421), since v10.12.0)
* Fixed remaining uses of `globalThis` undefined issue, causing Realm to not load on iOS 11/12. ([#4350](https://github.com/realm/realm-js/issues/4350))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Update token in integration test.
* Upgraded Realm Core from v11.12.0 to v11.13.0.
* Added a failing test case for Node.js scripts failing to exit cleanly ([#4556](https://github.com/realm/realm-js/pull/4556))

## 10.14.0 (2022-3-24)

### Enhancements
* `Realm.writeCopyTo()` can now be invoked with a `Realm.Configuration` as parameter, which will create a copy of the Realm that conforms to the given configuration -- this allows for a much wider range of conversions between synced/local Realms and encrypted/non-encrypted Realms. ([#3146](https://github.com/realm/realm-js/issues/4136))
* Added `Realm.Configuration.onFirstOpen` to populate a new Realm with initial data.

### Fixed
* Fixed issue that could cause mangling of binary data on a roundtrip to/from the database ([#4278](https://github.com/realm/realm-js/issues/4278), since v10.1.4).
* Fixed `globalThis` undefined issue for older devices. ([#4350](https://github.com/realm/realm-js/issues/4350))
* Fixed a fatal sync error `Automatic recovery failed` during DiscardLocal client reset if the reset notifier callbacks were not set to something. ([realm/realm-core#5223](https://github.com/realm/realm-core/issues/5223), since v10.10.0)
* Changed parsed queries using the `between` operator to be inclusive of the limits, a closed interval instead of an open interval. This is to conform to the published documentation and for parity with NSPredicate's definition. ([realm/realm-core#5262](https://github.com/realm/realm-core/issues/5262), since v10.7.0)
* If a list of objects contains links to objects not included in the synchronized partition, the indices contained in the listener callback could be wrong. ([realm/realm-core#5164](https://github.com/realm/realm-core/issues/5164), since v10.0.0)
* Converting floats/doubles into Decimal128 would yield imprecise results. ([realm/realm-core#5184](https://github.com/realm/realm-core/pull/5184), since v6.1.3)
* Using accented characters in class and property names may end the sync session ([realm/realm-core#5196](https://github.com/realm/realm-core/pull/5196), since v10.3.0-rc.1)
* Waiting for upload after opening a bundled Realm file could hang. ([realm/realm-core#5277](https://github.com/realm/realm-core/issues/5277), since v10.10.0)
* Realm Query Language would not accept `in` as a property name. ([realm/realm-core#5312](https://github.com/realm/realm-core/issues/5312))
* Fixed an issue that could lead to a crash with exceptions like `'KeyNotFound'`. ([realm/realm-core#5283](https://github.com/realm/realm-core/issues/5283), since v6.0.0)
* Refreshing the user profile after the app has been destroyed leads to a failure. ([realm/realm-dotnet#2800](https://github.com/realm/realm-dotnet/issues/2800)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.9.0 to v11.12.0.
* Fixed analytics to read the `realm/package.json` when installing from the root of the package.
* Changed token for analytics.
* Fixed React Native Android integration test harness to read only one pid when starting logcat.
* Added a script to generate JS template apps from TS, and updated JS templates. ([4374](https://github.com/realm/realm-js/pull/4374))

## 10.13.0 (2022-2-11)

### Enhancements
* Added `Realm.App#deleteUser(user)` to delete a sync user from a MongoDB Realm app. ([#4006](https://github.com/realm/realm-js/issues/4006))
* Extended `Realm.writeCopyTo()` functionality to allow conversion of non-synced Realms to synced Realms. ([#4136](https://github.com/realm/realm-js/issues/4136))

### Fixed
* Fixed a crash when using `Proxy` with a `Realm.Results` object. ([#4257](https://github.com/realm/realm-js/pull/4257))
* JWT metadata is now populating `Realm.User.profile`. ([#3268](https://github.com/realm/realm-js/issues/3268), since v10.0.0)
* Security upgrade of `prebuild-install`. ([#4281](https://github.com/realm/realm-js/issues/4281))
* UserIdentity metadata table will no longer occationally grow indefinitely. ([realm/realm-core#5152](https://github.com/realm/realm-core/pull/5144), since v10.0.0)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.8.0 to v11.9.0.
* Fixed documentation publishing. ([#4276](https://github.com/realm/realm-js/pull/4276))
* Enabled mixed tests for flexible sync. ([#4279](https://github.com/realm/realm-js/pull/4279))
* Fixed an issue where some references were not updated from `Subscriptions` to `SubscriptionSet`. ([#4298](https://github.com/realm/realm-js/pull/4298))
* Submitting [analytics](https://github.com/realm/realm-js/blob/main/README.md#analytics) as a postinstall script.

## 10.12.0 (2022-1-24)

### Notes
This release adds beta support for flexible sync. See the [backend](https://docs.mongodb.com/realm/sync/data-access-patterns/flexible-sync/) and [SDK](https://docs.mongodb.com/realm/sdk/node/fundamentals/realm-sync/#flexible-sync) documentation for more information. Please report any issues with the beta through Github.

Please note the following API changes from the `10.12.0-beta.1` release of Flexible Sync:
* `Realm.getSubscriptions()` is now `Realm.subscriptions`
* `Subscriptions` has been renamed to `SubscriptionSet`, and `MutableSubscriptions` to `MutableSubscriptionSet`
* `SubscriptionSet.snaphot()` has been removed, in favour of allowing a `SubscriptionSet` to be accessed as an array
* `SubscriptionSet.find()` has been renamed to `SubscriptionSet.findByQuery()` to avoid a naming confict with the `Array.find` method
* `SubscriptionSet.empty` has been renamed to `SubscriptionSet.isEmpty`
* The result of `Realm.subscriptions.update` can be `await`ed to avoid a separate call to `waitForSynchronization`
* The spelling of `SubscriptionState.Superceded` was corrected to `SubscriptionState.Superseded`

### Enhancements
* Support arithmetic operations (+, -, *, /) in queries. Operands can be properties and/or constants of numeric types (`int`, `float`, `double` or `Decimal128`). You can now say something like `(age + 5) * 2 > child.age`.
* `Realm.writeCopyTo()` now supports creating snapshots of synced Realms, thus allowing apps to be shipped with partially-populated synced databases. ([#3782](https://github.com/realm/realm-js/issues/3782)
* Added beta support for flexible sync ([#4220](https://github.com/realm/realm-js/pull/4220)).
* Adding support for passing the `arrayFilters` parameter when updating documents using the remote MongoDB client. ([#4248](https://github.com/realm/realm-js/pull/4248))

### Fixed
* Opening a Realm with a schema that has an orphaned embedded object type performed an extra empty write transaction. ([realm/realm-core#5115](https://github.com/realm/realm-core/pull/5115), since v10.5.0)
* Schema validation was missing for embedded objects in sets, resulting in an unhelpful error being thrown if the user attempted to define one. ([realm/realm-core#5115](https://github.com/realm/realm-core/pull/5115))
* Fixed a crash when closing an Electron app with a custom sync error handler ([#4150](https://github.com/realm/realm-js/issues/4150)
* Adding data from authentication providers, to be included in the `User#profile` object. ([#3268](https://github.com/realm/realm-js/issues/3268), since v10.0.0)

### Compatibility
* Removed `deprecated-react-native-listview` from root package.json
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.7.0 to v11.8.0.
* Removed `.dir-locals.el`. Please configure Emacs to use `clang-format` e.g. https://github.com/SavchenkoValeriy/emacs-clang-format-plus.
* Enabled `strictNullChecks` for integration tests
* Updated release instructions

## 10.11.0 (2021-12-21)
### Enhancements
* Added templates for Expo (https://www.npmjs.com/package/@realm/expo-template-js and https://www.npmjs.com/package/@realm/expo-template-ts).
* A new mode `discardLocal` for client reset has been introduced. The old behavior is supported (but deprecated) through the `manual` mode. The new mode will discard any local changes, and a fresh copy of the Realm will be downloaded. An example of the configuration:

```js
const config = {
  // ...
  sync: {
    // ...
    clientReset: {
      mode: "discardLocal",
      clientResyncBefore: (realm) => { /* ... */ },
      clientResyncAfter: (beforeRealm, afterRealm) => { /* ... */ },
    },
  },
};
```

### Fixed
* If the option `user` in a sync configuration was not a `Realm.User` object could lead to a crash. ([#1348](https://github.com/realm/realm-js/issues/1348), since v10.0.0)
* `@sum` and `@avg` queries on Dictionaries of floats or doubles used too much precision for intermediates, resulting in incorrect rounding. (since v10.3.0-rc.1)
* Queries of the form `link.collection.@sum = 0` where `link` is `null` matched when `collection` was a List or Set, but not a Dictionary ([realm/realm-core#5080](https://github.com/realm/realm-core/pull/5080), since v10.5.0)
* Fix Realm for versions of Node greater than 14. ([#4149](https://github.com/realm/realm-js/pull/4149))
* Type methods defined in `collection-methods.js` no longer throw `Realm not defined` errors in some environments ([#4029](https://github.com/realm/realm-js/issues/4029), [#3991](https://github.com/realm/realm-js/issues/3991), since v10.5.0)
* Fixed a bug in `Realm.App.emailPasswordAuth.callResetPasswordFunction()` which could lead to the error `Error: Error: resetDetails must be of type 'object', got (user@example.com)`. ([#4143](https://github.com/realm/realm-js/issues/4143), since v10.10.0)
* Using a custom logger on Sync sessions could trigger a segmentation fault. ([#4121](https://github.com/realm/realm-js/issues/4121), since v10.5.0)
* Fixed `MongoDBCollection#watch` on React Native (https://github.com/realm/realm-js/issues/3494, since v10.0.0). To use this, you must install:
  1. Polyfills for `fetch`, `ReadableStream` and `TextDecoder`: https://www.npmjs.com/package/react-native-polyfill-globals
  2. Babel plugin enabling async generator syntax: https://npmjs.com/package/@babel/plugin-proposal-async-generator-functions

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgrade `ReactTestApp` to RN 0.66.3 and to use the metro bundler to resolve links to relam and test code.
* Add `.clang-format` file for formatting C++ code, formatted all existing code and added a lint check for C++.
* Updated Docker URL to new canonical URL of `ghcr.io`
* Excluding the `react-native/android/build` directory from the NPM package.
* Removed the `examples/ReactExample` app. See [FindOurDevices](https://github.com/realm/FindOurDevices) for a modern example app.
* Removed undocumented, outdated and unused `ListView` component exported via `realm/react-native`. See [@realm.io/react](https://www.npmjs.com/package/@realm.io/react) for a modern integration with React.
* Sending the correct version when submitting analytics requests on Android, as a side-effect of [#4114](https://github.com/realm/realm-js/pull/4114/files#diff-58e627175b916d5dcb05c3c8bd5b10fb18cd72ce6e40e41d8d1c51e984fe32e8L73-R73).
* Removed TypeScript dependency from individual sub-packages so all packages share the root version, and updated the root TypeScript version to `4.5.2`.
* Consuming TypeScript directly from the integration test environments, instead of transpiling first.
* Adding a new private `@realm/metro-config` package to share this across any React Native app in our repo that reference other packages via symbolic links.
* Added a performance test suite to the integration test.
* Upgraded Realm Core from v11.6.1 to v11.7.0.

## 10.10.1 (2021-11-18)

### Enhancements
* None.

### Fixed
* A sync user's Realm was not deleted when the user was removed if the Realm path was too long such that it triggered the fallback hashed name (this is OS dependant but is 300 characters on linux). ([realm/realm-core#4187](https://github.com/realm/realm-core/issues/4187), since  v10.0.0-beta.10)
* Fixed a bug where opening a synced Realm would hang if the device's clock is more than 30 minutes fast. ([realm/realm-core#4941](https://github.com/realm/realm-core/issues/4941), since v10.0.0)
* Fixed a bug where an app hangs if it tries to connect after being offline for more than 30 minutes. ([#3882](https://github.com/realm/realm-js/issues/3882), since v10.0.0)


### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.6.0 to v11.6.1.

## 10.10.0 (2021-11-11)


### Deprecations
* `EmailPasswordAuth` method calls using positional arguments are being deprecated in favour of using a single object dictionary argument. See "Examples of how to update to the new API" in the description of https://github.com/realm/realm-js/pull/4041 for examples of how to update each method call.
    * The existing methods will be removed in the next major version.
    * The existing methods will continue to work but will output a deprecation warning to the console in development mode when used, of the form: `Deprecation warning from Realm: resetPassword(password, token, token_id) is deprecated and will be removed in a future major release. Consider switching to resetPassword({ password, token, token_id })`.

### Enhancements
* New consistent API for `EmailPasswordAuth` methods, using a single object dictionary rather than positional arguments, to fix inconsistencies and make usage clearer. The existing API is being deprecated (see above). ([#3943](https://github.com/realm/realm-js/issues/3943))

### Fixed
* Aligned implementation with API documentation and TS defs: `timeOutBehavior` should be `"openLocalRealm"`. (since v10.0.0)
* Using `sort`, `distinct`, or `limit` as property name in query expression would cause an `Invalid predicate` error. ([realm/realm-java#7545](https://github.com/realm/realm-java/issues/7545), since v10.0.2)
* Fixed a rare assertion failure or deadlock when a sync session. ([realm/realm-core#4931](https://github.com/realm/realm-core/issues/4931))
* Fixed a rare segfault which could trigger if a user was being logged out while the access token refresh response comes in. ([realm/realm-core#4944](https://github.com/realm/realm-core/issues/4944), since v10.0.0)
* Fixed a user being left in the logged in state when the user's refresh token expires. ([realm/realm-core#4882](https://github.com/realm/realm-core/issues/4882), since v10.0.0)
* Allow for `EPERM` to be returned from `fallocate()`. This improves support for running on Linux environments with interesting file systems, like AWS Lambda. Thanks to [@ztane](https://github.com/ztane) for reporting and suggesting a fix. ([realm/realm-core#4957](https://github.com/realm/realm-core/issues/4957) and [#1832](https://github.com/realm/realm-js/issues/1832))
* Sync progress notifiers would not trigger when the downloadable bytes size would equal 0. ([realm/realm-core#4989](https://github.com/realm/realm-core/pull/4989), since v10.3.0-rc.1)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.4.1 to v10.6.0.
* Added use of [ccache](https://ccache.dev/) in build scripts, XCode projects and the integration tests GHA workflow.
* Dropped using `install-local` in the integration tests, in favour of a more involved Metro configuration.
* Added combined type definition for Realm.object and Realm.objectForPrimaryKey so they can be cleanly wrapped.
* Changed Apple/Linux temporary directory to default to the environment's `TMPDIR` if available. This is primarily used by tests. ([realm/realm-core#4921](https://github.com/realm/realm-core/issues/4921))
* Added colorized compiler diagnostics if using Ninja.
* Minor speed improvement in property setters. ([#4058](https://github.com/realm/realm-js/pull/4058) and [realm/realm-core#5011](https://github.com/realm/realm-core/pull/5011))

## 10.9.1 (2021-10-20)

### Enhancements
* None

### Fixed
* Address memory leak in the `Mixed` implementation affecting all datatypes ([#3913](https://github.com/realm/realm-js/issues/3913), [#4007](https://github.com/realm/realm-js/issues/4007), [#4016](https://github.com/realm/realm-js/issues/4016), since v10.5.0)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* None

## 10.9.0 (2021-10-18)

### Enhancements
* None

### Fixed
* Remove usage of deprecated features for Gradle 7 ([#3946](https://github.com/realm/realm-js/issues/3946), [#3879](https://github.com/realm/realm-js/issues/3879))
* A `sync` configuration value of `undefined` now behaves the same as a missing `sync` configuration ([#3999](https://github.com/realm/realm-js/issues/3999), since v2.2.0)
* Empty string is now a valid `partitionValue` ([#4002](https://github.com/realm/realm-js/issues/4002), since v10.0.0)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Updated `README.md` and `building.md` with updated instructions on building from source.
* Changed logo to a 'dark-mode' aware SVG ([#4020](https://github.com/realm/realm-js/pull/4020))
* Added workaround for crash when closing Realm in Jest test on Node 12 ([#4025](https://github.com/realm/realm-js/pull/4025), since v10.8.0)

## 10.9.0-rc.1 (2021-10-13)

### Enhancements
* Realm JS now support retrying Custom Confirmation functions for Realm Sync users via `retryCustomConfirmation`. ([#3032](https://github.com/realm/realm-js/issues/3032) since v10.0.0)

### Fixed
* React Native templates now transfer hidden files into new projects([#3971](https://github.com/realm/realm-js/issues/3971))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Lint react-native templates and ensure they are checked by the CI.
* Using Realm Core v11.4.1.
* Small fix to Jenkins to publish Docker image for Raspberry Pi.

## 10.8.0 (2021-9-14)
### Enhancements
* Synchronized Realms are no longer opened twice, cutting the address space and file descriptors used in half. ([realm/realm-core#4839](https://github.com/realm/realm-core/pull/4839))
* `Realm.write()` now returns callback return value. ([#2237](https://github.com/realm/realm-js/issues/2237))
* Added `Realm.Object.getPropertyType()` which returns the type of the property. For a mixed property, the underlying type will be returned. ([#3646](https://github.com/realm/realm-js/issues/3646))

### Fixed
* Fixed issue when opening a synced Realm is prevented by assertion `m_state == SyncUser::State::LoggedIn`. ([realm/realm-core#4875](https://github.com/realm/realm-core/issues/4875), since v10.0.0)
* Fixed slow teardown of Realm by which interfered with Jest. ([#3620](https://github.com/realm/realm-js/issues/3620) and [#2993](https://github.com/realm/realm-js/issues/2993), since v10.0.0)
* If an object with a null primary key was deleted by another sync client, the exception `KeyNotFound: No such object` could be triggered. ([realm/realm-core#4885](https://github.com/realm/realm-core/issues/4885), since v10.0.0)
* Improved the error message when trying to use an array as value for a dictionary. ([#3730](https://github.com/realm/realm-js/issues/3730), since v10.6.0)
* When opening a synced Realm with a `Realm.Dictionary` property, an exception similar to `Property 'Dictionary.columnFloatDictionary' has been made optional` might be thrown. (since v10.6.0)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.3.1 to v11.4.1. ([#3942](https://github.com/realm/realm-js/issues/3942))
* Extend Jest test runner to cover opening and closing of a Realm.
* Disable analytics if the `CI` environment variable is set to some value.

## 10.7.0 (2021-8-30)

### Enhancements
* Sync logs now contain information about what object/changeset was being applied when the exception was thrown. ([realm/realm-core#4836](https://github.com/realm/realm-core/issues/4836))
* Query parser now accepts `BETWEEN` operator. It can be used like `Age BETWEEN {20, 60}` which means "'Age' must be in the open interval ]20;60[". ([realm/realm-core#4268](https://github.com/realm/realm-core/issues/4268) and [#805](https://github.com/realm/realm-js/issues/805))
* Changed error code for wrong username/password to 50. ([realm/realm-core#4581](https://github.com/realm/realm-core/issues/4581))

### Fixed
* Fixed history corruption when replacing an embedded object in a list. ([realm/realm-core#4845](https://github.com/realm/realm-core/issues/4845), since v10.0.0)
* Fixed `Invalid data type` assertion failure in the sync client when adding an existing `mixed` property when it already exists locally. ([realm/realm-core#4873](https://github.com/realm/realm-core/issues/4873), since v10.5.0)
* Fixed a crash when accessing the lock file during deletion of a Realm on Windows if the folder does not exist. ([realm/realm-core#4855](https://github.com/realm/realm-core/pull/4855))
* Fixed a crash when an object which is linked to by a `mixed `is invalidated (sync only). ([#4828](https://github.com/realm/realm-core/pull/4828), since 10.5.0)
* Fixed a rare crash when setting a mixed link for the first time which would trigger if the link was to the same table. ([#4828](https://github.com/realm/realm-core/pull/4828), since v10.5.0)
* User profile now correctly persisted between runs. ([#3561](https://github.com/realm/realm-js/issues/3561), since v10.0.0)
* When updating a property of list of embedded objects, previous value is not cleared and might lead to an inconsistent state (sync only). ([realm/realm-core#4844](https://github.com/realm/realm-core/pull/4844))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Pinning BSON to v4.4.1.
* Disable analytics if `NODE_ENV` is set to `"production"` or `"test"`. Since `NODE_ENV` is used by many commonly used JavaScript frameworks, this should help us to get a better signal-to-noise ratio in our builders' statistics.
* Upgraded Realm Core v11.2.0 @ [5e128e9f](https://github.com/realm/realm-core/pull/4844/commits/5e128e9f9c81937aaa7e7d1429794983b16077aa) to v11.3.1.
* Switch testing to node v12.22.5.
* Enabled CI testing on Android.

## 10.6.2-beta.1 (2021-8-12)

### Enhancements
* None.

### Fixed
* Fixed a crash when an object which is linked to by a `mixed `is invalidated (sync only). ([#4828](https://github.com/realm/realm-core/pull/4828), since 10.5.0)
* Fixed a rare crash when setting a mixed link for the first time which would trigger if the link was to the same table. ([#4828](https://github.com/realm/realm-core/pull/4828), since v10.5.0)
* User profile now correctly persisted between runs. ([#3561](https://github.com/realm/realm-js/issues/3561), since v10.0.0)
* When updating a property of list of embedded objects, previous value is not cleared and might lead to an inconsistent state (sync only). ([realm/realm-core#4844](https://github.com/realm/realm-core/pull/4844))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Upgraded Realm Core from v11.0.4 @ commit [be69223](https://github.com/realm/realm-core/commit/be6922394a57077d90723eba60c98ae9b2aa0eae) to v11.2.0 @ [5e128e9f](https://github.com/realm/realm-core/pull/4844/commits/5e128e9f9c81937aaa7e7d1429794983b16077aa)

## 10.6.1 (2021-7-27)

### Enhancements
* None.

### Fixed
* Fixed TypeScript definition of `Realm.Dictionary.remove()`. ([#3853](https://github.com/realm/realm-js/pull/3853) since v10.6.0)
* Fixed `Realm.Object#toJSON` as it threw `Right-hand side of 'instanceof' is not an object`. ([#3872](https://github.com/realm/realm-js/pull/3872) since v10.6.0)
* Fixed `Realm not defined` error experienced when using `Realm.Set` iterators under Jest ([#3843](https://github.com/realm/realm-js/pull/3843) since v1.5.0-beta1)

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Add Jenkins job for testing Catalyst
* Metrics is no longer submitted to MixPanel, but uploaded to S3.
* Ran --fix for linters in all sub-packages of the repository.
* Add step for Catalyst integration tests
* Using Realm Core v11.0.4 @ commit [be69223](https://github.com/realm/realm-core/commit/be6922394a57077d90723eba60c98ae9b2aa0eae) for Catalyst support

## 10.6.0 (2021-7-8)

### Enhancements
* Dictionary support has been enabled.
* Support for Catalyst. ([#3750](https://github.com/realm/realm-js/issues/3750))

### Fixed
* Fixed an issue preventing opening a Realm with `disableFormatUpgrade` and a `sync` configuration, reverting part of [#3772](https://github.com/realm/realm-js/pull/3772). ([#3830](https://github.com/realm/realm-js/pull/3830), since v10.4.2)
* Fixed a recursive loop which would eventually crash trying to refresh a user app token when it had been revoked by an admin. Now this situation logs the user out and reports an error. ([realm/realm-core#4745](https://github.com/realm/realm-core/issues/4745), since v10.0.0)
* Fixed a crash after clearing a list or set of Mixed containing links to objects. ([realm/realm-core#4774](https://github.com/realm/realm-core/issues/4774), since the beginning of v11)
* Fixed an endless recursive loop that could cause a stack overflow when computing changes on a set of objects which contained cycles. ([#4770](https://github.com/realm/realm-core/pull/4770), since the beginning of v11)

### Known Issues
* `instanceof Realm.Dictionary` will always be `false` on React Native. ([#3836](https://github.com/realm/realm-js/issues/3836))

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Using Realm Core v11.0.4 @ commit [be69223](https://github.com/realm/realm-core/commit/be6922394a57077d90723eba60c98ae9b2aa0eae) for Catalyst support
* Upgraded test app to RN 0.64.1

## 10.5.0 (2021-6-24)

NOTE: Bump file format version to 22. NO DOWNGRADE PATH IS AVAILABLE.

### Enhancements
* Added UUID types. ([#3244](https://github.com/realm/realm-js/issues/3244))
* Added Set type ([#3378](https://github.com/realm/realm-js/issues/3378)).
* Adding Mixed types. ([#3389](https://github.com/realm/realm-js/issues/3389))
* Added `ssl` option to `Realm.App.Sync` configuration.

### Fixed
* Performance regression for some scenarios of writing/creating objects with a primary key. ([realm/realm-core#4522](https://github.com/realm/realm-core/issues/4522))
* Async callbacks not triggered on Android 12 emulator. ([realm/realm-core#4666](https://github.com/realm/realm-core/issues/4666))
* Fixed the string based query parser not supporting integer constants above 32 bits on a 32 bit platform. ([#3773](https://github.com/realm/realm-js/issues/3773), since v10.4.0)
* Fixed the naming of `url` (now `baseUrl`) property on an app config to match the TypeScript declaration and other SDKs. ([#3612](https://github.com/realm/realm-js/issues/3612))


### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format 22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Known Issues
* Set iterators do not work under Jest ([#3788](https://github.com/realm/realm-js/issues/3788)).
* Properties of type dictionary is temporarily disabled and will be reintroduced.

### Internal
* Improved the integration test harness to increase developer experience, enable tests needing a server and importing Realm apps on demand. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Migrated integration tests to GitHub Actions. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Upgraded to Realm Core from v11.0.0-beta.5 to v11.0.3. ([#3785](https://github.com/realm/realm-js/issues/3785))
* Added npm script to generate internal Doxygen documentation.
* Removed private methods `Realm._objectForObjectId()` and `Realm.Object._objectId()`.
* Refactor the string formatting logic for logging, reducing the compiled size of the library.
* Omitting zlib when building for Node.js on Windows, since this is no longer provided by the platform. ([#3787](https://github.com/realm/realm-js/pull/3787))

## 10.5.0-beta.2 (2021-5-12)

NOTE: Realm file format is likely to break and you CAN NOT revert back to the previous file format - DATA WILL BE LOST!!!!
NOTE: Sync protocol version 4: CANNOT SYNC WITH MONGODB REALM CLOUD.
NOTE: Bump file format version to 21. NO DOWNGRADE PATH IS AVAILABLE.

### Enhancements
* None.

### Fixed
* Set didn't export `objectType` to Realm.schema when it contained scalar types.
* Fixed the naming of `url` (now `baseUrl`) property on an app config to match the TypeScript declaration and other SDKs. ([#3612](https://github.com/realm/realm-js/issues/3612))
* Add explicitly support for Nullable/Undefined values for the Mixed type. ([#3731](https://github.com/realm/realm-js/issues/3731))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v21 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Improved the integration test harness to increase developer experience, enable tests needing a server and importing Realm apps on demand. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Migrated integration tests to GitHub Actions. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Upgraded to Realm Core v11.0.0-beta.5.

## 10.5.0-beta.1 (2021-5-6)

NOTE: This is an internal release and SHOULD NOT be used.
NOTE: Realm file format is likely to break and you CAN NOT revert back to the previous file format - DATA WILL BE LOST!!!!
NOTE: Sync protocol version 4: CANNOT SYNC WITH MONGODB REALM CLOUD.
NOTE: Bump file format version to 21. NO DOWNGRADE PATH IS AVAILABLE.

### Enhancements
* None.

### Fixed

* Performance regression for some scenarios of writing/creating objects with a primary key. ([realm/realm-core#4522](https://github.com/realm/realm-core/issues/4522))
* Observing a dictionary holding links to objects would crash. ([realm/realm-core#4711](https://github.com/realm/realm-core/issues/4711), since v11.0.0-beta.1)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format 21 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Improved the integration test harness to increase developer experience, enable tests needing a server and importing Realm apps on demand. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Migrated integration tests to GitHub Actions. ([#3690](https://github.com/realm/realm-js/pull/3690))
* Upgraded to Realm Core from v11.0.0-beta.5 to v11.0.0-beta.6.
* Added npm script to generate internal Doxygen documentation.
* Removed private methods `Realm._objectForObjectId()` and `Realm.Object._objectId()`.
* Omitting zlib when building for Node.js on Windows, since this is no longer provided by the platform. ([#3787](https://github.com/realm/realm-js/pull/3787))

## 10.4.2 (2021-6-10)

### Enhancements
* None.

### Fixed
* A warning to polyfill `crypto.getRandomValues` was triggered prematurely. ([#3714](https://github.com/realm/realm-js/issues/3714), since v10.4.0)
* Mutual exclusive configuration options (`sync`/`inMemory` and `sync`/`migration`) could lead to a crash. ([#3771](https://github.com/realm/realm-js/issues/3771), since v1.0.0)
* Disabled executable stack on Linux. ([#3752](https://github.com/realm/realm-js/issues/3752), since v10.2.0)
* Don't hang when using the network after hot-reloading an RN app. ([#3668](https://github.com/realm/realm-js/issues/3668))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Omitting zlib when building for Node.js on Windows, since this is no longer provided by the platform. (backport of [#3787](https://github.com/realm/realm-js/pull/3787))

## 10.4.1 (2021-5-13)

### Enhancements
* None.

### Fixed
* Fixed the naming of `url` (now `baseUrl`) property on an app config to match the TypeScript declaration and other SDKs. ([#3612](https://github.com/realm/realm-js/issues/3612))
* `Realm.User.callFunction()` could crash if no arguments were applied. ([#3718](https://github.com/realm/realm-js/issues/3718), since v10.0.0)
* Proactively check the expiry time on the access token and refresh it before attempting to initiate a sync session. This prevents some error logs from appearing on the client such as `ERROR: Connection[1]: Websocket: Expected HTTP response 101 Switching Protocols, but received: HTTP/1.1 401 Unauthorized`. (since v10.0.0)
* Fixed a race condition which could result in a skipping notifications failing to skip if several commits using notification skipping were made in succession. (since v6.0.0)
* Added guard against unresolved link which could crash with `Assertion failed: !key.is_unresolved()`. ([#3611](https://github.com/realm/realm-js/issues/3611), since v6.1.3)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Core from v10.6.0 to 10.7.2.
* Added binaries for Apple Silicon (M1). ([#3257](https://github.com/realm/realm-js/issues/3527))
* Throwing a more meaningful error when loading `librealm.so` fails from being loaded in an app using Hermes. ([#3633](https://github.com/realm/realm-js/pull/3633))

## 10.4.1-rc.3 (2021-5-10)

### Enhancements
* None.

### Fixed
* None.
### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Core from v10.6.0 to 10.7.1
* Added binaries for Apple Silicon (M1). ([#3257](https://github.com/realm/realm-js/issues/3527))

## 10.4.0 (2021-4-15)

### Enhancements
* We now make a backup of the realm file prior to any file format upgrade. The backup is retained for 3 months. Backups from before a file format upgrade allows for better analysis of any upgrade failure. We also restore a backup, if a) an attempt is mad
e to open a realm file whith a “future” file format and b) a backup file exist that fits the current file format. ([#4166](https://github.com/realm/realm-core/pull/4166))


### Fixed
* Using node version 15, the error `sh: cmake-js: command not found` will prevent installation. ([#3670](https://github.com/realm/realm-js/issues/3670), since v10.3.0-rc.1)
* On React Native, calling an aggregate function would fail with error `Not implemented`. ([#3674](https://github.com/realm/realm-js/issues/3674), since v10.2.0)
* Fixed name aliasing (`mapTo` in schemas) not working in sort/distinct clauses of the query language. ([realm/realm-core#4550](https://github.com/realm/realm-core/issues/4550), never worked)
* Potential/unconfirmed fix for crashes associated with failure to memory map (low on memory, low on virtual address space). ([realm/realm-core#4514](https://github.com/realm/realm-core/issues/4514))
* Fixed collection notification reporting for modifications. This could be observed by receiving the wrong indices of modifications on sorted or distinct results, or notification blocks sometimes not being called when only modifications have occured. ([r
ealm/realm-core#4573](https://github.com/realm/realm-core/pull/4573), since v6.0.0)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format 21.

### Internal
* Bump the Realm Sync protocol version to 3.
* Bump Realm File Format version to 21.
* Prebuild the React Native iOS variant and bundle it in the npm tarball. ([#3649](https://github.com/realm/realm-js/pull/3649))

## 10.3.0 (2021-3-30)

NOTE: This release has a number of fixes compared to v10.3.0-rc.1. For a complete changelog, please see v10.3.0-rc.1.

### Enhancements
* None.

### Fixed
* Classes names `class_class_...` were not handled correctly in queries. ([realm/realm-core#4480](https://github.com/realm/realm-core/issues/4480))
* Syncing large `Decimal128` values will cause `Assertion failed: cx.w[1] == 0`. ([realm/realm-core#4519[(https://github.com/realm/realm-core/issues/4519)], since v10.0.0)
* Avoid race condition leading to possible hangs on Windows. ([realm/realm-dotnet#2245](https://github.com/realm/realm-dotnet/issues/2245))
* During integration of a large amount of data from the MongoDB Realm, you may get `Assertion failed: !fields.has_missing_parent_update()`. ([realm/realm-core#4497](https://github.com/realm/realm-core/issues/4497), since v6.0.0)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Core from v10.5.4 to v10.5.6.

## 10.3.0-rc.1 (2021-3-19)

### Enhancements
* Added support for comparing numbers to boolean values in queries.

### Fixes
* On 32 bit devices you may get exception with `No such object` when upgrading from v6.x to v10.x ([realm/realm-java#7314](https://github.com/realm/realm-java#7314), since v10.0.0)
* Restore support for upgrading files from file format 5 (Realm JavaScript 1.x). ([realm/realm-cocoa#7089](https://github.com/realm/realm-cocoa/issues/7089), since v6.0.0)
* Fixed a bug that prevented an object type with incoming links from being marked as embedded during migrations. ([realm/realm-core#4414](https://github.com/realm/realm-core#4414))
* During synchronization you might experience crash with `Assertion failed: ref + size <= next->first`. ([realm/realm-core#4388](https://github.com/realm/realm-core#4388))
* There seems to be a few issues regarding class support in realm-js. We are currently coming up with strategies to better support this in the future. In the meantime, the following fixes have been applied to help avoid crashes and failures.
  * When creating a class that extends Realm.Object and pushing the instantiated object to a list, a segmentation fault would occur. This has been fixed by a null check and throwing an exception.
  * Creating an object from an instance of Realm.Object that was manually constructed (detached from Realm) would fail the second time. Now we throw a meaningful exception the first time.
* Removed a delay when running in node.js. It could make testing using Jest to fail. ([#3608](https://github.com/realm/realm-js/issues/3608), since v2.0.0)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Switch to unified releases of Realm Core, Realm Sync and Realm Object Store.
* Upgraded to Realm Core v10.5.4.


## 10.2.0 (2021-2-5)

### Enhancements
* Adding sync-logging support to Android/iOS. ([#2491](https://github.com/realm/realm-js/issues/2491))

### Fixed
* Fixing regression on [Array Buffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) throwing an error when inserting an empty value in an optional binary field. [#3536](https://github.com/realm/realm-js/issues/3536).

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Added metrics migration to webhooks.

## 10.1.4 (2021-1-27)

### Enhancements
* None.

### Fixed
* App crashed if a native error was thrown during `Realm.open(...)` ([#3414](https://github.com/realm/realm-js/issues/3414), since v10.0.0)
* Fixed an issue in Node.js, where utilizing an ArrayBuffer for setting a binary property, would mangle the data. ([#3518](https://github.com/realm/realm-js/issues/3518))
* Fixed an issue where scripts may hang rather than executing after all code has executed. ([#3525](https://github.com/realm/realm-js/issues/3525), since v2.0.0)
* Fixed TS declarations for `Realm.ErrorCallback`. (since v2.0.0)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded OpenSSL v1.1.b to v1.1.1g (Linux).

## 10.1.3 (2021-1-15)

### Enhancements
* Added an export of the `bson` module on the package, making it possible to access the BSON types via `import Realm from "realm";` followed by `Realm.BSON.ObjectId`, `Realm.BSON.Decimal128`, `Realm.BSON.Binary` etc. ([#3363](https://github.com/realm/realm-js/pull/3363))

### Fixed
* Fixed a bug where elements in the `User#identities` array would have a `userId` which was actually an `id` of the identity. ([#3481](https://github.com/realm/realm-js/pull/3481), since v10.0.0-beta.13)
* Fixed a crash after getting a 401 error inside sync. ([#3503](https://github.com/realm/realm-js/issues/3206), since v10.0.0)
* Fixed a bug which could lead to a `BadChangeset Error` (`ProtocolErrorCode=212`).

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Sync from v10.1.5 to v10.1.6.

## 10.1.2 (2020-12-16)

### Enhancements
* None.

### Fixed
* Fixed creating objects and assigning properties of BSON Decimal128 and ObjectId types, when running in React Native Chrome debugging mode. ([#3452](https://github.com/realm/realm-js/issues/3452) & [#3454](https://github.com/realm/realm-js/issues/3454), since v10.0.0)
* Fixed a crash that would happen if the app did a network request after the app got refreshed during development and the Chrome debugging mode was disabled. NOTE: Because of [#3206](https://github.com/realm/realm-js/issues/3206) the fix has not been implemented on Android. ([#3457](https://github.com/realm/realm-js/issues/3457), since v10.0.2)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* CI integration updated to use Xcode 12.
* Support for newest version of Object Store.
* Push functionality test re-enabled.

## 10.1.1 (2020-12-11)

### Enhancements
* None.

### Fixed
* Integrating changesets from the server would sometimes hit the assertion failure `n != realm::npos` inside `Table::create_object_with_primary_key()` (in JS: `Realm.create()`) when creating an object with a primary key which previously had been used and had incoming links. ([realm/realm-core#4180](https://github.com/realm/realm-core/pull/4180), since v10.0.0)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Core from v10.1.3 to v10.1.4.
* Upgraded Realm Sync from v10.1.4 to v10.1.5.

## 10.1.0 (2020-12-8)

### Enhancements
* Added support of OpenID Connect credential for the Google authentication provider. ([#3383](https://github.com/realm/realm-js/issues/3383))

### Fixed
* Fixing the construction of Realm instances declararing the schema, when running in the React Native Chrome debugging mode, by removing it. Note: This is not considered a breaking change, since this behaviour was never documented. ([#3442](https://github.com/realm/realm-js/pull/3442), since v10.0.0)
* Fixed a bug that would prevent eventual consistency during conflict resolution. Affected clients would experience data divergence and potentially consistency errors as a result if they experienced conflict resolution between cycles of Create-Erase-Create for objects with same primary key.

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded to Realm Sync from v10.1.3 to v10.1.4
* The sync client now requires a server that speaks protocol version 2 (Cloud version 20201202 or newer).

## 10.0.2 (2020-12-5)

### Enhancements
* None.

### Fixed
* Fixed an issue in `toJSON()`, in combination with primaryKeys, where data from another table could be returned. ([#3331](https://github.com/realm/realm-js/issues/3331), since v10.0.0)
* Fixed an issue in `toJSON()` where `data` would output as `{}`, it now returns the data base64 encoded. ([#3356](https://github.com/realm/realm-js/pull/3356), since v10.0.0)
* Fixed a bug where setting `shouldCompactOnLaunch` would lead to a crash with the error `Fatal error in HandleScope::HandleScope` (on node.js). (since v1.0.0)
* TS: `RealmInsertionModel<T>` used in `realm.create<T>(...)` now ignores functions on Class Models. ([#3421](https://github.com/realm/realm-js/pull/3421), since v10.0.0)
* Fixing the creation of an RPC session when running in React Native Chrome debugging mode. ([#3411](https://github.com/realm/realm-js/pull/3411), [#3358](https://github.com/realm/realm-js/issues/3358), [#3361](https://github.com/realm/realm-js/issues/3361), since v10.0.0)
* Fixed a crash in case insensitive query on indexed string properties when nothing matches. ([realm/realm-cocoa#6836](https://github.com/realm/realm-cocoa/issues/6836), since v6.0.0)
* Fixed a bug where queries for the size of a list of primitive nullable `int`s returned size + 1. ([realm/realm-core#4016](https://github.com/realm/realm-core/pull/4016), since v6.0.0)
* Files upgraded on 32-bit devices could end up being inconsistent resulting in `Key not found` exception to be thrown. ([realm/realm-java#6992)(https://github.com/realm/realm-java/issues/6992), since v6.0.5)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded to Realm Core from v10.0.0 to v10.1.3
* Upgraded to Realm Sync from v10.0.0 to v10.1.3


## 10.0.1 (2020-10-16)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version uses the Realm file format to version 20. It is not possible to downgrade to earlier versions than v10.0.0-beta.13. Non-sync Realms will be upgraded automatically. Synced Realms can only be automatically upgraded if created with Realm JavaScript v10.0.0-beta.1 and above.

### Breaking changes
* None

### Enhancements
* None

### Fixed
* Fixed RN Android error: couldn't find DSO to load: librealmreact.so caused by: dlopen failed: cannot locate symbol. ([#3347](https://github.com/realm/realm-js/issues/3347), since v10.0.0)
* Fixed TS declaration for `app.allUsers` to `Record<string, User>` instead of an array of `User`. ([#3346](https://github.com/realm/realm-js/pull/3346))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* None

## 10.0.0 (2020-10-14)

NOTE: This is a unified release note covering all v10.0.0-alpha.X and v10.0.0-beta.X releases.

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version uses the Realm file format version 20. It is not possible to downgrade to earlier versions than v10.0.0-beta.13. Non-sync Realms will be upgraded automatically. Synced Realms can only be automatically upgraded if created with Realm JavaScript v10.0.0-beta.1 and above.

NOTE: Deprecated methods have been removed.

### Breaking changes
* `Realm.Sync.User` has been replaced by `Realm.User`.
* `Realm.Sync.Adapter`, `Realm.Sync.addlistener()`, `Realm.Sync.localListenerRealms()`, `Realm.Sync.removeAllListeners()` and `Realm.Sync.removeListener()` have been removed. ([#2732](https://github.com/realm/realm-js/issues/2732))
* Query-based Sync has been removed. This includes `Realm.Sync.Subscription`, `Realm.Results.subscribe()`, `Realm.subscriptions()`, `Realm.unsubscribe()`, `Realm.privileges()`. These APIs are not initially supported by MongoDB Realm. They will be re-introduced in a future release. `partitionValue` has been added to the `sync` configuration as a replacement. Please read section ["Partition Atlas Data into Realms"](https://docs.mongodb.com/realm/sync/partitioning/) in documentation for further information.
* Permissions has been removed. You need to configure permissions through MongoDB Realm.
* Deprepated API has been removed: `Realm.openAsync()`, `Realm.Sync.setFeatureToken()`, `Realm.Sync.User.register()`, `Realm.Sync.User.registerWithProvider()`, `Realm.Sync.User.authenticate()`, `Realm.automaticSyncConfiguration()`.
* Renamed configuration option `custom_http_headers` to `customHttpHeaders`.
* Renamed `Realm.Sync` to `Realm.App.Sync` including all methods and properties.

### Enhancements
* Added support for compiling on a RaspberryPi. ([#2798](https://github.com/realm/realm-js/issues/2798)
* Added support for the `Decimal128` data type. ([#2674](https://github.com/realm/realm-js/issues/2674))
* Added support for the `ObjectId` data type. ([#2675](https://github.com/realm/realm-js/issues/2675))
* Added support for embedded objects. ([#2676](https://github.com/realm/realm-js/issues/2676))
* Added `Realm.App` with the following methods: `getApp()`, `logIn()`, `switchUser()`, and `removeUser()` and properties `id`, `emailPasswordAuth`, `currentUser`, `allUsers`. A `Realm.App` instance represents a [MongoDB Realm app](https://docs.mongodb.com/realm/procedures/create-realm-app/). ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added `Realm.Credentials` which represents credentials for MongoDB Realm users. It has the following methods: `emailPassword()`, `facebook`, `anonymous()`, `apple()`, `google()`, `jwt()`, and `function()`. You must enable the credentials validation ([authentication providers](https://docs.mongodb.com/realm/authentication/providers/)) at MongoDB Realm before deploying your app. ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added auth providers `Realm.Auth.EmailPassword` and `Realm.Auth.APIKeys`. ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added support for `customData` readonly property to `Realm.User` objects. ([#2809](https://github.com/realm/realm-js/issues/2809))
* Added support for calling server functions from `Realm.User` objects. ([#2809](https://github.com/realm/realm-js/issues/2809))
* Added MongoClient and Push functionality to `Realm.User`.
* Added `watch()` to `MongoDBCollection` to enable streaming notifications of changes events from the database. Only supported in node.js for now.
* TS declarations with stricter TS validation of input-models and return-types for `create<T>(...)`, `objects<T>(...)` & `objectForPrimaryKey<T>(...)`. ([#3044](https://github.com/realm/realm-js/pull/3044) & [#3266](https://github.com/realm/realm-js/pull/3266))

### Fixed
* Realm.login() will not run after hot reloading in RN. ([#3236](https://github.com/realm/realm-js/issues/3236), since v10.0.0-beta.12)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded to Realm Core v10.0.0
* Upgraded to Realm Sync v10.0.0

## 10.0.0-rc.2 (2020-10-12)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version uses the Realm file format to version 20. It is not possible to downgrade to earlier versions than v10.0.0-beta.13. Non-sync Realms will be upgraded automatically. Synced Realms can only be automatically upgraded if created with Realm JavaScript v10.0.0-beta.1 and above.

### Breaking changes
* Removed the types for `app.services` and `app.functions` (which never had an implementation). ([#3322](https://github.com/realm/realm-js/pull/3322)).

### Enhancements
* Added descriptive errors for `partitionValue` of unsupported formats & ranges.

### Fixed
* Added missing `Realm.Credentials.jwt()` to React Native debugger support. ([#3285](https://github.com/realm/realm-js/issues/3285), since v10.0.0-beta.13)
* Fixed missing `partitionValue` on `syncSession`. ([#3205](https://github.com/realm/realm-js/pull/3205), since v10.0.0-beta.1)
* Fixed a bug where an integer could prematurely be converted & returned as a `Long` instead of a `number`. ([#3205](https://github.com/realm/realm-js/pull/3205), since v10.0.0-beta.1)
* TS declaration for `isLoggedIn` added to `User`. ([#3294](https://github.com/realm/realm-js/pull/3294))
* Fixed error `Attempted import error: 'invalidateCache' is not exported from './util' (imported as 'util').` ([#3314](https://github.com/realm/realm-js/issues/3314))
* Fixed a bug preventing caching of Realm instances. In certain cases, the Realm file would grow without any new objects added.
* TS declarations for `OpenRealmBehaviorConfiguration` presets `openLocalRealmBehavior` & `downloadBeforeOpenBehavior` moved to namespace `Realm.App.Sync`, to reflect the implementation. ([#3307](https://github.com/realm/realm-js/pull/3307), since v10.0.0-beta.1)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Changed CI to abort if changes are exclusively made to the /packages directory. ([#3298](https://github.com/realm/realm-js/pull/3298)) & ([#3307](https://github.com/realm/realm-js/pull/3307))
* Publish binaries for Raspberry Pi. ([#3272](https://github.com/realm/realm-js/issues/3272), since v10.0.0-beta.13)


## 10.0.0-rc.1 (2020-10-1)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version uses the Realm file format to version 20. It is not possible to downgrade to earlier versions than v10.0.0-beta.13. Non-sync Realms will be upgraded automatically. Synced Realms can only be automatically upgraded if created with Realm JavaScript v10.0.0-beta.1 and above.

### Breaking changes
* Renamed `Realm.App.getCachedApp()` to `Realm.App.getApp()`.

### Enhancements
* TS declaration for `objectForPrimaryKey<T>(...)` now mimics behavior of `objects<T>(...)`. ([#3266](https://github.com/realm/realm-js/pull/3266))

### Fixed
* Fixed an issue with `toJSON` where data from a different object could be serialized. ([#3254](https://github.com/realm/realm-js/issues/3254), since v10.0.0-beta.10)
* Fixed `create<T>(...)` deprecation warning. ([#3243](https://github.com/realm/realm-js/pull/3243))
* Throw error when `deleteRealmIfMigrationNeeded` is requested on a synced realm (incompatible options) ([#3245](https://github.com/realm/realm-js/pull/3245))
* Added missing `Realm.Credentials.function()` to React Native debugger support. ([#3236](https://github.com/realm/realm-js/issues/3236), since v10.0.0-beta.1)
* Added missing `Realm.Credentials.google()` to React Native debugger support. ([#3279](https://github.com/realm/realm-js/issues/3279), since v10.0.0-beta.1)
* Fixed inheritance when transpiling with Babel which results in `TypeError: Reflect.construct requires the first argument to be a constructor`. ([#3110](https://github.com/realm/realm-js/issues/3110))
* `-fno-aligned-new` added to podspec as C++ flag for for armv7. This could lead to error messages like `Aligned deallocation function of type 'void (void *, std::align_val_t) noexcept' is only available on iOS 11 or newer when archiving an app`. ([#3076](https://github.com/realm/realm-js/issues/3076), since v10.0.0-beta.1)
* TS declaration for `create<T>(...)` has been relaxed when `Realm.UpdateMode` `All` or `Modified` is given. ([#3266](https://github.com/realm/realm-js/pull/3266))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* Upgraded Realm Core from v10.0.0-beta.8 to v10.0.0-beta.9.
* Upgraded Realm Sync from v10.0.0-beta.12 to v10.0.0-beta.14.

### Notable known issues
* `Realm.App.logIn()` will not run again after refreshing React Native app. ([#3236](https://github.com/realm/realm-js/issues/3236))
* `OpenRealmBehaviorConfiguration` was removed in v10.0.0-beta.1 and hasn't been added back yet. The consequence is that it is not possible to open a synced Realm when offline.


## 10.0.0-beta.13 (2020-9-18)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 20. It is not possible to downgrade to earlier versions. Non-sync Realms will be upgraded automatically. Synced Realms can only be automatically upgraded if created with Realm JavaScript v10.0.0-beta.1 and above.

### Breaking changes
* Renamed `Realm.Credentials.custom()` to `Realm.Credentials.jwt()`.
* Renamed `Realm.User.remoteMongoClient()` to `Realm.User.mongoClient()`.
* Removed `Remote` prefix from all `MongoDB` related classes.
* Renamed `Realm.Sync` to `Realm.App.Sync` including all methods and properties.

### Enhancements
* Added property `Realm.User.deviceId`.
* Added property `Realm.User.providerType`.
* Added property `Realm.User.identities`.
* Added property `name` to `Realm.MongoDB`, `Realm.MongoDB.Database` and `Realm.MongoDB.Collection`.
* Added methods `Realm.App.Sync.getSyncSession()` and `Realm.App.Sync.getAllSyncSessions()`.
* Allow synchronization on the nil partition by specifying `null` as `partitionValue` in sync configuration.
* Added support for creating multiple Realm apps. ([#3072](https://github.com/realm/realm-js/issues/3072))
* Added method `Realm.App.getCachedApp()`.

### Fixed
* Reapplied fix for the error `expected either accessToken, id_token or authCode in payload` when using Facebook Auth. ([#3109])(https://github.com/realm/realm-js/issues/3109)
* Fixed linking issue (error message: `ld: symbol(s) not found for architecture x86_64`) on iOS. ([#3189](https://github.com/realm/realm-js/issues/3189), since v10.0.0-beta.12)
* It is not allowed to query embedded objects directly. An expection will be thrown. (since v10.0.0-beta.1)
* Fixed a bug where .type is incorrect for some property types. ([#3235](https://github.com/realm/realm-js/pull/3235))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).
* Stopped building binary releases for Node.js 11

### Internal
* Realm JS now uses a single pre-build native binary for every Node.js and Electron version per platform (Windows, Linux, MacOS) and architecture (ia32, x64). Switching Node.js and Electron versions after Realm JS is installed will not require re-building or re-downloading of the Realm JS native binary.
* Upgraded Realm Core from v10.0.0-beta.6 to v10.0.0-beta.8.
* Upgraded Realm Sync from v10.0.0-beta.10 to v10.0.0-beta.12.

## 10.0.0-beta.12 (2020-9-2)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* None.

### Fixed
* Fixed validation of idempotent `AddColumn` instruction. This could lead to crashes with an error message like`Failed to parse, or apply received changeset: ERROR: AddColumn 'class_Person.name' which already exists`.
* Fixed a syntax error in `lib/browser/index.js` preventing RN debugger to launch. Thanks to @ioveracker. ([#3178](https://github.com/realm/realm-js/issues/3178), since v10.0.0-beta.10)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Upgraded from Realm Core v10.0.0-beta.5 to v10.0.0-beta.6.
* Upgraded from Realm Sync v10.0.0-beta.8 to v10.0.0-beta.10.



## 10.0.0-beta.11 (2020-08-28)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* None.

### Fixed
* Remove extra `scripts/` in path to `download-realm.js`. Fixes `Cannot find module '/my-app/node_modules/realm/scripts/scripts/download-realm.js'` ([3168])https://github.com/realm/realm-js/issues/3168

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* None



## 10.0.0-beta.10 (2020-08-27)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* Adding the possibility of passing a string argument when constructing an App. ([#3082](https://github.com/realm/realm-js/pull/3082))
* `toJSON()` implemented for `Realm.Collection`, to return a nicer serializable Array. ([#3044](https://github.com/realm/realm-js/pull/3044))
* `Realm.JsonSerializationReplacer` exposed as a replacer (for usage with `JSON.stringify`) to handle circular structures.([#3044](https://github.com/realm/realm-js/pull/3044))
* TS: Stricter model validation for `create<T>(...)`. ([#3044](https://github.com/realm/realm-js/pull/3044))

### Fixed
* Fixed Android and XCode build files. ([#3069](https://github.com/realm/realm-js/issues/3069), since v10.0.0-beta.9)
* Fixed a crash when calling `user.apiKeys.fetchAll()`. ([#3067](https://github.com/realm/realm-js/pull/3067))
* Fixed calling `app.emailPasswordAuth.resetPassword` and `app.emailPasswordAuth.callResetPasswordFunction`, which would throw an error of mismatch in count of arguments. ([#3079](https://github.com/realm/realm-js/pull/3079))
* realm.delete throws an exception `Argument to 'delete' must be a Realm object or a collection of Realm objects.` for schema objects defined with JS class syntax and not inheriting from RealmObject [#2848](https://github.com/realm/realm-js/issues/2848).
* Fixed `Realm.Object` TS declaration to allow inheritance. ([#1226](https://github.com/realm/realm-js/issues/1226))
* Fixed TS declaration for `CollectionChangeSet` in `CollectionChangeCallback` when adding a change listener to a collection ([#3093](https://github.com/realm/realm-js/pull/3093)).
* Fixed an error Error: `Invalid arguments: 2 expected, but 1 supplied.` when calling `app.removeUser` [#3091](https://github.com/realm/realm-js/issues/3091)
* Creating standalone/free-floating embedded objects crashed with a seg. fault. Temporarily an exception is thrown. Later we will introduce a way to add a new object to a list.  ([RJS#636](https://jira.mongodb.org/browse/RJS-636), since v10.0.0-beta.1)
* Fixed a missing import in the RN debugger support causing the debug session to fail with the error `ReferenceError: createSession is not defined`. Thanks for @deckyfx to investigating and refactoring the cache. ([#3085](https://github.com/realm/realm-js/issues/3085), since v10.0.0-beta.9)
* `toJSON()` no longer throws `"RangeError: Maximum call stack size exceeded"` when a circular structure is encountered (applies for both `Realm.Object` & `Realm.Collection`). ([#3044](https://github.com/realm/realm-js/pull/3044))
* TS: `objects<T>(...)` now sets return types reflecting underlying implementation. ([#3044](https://github.com/realm/realm-js/pull/3044))
* TS: `_objectId()` added to TS declaration for `Realm.Object`. ([#3044](https://github.com/realm/realm-js/pull/3044))
* Fixed performance regresion when creating `Realm.Object` in RN on iOS. ([#2845]https://github.com/realm/realm-js/issues/2845))
* Rare crash when a schema was updated ([#6680](https://github.com/realm/realm-cocoa/issues/6680))
* Bug in memory mapping management. This bug could result in multiple different asserts as well as segfaults. In many cases stack backtraces would include members of the EncyptedFileMapping near the top - even if encryption was not used at all. In other cases asserts or crashes would be in methods reading an array header or array element. In all cases the application would terminate immediately. (Realm Core PR #3838, since 7.0.0)
* Fixed the error `expected either accessToken, id_token or authCode in payload` when using Facebook Auth ([#3109])(https://github.com/realm/realm-js/issues/3109)
* Fixed segfault when `push()`ing onto a list of embedded objects.

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Realm Object Store updated to commit 9c80160881f2af76d99c356a9d6017c88c9b7e52
* Upgraded Realm Core from v10.0.0-beta.4 to v10.0.0-beta.5
* Upgraded Realm Sync from v10.0.0-beta.6 to v10.0.0-beta.8
* Upgraded Realm Network Transport from v0.6.0 to v0.7.0
* When creating objects without primary keys, it is now checked that the generated ObjKey does not collide with an already existing object. This was a problem in some migration scenarios in ObjectStore.


## 10.0.0-beta.9 (2020-7-15)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Breaking changes
* `Realm.Auth.EmailPassword.registerEmail()` has been renamed to `Realm.Auth.EmailPassword.registerUser()`.
* `Realm.User.identity` has been renamed to `Realm.User.id`.
* `Realm.User.token` has been renamed to `Realm.User.accessToken`.
* Change instance methods `Realm.App.currentUser()` and `Realm.App.allUsers()` to instance properties `Realm.App.currentUser` and `Realm.App.allUsers`.
* `Realm.Auth.UserAPIKeyProvider` has been replaced by `Realm.Auth.ApiKeyProvider`.
* `user.auth.apiKeys` has been replaced by `user.apiKeys`.
*  The instance methods on the ApiKeyAuth instance (`user.apiKeys`) have gotten their APIKey(s) suffix removed: Ex. `apiKeys.createAPIKey` has been replaced by `apiKeys.create`.
* `Realm.Auth.EmailPasswordProvider` has been replaced by `Realm.Auth.EmailPasswordAuth`.
* `app.auth.emailPassword` has been replaced by `user.emailPasswordAuth`.
* `Credentials.userAPIKey` has been replaced by `Credentials.userApiKey`.
* `Credentials.serverAPIKey` has been replaced by `Credentials.serverApiKey`.

### Enhancements
* Added RemoteMongoClient functionality to `Realm.User`
* Added `watch()` to `RemoteMongoDBCollection` to enable streaming notifications of changes events from the database. Only supported in node.js for now.
* Throwing more descriptive messages when parsing schema properties

### Fixed
* Failed to parse arguments correctly, causing the error `callback must be of type 'function', got (undefined)` when calling `Realm.App.emailPassword.sendResetPasswordEmail()` and `Realm.App.emailPassword.resendConfirmationEmail()`. ([#3037](https://github.com/realm/realm-js/issues/3037), since v10.0.0-beta.1)
* Fixed `user.logOut()` to also log out at MongoDB Realm Cloud. The method now returns `Promise<void>` instead. ([#2980](https://github.com/realm/realm-js/issues/2980), since v10.0.0-beta.1)
* Fixed `TypeError: process.versions is not an Object` error being thrown when requiring the package from React Native. ([#3045](https://github.com/realm/realm-js/issues/3045), since v10.0.0-beta.8)
* Fixed duplicated TypeScript definition of `Realm.objectForPrimaryKey()`. ([#2940](https://github.com/realm/realm-js/issues/2940), since v10.0.0-beta.1)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* None.

## 10.0.0-beta.8 (2020-7-07)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* None.

### Fixed
* `toJSON()` now declared as returning `any` for easy usage in TS.

### Fixed
* Fix `401 Unauthorized` when using anonymous login resulting in a `Fatal error in v8::HandleScope::CreateHandle()`

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* None.

## 10.0.0-beta.7 (2020-6-26)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* Added RemoteMongoClient functionality to `Realm.User`
* Added Push functionality to `Realm.User`

### Fixed
* Added missing `SyncConfiguration.error` field in the typescript definitions.
* Fixed `SSL handshake failed: premature end of input` on Windows ([#2975](https://github.com/realm/realm-js/issues/2975, since v10.0.0-beta.1)
* Missing `toJSON` TS declaration added for `Realm.Object` ([2903](https://github.com/realm/realm-js/issues/2903))

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Now linking against OpenSSL 1.1 on Windows.

## 10.0.0-beta.6 (2020-6-9)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* None.

### Fixed
* Opening a sync session with LOCAL app deployments would not use the correct endpoints. (since v10.0.0-beta.5)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Reverted back to rely on Realm.App's default URL in Realm Object Store.
* Updated Realm Object Store to commit c02707bc28e1886970c5da29ef481dc0cb6c3dd8.

## 10.0.0-beta.5 (2020-6-8)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

### Enhancements
* None.

### Fixed
* Changed default MongoDB Realm URL to https://cloud.mongodb.com.
* `Realm.User.refreshCustomData()` will return the data when refreshed. (since v10.0.0-beta.1)
* Fixed bugs so `Realm.User.auth.APIKeys` and `Realm.App.auth.EmailPassword` are properties and not functions. (since v10.0.0-beta.1)
* Added missing methods to `Realm.Auth` classes. (since v10.0.0-beta.1)
* When restarting an app, re-using the already logged in user would result in Sync not resuming. (since v10.0.0-beta.1)
* Disabled client resync. (since v10.0.0-beta.1)
* Android report version as number and not as string, preventing an app to launch. (since v10.0.0-beta.1)

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Known issues
* TypeScript definitions for `Realm.objectForPrimaryKey()` and the `Realm.App` constructor are inconsistent. (https://github.com/realm/realm-js/issues/2940)

### Internal
* Updated Realm Object Store to commit c50be4dd178ef7e11d453f61a5ac2afa8c1c10bf.

## 10.0.0-beta.4 (2020-6-7)

### Enhancements
* None.

### Fixed
* Fixed an incorrect import in the React Native debugging support. Bug prevented app to be launched.
* Fixed Android builds by adding missing files to build system.

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* None.

## 10.0.0-beta.3 (2020-6-6)

### Enhancements
* None.

### Fixed
* `partitionValue` can now be specified as a plain string, number or `BSON.ObjectId`.
* Added TypeScript definitions back in.
* Fixed a bug preventing optional Decimal128 to be null.

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Updated Realm Sync from v10.0.0-beta.1 to Realm Sync v10.0.0-beta.2.
* Updated Realm Object Store to commit c6b7e35544ce9514ceb7ff5fc0280b93c073c659.

## 10.0.0-beta.1 (2020-6-4)

NOTE: Support for syncing with realm.cloud.io and/or Realm Object Server has been replaced with support for syncing with MongoDB Realm Cloud.

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade to earlier versions. Older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 10.0.0](https://github.com/realm/realm-studio/releases/tag/v10.0.0-beta.1) or later will be able to open the new file format.

NOTE: Deprecated methods have been removed.

### Breaking changes
* `Realm.Sync.User` has been replaced by `Realm.User`.
* `Realm.Sync.Adapter`, `Realm.Sync.addlistener()`, `Realm.Sync.localListenerRealms()`, `Realm.Sync.removeAllListeners()` and `Realm.Sync.removeListener()` have been removed. ([#2732](https://github.com/realm/realm-js/issues/2732))
* Query-based Sync has been removed. This includes `Realm.Sync.Subscription`, `Realm.Results.subscribe()`, `Realm.subscriptions()`, `Realm.unsubscribe()`, `Realm.privileges()`. These APIs are not initially supported by MongoDB Realm. They will be re-introduced in a future release. `partitionValue` has been added to the `sync` configuration as a replacement. Please read section "Partition Atlas Data into Realms" in documentation for further information.
* Permissions has been removed. You need to configure permissions through MongoDB Realm.
* Deprepated API has been removed: `Realm.openAsync()`, `Realm.Sync.setFeatureToken()`, `Realm.Sync.User.register()`, `Realm.Sync.User.registerWithProvider()`, `Realm.Sync.User.authenticate()`, `Realm.Sync.setSyncLogger()`, `Realm.automaticSyncConfiguration()`.
* Renamed configuration option `custom_http_headers` to `customHttpHeaders`.

### Enhancements
* Added support for compiling on a RaspberryPi. ([#2798](https://github.com/realm/realm-js/issues/2798)
* Added support for the `Decimal128` data type. ([#2674](https://github.com/realm/realm-js/issues/2674))
* Added support for the `ObjectId` data type. ([#2675](https://github.com/realm/realm-js/issues/2675))
* Added support for embedded objects. ([#2676](https://github.com/realm/realm-js/issues/2676))
* Added `Realm.App` with the following methods: `logIn()`, `currentUser()`, `allUsers()`, `switchUser()`, and `removeUser()`. A `Realm.App` instance represents a MongoDB Realm app. ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added `Realm.Credentials` which represents credentials MongoDB Realm users. It is the following methods: `emailPassword()`, `facebook`, `anonymous()`, `apple()`, `google()`, `custom()`, and `function()`. You must enable the credentials validation at MongoDB Realm before deploying your app. ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added auth providers `Realm.Auth.EmailPassword` and `Realm.Auth.APIKeys`. ([#2750](https://github.com/realm/realm-js/issues/2750) and [#2809](https://github.com/realm/realm-js/issues/2809))
* Added support for `customData` readonly property to `Realm.User` objects. ([#2809](https://github.com/realm/realm-js/issues/2809))
* Added support for calling server functions from `Realm.User` objects. ([#2809](https://github.com/realm/realm-js/issues/2809))

### Fixed
* None.

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v10.0.0 (and related beta versions)
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5 or later).

### Internal
* Updated Realm Core from v6.0.5 to Realm Core v10.0.0-beta.1.
* Updated Realm Sync from v5.0.5 to Realm Sync v10.0.0-beta.1.
* Updated Realm Object Store to commit 6d081a53377514f9b77736cb03051a03d829da92.
* Created a package named `realm-app-importer`, to be used by integration tests (ideally by other SDKs too).
