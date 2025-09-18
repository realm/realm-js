# CRUD - Update - Node.js SDK
## Update an Object
You can add, modify, or delete properties of a Realm object inside
of a write transaction in the same way that you would update any other
JavaScript object.

```javascript
// Open a transaction.
realm.write(() => {
  // Get a dog to update.
  const dog = realm.objects("Dog")[0];
  // Update some properties on the instance.
  // These changes are saved to the realm.
  dog.name = "Maximilian";
  dog.age += 1;
});

```

> **TIP:**
> To update a property of an embedded object or
a related object, modify the property with
[dot-notation or bracket-notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors) as if it were in a
regular, nested object.
>

## Upsert an Object
To upsert an object, call `Realm.create()`
with the update mode set to `modified`. The operation either inserts a
new object with the given primary key or updates an existing object that
already has that primary key.

```javascript
realm.write(() => {
  // Add a new person to the realm. Since nobody with ID 1234
  // has been added yet, this adds the instance to the realm.
  person = realm.create(
    "Person",
    { _id: 1234, name: "Joe", age: 40 },
    "modified"
  );

  // If an object exists, setting the third parameter (`updateMode`) to
  // "modified" only updates properties that have changed, resulting in
  // faster operations.
  person = realm.create(
    "Person",
    { _id: 1234, name: "Joseph", age: 40 },
    "modified"
  );
});

```

## Bulk Update a Collection
To apply an update to a collection of objects, iterate through the collection
(e.g. with [for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)). In the loop, update each object individually:

```javascript
realm.write(() => {
  // Create someone to take care of some dogs.
  const person = realm.create("Person", { name: "Ali" });
  // Find dogs younger than 2.
  const puppies = realm.objects("Dog").filtered("age < 2");
  // Loop through to update.
  for (const puppy of puppies) {
    // Give all puppies to Ali.
    puppy.owner = person;
  }
});

```

> **NOTE:**
> Thanks to an inverse relationship from
`Dog.owner` to `Person.dogs`, Realm automatically updates
Ali's list of dogs whenever we set her as a puppy's owner.
>
