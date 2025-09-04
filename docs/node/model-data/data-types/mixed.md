# Mixed - Node.js SDK
> Version changed: 12.9.0
> Mixed properties can contain lists or dictionaries of mixed data.
>

> Version added: 10.5.0

The mixed data type is a realm property type that can hold any valid Realm data
type except an embedded object or a set.
You can create collections (lists, sets, and dictionaries) of type `mixed`. Properties using the mixed data type can also hold null values.

> **NOTE:**
> The mixed data type is indexable, but you can't use it as a primary key.
Because null is a permitted value, you can't declare a Mixed property as
optional.
>

## Realm Object Models
To set a property of your object model as mixed, set the property's type to
"`mixed`".

```javascript
const DogSchema = {
  name: "Dog",
  properties: {
    name: "string",
    birthDate: "mixed",
  },
};

```

## Create an Object With a Mixed Value
Create an object with a mixed value by running the `realm.create()` method within a write transaction.

```javascript
realm.write(() => {
  // create a Dog with a birthDate value of type string
  realm.create("Dog", { name: "Euler", birthDate: "December 25th, 2017" });

  // create a Dog with a birthDate value of type date
  realm.create("Dog", {
    name: "Blaise",
    birthDate: new Date("August 17, 2020"),
  });
  // create a Dog with a birthDate value of type int
  realm.create("Dog", {
    name: "Euclid",
    birthDate: 10152021,
  });
  // create a Dog with a birthDate value of type null
  realm.create("Dog", {
    name: "Pythagoras",
    birthDate: null,
  });
});

```

### Collections as Mixed
In SDK v12.9.0 and later, a mixed data type can hold collections (a list or
dictionary, but *not* a set) of mixed elements. You can use mixed collections to
model unstructured or variable data. For more information, refer to
Define Unstructured Data.

- You can nest mixed collections up to 100 levels.
- You can query mixed collection properties and
register a listener for changes, as you
would a normal collection.
- You can find and update individual mixed collection elements
- You *cannot* store sets or embedded objects in mixed collections.

To use mixed collections, define the mixed type property in your data model.
Then, create the list or dictionary collection.

## Query for Objects with a Mixed Value
Query for objects with a mixed value by running the
`Collection.filtered()`
method and passing in a filter for a non-mixed
field. You can then print the value of the mixed property or the entire
object itself.

```javascript
// To query for Blaise's birthDate, filter for his name to retrieve the realm object.
// Use dot notation to access the birthDate property.
let blaiseBirthDate = realm.objects("Dog").filtered(`name = 'Blaise'`)[0]
  .birthDate;
console.log(`Blaise's birth date is ${blaiseBirthDate}`);

```
