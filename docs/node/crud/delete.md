# CRUD - Delete - Node.js SDK
## Delete an Object
To delete an object from a realm, pass the object to `Realm.delete()` inside of a write transaction.

```javascript
realm.write(() => {
  // Delete the dog from the realm.
  realm.delete(dog);
  // Discard the reference.
  dog = null;
});

```

> **IMPORTANT:**
> You cannot access or modify an object after you have deleted it from a Realm.
If you try to use a deleted object, Realm throws an error.
>

## Delete Multiple Objects
To delete a collection of objects from a realm, pass the collection to
`Realm.delete()` inside of a write
transaction.

```javascript
realm.write(() => {
  // Find dogs younger than 2 years old.
  const puppies = realm.objects("Dog").filtered("age < 2");
  // Delete the collection from the realm.
  realm.delete(puppies);
});

```

## Delete All Objects of a Specific Type
To delete all objects of a given object type from a realm, pass
`Realm.objects(<ObjectType>)` to the `Realm.delete()` method inside of a write transaction.

```javascript
realm.write(() => {
  // Delete all instances of Cat from the realm.
  realm.delete(realm.objects("Cat"));
});

```

## Delete All Objects in a Realm
To delete **all** objects from the realm, call `Realm.deleteAll()` inside of a write transaction. This clears the realm
of all object instances but does not affect the realm's schema.

```javascript
realm.write(() => {
  // Delete all objects from the realm.
  realm.deleteAll();
});

```

> **TIP:**
> `Realm.deleteAll()` is a useful method to
quickly clear out your realm in the course of development. For example,
rather than writing a migration to update objects to a new schema, it may be
faster to delete and then re-generate the objects with the app itself.
>
