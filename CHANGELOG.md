0.11.0 Release notes (2016-3-16)
=============================================================
### API breaking changes
* None.

### Enhancements
* Support for encryption
* List and Results now inherit from Realm.Collection
* Add common Array methods to List and Results
* Accept constructor in create() and objects() methods
* Support relative paths when opening realms
* Support case insensitive queries
* Support for indexed bool, string, and int properties
* Added method to retrieve schemaVersion from an unopened Realm

### Bugfixes
* Fix for crash on Android when initializing the Realm module
* Fix for using Chrome debug mode from a device
* Automatically forward port 8082 for Android
* Fix broken iterator methods on Android
* Fix for List splice method not accepting a single argument
* Don't download or unpack core libraries unnecessarily


0.10.0 Release notes (2016-2-22)
=============================================================
### Enhancements

* Initial Release
