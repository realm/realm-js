# CRUD - Create - Node.js SDK
## Create a New Object
To add an object to a realm, instantiate it as you would any other object
and then pass it to `Realm.create()` inside of a
write transaction. If the realm's schema includes
the object type and the object conforms to the schema, then Realm
stores the object, which is now *managed* by the realm.

```javascript
// Declare the variable that will hold the dog instance.
let dog;
// Open a transaction.
realm.write(() => {
  // Assign a newly-created instance to the variable.
  dog = realm.create("Dog", { name: "Max", age: 5 });
});
// use newly created dog object

```
