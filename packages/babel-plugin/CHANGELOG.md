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
