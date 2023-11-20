## vNext (TBD)

### Deprecations
* None

### Enhancements
* None

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

## 0.2.0 (2023-11-20)

### Enhancements
* Support full-text index decorator ()`@index("full-text")`). Thanks to @atdyer. ([#5800](https://github.com/realm/realm-js/issues/5800))


## 0.1.1 (2022-12-06)

### Breaking changes
* None

### Enhancements
* None

### Fixed
* When a property has dynamical default value, the function was called twice. ([#5140](https://github.com/realm/realm-js/issues/5140), since v0.1.0)

### Internal
* None

## 0.1.0 (2022-10-18)

### Breaking changes
* None

### Enhancements
* Initial implementation of a plugin to transform TypeScript classes. All Realm types are supported. Moreover, decorators for search indexes (`@index`), property aliases (`@mapTo`), embedded and asymmetric objects, and primary keys are supports.

### Fixed
* None

### Internal
* None
