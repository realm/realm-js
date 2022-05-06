<p align="center">
  <img height="140" src="logo.svg" alt="Realm React Logo"/>
</p>

<h1 align="center">
  Realm React
</h1>

Build better apps, faster.
## Introduction
Setting up Realm in a React Native application has historically been complex. Re-rendering of components when objects in the database change requires manually adding and removing listeners, which produce a lot of boilerplate code and is error-prone (if listeners properly removed on unmount). This library alleviates that by providing [React hooks](https://reactjs.org/docs/hooks-intro.html) which return Realm data that is state aware. As a consequence, any change to the Realm data will cause components using the hook to re-render.

Documentation for `@realm/react` and Realm can be found at [docs.mongodb.org](https://www.mongodb.com/docs/realm/sdk/react-native/use-realm-react/).
## Installation

This library requires `react-native` >= 0.59 and `realm` >= 10

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
import { Realm, createRealmContext } from '@realm/react'
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

const { RealmProvider, useRealm, useQuery } = createRealmContext({ schema: [Task] })

export default function AppWrapper() {
  return (
    <RealmProvider><TaskApp /></RealmProvider>
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
const Component = () => {
  // ObjectClass is a class extending Realm.Object, which should have been provided in the Realm Config.
  // It is also possible to use the model's name as a string ( ex. "Object" ) if you are not using class based models.
  const collection = useQuery(ObjectClass);

  // The methods `sorted` and `filtered` should be wrapped in a useMemo.
  const sortedCollection = useMemo(collection.sorted(), [collection]);

  return (
    <FlatList data={sortedCollection} renderItem={({ item }) => <Object item={item}/>
  )
}
```

### useObject
 Returns a [`Realm.Object`](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.Object.html) for a given type and primary key.  The Hook will update on any changes to the properties on the returned Object and return `null` if it either doesn't exist or has been deleted.

```tsx
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
### createRealmContext

To get started with `@realm/react`, one must create a Context object with `createRealmContext`.  The Context object will contain a Realm Context Provider, which will have an open Realm as its context, and a set of Hooks that access the Realm Context.

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

Here is an example of how to setup Realm React with a Task model:

```tsx
import {createRealmContext} from '@realm/react';

const myRealmConfig = { schema: [Task, User, /*...*/]};

const { RealmProvider, useRealm, useObject, useQuery } = createRealmContext(myRealmConfig);

const AppWrapper = () => {
  return (
    <RealmProvider>
      <App/>
    <RealmProvider>
  )
}

```

#### Multiple Realms
`createRealmContext` can be called multiple times if your app requires more than one Realm.  In that case, you would have multiple `RealmProvider`s that wrap your app and must use the hooks from the context you wish to access.

```tsx
const { RealmProvider: PublicRealmProvider, useRealm: usePublicRealm, useObject: usePublicObject, useQuery: usePublicQuery } = createRealmContext(publicConfig);
const { RealmProvider: PrivateRealmProvider, useRealm: usePrivateRealm, useObject: usePrivateObject, useQuery: usePrivateQuery } = createRealmContext(privateConfig);
```

It is also possible to call it without any Config; in the case that you want to do all your configuration through the `RealmProvider` props.
### RealmProvider

In the example above, we used the `RealmProvider` without any props.  It is, however, possible to configure the Realm through props on the `RealmProvider`.

```tsx
const AppWrapper = () => {
  return (
    <RealmProvider schema={[Task, User, /*...*/]} onFirstOpen={(realm) => {/*initialize realm with some data*/}}>
      <App/>
    <RealmProvider>
  )
}
```

The `RealmProvider` also comes with a fallback prop that can be used for sync conifigurations.  It can take time for larger datasets to sync, especially if it's the first time.  In that case, it is recommended to provide a loading component as a fallback.

```tsx
const AppWrapper = () => {
  return (
    <RealmProvider fallback={<Loading/>} >
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

<RealmProvider sync={user, partition}>
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
