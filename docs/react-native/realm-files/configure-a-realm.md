# Configure a Realm - React Native SDK
The Realm React Native SDK and `@realm/react` package provide many
configuration options for your realm.

How you configure your realm determines the capabilities of your realm
and how you work with your data. This page contains information about how
to configure your realm in various ways.

## Prerequisites
Before you configure a realm in a React Native application:

1. Install the Realm React Native SDK
2. Install the [@realm/react package](https://www.npmjs.com/package/@realm/react)

## Configure a Realm
`RealmProvider` is a wrapper
that exposes a realm to its child components. You configure your realm by
passing props to `RealmProvider`.

When `RealmProvider` is rendered, it opens the realm. This means that
the child components can't access the realm if rendering fails.

1. Import `RealmProvider` from `@realm/react`.
2. Pass your object models to the `schema` prop.
3. Add other `Configuration object`
properties as props to `RealmProvider` to configure your realm.

```typescript
import React from 'react';
import {RealmProvider} from '@realm/react';

function AppWrapperLocal() {
  return (
    <RealmProvider schema={[YourObjectModel]}>
      <RestOfApp />
    </RealmProvider>
  );
}

```

For a list of providers and hooks used in local realm, check out
@realm/react Providers and Hooks.

### Configuration Options
You can configure `RealmProvider` by setting props that match the properties
of a `Configuration object`.
You can also set `fallback` and `realmRef` props.

- Used with `useRef` to expose the configured realm to processes
outside of `RealmProvider`. This can be useful for things like a client
reset fallback.
- Rendered while waiting for the realm to open. Local realms
usually open fast enough that the `fallback` prop isn't needed.

### Configure an In-Memory Realm
To create a realm that runs entirely in memory without being written to a file,
pass `true` to the `inMemory` prop on your `RealmProvider`:

```typescript
import React from 'react';
import {Realm, RealmProvider} from '@realm/react';

function AppWrapperLocal() {
  return (
    <RealmProvider inMemory={true}>
      <RestOfApp />
    </RealmProvider>
  );
}

```

In-memory realms may use disk space if memory is running low, but files created
by an in-memory realm are deleted when you close the realm.

### Encrypt a Realm
To encrypt a realm file on disk, refer to
Encrypt a Realm.

## Expose More Than One Realm
The `@realm/react` package exposes realms in your application using
[React Context objects](https://react.dev/learn/passing-data-deeply-with-context)
and Provider components. You can access realms with React hooks.

To expose more than one realm, consider the following:

- Each realm needs its own Context object, created with `createRealmContext()`.
- The providers and hooks within each context should be namespaced so that it's
easy to reason about the realm you're working with.
- If you import `RealmProvider` directly from `@realm/react`, it is a
separate Context object. That object's providers and hooks can't be unsynced
with Context objects created using `createRealmContext`.

### Create Separate Context Objects
You can open more than one realm at a time by creating additional Context
objects using `createRealmContext()`.

#### Javascript

```typescript
import React from 'react';
import {
  Realm,
  AppProvider,
  UserProvider,
  createRealmContext,
} from '@realm/react';

class SharedDocument extends Realm.Object {
  static schema = {
    name: 'SharedDocument',
    properties: {
      _id: 'objectId',
      owner_id: 'objectId',
      title: 'string',
      createdDate: 'date',
    },
    primaryKey: '_id',
  };
}

class LocalDocument extends Realm.Object {
  static schema = {
    name: 'LocalDocument',
    properties: {
      _id: 'objectId',
      name: 'string',
      createdDate: 'date',
    },
  };
}

// Create Shared Document context object.
const SharedRealmContext = createRealmContext({
  schema: [SharedDocument],
});

// Create Local Document context object.
const LocalRealmContext = createRealmContext({
  schema: [LocalDocument],
});

```

#### Typescript

```typescript
import React from 'react';
import {
  Realm,
  AppProvider,
  UserProvider,
  createRealmContext,
} from '@realm/react';

class SharedDocument extends Realm.Object<SharedDocument> {
  _id!: Realm.BSON.ObjectId;
  owner_id!: Realm.BSON.ObjectId;
  title!: string;
  createdDate?: Date;

  static schema: ObjectSchema = {
    name: 'SharedDocument',
    properties: {
      _id: 'objectId',
      owner_id: 'objectId',
      title: 'string',
      createdDate: 'date',
    },
    primaryKey: '_id',
  };
}

class LocalDocument extends Realm.Object<LocalDocument> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  createdDate?: Date;

  static schema: ObjectSchema = {
    name: 'LocalDocument',
    properties: {
      _id: 'objectId',
      name: 'string',
      createdDate: 'date',
    },
  };
}

// Create Shared Document context object.
const SharedRealmContext = createRealmContext({
  schema: [SharedDocument],
});

// Create Local Document context object.
const LocalRealmContext = createRealmContext({
  schema: [LocalDocument],
});

```

### Extract Providers and Hooks
You need to extract providers and hooks from each Context object. You
should namespace the providers and hooks using destructuring. This makes it
easier to reason about the realm you're working with.

Refer to RealmProvider Hooks to see which
hooks are available for a `RealmProvider`.

```typescript
// Namespace the Shared Document context's providers and hooks.
const {
  RealmProvider: SharedDocumentRealmProvider,
  useRealm: useSharedDocumentRealm,
} = SharedRealmContext;

// Namespace the Local Document context's providers and hooks.
const {
  RealmProvider: LocalDocumentRealmProvider,
  useRealm: useLocalDocumentRealm,
} = LocalRealmContext;

```

### Use Namespaced Providers and Hooks
After extracting a Context object's providers and hooks, you can use them in
your app's components. Child components inside of extracted providers have
access to extracted hooks.

## Access a Realm Without Providing a Schema
After a realm has been created on a device, you don't need to always pass in a
schema to access the realm. Instead, you can use `RealmProvider` without
passing any object models to its `schema` property. The realm's schema is
derived from the existing realm file at `Realm.defaultPath`.

Accessing a realm without providing a schema only works for local realms. You
must always pass a schema when using a Synced realm.

```typescript
import React from 'react';
import {RealmProvider} from '@realm/react';

function AppWrapper() {
  return (
    // To access a realm at the default path, do not pass any configuration.
    // Requires a realm that has already been created.
    <RealmProvider>
      <RestOfApp />
    </RealmProvider>
  );
}

```

## @realm/react Providers and Hooks
`@realm/react` has providers and hooks that simplify working with your
non-sync realm and its data.

|Provider/Hook|Description|Example|
| --- | --- | --- |
|`RealmProvider`|A wrapper that exposes a realm to its child components, which have access to hooks that let you read, write, and update data.|See Configure a Realm|
|`useRealm`|Returns the instance of the Realm opened by the RealmProvider.|`const realm = useRealm();`|
|`useObject`|Returns an object (`Realm.Object<T>`) from a given type and value of primary key. Updates on any changes to the returned object. Returns `null` if the object either doesn't exists or has been deleted.|`const myTask = useObject(Task, _id);`|
|`useQuery`|Returns a collection of objects (`Realm.Results<T & Realm.Object T>`) from a given type. Updates on any changes to any object in the collection. Returns an empty array if the collection is empty.|`const tasks = useQuery(Task);`|
