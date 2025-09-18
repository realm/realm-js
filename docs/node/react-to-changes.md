# React to Changes - Node.js SDK
Data in Realm is *live*, which means that an object always reflects
its most recent saved state and read operations never block. Objects
automatically update in response to changes, so you can see up-to-date data in
your application without running a new query. Objects and queries emit
notifications that can update your app whenever data changes.

You can register three types of notification listeners:

- A **realm listener** fires whenever any object in a realm changes.
- A **collection listener** fires whenever a specific query matches a new set of objects or when any matched object changes.
- An **object listener** fires whenever a specific object is deleted or has one or more properties modified.

## Register a Realm Change Listener
To register a change listener for an entire realm, pass a callback function
to the realm's `addListener()` method.
Realm calls the listener asynchronously whenever an operation
adds, changes, or removes objects in the realm.

To remove a realm listener, pass the callback to the realm's
`removeListener()` method.

> **TIP:**
> Realm does not pass any information about what changed to
realm listener callback functions. If you need to know more information
about what changed in an object or collection, use object listeners and collection listeners.
>

> **TIP:**
> To handle exceptions thrown from a change listener, wrap your `addListener()` call
within a [try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) statement.
>

```javascript
// Define a listener callback function
function onRealmChange() {
  console.log("Something changed!");
}
// Add the listener callback to the realm
try {
  realm.addListener("change", onRealmChange);
} catch (error) {
  console.error(
    `An exception was thrown within the change listener: ${error}`
  );
}
// Remember to remove the listener when you're done!
realm.removeListener("change", onRealmChange);

```

## Register a Collection Change Listener
To register a change listener for a collection of Realm objects,
pass a callback function to the collection's `addListener()` method. Realm calls the
listener asynchronously when it's registered as well as whenever an operation
adds, changes, or removes objects in the collection.

To remove a collection listener, pass the callback to the collection's
`removeListener()` method.

> **IMPORTANT:**
> In collection notification handlers, always apply changes in the following
order: deletions, insertions, then modifications. Handling insertions before
deletions may result in unexpected behavior.
>

```javascript
// You can define a listener for any collection of Realm objects
const dogs = realm.objects("Dog");
// Define a listener callback function for changes to any Dog
function onDogsChange(dogs, changes) {
  // Handle deleted Dog objects
  changes.deletions.forEach((index) => {
    // You cannot directly access deleted objects,
    // but you can update a UI list, etc. based on the index.
    console.log(`Looks like Dog #${index} has left the realm.`);
  });

  // Handle newly added Dog objects
  changes.insertions.forEach((index) => {
    const insertedDog = dogs[index];
    console.log(`Welcome our new friend, ${insertedDog.name}!`);
  });
  // Handle Dog objects that were modified
  changes.modifications.forEach((index) => {
    const modifiedDog = dogs[index];
    console.log(`Hey ${modifiedDog.name}, you look different!`);
  });
}
// Add the listener callback to the collection of dogs
try {
  dogs.addListener(onDogsChange);
} catch (error) {
  console.error(
    `An exception was thrown within the change listener: ${error}`
  );
}
// Remember to remove the listener when you're done!
dogs.removeListener(onDogsChange);

```

## Register an Object Change Listener
To register a change listener on a specific Realm object, pass a
callback function to the object's `addListener()` method. Realm calls the listener
if any of the object's properties change or if someone deletes the object.

To remove an object listener, pass the callback to the object's
`removeListener()` method.

```javascript

// Define a listener callback function for changes to a specific Dog
function onDogChange(dog, changes) {
  if (changes.deleted) {
    console.log(`dog is deleted: ${changes.deleted}`);
  } else {
    changes.changedProperties.forEach((prop) => {
      console.log(`* the value of "${prop}" changed to ${dog[prop]}`);
    });
  }
}
// You can define a listener for any Realm object
try {
  dog.addListener(onDogChange);
} catch (error) {
  console.error(
    `An exception was thrown within the change listener: ${error}`
  );
}
// Remember to remove the listeners when you're done!
dog.removeListener(onDogChange);

```

## Remove All Change Listeners
To remove **all** listeners on a given realm, object, or collection instance,
call the instance's `removeAllListeners()` function:

- `Realm.removeAllListeners()`
- `Realm.Collection.removeAllListeners()`
- `Realm.Object.removeAllListeners()`

```javascript
// Remove all listeners from a realm
realm.removeAllListeners();
// Remove all listeners from a collection
dogs.removeAllListeners();
// Remove all listeners from an object
dog.removeAllListeners();

```

## Change Notification Limits
Changes in nested documents deeper than four levels down do not trigger
change notifications.

If you have a data structure where you need to listen for changes five
levels down or deeper, workarounds include:

- Refactor the schema to reduce nesting.
- Add something like "push-to-refresh" to enable users to manually refresh data.
