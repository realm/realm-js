?.?.? Release notes (2020-??-??)
=============================================================

### Enhancements
* Users are now persisted across refreshes and browser tabs (using the browser's local-storage). ([#2990](https://github.com/realm/realm-js/pull/2990))
* App location metadata is now requested before making any requests towards the app server. This removes the need for users to manually resolve the baseUrl. ([#3000](https://github.com/realm/realm-js/pull/3000))

### Fixed
* None.

### Internal
* None

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
