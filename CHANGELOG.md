## vNext (TBD)

### Deprecations
* None

### Enhancements
* None

### Fixed
* Fix issues with `yarn` and the `bson` dependency. ([#6040](https://github.com/realm/realm-js/issues/6040))

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

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
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->
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
