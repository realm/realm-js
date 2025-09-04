# CRUD - Delete - React Native SDK
The examples on this page use the following schema:

#### Javascript

```javascript
class Dog extends Realm.Object {
  static schema = {
    name: 'Dog',
    properties: {
      name: 'string',
      owners: {
        type: 'list',
        objectType: 'Person',
        optional: true,
      },
      age: 'int?',
    },
  };
}

```

#### Typescript

```typescript
class Dog extends Realm.Object<Dog> {
  name!: string;
  owner?: Realm.List<Person>;
  age?: number;

  static schema: ObjectSchema = {
    name: 'Dog',
    properties: {
      name: 'string',
      owners: {
        type: 'list',
        objectType: 'Person',
        optional: true,
      },
      age: 'int?',
    },
  };
}

```

## Delete an Object
To delete an object from a realm, pass the object to `Realm.delete()` inside of a write transaction.

In the following example of a `DogList` component, we:

1. Get access to the opened realm instance by calling the `useRealm()` hook.
2. Retrieve all dogs in the realm instance by passing `Dog` to the
`useQuery()` hook.
3. Create a component method `deleteDog()` that takes in a `Dog` object as a
parameter. Within the method, we pass `Realm.delete()` the `Dog` object,
deleting it from the realm.
4. [Map](https://react.dev/learn/rendering-lists) through the dogs to
render a list of `Text` components that contain a dog's `name` and a
"Delete Dog" button.
5. Add an [onPress](https://reactnative.dev/docs/handling-touches) event on
the "Delete Dog" button that calls the component's `deleteDog()` method.

#### Javascript

```javascript
const DogList = () => {
  const realm = useRealm();
  const myDogs = useQuery(Dog);

  const deleteDog = deletableDog => {
    realm.write(() => {
      realm.delete(deletableDog);
    });
  };

  return (
    <>
      {myDogs.map(dog => {
        return (
          <>
            <Text>{dog.name}</Text>
            <Button
              onPress={() => deleteDog(dog)}
              title='Delete Dog'
            />
          </>
        );
      })}
    </>
  );
};

```

#### Typescript

```typescript
const DogList = () => {
  const realm = useRealm();
  const myDogs = useQuery(Dog);

  const deleteDog = (deletableDog: Dog) => {
    realm.write(() => {
      realm.delete(deletableDog);
    });
  };

  return (
    <>
      {myDogs.map(dog => {
        return (
          <>
            <Text>{dog.name}</Text>
            <Button
              onPress={() => deleteDog(dog)}
              title='Delete Dog'
            />
          </>
        );
      })}
    </>
  );
};

```

> **IMPORTANT:**
> You cannot access or modify an object after you have deleted it from a Realm.
If you try to use a deleted object, Realm throws an error.
>

## Delete Multiple Objects
You can delete multiple objects from a realm in a couple of ways:

1. To **delete all objects of a given object type** from a realm, pass the
results of `useQuery(<ObjectType>)` to the `Realm.delete()` method inside of a write transaction.
2. To **delete many specific objects** from a realm, pass
`Collection.filtered()` to
`Realm.delete()` inside of a write transaction.

In the following example of a `DogList` component, we:

1. Retrieve the realm instance using the `useRealm()` hook.
2. Set a variable `myDogs` to all the `Dog` objects by passing the `Dog`
class to the `useQuery()` hook.
3. Create a component method `deleteAllYoungDogObjects()` that performs a
write transaction. Within the write transaction, we set a variable,
`youngDogs`, to the result of `myDogs.filtered()` with a query to
obtain all dogs younger than three. Then pass `youngDogs` to
`realm.delete()`, deleting all young dogs from the realm.
4. Create a component method `deleteAllDogObjects()` that performs a write
transaction. Within the write transaction, we pass `myDogs` to
`realm.delete()`, deleting all the dogs from the realm.
5. [Map](https://react.dev/learn/rendering-lists) through the dogs to render
a list of `Text` components that contain a dog's `name` and `age`.
6. Add an `onPress` event on the "Delete Young Dog Objects" button that calls
`deleteAllYoungDogObjects()`, deleting all young dogs from the realm,
which triggers a re-render and removes them from the UI.
7. Add an `onPress` event on the "Delete All Dog Objects" button that calls
`deleteAllDogObjects()`, deleting every dog from the realm, which triggers
a re-render and removes them from the UI.

> **NOTE:**
> When you delete objects from the realm instance, the component automatically re-renders and removes them from the UI.
>

#### Javascript

```javascript
const DogList = () => {
  const realm = useRealm();
  const myDogs = useQuery(Dog);

  const deleteAllYoungDogObjects = () => {
    const youngDogs = useQuery(Dog, dogs => {
      return dogs.filtered('age < 3');
    });
    realm.write(() => {
      realm.delete(youngDogs);
    });
  };
  const deleteAllDogObjects = () => {
    realm.write(() => {
      realm.delete(myDogs);
    });
  };

  return (
    <>
      {myDogs.map(dog => {
        return (
          <>
            <Text>{dog.name}</Text>
            <Text>{dog.age}</Text>
          </>
        );
      })}
      <Button
        onPress={() => deleteAllYoungDogObjects()}
        title='Delete Young Dog Objects'
      />
      <Button
        onPress={() => deleteAllDogObjects()}
        title='Delete All Dog Objects'
      />
    </>
  );
};

```

#### Typescript

```typescript
const DogList = () => {
  const realm = useRealm();
  const myDogs = useQuery(Dog);

  const deleteAllYoungDogObjects = () => {
    const youngDogs = useQuery(Dog, dogs => {
      return dogs.filtered('age < 3');
    });
    realm.write(() => {
      realm.delete(youngDogs);
    });
  };
  const deleteAllDogObjects = () => {
    realm.write(() => {
      realm.delete(myDogs);
    });
  };

  return (
    <>
      {myDogs.map(dog => {
        return (
          <>
            <Text>{dog.name}</Text>
            <Text>{dog.age}</Text>
          </>
        );
      })}
      <Button
        onPress={() => deleteAllYoungDogObjects()}
        title='Delete Young Dog Objects'
      />
      <Button
        onPress={() => deleteAllDogObjects()}
        title='Delete All Dog Objects'
      />
    </>
  );
};

```

## Delete All Objects in a Realm
To delete **all** objects from the realm, call `Realm.deleteAll()` inside of a write transaction. This clears the realm
of all object instances but does not affect the realm's schema.

In the following example of a `DeleteProfileSettingsScreen` component, we:

1. Get access to the opened realm instance by calling the `useRealm()` hook within the component.
2. Create a component method `deleteAllData()` that performs a write transaction and calls `Realm.deleteAll()`, deleting all objects from the realm.
3. Add an `onPress` event on the "Delete all data" button that calls `deleteAllData()`.

#### Javascript

```javascript
const DeleteProfileSettingsScreen = () => {
  const realm = useRealm();

  const deleteAllData = () => {
    realm.write(() => {
      realm.deleteAll();
    });
  };

  return (
    <>
      <Text>Delete all data in your profile:</Text>
      <Button
        onPress={deleteAllData}
        title='Delete all data'
      />
    </>
  );
};

```

#### Typescript

```typescript
const DeleteProfileSettingsScreen = () => {
  const realm = useRealm();

  const deleteAllData = () => {
    realm.write(() => {
      realm.deleteAll();
    });
  };

  return (
    <>
      <Text>Delete all data in your profile:</Text>
      <Button
        onPress={deleteAllData}
        title='Delete all data'
      />
    </>
  );
};

```

> **TIP:**
> `Realm.deleteAll()` is a
useful method to quickly clear out your realm in the course of development.
For example, rather than writing a migration to update objects to a new
schema, it may be faster to delete and then re-generate the objects with the
app itself.
>
