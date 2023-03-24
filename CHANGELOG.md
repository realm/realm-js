## vNext (TBD)

### Deprecations
* None

### Enhancements
* Exposed `SyncError.logUrl` which contains the URL to the server log related to the sync error. ([#5609](https://github.com/realm/realm-js/issues/5609))
* Added a new error class `CompensatingWriteError` which indicates that one or more object changes have been reverted by the server. 
This can happen when the client creates/updates objects that do not match any subscription, or performs writes on an object it didn't have permission to access. ([#5599](https://github.com/realm/realm-js/pull/5599))

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* Fixed linting issues and running linting on CI.
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

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

## 10.20.0-beta.5 (2022-4-13)

### Notes
Based on Realm JS v10.16.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.15.0).

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

## 10.20.0-beta.4 (2022-4-11)

### Notes
Based on Realm JS v10.15.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.14.0).

### Fixed
* Changed "react-native" main field to point to a `lib/index.native.js` file to help bundlers pick the right file when loading our library on React Native. ([#4459](https://github.com/realm/realm-js/issues/4459))
* Fixed resolving the "react-native" package when building from source, enabling developers to run the `./scripts/build-ios.sh` script themselves to build our iOS artifacts with the same version of Xcode / LLVM as they're building their app.

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

## 10.20.0-beta.3 (2022-3-24)

### Notes
Based on Realm JS v10.14.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.13.0).

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

## 10.20.0-beta.2 Release notes (2022-2-14)

### Notes
Based on Realm JS v10.13.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.12.0).

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

## 10.20.0-beta.0 (2021-12-21)

### Notes
Based on Realm JS v10.11.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.10.1).

### Enhancements
* Catching missing libjsi.so when loading the librealm.so and rethrowing a more meaningful error, instructing users to upgrade their version of React Native.

### Fixed
* Fixed support of user defined classes that don't extend `Realm.Object`.
* Fixed throwing "Illegal constructor" when `new` constructing anything other than `Realm` and `Realm.Object`.

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

## 10.20.0-alpha.1 (2021-9-1)

### Notes
NOTE: DO NOT USE THIS RELEASE IN PRODUCTION!
NOTE: This is an early (alpha) release with Hermes/JSI support. Only iOS is supported and we expect crashes and bugs.

Based on Realm JS v10.8.0: See changelog below for details on enhancements and fixes introduced between this and the previous pre release (which was based on Realm JS v10.7.0).

### Enhancements
* Adding support for Hermes on Android.

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

## 10.20.0-alpha.0 (2021-9-1)

### Notes
NOTE: DO NOT USE THIS RELEASE IN PRODUCTION!
NOTE: This is an early (alpha) release with Hermes/JSI support. Only iOS is supported and we expect crashes and bugs.

Based on Realm JS v10.7.0: See changelog below for details on enhancements and fixes introduced by that version.

### Enhancements
- Adding support for Hermes (iOS only).

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

## 6.1.7 (2021-3-13)

### Enhancements
* None.

### Fixes
* There seems to be a few issues regarding class support in realm-js. We are currently coming up with strategies to better support this in the future. In the meantime, the following fixes have been applied to help avoid crashes and failures.
  * When creating a class that extends Realm.Object and pushing the instantiated object to a list, a segmentation fault would occur. This has been fixed by a null check and throwing an exception.
  * Creating an object from an instance of Realm.Object that was manually constructed (detached from Realm) would fail the second time. Now we throw a meaningful exception the first time.
* Removed a delay when running in node.js. It could make testing using Jest to fail. ([#3608](https://github.com/realm/realm-js/issues/3608), since v2.0.0)
* Support upgrading from file format 5. ([realm/realm-cocoa#7089](https://github.com/realm/realm-cocoa/issues/7089), since v6.0.0)
* During integration of a large amount of data from the server, you may get `Assertion failed: !fields.has_missing_parent_update()`. ([realm/realm-core#4497](https://github.com/realm/realm-core/issues/4497), since v6.0.0)
* Fixed queries for constant null across links to an indexed property not returning matches when the link was null. ([realm/realm-core#4460](https://github.com/realm/realm-core/pull/4460), since v3.5.0).

### Compatibility
* Realm Object Server: 3.23.1 or later
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 6.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5).

## 6.1.6 (2021-2-15)

### Enhancements
* None.

### Fixed
* Fixed an issue where creating an object after file format upgrade may fail with error message `Assertion failed: lo() <= std::numeric_limits<uint32_t>::max()`. ([realm/realm-core#4295](https://github.com/realm/realm-core/issues/4295), since v6.0.0)
* Due to an upcoming WebKit update (currently accessible through Xcode beta simulators), apps would throw `Attempting to change configurable attribute of unconfigurable property` at runtime. ([#3557](https://github.com/realm/realm-js/issues/3557))

### Compatibility
* Realm Object Server: 3.23.1 or later
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 6.x.y series.
* File format: generates Realms with format v11 (reads and upgrades file format v5).

### Internal
* Upgraded Realm Core from v6.2.0 to v6.2.3.
* Upgraded Realm Sync from v5.0.30 to v5.0.32.
* Implemented webhook analytics integration.

## 6.1.5 (2020-11-4)

### Enhancements
* None.

### Fixed
* Fixed a bug preventing caching of Realm instances. In certain cases, the Realm file would grow without any new objects added. ([#3322](https://github.com/realm/realm-js/pull/3322), since v6.0.0).
* Fixed an issue in `toJSON()`, in combination with primaryKeys, where data from another table could be returned. ([#3331](https://github.com/realm/realm-js/issues/3331), since v6.1.0)
* Fixed an issue in `toJSON()` where `data` would output as `{}`, it now returns the data base64 encoded. ([#3356](https://github.com/realm/realm-js/pull/3356), since v6.1.0)
* Fixed a crash in case insensitive query on indexed string properties when nothing matches. ([realm/realm-cocoa#6836](https://github.com/realm/realm-cocoa/issues/6836), since v6.0.0)
* Fixed a bug where queries for the size of a list of primitive nullable `int`s returned size + 1. ([realm/realm-core#4016](https://github.com/realm/realm-core/pull/4016), since v6.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.1.4 to v6.2.0.
* Upgraded Realm Sync from v5.0.29 to v5.0.30.

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

## 6.1.4 (2020-10-8)

### Enhancements
* None.

### Fixed
* A case-insensitive query, on an indexed string property, could throw a `"No such key"` when the query matched a deleted object. ([realm/realm-cocoa#6830](https://github.com/realm/realm-cocoa/issues/6830), since v6.0.0)
* A schema migration could throw a `"No Such Column"` if a property changed from optional to primary key. ([#3270](https://github.com/realm/realm-js/issues/3270), since v6.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.1.3 to v6.1.4.
* Upgraded Realm Sync from v5.0.28 to v5.0.29.
* Upgraded Realm Object Store to commit 301642fe90212c379f550656a7234f41db158ddf.

## 6.1.3 (2020-10-2)

### Enhancements
* None.

### Fixed
* Fixed an issue with `toJSON` where data from a different object could be serialized. ([#3254](https://github.com/realm/realm-js/issues/3254), since v6.1.0)
* Fixed inheritance when transpiling with Babel which results in TypeError: Reflect.construct requires the first argument to be a constructor ([#3110](https://github.com/realm/realm-js/issues/3110))
* When querying a table where links are part of the condition, the application may crash if objects has recently been added to the target table. ([realm/realm-java#7118](https://github.com/realm/realm-java/issues/7118), since v6.0.0)
* Rerunning an equals query on an indexed string column, which previously had more than one match and now has one match, would sometimes throw a "key not found" exception ([realm/realm-cocoa#6536](https://github.com/realm/realm-cocoa/issues/6536), since v6.0.0)
* Queries on indexed properties could yield a "Key not found" exception. ([realm/realm-dotnet#2025](https://github.com/realm/realm-dotnet/issues/2025), since v6.0.0)
* Fixed queries for null on non-nullable indexed integer columns returning results for zero entries. (since v6.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 5.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.26 to v6.1.3.
* Upgraded Realm Sync from v5.0.23 to v5.0.28.
* Improved performance of queries of the form `NOT (prop == 1 || prop == 2 || ...)`. ([realm/realm-cocoa#4564](https://github.com/realm/realm-cocoa/issues/4564))
* Improved performance of most operations which read data from the Realm file.

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

## 6.1.2 (2020-9-17)

### Enhancements
* None.

### Fixed
* If you use encryption your application could crash with a message like `Opening Realm files of format version 0 is not supported by this version of Realm`. ([realm/realm-core#6889](https://github.com/realm/realm-core#6889), since v6.0.0)
* Fixed deadlocks when opening a Realm file in both the iOS simulator and Realm Studio. ([realm/realm-cocoa#6743](https://github.com/realm/realm-cocoa#6743), since v6.1.0).

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 5.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* Realm JS now uses a single pre-build native binary for every Node.js and Electron version per platform (Windows, Linux, MacOS) and architecture (ia32, x64). Switching Node.js and Electron versions after Realm JS is installed will not require re-building or re-downloading of the Realm JS native binary.
* Upgraded Realm Core from v6.0.25 to v6.0.26.
* Upgraded Realm Sync from v5.0.22 to v5.0.23.

## 6.1.1 (2020-9-10)

NOTE: This version bumps the Realm file format to version 11. It is not possible to downgrade version 10 or earlier. Moreover, older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable.

### Enhancements
* None.

### Fixed
* Upgrading files with string primary keys would result in a file where it was not possible to find the objects by primary key. ([realm/realm-cocoa#6716](https://github.com/realm/realm-cocoa/issues/6716), since Realm JavaScript v6.0.4)
* If you have a realm file growing towards 2Gb and have a table with more than 16 columns, then you may get a `Key not found` exception when updating an object. ([#3194](https://github.com/realm/realm-js/issues/3194), since v6.0.0)
* In cases where you have more than 32 columns in a table, you may get a corrupted file resulting in various crashes. ([realm/realm-java#7057](https://github.com/realm/realm-java/issues/7057), since Realm JavaScript v6.0.0)

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 5.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.21 to v6.0.25.
* Upgraded Realm Sync from v5.0.18 to v5.0.22.


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

## 6.1.0 (2020-08-27)

### Enhancements
* `toJSON()` implemented for `Realm.Collection`, to return a nicer serializable Array. ([#3013](https://github.com/realm/realm-js/pull/3013))
* `Realm.JsonSerializationReplacer` exposed as a replacer (for usage with `JSON.stringify`) to handle circular structures.([#3013](https://github.com/realm/realm-js/pull/3013))
* TS: Stricter model validation for `create<T>(...)`. ([#3013](https://github.com/realm/realm-js/pull/3013))

### Fixed
* `toJSON()` no longer throws `"RangeError: Maximum call stack size exceeded"` when a circular structure is encountered (applies for both `Realm.Object` & `Realm.Collection`). ([#3013](https://github.com/realm/realm-js/pull/3013))
* TS: `objects<T>(...)` now sets return types reflecting underlying implementation. ([#3013](https://github.com/realm/realm-js/pull/3013))
* Holding a shared lock while being suspended on iOS would cause the app to be terminated. ([#6671])(https://github.com/realm/realm-cocoa/issues/6671)
* If an attempt to upgrade a realm has ended with a crash with "migrate_links" in the call stack, the realm ended in a corrupt state where further upgrade was not possible.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.19 to v6.0.21.
* Upgraded Realm Sync from v5.0.16 to v5.0.18


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

## 6.0.5 (2020-08-24)

### Enhancements
* None

### Fixed
* Rare crash (EXC_BAD_ACCESS KERN_INVALID_ADDRESS in realm::Table::migrate_links) when a schema was updated ([realm/realm-cocoa#6680](https://github.com/realm/realm-cocoa/issues/6680))
* Rare crash (Attempted to insert null into non-nullable column) when updating Realm file from v9 to v10. ([realm/realm-core#3836](https://github.com/realm/realm-core/issues/3836))
* Upgrading a table with only linkingObjects properties could result in a crash.

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.14 to v6.0.19.
* Upgraded Realm Sync from v5.0.14 to v5.0.16.

## 6.0.4 (2020-08-04)

### Enhancements
* None.

### Fixed
* realm.delete throws an exception `Argument to 'delete' must be a Realm object or a collection of Realm objects.` for schema objects defined with JS class syntax and not inheriting from RealmObject [2848](https://github.com/realm/realm-js/issues/2848).
* Fixed `Realm.Object` TS declaration to allow inheritance. ([#1226](https://github.com/realm/realm-js/issues/1226))
* Fixed performance regresion when creating `Realm.Object` in RN on iOS. ([#2845]https://github.com/realm/realm-js/issues/2845))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.9 to v6.0.14.
* Upgraded Realm Sync from v5.0.8 to v5.0.14.

## 6.0.3 (2020-7-15)

### Enhancements
* None.

### Fixed
* Missing `toJSON` TS declaration added for `Realm.Object` ([2903](https://github.com/realm/realm-js/issues/2903))
* Upgrading older Realm files with String indexes was very slow. ([realm/realm-core#3767](https://github.com/realm/realm-core/issues/3767), since v6.0.0)
* Upgrading a Realm file could result in the file getting corrupted. ([realm/realm-core#3734](https://github.com/realm/realm-core/issues/3734), since v6.0.0)
* Using `REALM_USE_FRAMEWORKS` environment variable to override detection of `use_framework!` in Cocoapods. Thanks to @alexeykomov. ([#2839](https://github.com/realm/realm-js/issues/2830))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Upgraded Realm Core from v6.0.6 to v6.0.9.
* Upgraded Realm Sync from v5.0.5 to v5.0.8.

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

## 6.0.2 (2020-06-02)

### Enhancements
* None.

### Fixed
* Fixes crashes on some iOS devices when upgrading realm file to new format ([2902](https://github.com/realm/realm-js/issues/2902))
* Fixes a possible 'NoSuchTable' exception after upgrading of a realm file on some devices ([3701](https://github.com/realm/realm-core/issues/3701))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous file format).

### Internal
* Fixed compiling without Realm Sync.

## 6.0.1 (2020-5-18)

### Enhancements
* None.

### Fixed
* Added missing file to Android builds. The bug caused RN Android to crash with error `cannot locate symbol "_ZN5realm4util9Scheduler12make_defaultEv"`. ([#2884](https://github.com/realm/realm-js/issues/2884))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 4.0.0 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous formats).

### Internal
* None.

## 6.0.0 (2020-5-6)

NOTE: This version bumps the Realm file format to version 10. It is not possible to downgrade version 9 or earlier. Moreover, older files will automatically be upgraded to the new file format. Files created by Realm JavaScript prior to v1.0.0, might not be upgradeable. Only [Realm Studio 3.11](https://github.com/realm/realm-studio/releases/tag/v3.11.0) or later will be able to open the new file format.

### Breaking changes
* Calling `Realm.close()` on a closed Realm will throw an exception.
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
* APIs are backwards compatible with all previous release of realm in the 6.x.y series.
* File format: Generates Realms with format v10 (reads and upgrades previous formats).

### Internal
* Updated Realm Core from v5.23.8 to v6.0.4.
* Updated Realm Sync from v4.9.5 to v5.0.3.
* Updated Realm Object Store to commit dc03607585fd27cf5afa8060a2d17120e47b9b3e.

## 5.0.4 (2020-4-29)

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

## 5.0.3 (2020-4-01)

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

## 5.0.2 (2020-3-21)

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

## 5.0.1 (2020-3-20)

### Enhancements
* None.

### Fixed
* Fixed a bug in how the destruction of global objects was handled. This could lead to segfaults on Node.js version 12 and 13. ([#2759](https://github.com/realm/realm-js/issues/2759))

### Compatibility
* Realm Object Server: 3.23.1 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

## 5.0.0 (2020-3-18)

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

## 3.6.5 (2020-3-4)

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

## 3.6.4 (2020-2-14)

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

## 3.6.3 (2020-1-17)

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

## 3.6.2 (2020-1-16)

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

## 3.6.0 (2019-12-11)

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

## 3.5.0 (2019-12-2)

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

## 3.5.0-alpha.1 (2019-11-27)

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

## 3.4.2 (2019-11-14)

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

## 3.4.1 (2019-11-12)

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

## 3.4.0 (2019-11-11)

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

## 3.3.0 (2019-10-18)

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

## 3.2.0 (2019-9-30)

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


## 3.1.0 (2019-9-19)

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


## 3.0.0 (2019-9-11)

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


## 2.29.2 (2019-8-14)

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


## 2.29.1 (2019-7-11)

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


## 2.29.0 (2019-7-3)

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


## 2.28.1 (2019-6-3)

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


## 2.28.0 (2019-5-22)

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


## 2.27.0 (2019-5-15)

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


## 2.27.0-rc.3 (2019-5-10)

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
* Updated to Realm Sync 4.4.2.
* Updated to Object Store commit b96cd7ae5ff531a94fd759bdef9a5bb9e329a332

## 2.27.0-rc.2 (2019-5-8)

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

## 2.26.1 (2019-4-12)

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

## 2.26.0 (2019-4-4)

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

## 2.25.0 (2019-3-12)

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

## 2.24.0 (2019-2-27)

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

## 2.23.0 (2019-2-1)

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

## 2.22.0 (2019-1-10)

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

## 2.22.0-beta.2 (2018-12-22)

### Enhancements
* Improved performance and memory usage of `Realm.Sync.Adapter`.

### Compatibility
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* Upgraded to https://github.com/nlohmann/json 3.4

## 2.22.0-beta.1 (2018-12-15)

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


## 2.21.1 (2018-12-13)

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

## 2.21.0 (2018-12-3)

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

## 2.20.1 (2018-11-28)

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

## 2.20.0 (2018-11-22)

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

## 2.19.1 (2018-11-15)

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

## 2.19.0 (2018-11-8)

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

## 2.19.0-rc.5 (2018-11-7)

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

## 2.19.0-rc.4 (2018-10-17)

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

## 2.19.0-rc.3 (2018-10-16)

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

## 2.19.0-rc.2 (2018-10-10)

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

## 2.19.0-rc.1 (2018-10-9)

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

## 2.18.0 (2018-10-4)

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

## 2.17.0 (2018-9-28)

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

## 2.17.0-rc.1 (2018-9-25)

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


## 2.16.2 (2018-9-25)

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

## 2.16.1 (2018-9-21)

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

## 2.16.0 (2018-9-19)

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


## 2.16.0-rc.2 (2018-9-14)

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


## 2.15.3 (2018-8-24)

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

## 2.15.2 (2018-8-24)

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

## 2.15.0 (2018-8-24)

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
* Support parallel run of multiple iOS builds with React Native on the same CI machine (contributed by @mandrigin).
* [Sync] Fixed a bug in the client where a session was not properly discarded after a deactivation process ending with the reception of an ERROR message. When this happened, it would lead to corruption of the client's internal data structures.

### Internal
* Updated to Object Store commit: 97fd03819f398b3c81c8b007feaca8636629050b
* Updated external packages with help from `npm audit`.
* Upgraded to Realm Sync v3.9.1 (to match the devtoolset-6 upgrade).
* Upgraded to devtoolset-6 on Centos for Linux builds.


## 2.14.2 (2018-8-8)

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


## 2.14.1 (2018-8-7)

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

### Internal
* Upgraded to Realm Core v5.7.2.
* Upgraded to Realm Sync v3.8.7.

## 2.14.0 (2018-7-24)

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

### Internal
* Upgraded to Realm Core v5.7.2.
* Upgraded to Realm Sync v3.8.3.

## 2.13.0 (2018-7-12)

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

### Internal
* Upgraded to Realm Core v5.7.1.
* Upgraded to Realm Sync v3.8.0.


## 2.12.0 (2018-7-3)

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

### Internal
* Upgraded to Realm Core v5.6.5.
* Upgraded to Realm Sync v3.7.0.


## 2.11.0 (2018-6-28)

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

### Internal
* Upgraded to Realm Core v5.6.3.
* Upgraded to Realm Sync v3.5.8.
* Added properties of `Realm.Sync.User` to debugger support.
* Fixed class names in API documentation (wrong names were introduced in v2.6.0).
* Added prebuilding for Electron v2.0 (**Electron is not supported**).


## 2.10.0 (2018-6-19)

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

### Internal
* Upgraded to Realm Sync v3.5.6.
* Realm Core v5.6.2.


## 2.9.0 (2018-6-19)

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

### Internal
* Realm Core v5.6.2.
* Realm Sync v3.5.5.


## 2.8.5 (2018-6-18)

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

### Internal
* Upgraded to Realm Sync v3.5.5.
* Realm Core v5.6.2.


## 2.8.4 (2018-6-15)

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

### Internal
* Upgraded to Realm Core v5.6.2.
* Upgraded to Realm Sync v3.5.4.


## 2.8.3 (2018-6-13)

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


## 2.8.2 (2018-6-12)

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


## 2.8.1 (2018-6-8)

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


## 2.8.0 (2018-6-6)

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


## 2.7.2 (2018-6-1)

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


## 2.7.1 (2018-5-31)

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


## 2.7.0 (2018-5-29)

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


## 2.6.0 (2018-5-16)

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

## 2.5.0 (2018-5-14)

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


## 2.4.1 (2018-5-7)

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


## 2.4.0 (2018-4-26)

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


## 2.3.4 (2018-4-12)

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

## 2.3.3 (2018-3-23)

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

## 2.3.2 (2018-3-21)

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

## 2.3.1 (2018-3-16)

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


## 2.3.0 (2018-3-13)

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


## 2.2.20 (2018-4-13)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.2.17


## 2.2.19 (2018-4-10)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Avoid crashing if partial Realms find their way into the admin Realm when using Realm Object Server v3.0.0 or later (realm-js-private #430).

### Internal
* None.


## 2.2.18 (2018-3-23)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug where leaking Realms when an error occurs within an event handler (#1725).

### Internal
* Added trace logging to the global notifier (realm-js-private #426).


## 2.2.17 (2018-3-21)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Do a better job of not opening the notifier pipe file for global notifier realms.

### Internal
* None.


## 2.2.16 (2018-3-16)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Avoid hammering the ROS authentication service when large numbers of Realms are opened at once.

### Internal
* None.


## 2.2.15 (2018-3-9)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug that could result in notifications from the global notifier being delayed or not delivered at all when multiple Realms change at once.

### Internal
* None.


## 2.2.14 (2018-3-5)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed race condition in handling of session bootstrapping in client.

### Internal
* Updated to Realm Sync 2.2.15.


## 2.2.13 (2018-3-2)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed handling of SSL certificates for the sync client.

### Internal
* Updated to Realm Sync 2.2.14.


## 2.2.12 (2018-2-23)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Validate that a given type appears at most once in the schema.

### Internal
* None.


## 2.2.10 (2018-2-20)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] A use-after-free bug was fixed which could cause arrays of primitives to behave unexpectedly.

### Internal
* Updated to Realm Sync 2.2.12.


## 2.2.9 (2018-2-19)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Improved root certificate checking.

### Internal
* Updated to Realm Sync 2.2.11.


## 2.2.8 (2018-2-13)

### Breaking changes
* None.

### Enhancements
* [Sync] For OpenSSL, the sync client includes a fixed list of certificates in its SSL certificate verification besides the default trust store in the case where the user is not specifying its own trust certificates or callback.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.2.10.


## 2.2.7 (2018-2-6)

### Breaking changes
* None.

### Enhancements
* [Sync] Wait for pending notifications to complete when removing a sync listener (#1648).
* Add schema name to missing primary key error message

### Bug fixes
* [Sync] Fixed a bug causing use-after-free crashes in Global Notifier (realm-js-private #405).

### Internal
* None.


## 2.2.6 (2018-1-26)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug where arguments were not transferred when debugging.

### Internal
* None.

## 2.2.5 (2018-1-25)

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

## 2.2.4 (2018-1-18)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug where errors in `refreshAdminToken` wasn't catched (#1627).
* [Sync] Added `_getExitingUser` to the Chrome debugging support library.

### Internal
* None.

## 2.2.3 (2018-1-17)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug in upload progress reporting.
* [Sync] Fixed a bug where any errors which occurred when trying to sync the admin Realm were ignored, which made attempting to add a listener with an invalid admin user silently do nothing.

### Internal
* None.

## 2.2.2 (2018-1-16)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Added missing `Realm.Sync` listener functions.

### Internal
* None.


## 2.2.1 (2018-1-13)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug preventing opening Realms with an admin token without a working ROS directory service (#1615).

### Internal
* None.

## 2.2.0 (2018-1-12)

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

## 2.1.1 (2017-12-15)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] Fixed a bug where long reconnection happens when a proxy in front of the sync worker returns one of those.

### Internal
* [Sync] Updated to Realm Object Server v2.2.0 for testing.
* Updated to Realm Sync 2.1.10 (see "Bug fixes").


## 2.1.0 (2017-12-14)

### Breaking changes
* None.

### Enhancements
* Added property `Realm.isClosed` which indicates if a Realm instance is closed or not.
* Added property `disableFormatUpgrade` to the Realm configuration object which disables automatic file format upgrade when opening a Realm file.

### Bug fixes
* None.

### Internal
* Updated to React Native 0.50.4 (test and example apps).

## 2.0.13 (2017-12-8)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* [Sync] When authentication fails due to a misbehaving server, a proper error is thrown.

### Internal
* [Sync] Strings can now be assigned to Date columns. When that happens the JavaScript Date constructor will be invoked to parse the string.
* [Sync] Base64 strings can now be assigned to Data columns.

## 2.0.12 (2017-12-1)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fixed a bug in 3rd party JSON parser: `localeconv()` does not exist on Android API < 21 and should not be called.

### Internal
* Fixed issues in unit tests (`addListener` hangs on Android).
* Upgraded to Realm Sync 2.1.8 (no external effects).

## 2.0.11 (2017-11-23)

### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* [Sync] Fixed a bug where deleted-then-recreated objects with identical primary keys to become empty.
* [Sync] Fixed a bug in outward partial sync is changed to ensure convergence of partial sync in the case where the client creates a primary key object, that is already present on the server, and subscribes to it in the same transaction.

### Internal
* Updated to Realm Sync 2.1.7 (see under "Bug fixes").

## 2.0.10 (2017-11-21)

### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* Fix json parsing in RN debugger.

### Internal
* None.

## 2.0.9 (2017-11-20)

### Breaking changes
* None.

### Enhancements
* None

### Bug fixes
* Reenable Realm for RN Android (#1506), which was disabled only in 2.0.8 by mistake.

### Internal
* None.

## 2.0.8 (2017-11-17)

### Breaking changes
* None.

### Enhancements
* [Sync] Improving performance of processing large changesets.

### Bug fixes
* [Sync] Changesets over 16MB in size are now handled correctly.

### Internal
* Updated to Realm Sync 2.1.6.
* Updated to JSON for Modern C++ 2.1.1.

## 2.0.7 (2017-11-15)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fixes Realm.open hangs in React Native debugger for iOS and Android

### Internal
* Updated to Realm Sync 2.1.4.


## 2.0.6 (2017-11-10)

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

## 2.0.5 (2017-11-9)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Added support for object IDs.
* Updated to Realm Sync 2.1.2.


## 2.0.4 (2017-11-7)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Updated to Realm Sync 2.1.1.


## 2.0.3 (2017-11-6)

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

## 2.0.2 (2017-10-30)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* Fix several cases where adding collection listeners from within a listener
  callback would produce incorrect results.

### Internal
* None.

## 2.0.1 (2017-10-23)

### Breaking changes
* None.

### Enhancements
* None.

### Bug fixes
* None.

### Internal
* Upgraded to Realm Sync 2.1.0.

## 2.0.0 (2017-10-17)

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


## 1.13.0 (2017-10-5)

### Breaking changes
* None.

### Enhancements
* Add a callback function used to verify SSL certificates in the sync config.
* Added aggregate functions `min()`, `max()`, `sum()`, and `avg()` to `Realm.Results` and `Realm.List` (#807).
* Added `deleteRealmIfMigrationNeeded` to configuration to delete a Realm if migration needed (#502).

### Bug fixes
* Fixed port conflict between RN >= 0.48 inspector proxy and RPC server used for Chrome debugging (#1294).
* Workaround for RN >= 0.49 metro-bundler check for single string literal argument to `require()` (#1342)

## 1.12.0 (2017-9-14)


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

## 1.11.1 (2017-9-1)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix accessToken.

## 1.11.0 (2017-8-31)

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


## 1.10.3 (2017-8-16)

### Breaking changes
* setAccessToken renamed to setFeatureToken. setAccessToken still works for now.

### Enhancements
* None

### Bug fixes
* None


## 1.10.2 (2017-8-16)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* RN 0.47 no longer breaks for Android due to a superfluous @override annotation


## 1.10.1 (2017-8-2)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* `Realm.openAsync` will no longer open the realm if a sync error has occured. Previously this resulted in the callback being invoked twice - once with an error and a second time - with the synchronously opened Realm.
* Database adapters will no longer process the sync history of realm files that are not requested by the adapter configuration. Previously this would lead to crashes for realm files that contained schemas that don't define primary keys.


* None

## 1.10.0 (2017-7-12)

### Breaking changes
* None

### Enhancements
* Added `Realm.prototype.empty` which is a property that indicates whether or not the realm has any objects in it.

### Bug fixes
* Fix crash on Node.js when a listener callback throws an error.
  The error will now be forwarded to Node's fatal error handling facilities. This means better error reporting,
  the ability to debug such errors in a Node.js debugger, and proper invocation of the `uncaughtError` event on the `process` object.

## 1.9.0 (2017-7-10)

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

## 1.8.3 (2017-6-27)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix admin users not appearing in `Realm.Sync.User.all`, which broke getting an access token for them.

## 1.8.2 (2017-6-26)

### Breaking changes
* None

### Enhancements
* Added `indexOf()` method on `Realm.Results` and `Realm.List` that returns the index of the object in the collection.

### Bug fixes
* Fix opening synced realms with a logged-in admin user.

## 1.8.1 (2017-6-20)

### Breaking changes
* None

### Enhancements
* Accessing `Realm.Sync` when sync is not enabled will no longer throw, but return `undefined`.
* Better error messages when creating objects.
* Added bundled TypeScript declarations of the Realm API.
* Added `objectSchema()` method on `Realm.Object` that returns the schema for the object.

### Bug fixes
* Fix `Realm.Sync.User.prototype.isAdmin` returning `false` for logged-in admin users.

## 1.8.0 (2017-6-15)

### Breaking changes
* None

### Enhancements
* Updated core and sync dependencies
* Unified packaging

### Bug fixes
* Fix crash when used with the React Native C++ bridge
* Fix `Realm.open` and `Realm.asyncOpen` missing when in the React Native debugger

## 1.3.1 (2017-5-18)

### Breaking changes
* None

### Enhancements
* Add Realm open async API support.

### Bug fixes
* None


## 1.3.0 (2017-5-11)

### Breaking changes
* Files written by Realm this version cannot be read by earlier versions of Realm.
Old files can still be opened and files open in read-only mode will not be modified.
* The `setVerifyServersSslCertificate` method has been deleted
* The SyncConfig now gets two more optional parameters, `validate_ssl` and `ssl_trust_certificate_path`.

### Enhancements
* None

### Bug fixes
* None

## 1.2.0 (2017-3-28)

### Breaking changes
* This version is not compatible with versions of the Realm Object Server lower than 1.3.0.

### Enhancements
* None.

### Bug fixes
* Fixed bug where opening synced realms with an encryption key would fail.

## 1.1.1 (2017-3-9)

### Breaking changes
* None

### Enhancements
* Add support for Node.js on Windows (#863).

### Bug fixes
* Fixed an error when installing Realm React Native module on Windows (#799).

### Credits
* Thanks to David Howell (@dbhowell) for adding a fix to Windows install (#849).

## 1.0.2 (2017-2-7)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Proactively refresh sync user tokens to avoid a reconnect delay (#840)

## 1.0.1 (2017-2-2)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix crash when the sync user token expires (#839)

## 1.0.0 (2017-2-2)

### Breaking changes
* None

### Enhancements
* Add the Management Realm accessor on the User class, and its schema (#779)

### Bug fixes
* None

## 0.15.4 (2017-1-11)

### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Always download Node binaries except on Windows, for unit testing (#789)


## 0.15.3 (2017-1-10)

### Breaking changes
* None

### Enhancements
* More specific error message when setting a property to a wrong type (#730)

### Bug fixes
* Fix chrome debugging on React Native 0.39 and up (#766)


## 0.15.2 (2016-12-29)

### Breaking changes
* None

### Enhancements
* More explicit handling of missing constructor (#742)

### Bugfixes
* Realm open on another thread (#473)
* symbol() variable not found (#761)


## 0.15.1 (2016-11-22)

### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix compile error for collection notification in chrome debug mode

## 0.15.0 (2016-11-15)

### Breaking changes
* None

### Enhancements
* Node.js support
* Support for fine grained notifications on `List` and `Results` objects
* Updated test and examples for react-natve v0.37.0

### Bugfixes
* None

## 0.14.3 (2016-8-8)

### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Support for react-native v0.31.0

## 0.14.2 (2016-8-3)

### Breaking changes
* Deprecate `Realm.Types`. Please specify the type name as lowercase string instead.

### Enhancements
* None

### Bugfixes
* None

## 0.14.2 (2016-7-11)

### Breaking changes
* Please use `rnpm 1.9.0` or later to link your project. Older versions are no longer supported.
* ReactNative versions older than v0.14.0 are no longer supported

### Enhancements
* Support for ReactNative versions v0.28.0+
* Added support for debugging in Visual Studio Code.

### Bugfixes
* None

## 0.14.1 (2016-6-28)

### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix linker error when building for minimum target version of iOS 7.
* Fix for failure in `strip` command when building an archive.

## 0.14.0 (2016-6-22)

### Breaking changes
* None

### Enhancements
* Added `isValid()` method to `List` and `Results` to check for deleted or invalidated objects
* Added `objectForPrimaryKey(type, key)` method to `Realm`

### Bugfixes
* Fix for crash when setting object properties to objects from other Realms
* Fix for exception sometimes thrown when reloading in Chrome debug mode

## 0.13.2 (2016-5-26)

### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when updating Realms with optional date properties to the new file format

## 0.13.1 (2016-5-24)

### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when inserting dates from before the epoch
* Fix for crash when using collection snapshot after realm.deleteAll()

## 0.13.0 (2016-5-19)

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

## 0.12.0 (2016-5-4)

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

## 0.11.1 (2016-3-29)

### Bugfixes
* Fix for using Android Studio to build app using Realm
* Fix for sharing Realm between JS and Objective-C/Swift

## 0.11.0 (2016-3-24)

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


## 0.10.0 (2016-2-22)

### Enhancements
* Initial Release
