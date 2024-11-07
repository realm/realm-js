## vNext (TBD)

### Deprecations
* None

### Enhancements
* None

### Fixed
* Fixed build error on React Native Android when used with React Native 0.76, due to the merge of dynamic libraries. ([#6908](https://github.com/realm/realm-js/issues/6908) since React Native v0.76.0).
* Fix build failure from duplicate libreactnative.so files. I.e. "2 files found with path 'lib/arm64-v8a/libreactnative.so' from inputs" ([#6918](https://github.com/realm/realm-js/issues/6918), since v12.13.2)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

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
