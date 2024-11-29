## 20.1.0 (2024-11-29)

### Enhancements
* Added `excludeFromIcloudBackup` option to the `Realm` constructor to exclude the realm files from iCloud backup. ([#4139](https://github.com/realm/realm-js/issues/4139) and [#6927](https://github.com/realm/realm-js/pull/6927))
```typescript
const realm = new Realm({
  schema: [
    /* your schema */
  ],
  // Set to true to exclude from iCloud backup, false to include, defaults to false
  excludeFromIcloudBackup: true,
});
```

### Fixed
* Fixed build error on React Native Android when used with React Native 0.76, due to the merge of dynamic libraries. ([#6908](https://github.com/realm/realm-js/issues/6908) since React Native v0.76.0).
* Fix build failure from duplicate libreactnative.so files. I.e. "2 files found with path 'lib/arm64-v8a/libreactnative.so' from inputs" ([#6918](https://github.com/realm/realm-js/issues/6918), since v12.13.2)
* Having a query with a number of predicates ORed together may result in a crash on some platforms (strict weak ordering check failing on iphone) ([realm/realm-core#8028](https://github.com/realm/realm-core/issues/8028), since Realm JS v20.0.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

### Internal
* Refactored Android filesystem platform helpers. ([#5296](https://github.com/realm/realm-js/issues/5296) and [realm/realm-js-private#507](https://github.com/realm/realm-js-private/issues/507))
* Upgraded Realm Core from v20.0.1 to v20.1.0

## 20.0.0 (2024-09-09)

### Breaking Changes
* Removed all functionality related to Atlas Device Services / Device Sync.

### Compatibility
* React Native >= v0.71.4
* Realm Studio v20.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

### Internal
* Upgraded Realm Core from v14.12.0 to v20.0.1

## 12.13.1 (2024-08-21)

### Fixed
* Fixed a build error on React Native iOS and Android from a change in the `CallInvoker`'s `invokeAsync` call signature. ([#6851](https://github.com/realm/realm-js/pull/6851) since v12.12.0 in combination with React Native >= v0.75.0).

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->
