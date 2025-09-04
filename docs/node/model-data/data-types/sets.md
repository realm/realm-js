# Sets - Node.js SDK
> Version added: 10.5.0

## Overview
A **Realm Set** is a special object that allows you to store a
collection of unique values. **Realm Sets** are based on JavaScript
[sets](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), but can only contain
values of a single type and can only be modified within a write transaction.
Sets allow you to perform math operations such as finding the union,
intersection, or difference between two sets. To learn more about performing
these operations, see the MDN docs for [Implementing basic set operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#implementing_basic_set_operations).

## Realm Object Models
To define a property type as a **Realm Set**, specify the data type
you want in the set, followed by `<>`. For instance, for a set made of integer
values, specify `"int<>"`.

```javascript
const characterSchema = {
  name: "Character",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    name: "string",
    levelsCompleted: "int<>",
    inventory: "string<>",
  },
};

```

## Create an Object With a Set
To create an object with a **Realm Set** property, you must create
the object within a write transaction. When defining your Realm
object, initialize the **Realm Set** by passing an empty array or an
array with your initial values.

```javascript
let playerOne, playerTwo;
realm.write(() => {
  playerOne = realm.create("Character", {
    _id: new BSON.ObjectId(),
    name: "PlayerOne",
    inventory: ["elixir", "compass", "glowing shield"],
    levelsCompleted: [4, 9],
  });
  playerTwo = realm.create("Character", {
    _id: new BSON.ObjectId(),
    name: "PlayerTwo",
    inventory: ["estus flask", "gloves", "rune"],
    levelsCompleted: [1, 2, 5, 24],
  });
});

```

## Add Items to a Set
To add an item to a set, pass the new value to the `<Realm.Set>.add()` method within a write transaction.

```javascript
realm.write(() => {
  playerOne.inventory.add("hammer");
  playerOne.levelsCompleted.add(32);
});

```

## Check if a Set has Specific Items
To determine if a set contains a particular value, pass the value to the `<Realm.Set>.has()` method. The
`set.has()` method will return true if the set contains the value specified.

```javascript
// check if playerTwo has completed level 3 by calling the `has()` method
// on the Realm Set object
const playerTwoHasCompletedLevelThree = playerTwo.levelsCompleted.has(3);
console.log(
  `Is level three completed by playerTwo: ${playerTwoHasCompletedLevelThree}`
);

```

## Check the Size of a Set
To discover how many items are in a set, you can check the set's `size` property.

```javascript
// check how many items playerTwo has in his inventory through the `size`
// property of the Realm Set object
const playerTwoInventorySize = playerTwo.inventory.size;
console.log(`playerTwo has ${playerTwoInventorySize} inventory items`);

```

## Remove an Item from a Set
To remove a specific value from a set, pass the value to the `<Realm.Set>.delete()` method within a write transaction.

```javascript
realm.write(() => {
  // remove the compass from playerOne's inventory by calling the
  // `delete()` method of the Realm Set object within a write transaction
  playerOne.inventory.delete("compass");
});

```

## Remove all Items from a Set
To clear the set, run the `<Realm.Set>.clear()` method within a write transaction.

```javascript
realm.write(() => {
  // clear all data from the inventory slot of playerTwo by calling
  // the `clear()` method of the Realm Set object in a write transaction
  playerTwo.inventory.clear();
});

```

## Traverse a Set
To traverse a set, use the `<Realm.Set>.forEach()` method or alternative [iteration method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#iteration_methods).

```javascript
playerOne.inventory.forEach((item) => {
  console.log(item);
});

```

> Example:
> The order of the **Realm Set** may be different from the order that
the items were added.
>
> You can track the set order by updating an array when a new value is added. For example:
>
> ```javascript
> function updateSetAndOrderedSetArray(set, orderedArray, value) {
>   const oldSize = set.size;
>   set.add(value);
>   if (set.size > oldSize) {
>     orderedArray.push(value);
>   }
> }
>
> let playerOne;
> let levelsCompletedInOrder = [];
> const realm = await Realm.open({
>   path: "realm-files/data-type-realm",
>   schema: [characterSchema],
> });
> realm.write(() => {
>   playerOne = realm.create("Character", {
>     _id: new BSON.ObjectId(),
>     name: "PlayerOne",
>     inventory: ["potion", "wand", "spell book"],
>     levelsCompleted: [],
>   });
> });
> realm.write(() => {
>   updateSetAndOrderedSetArray(
>     playerOne.levelsCompleted,
>     levelsCompletedInOrder,
>     5
>   );
> });
> realm.write(() => {
>   updateSetAndOrderedSetArray(
>     playerOne.levelsCompleted,
>     levelsCompletedInOrder,
>     12
>   );
> });
> realm.write(() => {
>   updateSetAndOrderedSetArray(
>     playerOne.levelsCompleted,
>     levelsCompletedInOrder,
>     2
>   );
> });
> realm.write(() => {
>   updateSetAndOrderedSetArray(
>     playerOne.levelsCompleted,
>     levelsCompletedInOrder,
>     7
>   );
> });
> console.log("set ordered", Array.from(playerOne.levelsCompleted)); // not necessarily [5, 12, 2, 7]
> console.log("insert ordered", levelsCompletedInOrder); // [5, 12, 2, 7]
> // close the realm
> realm.close();
>
> ```
>
