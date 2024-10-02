## 0.11.0 (2024-10-02)

### Enhancements
* Add more additional overload to `useQuery` to allow the [react-hooks/exhaustive-deps](https://www.npmjs.com/package/eslint-plugin-react-hooks) eslint rule to work (#6819)

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

## 0.10.1 (2024-08-28)

### Fixed
* Fixing the `RealmProvider` component when context is created without passing neither a `Realm` instance nor a `Realm.Configuration` to avoid unnecessary recreation of the provider, which was causing "Cannot access realm that has been closed" errors. ([#6842](https://github.com/realm/realm-js/issues/6842), since v0.8.0)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).

## 0.10.0 (2024-08-15)

### Enhancements
* Added `useProgress` hook which provides a convenient way to access Realm's progress information. It works in a similar way as `realm.addProgressNotification`. ([#6797](https://github.com/realm/realm-js/issues/6797))
```tsx
import { RealmProvider, ProgressDirection, ProgressMode } from "@realm/react";

const ProgressText = () => {
	const progress = useProgress({ direction: ProgressDirection.Download, mode: ProgressMode.ReportIndefinitely });

    return <Text>Loading: {(100 * progress).toFixed()}%</Text>;  
}

const MyApp() = () => {
  return (
    <RealmProvider sync={...}> 
      <ProgressText />
    </RealmProvider>
  );
}
```
* Added the ability to get `progress` information in `fallback` component of `RealmProvider` when opening a synced Realm. ([#6785](https://github.com/realm/realm-js/issues/6785))
```tsx
import { RealmProvider, RealmProviderFallback } from "@realm/react";

const Fallback: RealmProviderFallback = ({ progress }) => {
	return <Text>Loading:{(100 * progress).toFixed()}%</Text>;
}

const MyApp() = () => {
  return (
    <RealmProvider sync={...} fallback={Fallback}> 
      ...
    </RealmProvider>
  );
}
```

### Compatibility
* **Realm JavaScript >= v12.12.0**.
* React Native >= v0.71.4
* Realm Studio v15.0.0.
* File format: generates Realms with format v24 (reads and upgrades file format v10).


## 0.9.0 (2024-07-17)

### Enhancements
* Added the ability to pass an existing `Realm.App` instance in `AppProvider` with the `app` prop. ([#6785](https://github.com/realm/realm-js/issues/6785))
```jsx
import { AppProvider } from "@realm/react";

const app = new Realm.App(...);

function MyApp() {
  return (
    <AppProvider app={app}> 
      ...
    </AppProvider>
  );
}
```

### Fixed
* Fixed listener that was not being removed during unmounting of `useObject` and `useQuery` if the listener was added in a write transaction. ([#6552](https://github.com/realm/realm-js/pull/6552)) Thanks [@bimusiek](https://github.com/bimusiek)!
* The `app` prop in `AppProvider` meant for `LocalAppConfiguration` was not being used by Atlas Device Sync and has been removed. `app` is now only used to pass an existing `Realm.App` to the provider. ([#6785](https://github.com/realm/realm-js/pull/6785))

### Compatibility
* React Native >= v0.71.4
* See "Compatibility" for a specific Realm version in [Realm's CHANGELOG](https://github.com/realm/realm-js/blob/main/CHANGELOG.md).

## 0.8.0 (2024-06-18)

### Enhancements
* Added the ability to use an existing Realm instance in `RealmProvider` and `createRealmContext`. ([#6714](https://github.com/realm/realm-js/pull/6714))
```jsx
// Using RealmProvider
import { RealmProvider } from "@realm/react";

const realm = new Realm(...);

function MyApp() {
  return (
    <RealmProvider realm={realm}> 
      ...
    </RealmProvider>
  );
}

// Using createRealmContext
import { createRealmContext } from "@realm/react";

const realm = new Realm(...);
const { RealmProvider, useRealm } = createRealmContext(realm);

function MyApp() {
  return (
    <>
      <RealmProvider> 
        ...
      </RealmProvider>
      <AnotherComponent>
        {/* Note: The hooks returned from `createRealmContext` using an existing Realm can be used outside of the scope of the provider! */}
      </AnotherComponent>
    </>
  );
```

### Compatibility
* React Native >= v0.71.4
* See "Compatibility" for a specific Realm version in [Realm's CHANGELOG](https://github.com/realm/realm-js/blob/main/CHANGELOG.md).

## 0.7.0 (2024-05-06)

### Deprecations
* Deprecated calling `useQuery` with three positional arguments. ([#6360](https://github.com/realm/realm-js/pull/6360))

  Please pass a single "options" object followed by an optional `deps` argument (if your query depends on any local variables):
  ```tsx
  const filteredAndSorted = useQuery({
    type: Object,
    query: (collection) => collection.filtered('category == $0',category).sorted('name'),
  }, [category]);
  ```

### Enhancements
* Adding the ability to pass "options" to `useQuery` and `useObject` as an object. ([#6360](https://github.com/realm/realm-js/pull/6360))
* Adding `keyPaths` option to the `useQuery` and `useObject` hooks, to indicate a lower bound on the changes relevant for the hook. This is a lower bound, since if multiple hooks add listeners (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the collection or object. In other words: A listener might fire and cause a re-render more than the key-paths specify, if other listeners with different key-paths are present. ([#6360](https://github.com/realm/realm-js/pull/6360))

### Fixed
* Removed race condition in `useObject`. ([#6291](https://github.com/realm/realm-js/issues/6291)) Thanks [@bimusiek](https://github.com/bimusiek)!
* Fixed flickering of the `RealmProvider`'s `fallback` component and its `children` when offline. ([#6333](https://github.com/realm/realm-js/issues/6333))

### Compatibility
* React Native >= v0.71.4
* See "Compatibility" for a specific Realm version in [Realm's CHANGELOG](https://github.com/realm/realm-js/blob/main/CHANGELOG.md).

## 0.6.2 (2023-11-15)

### Fixed
* Improved type generation, which fixed an issue with the `Realm.User` return from `useUser` ([#6196](https://github.com/realm/realm-js/issues/6196))
* `UserProvider` will now always return a new `user` reference on change events. ([#6186](https://github.com/realm/realm-js/issues/6186))
* Fix `useQuery` re-render when updating the given `type`. ([#6235](https://github.com/realm/realm-js/issues/6186))

### Compatibility
* React Native >= v0.71.4
* Realm >= 11.0.0

## 0.6.1 (2023-10-06)

### Fixed
* `useObject` will now re-render if the result of `objectForPrimaryKey` is `null` or `undefined`. ([#6101](https://github.com/realm/realm-js/issues/6101))
* Changed commonJS file name to make it more bundler friendly, especially for Electron apps.

### Compatibility
* React Native >= v0.68.0
* Realm >= 11.0.0

### Internal
* Removed `11.0.0-rc` from compatible versions.

## 0.6.0 (2023-08-23)

### Enhancements
* Add flag to keep realm open on unmount of `RealmProvider`. ([#6023](https://github.com/realm/realm-js/issues/6023))

### Fixed
* Fix for `useObject` not updating when using previously used primary key. ([#5620](https://github.com/realm/realm-js/issues/5620), since v0.4.2. Thanks @RS1-Project)

### Compatibility
* Realm >= 11.0.0

### Internal
* Added more documentation to provider params.

## 0.5.2 (2023-08-09)

### Fixed
* Fixed using `@realm/react` in jest tests, by providing a common js distribution. ([#6049](https://github.com/realm/realm-js/issues/6049)

### Compatibility
* React Native >= v0.71.4
* Realm Studio v14.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

## 0.5.1 (2023-06-21)

### Fixed
* Include the `src` in the distributed package.  This fixes a warning about source maps being not included.
* Get the `useAuth` and `useEmailPasswordAuth` tsdoc to appear on hover over for LSP enabled IDEs.
* `useEmailPasswordAuth` was crashing on v11 since there are no named exports on `Realm`.


### Internal
* Refactor `useAuthOperation` to use the `reject` callback rather than `catch`.
* Refactor `useAuthOperation` to not return a result.  All methods are `void`.

## 0.5.0 (2023-06-19)

### Enhancements
* Add authentication hooks, `useAuth` and `useEmailPasswordAuth`
	[Usage example](https://github.com/realm/realm-js/blob/main/packages/realm-react/README.md#authentication-hooks)
* Allow `useQuery` to be passed a `query` function where `sorted` and `filtered` methods can be called ([#5471](https://github.com/realm/realm-js/issues/5471)) Thanks for the contribution [@levipro](https://github.com/levipro)!

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
