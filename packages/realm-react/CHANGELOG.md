x.y.z Release notes (2021-11-10)
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
