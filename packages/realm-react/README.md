<p align="center">
  <img height="140" src="media/realm-react-logo.svg" alt="Realm React Logo"/>
</p>

<h1 align="center">
  Realm React
</h1>

Build better apps, faster.
## Introduction
Setting up Realm in a React Native application has historically been complex. Re-rendering of components when objects in the database change requires manually adding and removing listeners, which produce a lot of boilerplate code and is error-prone (if listeners properly removed on unmount). This library alleviates that by providing [React hooks](https://reactjs.org/docs/hooks-intro.html) which return Realm data that is state aware. As a consequence, any change to the Realm data will cause components using the hook to re-render.

Documentation for `@realm/react` and Realm can be found at [docs.mongodb.org](https://www.mongodb.com/docs/realm/sdk/react-native/use-realm-react/).
## Installation

This library requires `react-native` >= 0.59 and `realm` >= 11

npm:

```
npm install realm @realm/react
```

yarn:

```
yarn add realm @realm/react
```

## Try it out

Here is a simple task manager application written with Realm React.  Copy into a React Native application and give it a try!

```tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, FlatList, Pressable } from "react-native";
import { Realm, RealmProvider, useRealm, useQuery } from '@realm/react'

class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  createdAt!: Date;

  static generate(description: string) {
    return {
      _id: new Realm.BSON.ObjectId(),
      description,
      createdAt: new Date(),
    };
  }

  static schema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      description: 'string',
      isComplete: { type: 'bool', default: false },
      createdAt: 'date'
    },
  };
}

export default function AppWrapper() {
  return (
    <RealmProvider schema={[Task]}><TaskApp /></RealmProvider>
  )
}

function TaskApp() {
  const realm = useRealm();
  const tasks = useQuery(Task);
  const [newDescription, setNewDescription] = useState("")

  return (
    <SafeAreaView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 10 }}>
        <TextInput
          value={newDescription}
          placeholder="Enter new task description"
          onChangeText={setNewDescription}
        />
        <Pressable
          onPress={() => {
            realm.write(() => {
              realm.create("Task", Task.generate(newDescription));
            });
            setNewDescription("")
          }}><Text>➕</Text></Pressable>
      </View>
      <FlatList data={tasks.sorted("createdAt")} keyExtractor={(item) => item._id.toHexString()} renderItem={({ item }) => {
        return (
          <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 10 }}>
            <Pressable
              onPress={() =>
                realm.write(() => {
                  item.isComplete = !item.isComplete
                })
              }><Text>{item.isComplete ? "✅" : "☑️"}</Text></Pressable>
            <Text style={{ paddingHorizontal: 10 }} >{item.description}</Text>
            <Pressable
              onPress={() => {
                realm.write(() => {
                  realm.delete(item)
                })
              }} ><Text>{"🗑️"}</Text></Pressable>
          </View>
        );
      }} ></FlatList>
    </SafeAreaView >
  );
}
```

For a full fledged example, check out [our templates](https://github.com/realm/realm-js#template-apps-using-expo-for-react-native).


## Realm Hooks

### useRealm
Returns the instance of the [`Realm`](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.html) configured by `createRealmContext` and the `RealmProvider`.  The following is an example of how to use this Hook to make a write transaction callback for a component.

```tsx
import {useRealm} from '@realm/react';
// assume props contain item a Realm.Object
const Component = ({item}) => {
  const realm = useRealm();
  const toggleComplete = useCallback((item) => {
    realm.write(() => {
      item.isComplete = !item.isComplete
    })
  },[item, realm])

  return (
    <Pressable
      onPress={() =>
        realm.write(() => {
          item.isComplete = !item.isComplete
        })
      }><Text>{item.isComplete ? "✅" : "☑️"}</Text>
    </Pressable>
  )
}
```

### useQuery

Returns [`Realm.Results`](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.Results.html) from a given type. This Hook will update on any changes to any Object in the Collection and return an empty array if the Collection is empty.
The result of this can be consumed directly by the `data` argument of any React Native [`VirtualizedList`](https://reactnative.dev/docs/virtualizedlist) or [`FlatList`](https://reactnative.dev/docs/flatlist).  If the component used for the list's `renderItem` prop is wrapped with [`React.Memo`](https://reactjs.org/docs/react-api.html#reactmemo), then only the modified object will re-render.

```tsx
import {useQuery} from '@realm/react';

const Component = () => {
  // ObjectClass is a class extending Realm.Object, which should have been provided in the Realm Config.
  // It is also possible to use the model's name as a string ( ex. "Object" ) if you are not using class based models.
  const sortedCollection = useQuery(ObjectClass, (collection) => {
    // The methods `sorted` and `filtered` should be passed as a `query` function.
    // Any variables that are dependencies of this should be placed in the dependency array.
    return collection.sorted();
  }, []);

  return (
    <FlatList data={sortedCollection} renderItem={({ item }) => <Object item={item}/>
  )
}
```

### useObject
 Returns a [`Realm.Object`](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.Object.html) for a given type and primary key.  The Hook will update on any changes to the properties on the returned Object and return `null` if it either doesn't exist or has been deleted.

```tsx
import {useObject} from '@realm/react';

const Component = ({someId}) => {
  // ObjectClass is a class extending Realm.Object, which should have been provided in the Realm Config.
  // It is also possible to use the model's name as a string ( ex. "Object" ) if you are not using class based models.
  const object = useObject(ObjectClass, someId);

  return (
    <View>
      <Text>{object.name}</Text>
    </View>
  )
}
```
## Setting Things Up
### RealmProvider

To get started with `@realm/react`, one must wrap your app with a `RealmProvider`. The `RealmProvider` can be configured using props.  At a minimum, one must set the `schema` prop to the Realm models that they have configured.
Any child of the RealmProvider will be able to use the hooks to access and manipulate Realm data. Here is an example of how to setup Realm React with a Task model:

```tsx
import { RealmProvider, useQuery, Realm } from '@realm/react';

const AppWrapper = () => {
  return (
    <RealmProvider schema={[Item]}>
      <SomeComponent/>
    <RealmProvider>
  )
}

const SomeComponent = () => {
  const items = useQuery(Item)
  //..
}

```

The `RealmProvider` also comes with a fallback prop that is rendered when while awaiting for the Realm to open. For local Realm, this is instant, but for synced a Realm, it can take time for larger datasets to sync, especially if it's the first time the app has been opened.  In that case, it is recommended to provide a loading component as a fallback.

```tsx
const AppWrapper = () => {
  return (
    <RealmProvider fallback={<Loading/>} >
      <App/>
    <RealmProvider>
  )
}
```

In some cases, it may be necessary to access the configured Realm from outside of the `RealmProvider`, for instance, implementing a client reset fallback.  This can be done by creating a `ref` with `useRef` and setting the `realmRef` property of `RealmProvider`.

```tsx
const AppWrapper = () => {
  const realmRef = useRef<Realm|null>(null)

  return (
    <RealmProvider realmRef={realmRef}>
      <App/>
    <RealmProvider>
  )
}
```
### Dynamically Updating a Realm Configuration

It is possible to update the realm configuration by setting props on the `RealmProvider`.  The `RealmProvider` takes props for all possible realm configuration properties.

For example, one could setup the sync configuration based on a user state:

```tsx
const [user, setUser] = useState()

//... some logic to get user state

<RealmProvider sync={{ user, partition }}>
```

### `useApp` and the `AppProvider`

The `useApp` hook can be used to access your Realm App instance as long as the `AppProvider` wraps your application.  This should be done outside of your `RealmProvider`.

`AppProvider` usage:

```tsx
import { AppProvider } from '@realm/react'
//...
// Wrap your RealmProvider with the AppProvider and provide an appId
<AppProvider id={appId}>
	<RealmProvider sync={{user, flexible: true}}>
	//...
	</RealmProvider>
</AppProvider>
```

`useApp` usage:
```tsx
// Access the app instance using the useApp hook
import { useApp } from '@realm/react'

const SomeComponent = () => {
	const app = useApp();

	//...
}
```

It is also possible to receive a reference to the app outside of the `AppProvider`, through the `appRef` property.  This must be set to a React reference returned from `useRef`.

```tsx
const AppWrapper = () => {
  const appRef = useRef<Realm.App|null>(null)

  return (
    <AppProvider appRef={appRef}>
      <App/>
    <AppProvider>
  )
}
```

### `useUser` and the `UserProvider`

With the introduction of the `UserProvider`, the `user` can be automatically populated into the underlying Realm configuration.  The `fallback` property can be used to provide a login component.
The child components will be rendered as soon as a user has authenticated.  On logout, the fallback will be displayed again.

`UserProvider` usage:

```tsx
import { AppProvider, UserProvider } from '@realm/react'
//...
<AppProvider id={appId}>
	<UserProvider fallback={LoginComponent}>
		{/* After login, user will be automatically populated in realm configuration */}
		<RealmProvider sync={{flexible: true}}>
		//...
		</RealmProvider>
	</UserProvider>
</AppProvider>
```

`useUser` usage:
```tsx
// Access the app instance using the useApp hook
import { useUser } from '@realm/react'

const SomeComponent = () => {
	const user = useUser();

	//...
}
```


#### Multiple Realms
`createRealmContext` can be used to create a contextualized hooks and a RealmProvider to the passed in configuration for a Realm. It can be called multiple times if your app requires more than one Realm.  In that case, you would have multiple `RealmProvider`s that wrap your app and must use the hooks from the created context you wish to access.

The Context object will contain a `RealmProvider`, which will a open a Realm when it is rendered. It also contains a set of hooks that can be used by children to the `RealmProvider` to access and manipulate Realm data.

The structure of the Context object is:

```
{
  RealmProvider, // Wrapper for your application to enable usage of hooks
  useRealm, // Hook to access the configured Realm
  useQuery, // Hook to access collections of Realm objects
  useObject, // Hook to access a single Realm object by primary key
}
```

The configuration for the Realm context can be given as an object argument to `createRealmContext` or be set directly on the `RealmProvider` props. The props set on `RealmProvider` will be merged with those provided to `createRealmContext`, with the props taking priority.  A Realm will be opened with this merged configuration when the Realm Context Provider is rendered.  A fallback component can optionally be rendered until the Realm is opened.  This is useful for projects using Realm Sync.

```tsx
const { RealmProvider: PublicRealmProvider, useRealm: usePublicRealm, useObject: usePublicObject, useQuery: usePublicQuery } = createRealmContext(publicConfig);
const { RealmProvider: PrivateRealmProvider, useRealm: usePrivateRealm, useObject: usePrivateObject, useQuery: usePrivateQuery } = createRealmContext(privateConfig);
```

It is also possible to call it without any Config; in the case that you want to do all your configuration through the `RealmProvider` props.


#### Sync Debug Logs
When running into issues with sync, it may be helpful to view logs in order to determine what the issue was or to provide more context when submitting an issue.  This can by done with the `AppProvider`.

```
// logger includes a default that prints level and message
<AppProvider id={appId} logLevel={'trace'} logger={(level, message) => console.log(`[${level}]: ${message}`)}>
```
