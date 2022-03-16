x.x.x Release notes (yyyy-MM-dd)
=============================================================
### Enhancements
* None.

### Fixed
* Fixed bug when trying to access a collection result with an out of bounds index.([#4416](https://github.com/realm/realm-js/pull/4416), since v0.2.0)

### Compatibility
* None

### Internal
* None

0.2.0 Release notes (2022-03-07)
=============================================================
### Enhancements
* Add ability to import `Realm` directly from `@realm/react`
* Add cachedObject and cachedCollection
  * Ensures that React.Memo that have Realm.Object/Collection as a property only rerender on actual changes
	* Increased compatability with VirtualizedList/FlatList
* Added more comprehensive documentation in the source code
* List properties of a Realm.Object now rerender on change
* Broadened test coverage for collections, lists and linked objects

0.1.0 Release notes (2021-11-10)
=============================================================
### Enhancements
* Initial release
