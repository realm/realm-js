x.x.x Release notes (yyyy-MM-dd)
=============================================================
### Enhancements
* Add realmRef property to `RealmProvider` to access the configured realm outside of the provider component ([#4571](https://github.com/realm/realm-js/issues/4571))
  * Additionally appRef on `AppProvider` was added to provide access to `Realm.App` from outside the provider component

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None.

### Compatibility
* MongoDB Realm Cloud.
* Realm Studio v11.0.0.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.5.x series.
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
* <Either mention core version or upgrade>
* <Using Realm Core vX.Y.Z>
* <Upgraded Realm Core from vX.Y.Z to vA.B.C>

# 0.3.0 Release notes (2022-05-11)

### Enhancements

- Add UserProvider and useUser hook ([#4557](https://github.com/realm/realm-js/pull/4557)). Usage example:

```
import {AppProvider, UserProvider} from '@realm/react'
//...
// Wrap your RealmProvider with the AppProvider and provide an appId
<AppProvider id={appId}>
	<UserProvider fallback={LoginComponent}>
		{/* After login, user will be automatically populated in realm configuration */}
		<RealmProvider sync={{flexible: true}}>
		//...
		</RealmProvider>
	</UserProvider>
</AppProvider>

// Access the app instance using the useApp hook
import {useUser} from '@realm/react'

const SomeComponent = () => {
	const user = useUser()

	//...
}
```

- Add AppProvider and useApp hook ([#4470](https://github.com/realm/realm-js/pull/4470)). Usage example:

```
import {AppProvider} from '@realm/react'
//...
// Wrap your RealmProvider with the AppProvider and provide an appId
<AppProvider id={appId}>
	<RealmProvider sync={{user, flexible: true}}>
	//...
	</RealmProvider>
</AppProvider>

// Access the app instance using the useApp hook
import {useApp} from '@realm/react'

const SomeComponent = () => {
	const app = useApp()

	//...
}
```

### Fixed

- Implicit children [was removed from `React.FC`](https://solverfox.dev/writing/no-implicit-children/). Children has now been explicitly added to provider props. ([#4565](https://github.com/realm/realm-js/issues/4565))
- Fixed potential "Cannot create asynchronous query while in a write transaction" error with `useObject` due to adding event listeners while in a write transaction ([#4375](https://github.com/realm/realm-js/issues/4375), since v0.1.0)

### Compatibility

- None.

### Internal

- Tests run with `--forceExit` to prevent them hanging ([#4531](https://github.com/realm/realm-js/pull/4531))

  # 0.2.1 Release notes (2022-03-24)

### Enhancements

- Allow `createRealmContext` to be called without an initial configuration
- Add a `fallback` property to `RealmProvider` that is shown while realm is opening

### Fixed

- Fixed bug when trying to access a collection result with an out of bounds index.([#4416](https://github.com/realm/realm-js/pull/4416), since v0.2.0)

### Compatibility

- None

### Internal

- None

  # 0.2.0 Release notes (2022-03-07)

### Enhancements

- Add ability to import `Realm` directly from `@realm/react`
- Add cachedObject and cachedCollection
  - Ensures that React.Memo that have Realm.Object/Collection as a property only rerender on actual changes
  - Increased compatability with VirtualizedList/FlatList
- Added more comprehensive documentation in the source code
- List properties of a Realm.Object now rerender on change
- Broadened test coverage for collections, lists and linked objects

  # 0.1.0 Release notes (2021-11-10)

### Enhancements

- Initial release
