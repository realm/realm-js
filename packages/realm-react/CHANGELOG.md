## vNext (TBD)

### Enhancements
* Add authentication hooks, `useAuth` and `useEmailPasswordAuth`
	[Usage example](https://github.com/realm/realm-js/blob/main/packages/realm-react/README.md#authentication-hooks)
* Add sync log configuration to AppProvider ([#5517](https://github.com/realm/realm-js/issue/5517))
  Usage example:
	```tsx
	// logger includes a default that prints level and message
	<AppProvider id={appId} logLevel={'trace'} logger={(level, message) => console.log(`[${level}]: ${message}`)}>
	```
* Allow `useQuery` to be passed a `query` function where `sorted` and `filtered` methods can be called ([#5471](https://github.com/realm/realm-js/issues/4973)) Thanks for the contribution [@levipro](https://github.com/levipro)!

  Example:
	```tsx
	const SomeComponent = () => {
	    const user = useUser();
	    const items = useQuery(Item,
	        (res) => res.filtered(`owner_id == "${user?.id}"`).sorted('createdAt'),
	        [user]
	    );
	};
	```
* Create a default context so the `RealmProvider`, `useQuery`, `useRealm`, and `useObject` can be directly imported from `@realm/react` ([#5292](https://github.com/realm/realm-js/issue/5292))

  Example:
	```tsx
	// These imports are now available without calling `createRealmContext`
	import {RealmProvider, useQuery} from '@realm/react'
	//...
	// Provider your schema models directly to the realm provider
	<RealmProvider schema={[Item]}>
		<SomeComponent/>
	</RealmProvider>

	const SomeComponent = () => {
		const items = useQuery(Item)

		//...
	}
	```
	>NOTE: If your app is using multiple Realms, then you should continue using `createRealmContext`

### Fixed
* `useUser` is now typed to never returned `null` [#4973](https://github.com/realm/realm-js/issues/4973)
  Example:
	```
	const user = useUser();
	// before
	console.log(user?.id); // Optional chaining required
	// now
	console.log(user.id); // No typing error
	```

### Compatibility
* React Native >= v0.70.0
* Atlas App Services.
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

## 0.4.3 (2023-01-24)

### Enhancements
* Improve AppProvider and UserProvider rendering performance ([#5215](https://github.com/realm/realm-js/pull/5215))

### Fixed
* Stabilized references for Collections, Lists and Objects ([#5269](https://github.com/realm/realm-js/issues/5269))

## 0.4.2 (2023-1-11)

### Enhancements
* Immediately bind local Realm in the RealmProvider ([#5074](https://github.com/realm/realm-js/issues/5074))

### Fixed
* Prime any list properties with an cachedCollection so that updates fire correctly ([#5185](https://github.com/realm/realm-js/issues/5185))
* Primary Keys as non-primative values would reset the cached objects, since their reference always changes
* Create a listener on the collection if the object doesn't exist, and rerender when it is created ([#4514](https://github.com/realm/realm-js/issues/4514))

### Compatibility
* File format: generates Realms with format v22 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

## 0.4.1 (2022-11-3)

### Fixed
* Fix crash when using `useObject` with a model containing a `List` of primitives ([#5058](https://github.com/realm/realm-js/issues/5058))
* Fix potential infinite rerender issue when using `useUser` and the `UserProvider` ([#4967](https://github.com/realm/realm-js/issues/4967))

## 0.4.0 (2022-10-18)

### Enhancements
* Added a [contribution guide](https://github.com/realm/realm-js/blob/main/packages/realm-react/CONTRIBUTING.md) to assist in contributions from the community.

### Internal
* Update devDependencies for testing:
  * react v18.1.0
  * react-native v0.70.1
	* react-test-renderer v18.1.0
	* @testing-library/react-native v11.2.0
	* @testing-library/jest-native v4.0.13
* Refactor tests to use updated `testing-library`

## 0.4.0-rc.0 (2022-09-14)

### Fixed
* Fix realm collection and object typing to reflect changes to Class Based Models introduced in Realm `11.0.0` ([#4905](https://github.com/realm/realm-js/issues/4905))

### Internal
* Upgrade dev dependency of React Native to 0.70.0 and any relevant packages effected by this upgrade
* Migrate tests away from `@testing-library/react-hooks` which is now part of `@testing-library/react-native`

### Compatibility
* Realm >= v0.11.0

## 0.3.2 (2022-07-14)
### Fixed
* Fix peer dependency for Realm in package.json to support `-rc` branches of Realm ([#4621](https://github.com/realm/realm-js/issues/4621))
* Add generic type parameters to `@realm/react` hooks ([#4716](https://github.com/realm/realm-js/pull/4716))

## 0.3.1 (2022-05-31)

### Enhancements
* Add realmRef property to `RealmProvider` to access the configured realm outside of the provider component ([#4571](https://github.com/realm/realm-js/issues/4571))
  * Additionally appRef on `AppProvider` was added to provide access to `Realm.App` from outside the provider component

### Fixed
* Results from `useQuery` could not be passed to `MutableSubscriptionSet.add`/`remove` ([#4507](https://github.com/realm/realm-js/issues/4507), since v0.1.0)

## 0.3.0 (2022-05-11)

### Enhancements

* Add UserProvider and useUser hook ([#4557](https://github.com/realm/realm-js/pull/4557)). Usage example:

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

* Add AppProvider and useApp hook ([#4470](https://github.com/realm/realm-js/pull/4470)). Usage example:

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

* Implicit children [was removed from `React.FC`](https://solverfox.dev/writing/no-implicit-children/). Children has now been explicitly added to provider props. ([#4565](https://github.com/realm/realm-js/issues/4565))
* Fixed potential "Cannot create asynchronous query while in a write transaction" error with `useObject` due to adding event listeners while in a write transaction ([#4375](https://github.com/realm/realm-js/issues/4375), since v0.1.0)

### Compatibility

* None.

### Internal

* Tests run with `--forceExit` to prevent them hanging ([#4531](https://github.com/realm/realm-js/pull/4531))

## 0.2.1 (2022-03-24)

### Enhancements

* Allow `createRealmContext` to be called without an initial configuration
* Add a `fallback` property to `RealmProvider` that is shown while realm is opening

### Fixed

* Fixed bug when trying to access a collection result with an out of bounds index.([#4416](https://github.com/realm/realm-js/pull/4416), since v0.2.0)

### Compatibility

* None

### Internal

* None

## 0.2.0 (2022-03-07)

### Enhancements

* Add ability to import `Realm` directly from `@realm/react`
* Add cachedObject and cachedCollection
  * Ensures that React.Memo that have Realm.Object/Collection as a property only rerender on actual changes
  * Increased compatability with VirtualizedList/FlatList
* Added more comprehensive documentation in the source code
* List properties of a Realm.Object now rerender on change
* Broadened test coverage for collections, lists and linked objects

## 0.1.0 (2021-11-10)

### Enhancements

* Initial release
