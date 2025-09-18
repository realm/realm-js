# Sets - React Native SDK
> Version added:

A Realm Set is a special object that allows you to store a
collection of unique values. Realm Sets are based on JavaScript
[sets](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), but can only contain
values of a single type and can only be modified within a write transaction.
Sets allow you to perform math operations such as finding the union,
intersection, or difference between two Sets. To learn more about performing
these operations, see the MDN docs for [Implementing basic set operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#implementing_basic_set_operations).

## Realm Object Models
You can define a Realm object model property type as a Realm Set, in a
two ways:

- Specify the data type the Set will contain, followed by `<>`.
- Use object notation and the `type` field for more complicated properties.

#### Javascript

```javascript
class Character extends Realm.Object {
  static schema = {
    name: 'Character',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      levelsCompleted: 'int<>',
      inventory: {
        type: 'set',
        objectType: 'string',
      },
    },
  };
}

```

#### Typescript

```typescript
class Character extends Realm.Object<Character> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  levelsCompleted!: Realm.Set<number>;
  inventory!: Realm.Set<string>;

  static schema: ObjectSchema = {
    name: 'Character',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      levelsCompleted: 'int<>',
      inventory: {
        type: 'set',
        objectType: 'string',
      },
    },
  };
}

```

## Create an Object With a Set
To create an object with a Realm Set property, you must create
the object within a write transaction. When defining your Realm
object, initialize the Realm Set by passing an empty array or an
array with your initial values.

### Example
In the following example of a `CreateInitialCharacters` component, we create
`Character` objects with Set properties.

The `CreateInitialCharacters` component does the following:

- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Uses React's [useEffect](https://react.dev/reference/react/useEffect) hook
to call an anonymous function only once with `useEffect` and an
empty dependency array. Within the anonymous function, we create two different
`Character` objects within a write transaction. We set each character's
`inventory` and `levelsCompleted` sets as an array with initial values.
- Retrieves all characters in the realm instance by passing the `Character`
class to the `useQuery()` hook.
- Displays each character's name in the UI as a `Text` element.

#### Javascript

```javascript
const CreateInitialCharacters = () => {
  const realm = useRealm();
  useEffect(() => {
    realm.write(() => {
      realm.create('Character', {
        _id: new Realm.BSON.ObjectId(),
        name: 'AdventurousPlayer',
        inventory: ['elixir', 'compass', 'glowing shield'],
        levelsCompleted: [4, 9],
      });
    });
    realm.write(() => {
      realm.create('Character', {
        _id: new Realm.BSON.ObjectId(),
        name: 'HealerPlayer',
        inventory: ['estus flask', 'gloves', 'rune'],
        levelsCompleted: [1, 2, 5, 24],
      });
    });
  }, []);
  const characters = useQuery(Character);

  return (
    <View>
      {characters.map(character => (
        <View key={character._id}>
          <Text>{character.name}</Text>
        </View>
      ))}
    </View>
  );
};

```

#### Typescript

```typescript
const CreateInitialCharacters = () => {
  const realm = useRealm();
  useEffect(() => {
    realm.write(() => {
      realm.create('Character', {
        _id: new Realm.BSON.ObjectId(),
        name: 'AdventurousPlayer',
        inventory: ['elixir', 'compass', 'glowing shield'],
        levelsCompleted: [4, 9],
      });
    });

    realm.write(() => {
      realm.create('Character', {
        _id: new Realm.BSON.ObjectId(),
        name: 'HealerPlayer',
        inventory: ['estus flask', 'gloves', 'rune'],
        levelsCompleted: [1, 2, 5, 24],
      });
    });
  }, []);
  const characters = useQuery(Character);

  return (
    <View>
      {characters.map(character => (
        <View key={character._id}>
          <Text>{character.name}</Text>
        </View>
      ))}
    </View>
  );
};

```

## Add Items to a Set
To add an item to a Set, pass the new value to the `Realm.Set.add()` method method within a write transaction.

### Example
In the following example of a `AddInventoryToCharacter` component, we add new
Set elements to the character's inventory.

The `AddInventoryToCharacter` component does the following:

- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Creates a [state variable](https://react.dev/reference/react/Component#state)
called "inventoryItem" that represents the new inventory item to add to the
inventory Set.
- Retrieves the character by passing the `Character` class to the
`useQuery()` hook and running the `Collection.filtered()` method on the result to filter for
characters with the name matching the `characterName`
[prop](https://react.dev/learn/passing-props-to-a-component). Then we set
the variable `character` to the first matching result.
- Creates a component method `addInventoryItem()` that performs a write
transaction that adds an inventory item to the character's inventory by passing
the `inventoryItem` state variable to `Realm.Set.add()`.
- Renders a `TextInput` that changes the `inventoryItem` state variable,
and a `Button` that calls the `addInventoryItem()` method.

#### Javascript

```javascript
const AddInventoryToCharacter = ({characterName}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const addInventoryItem = () => {
    realm.write(() => {
      character?.inventory.add(inventoryItem);
    });
  };

  return (
    <View>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Add Inventory Item'
        onPress={addInventoryItem}
      />
    </View>
  );
};

```

#### Typescript

```typescript
const AddInventoryToCharacter = ({
  characterName,
}: {
  characterName: string;
}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const addInventoryItem = () => {
    realm.write(() => {
      character?.inventory.add(inventoryItem);
    });
  };

  return (
    <View>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Add Inventory Item'
        onPress={addInventoryItem}
      />
    </View>
  );
};

```

## Check if a Set has Specific Items and Check the Size of a Set
You may want to check for information about your Set, such as its size or
if it contains specific item.

To determine if a Set contains a particular value, pass the value to the
`Realm.Set.has()` method. This method will return
`true` if the Set contains the value specified.

To discover how many items are in a Set, you can check its `size` property.

### Example
In the following example of a `QueryCharacterInventory` component, we check
the character's inventory size and if it has a specific item.

The `QueryCharacterInventory` component does the following:

- Creates a [state variable](https://react.dev/reference/react/Component#state)
called "inventoryItem" that represents the inventory item that you want to
search the character's inventory for.
- Uses the `useQuery` hook to perform a query for all characters, and filter
the results to only include the characters with the name matching the
`characterName` passed to the component as a [prop](https://react.dev/learn/passing-props-to-a-component). Then we get the first
matching result.
- Retrieves the character by passing the `Character` class to the `useQuery()`
hook and running the `Collection.filtered()`
method on the result to filter for characters with the name matching the
`characterName` prop.
Then we set the variable `character` to the first matching result.
- Creates a component method `queryCharacterInventory` that passes the
`inventoryItem` state variable to `Realm.Set.has()` to check if the
character's inventory contains the item. If the character's inventory contains
the item, the method [alerts](https://reactnative.dev/docs/alert) that the
character has the item. If the character's inventory does not contain the item,
the method alerts that the character does not have the item.
- Renders the character's name, and renders the inventory size using the `size`
property of the character's inventory. It also renders a `TextInput` that
changes the `inventoryItem` state variable, and a `Button` that calls the
`queryCharacterInventory` method.

#### Javascript

```javascript
const QueryCharacterInventory = ({characterName}) => {
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const queryCharacterInventory = () => {
    const characterDoesHaveItem = character.inventory.has(inventoryItem);
    if (characterDoesHaveItem) {
      Alert.alert(`Character has item: ${inventoryItem}`);
    } else {
      Alert.alert(`Item not found in character's inventory`);
    }
  };
  return (
    <View>
      <Text>{character.name}</Text>
      <Text>
        Total number of inventory items: {character.inventory.size}
      </Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Query for Inventory'
        onPress={queryCharacterInventory}
      />
    </View>
  );
};

```

#### Typescript

```typescript
const QueryCharacterInventory = ({
  characterName,
}: {
  characterName: string;
}) => {
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const queryCharacterInventory = () => {
    const characterDoesHaveItem: Boolean =
      character.inventory.has(inventoryItem);
    if (characterDoesHaveItem) {
      Alert.alert(`Character has item: ${inventoryItem}`);
    } else {
      Alert.alert(`Item not found in character's inventory`);
    }
  };
  return (
    <View>
      <Text>{character.name}</Text>
      <Text>
        Total number of inventory items: {character.inventory.size}
      </Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Query for Inventory'
        onPress={queryCharacterInventory}
      />
    </View>
  );
};

```

## Remove Set Information
You may want to remove a specific item or all items from a Set.

To remove a specific value from a Set, pass the value to the
`Realm.Set.delete()` method within a write
transaction.

To clear the Set, run the `Realm.Set.clear()`
method within a write transaction.

### Example
In the following example of a `RemoveInventoryFromCharacter` component, we
remove a specific item from the Set and clear the Set of all items.

The `RemoveInventoryFromCharacter` component does the following:

- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Creates a [state variable](https://react.dev/reference/react/Component#state)
called "inventoryItem" that represents the inventory item to remove from the
inventory Set.
- Creates a component method `removeInventoryItem` that passes the
`inventoryItem` state variable to `Realm.Set.delete()` to remove the
item from the character's inventory.
- Creates a component method `removeAllInventory` that calls `Realm.Set.clear()`
to remove all items from the character's inventory.
- Renders a `TextInput` that changes the `inventoryItem` state variable, and
two `Button` components that call the `removeInventoryItem` and
`removeAllInventory` methods, respectively.

#### Javascript

```javascript
const RemoveInventoryFromCharacter = ({characterName}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const removeInventoryItem = () => {
    realm.write(() => {
      character?.inventory.delete(inventoryItem);
    });
  };
  const removeAllInventory = () => {
    realm.write(() => {
      character?.inventory.clear();
    });
  };
  return (
    <View>
      <Text>{character.name}</Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Remove Inventory Item'
        onPress={removeInventoryItem}
      />
      <Button
        title='Remove All Inventory'
        onPress={removeAllInventory}
      />
    </View>
  );
};

```

#### Typescript

```typescript
const RemoveInventoryFromCharacter = ({
  characterName,
}: {
  characterName: string;
}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState('');
  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const removeInventoryItem = () => {
    realm.write(() => {
      character?.inventory.delete(inventoryItem);
    });
  };
  const removeAllInventory = () => {
    realm.write(() => {
      character?.inventory.clear();
    });
  };
  return (
    <View>
      <Text>{character.name}</Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Remove Inventory Item'
        onPress={removeInventoryItem}
      />
      <Button
        title='Remove All Inventory'
        onPress={removeAllInventory}
      />
    </View>
  );
};

```

## Traverse a Set
You can traverse a Set to access each item in the Set. To traverse a
Set, use the `Set.map()` method or alternative [iteration
method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#iteration_methods).

However, by default the order of the items in a Set is not guaranteed. To
traverse a Set in order, you can store the Set's items in a [state variable](https://react.dev/reference/react/Component#state) and update that state variable
when you add new items to the Set.

### Example
In the following example of a `TraverseCharacterInventory` component, a
character starts with no inventory items. When the user adds items to the
inventory Set, the component displays each item in the Set in both an
ordered and unordered list.

The `TraverseCharacterInventory` component does the following:

- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Creates a state variable called "inventoryItem" that represents the new
inventory item to add to the inventory Set.
- Creates a state variable called "inventory" that will hold the character's
inventory items in order of insertion.
- Retrieves the character by passing the `Character` class to the `useQuery()`
hook and running the `Collection.filtered()`
method on the result to filter for characters with the name matching the
`characterName` [prop](https://react.dev/learn/passing-props-to-a-component).
Then we set the variable `character` to the first matching result.
- Creates a component method `addInventoryItem()` that performs a write
transaction that adds an inventory item to the character's inventory by passing
the `inventoryItem` state variable to the `Realm.Set.add()` method. After the write transaction, the method adds the
`inventoryItem` to the `inventory` array state variable.
- Renders a `TextInput` that changes the `inventoryItem` state variable, and
a `Button` that calls the `addInventoryItem()` method.
- Renders a list of the character's inventory items in the order they were added
to the Set by iterating through the `inventory` array state variable.
- Renders a unordered list of the character's inventory by iterating through
`character.inventory`.

#### Javascript

```javascript
const TraverseCharacterInventory = ({characterName}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState('');
  const [inventory, setInventory] = useState([]);

  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const addInventoryItem = () => {
    realm.write(() => {
      character?.inventory.add(inventoryItem);
    });
    setInventory([...inventory, inventoryItem]);
  };

  return (
    <View>
      <Text>{character.name}</Text>
      <Text>Add an item to the inventory:</Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Add Inventory Item'
        onPress={addInventoryItem}
      />

      <Text>Ordered Inventory:</Text>
      {inventory.map(item => (
        <Text>{item}</Text>
      ))}

      <Text>Unordered Inventory:</Text>
      {character.inventory.map(item => (
        <Text>{item}</Text>
      ))}
    </View>
  );
};

```

#### Typescript

```typescript
const TraverseCharacterInventory = ({
  characterName,
}: {
  characterName: string;
}) => {
  const realm = useRealm();
  const [inventoryItem, setInventoryItem] = useState<string>('');
  const [inventory, setInventory] = useState<string[]>([]);

  const character = useQuery(
    Character,
    characters => {
      return characters.filtered(`name = '${characterName}'`);
    },
    [characterName],
  )[0];

  const addInventoryItem = () => {
    realm.write(() => {
      character?.inventory.add(inventoryItem);
    });
    setInventory([...inventory, inventoryItem]);
  };

  return (
    <View>
      <Text>{character.name}</Text>
      <Text>Add an item to the inventory:</Text>
      <TextInput
        onChangeText={text => setInventoryItem(text)}
        value={inventoryItem}
      />
      <Button
        title='Add Inventory Item'
        onPress={addInventoryItem}
      />

      <Text>Ordered Inventory:</Text>
      {inventory.map(item => (
        <Text>{item}</Text>
      ))}

      <Text>Unordered Inventory:</Text>
      {character.inventory.map(item => (
        <Text>{item}</Text>
      ))}
    </View>
  );
};

```

