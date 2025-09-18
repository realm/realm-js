# RealmProvider (@realm/react)
```typescript
RealmProvider(props, context?): null | ReactElement<any, any>
```

Components nested within `RealmProvider` can access the configured realm
and use the `RealmProvider` hooks.

## Props
All properties of `BaseConfiguration` can be passed as props.

`RealmProvider` has more props that define its behavior:

- `fallback?: React.ComponentType<unknown> | React.ReactElement | null | undefined` The fallback component to render while the Realm is opening.
- `closeOnUnmount?: boolean` Default is `true`. If set to `false`, realm will not close when the
component unmounts.
- `realmRef?: React.MutableRefObject<Realm | null>` A ref to the realm instance. This is useful if you need to access the realm
instance outside of the scope of the realm.
- `children: React.ReactNode`

## Configure a Realm with RealmProvider
You can configure a `RealmProvider` in two ways:

- Import `RealmProvider` directly from `@realm/react`
- Use `createRealmContext()` to configure a `RealmProvider` and create hooks

This section details how to configure a `RealmProvider` imported directly from
`@realm/react`. For information about using `createRealmContext()`, refer
to Create Context with createRealmContext().

Object models are part of most realm configurations. To learn more about Realm and
data models, refer to Define a Realm Object Model.

## Configure More Than One Realm
When you import `RealmProvider` from `@realm/react`, that Provider has a
specific context and is associated with a single realm. If you need to configure
more than one realm, use `createRealmContext()` to instantiate a new Provider
for each realm.

If you import `useRealm()`, `useQuery()`, or `useObject()` directly from
`@realm/react`, those hooks use the default realm context. To work with more
than one realm, you need to destructure a new realm Provider and its associated
hooks from the result of `createRealmContext()`. You should namespace providers
to avoid confusion about which Provider and hooks you're working with.

For a detailed guide, refer to Expose More Than One Realm.

For details about `createRealmContext()`, refer to "Create Context with
createRealmContext()" on this page.

## RealmProvider Hooks
### useRealm()
```typescript
useRealm(): Realm
```

The `useRealm()` hook returns an opened realm instance. The realm instance
gives you access to realm methods and properties. For example, you can call
`realm.write()` to add a realm object to your realm.

To learn more about modifying Realm data, refer to Write Transactions.

```typescript
const CreatePersonInput = () => {
  const [name, setName] = useState('');
  const realm = useRealm();

  const handleAddPerson = () => {
    realm.write(() => {
      realm.create('Person', {_id: PERSON_ID, name: name, age: 25});
    });
  };

  return (
    <>
      <TextInput value={name} onChangeText={setName}  />
      <Button
        onPress={() => handleAddPerson()}
        title='Add Person'
      />
    </>
  );
};

```

*Returns*

- `Realm`
Returns a realm instance. This is the realm created by the hook's parent,
`RealmProvider`.

### useObject()
```typescript
useObject<T>(type, primaryKey): T & Realm.Object<T> | null
```

The `useObject()` hook returns a Realm object for a given
primary key. You can pass an object class
or the class name as a string and the primary key.

The `useObject()` method returns null if the object doesn't exist or you have
deleted it. The hook will automatically subscribe to updates and rerender the
component using the hook on any change to the object.

```typescript
const TaskItem = ({_id}: {_id: number}) => {
  const myTask = useObject(Task, _id);
  return (
    <View>
      {myTask ? (
        <Text>
          {myTask.name} is a task with the priority of: {myTask.priority}
        </Text>
      ) : null}
    </View>
  );
};

```

*Parameters*

- `type: string`
A string that matches your object model's class name or a reference to a
class that extends `Realm.Object`.
- `primaryKey: T[keyof T]`
The primary key of the desired object.

*Returns*

- `Realm.Object | null`
A Realm Object or `null` if no object is found.

### useQuery()
```typescript
useQuery<T>(type, query?, deps?): Realm.Results<T & Realm.Object<T>>
```

The `useQuery()` hook returns a collection of realm objects of a given type.
These are the results of your query. A query can be an object class or the class
name as a string.

The `useQuery()` method subscribes to updates to any objects in the collection
and rerenders the component using it on any change to the results.

You can use `.filtered()` and `.sorted()` to filter and sort your query
results. You should do this in the `query` argument of `useQuery` so that
they only run when there are changes in the dependency array. For more examples,
refer to the CRUD - Read docs.

```typescript
const TaskList = () => {
  const [priority, setPriority] = useState(4);
  // filter for tasks with a high priority
  const highPriorityTasks = useQuery(
    Task,
    tasks => {
      return tasks.filtered('priority >= $0', priority);
    },
    [priority],
  );

  // filter for tasks that have just-started or short-running progress
  const lowProgressTasks = useQuery(Task, tasks => {
    return tasks.filtered(
      '$0 <= progressMinutes && progressMinutes < $1',
      1,
      10,
    );
  });

  return (
    <>
      <Text>Your high priority tasks:</Text>
      {highPriorityTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
      <Text>Your tasks without much progress:</Text>
      {lowProgressTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
    </>
  );
};

```

*Parameters*

- `type: string`
A string that matches your object model's class name or a reference to a
class that extends `Realm.Object`.
- `query?: QueryCallback<T>`
A query function that can filter and sort query results. Builds on
`useCallback` to memoize the query function.
- `deps?: DependencyList`
A list of query function dependencies that's used to memoize
the query function.

*Returns*

- `Realm.Results<T>`
A Realm Object or `null` if no object is found.

## Create Context with createRealmContext()
```typescript
createRealmContext(realmConfig?): RealmContext
```

Most of the time, you will only use `createRealmContext()` if you need to
configure more than one realm. Otherwise, you should import `RealmProvider`
and hooks directly from `@realm/react`.

The `createRealmContext()` method creates a [React Context](https://reactjs.org/docs/context.html) object for a realm with a given
Configuration`. The
`Context` object contains the following:

- A [Context Provider](https://reactjs.org/docs/context.html#contextprovider) (referred to
as `RealmProvider` elsewhere) component that wraps around child components
and provides them with access to hooks.
- Various prebuilt [Hooks](https://reactjs.org/docs/hooks-intro.html) that access the
configured realm.

For a detailed guide, refer to Expose More Than One Realm.

*Parameters*

- `realmConfig?: Realm.Configuration`
All properties of `BaseConfiguration` can be used.

*Returns*

- `RealmContext`
An object containing a `RealmProvider` component, and the `useRealm`,
`useQuery` and `useObject` hooks.
