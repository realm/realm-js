# Dictionaries - Node.js SDK
> Version added: 10.5.0

## Overview
You can use the `dictionary` data type to manage a collection of unique String
keys paired with values. The `dictionary` data maps to the Javascript
[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) type.

## Realm Object Models
To define a dictionary of mixed values in your schema, set the data type
of your field to an empty object, `"{}"`. Alternatively, to create a
dictionary with values of a specific type, add the data type before the
brackets. For instance, `"int{}"` to specify that dictionary values must be
integers or `"string{}"` to specify that dictionary values must be strings.

```javascript
const PersonSchema = {
  name: "Person",
  properties: {
    name: "string",
    home: "{}",
  },
};

```

Realm disallows the use of `.` or `$` characters in map keys.
You can use percent encoding and decoding to store a map key that contains
one of these disallowed characters.

```javascript
// Percent encode . or $ characters to use them in map keys
const mapKey = "kitchen.windows";
const encodedMapKey = mapKey.replace(".", "%2E");

```

## Create an Object with a  Dictionary Value
Create an object with a dictionary value by running the `realm.create()` method within a write transaction.

```javascript
let johnDoe;
let janeSmith;
realm.write(() => {
  johnDoe = realm.create("Person", {
    name: "John Doe",
    home: {
      windows: 5,
      doors: 3,
      color: "red",
      address: "Summerhill St.",
      price: 400123,
    },
  });
  janeSmith = realm.create("Person", {
    name: "Jane Smith",
    home: {
      address: "100 northroad st.",
      yearBuilt: 1990,
    },
  });
});

```

## Query for Objects with a Dictionary Property
To filter a query, run `collection.filtered()` to specify a subset of results based on the
value(s) of one or more object properties. You can specify results based on the value of a
dictionary's properties by using [bracket-notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors).

You can also determine whether a results collection has a certain key or value
by using `<dictionary>.@keys` or `<dictionary>.@values`. For instance, if
you had a `Person` collection with a nested `home` dictionary, you could
return all `Person` objects with a `home` with a `"price"` property by
running the query: `home.@keys = "price"`.

```javascript
// query for all Person objects
const persons = realm.objects("Person");

// run the `.filtered()` method on all the returned persons to
// find the house with the address "Summerhill St."
const summerHillHouse = persons.filtered(
  `home['address'] = "Summerhill St."`
)[0].home;

// Find all people that have a house with a listed price
const peopleWithHousesWithAListedPrice = persons.filtered(
  `home.@keys = "price" `
);
// find a house that has any field with a value of 'red'
const redHouse = persons.filtered(`home.@values = "red" `)[0].home;

```

## Add a Listener to a Dictionary
You can add a listener to a dictionary by running the
`dictionary.addListener()`
method. The `addListener` method's callback function has two parameters,
the changed dictionary and an array of changes describing how the dictionary
was changed.

> **NOTE:**
> Learn more about change notifications.
>

```javascript
summerHillHouse.addListener((changedHouse, changes) => {
  console.log("A change has occurred to the Summer Hill House object");
});

```

## Update a Dictionary
To update a dictionary's properties, use dot notation or the `dictionary.put()` method.

```javascript
realm.write(() => {
  // use the `set()` method to update a field of a dictionary
  summerHillHouse.set({ price: 400100 });
  // alternatively, update a field of a dictionary through dot notation
  summerHillHouse.color = "brown";
  // update a dictionary by adding a field
  summerHillHouse.yearBuilt = 2004;
});

```

## Delete Members of a Dictionary
To delete members of a dictionary, use the `dictionary.remove()` method with an array of properties to remove from the dictionary.

```javascript
realm.write(() => {
  // remove the 'windows' and 'doors' field of the Summerhill House.
  summerHillHouse.remove(["windows", "doors"]);
});

```
