0.4.0 Release notes (2020-6-11)
=============================================================

### Enhancements
* None.

### Fixed
* Loading Realm Web into a browser would yeild an error with the message "global is not defined". This was due to an issue in the "bson" dependency which got downgraded to the latest stable version. ([#2960](https://github.com/realm/realm-js/pull/2960))

### Internal
* None

0.3.0 Release notes (2020-6-11)
=============================================================

### Enhancements
* None.

### Fixed
* Building a TypeScript file which imported from "realm-web" would fail if the "realm" and "realm-network-transport" types were not installed, this is no longer the case. ([#2960](https://github.com/realm/realm-js/pull/2960))

### Internal
* None

0.2.0 Release notes (2020-6-4)
=============================================================

This was the first external release of the Realm Web package.
