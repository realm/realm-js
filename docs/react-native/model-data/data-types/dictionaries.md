# Dictionaries - React Native SDK
> Version added:

You can use the `Realm.Dictionary` data type to
manage a collection of unique String keys paired with values. The `dictionary`
data maps to the Javascript [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) type.

For example, creating a `HomeOwner` Realm object where the `home` property
is defined as a `dictionary` type could look like this:

```javascript
realm.create('HomeOwner', {
  name: 'Anna Smith',
  home: {address: '2 jefferson lane', yearRenovated: 1994, color: 'blue'},
});

```

## Realm Object Models
You can define a dictionary of mixed values for a Realm object model in three ways:

- set the data type of your field to an empty object, `"{}"`.
- Add the data type before the brackets to create a dictionary with values of a
specific type. For example, `"int{}"` to specify that dictionary values must
be integers or `"string{}"` to specify that dictionary values must be strings.
- Define the object type explicitly. This is necessary for using object Types in
your Realm as dictionary values.

#### Javascript

```javascript
class HomeOwner extends Realm.Object {
  static schema = {
    name: 'HomeOwner',
    properties: {
      name: 'string',
      home: '{}',
      pets: {
        type: 'dictionary',
        objectType: 'Pet',
        optional: true,
      },
    },
  };
}

```

#### Typescript

Use an [interface](https://www.typescriptlang.org/docs/handbook/2/objects.html) that
extends the `Realm.Dictionary` type to define the syntax for your
dictionary object. All of your Realm Objects for this class must follow
the syntax specified in the interface.

```typescript
interface Home extends Realm.Dictionary {
  address?: string;
  color?: string;
  price?: number;
  yearRenovated?: number;
}

class HomeOwner extends Realm.Object<HomeOwner> {
  name!: string;
  home!: Home;
  pets?: Pet[];

  static schema: ObjectSchema = {
    name: 'HomeOwner',
    properties: {
      name: 'string',
      home: 'mixed{}',
      pets: {
        type: 'dictionary',
        objectType: 'Pet',
        optional: true,
      },
    },
  };
}

```

Realm disallows the use of `.` or `$` characters in map keys.
You can use percent encoding and decoding to store a map key that contains
one of these disallowed characters.

```javascript
// Percent encode . or $ characters to use them in map keys
const mapKey = "kitchen.windows";
const encodedMapKey = mapKey.replace(".", "%2E");

```

## Create an Object with a Dictionary Value
In the following `CreateHomeOwner` example, we create a new object with a dictionary property.

The `CreateHomeOwner` component does the following:

- Create React [state](https://react.dev/reference/react/Component#state)
that represents the homeowner's name and address, respectively.
- Get access to an open realm instance by calling the `useRealm()` hook within
the component.
- Create a component method `SubmitHomeOwner()` that performs a write
transaction and creates a new `HomeOwner` object based on the `TextInput`
values for the homeowner's name and address, respectively.
- Add an [onPress](https://reactnative.dev/docs/handling-touches) event on
the submit button that calls `SubmitHomeOwner()`

```typescript
const CreateHomeOwner = () => {
  const [homeOwnerName, setHomeOwnerName] = useState('John Smith');
  const [address, setAddress] = useState('1 Home Street');
  const realm = useRealm();

  const submitHomeOwner = () => {
    // Create a HomeOwner realm object within a Write Transaction
    realm.write(() => {
      realm.create('HomeOwner', {
        name: homeOwnerName,
        // For the dictionary field, 'home', set the value
        // to a regular JavaScript object
        home: {
          address,
        },
      });
    });
  };
  return (
    <View>
      <TextInput
        value={homeOwnerName}
        onChangeText={text => setHomeOwnerName(text)}
      />
      <TextInput value={address} onChangeText={text => setAddress(text)} />
      <Button
        title='Submit Home Owner'
        onPress={submitHomeOwner}
      />
    </View>
  );
};

```

## Query for Objects with a Dictionary Property
To filter a query, run `collection.filtered()` to specify a subset of results based on the
value(s) of one or more object properties. You can specify results based on the value of a
dictionary's properties by using [bracket notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors).

You can also determine whether a results collection has a certain key or value
by using `<dictionary>.@keys` or `<dictionary>.@values`. For instance, if
you had a `HomeOwner` collection with a nested `home` dictionary, you could
return all `HomeOwner` objects with a `home` with a `"price"` property by
running the query: `home.@keys = "price"`.

### Example
In the following `HomeList` example, we query for objects that have dictionary properties.

The `HomeList` component does the following:

- Performs a query for all homeowners by passing the `HomeOwner` class to the `useQuery` hook.
- Performs a query for homeowners with a listed price by passing `collection.filtered()` the query: `home.@keys = "price"`.
- Performs a query for the summer hill house by running `collection.filtered()` using bracket notation to find the first homeowner with an address set to "Summerhill St." and getting their home by using dot syntax.
- Performs a query for all homeowners with any field with a value of red by passing `collection.filtered()` the query: `'home.@values = "red"'`. We then get the first homeowner's home.
- Display the results of our queries in the UI by rendering information about the homes

#### Javascript

```javascript
const HomeList = () => {
  // query for all HomeOwner objects
  const homeOwners = useQuery(HomeOwner);

  // run the `.filtered()` method on all the returned homeOwners to
  // find all homeOwners that have a house with a listed price
  const listedPriceHomes = useQuer(HomeOwner, homeOwners => {
    return homeOwners.filtered('home.@keys = "price"');
  });

  // run the `.filtered()` method on all the returned homeOwners to
  // find the house with the address "Summerhill St."
  const summerHillHouse = useQuery(HomeOwner, homeOwners => {
    return homeOwners.filtered('home["address"] = "Summerhill St."');
  })[0].home;

  // run the `.filtered()` method on all the returned homeOwners to
  // find the first house that has any field with a value of 'red'
  const redHouse = useQuery(HomeOwner, homeOwners => {
    return homeOwners.filtered('home.@values = "red"');
  })[0].home;

  return (
    <View>
      <Text>All homes:</Text>
      {homeOwners.map(homeOwner => (
        <View>
          <Text>{homeOwner.home.address}</Text>
        </View>
      ))}

      <Text>All homes with a price:</Text>
      {listedPriceHomes.map(homeOwner => (
        <View>
          <Text>{homeOwner.home.address}</Text>
          <Text>{homeOwner.home.price}</Text>
        </View>
      ))}

      <Text>Summer Hill House:</Text>
      <Text>{summerHillHouse.address}</Text>
      <Text>{summerHillHouse.color}</Text>

      <Text>Red House:</Text>
      <Text>{redHouse.address}</Text>
    </View>
  );
};

```

#### Typescript

```typescript
const HomeList = () => {
  // query for all HomeOwner objects
  const homeOwners = useQuery(HomeOwner);

  // run the `.filtered()` method on all the returned homeOwners to
  // find all homeOwners that have a house with a listed price
  const listedPriceHomes = useQuery(HomeOwner, homeOwners => {
    return homeOwners.filtered('home.@keys = "price"');
  });

  // run the `.filtered()` method on all the returned homeOwners to
  // find the house with the address "Summerhill St."
  const summerHillHouse = useQuery(HomeOwner, homeOwners => {
    return homeOwners.filtered('home["address"] = "Summerhill St."');
  })[0].home;

  // run the `.filtered()` method on all the returned homeOwners to
  // find the first house that has any field with a value of 'red'
  const redHouse = useQuery(HomeOwner, homeOwners => {
    return homeOwners.filtered('home.@values = "red"');
  })[0].home;

  return (
    <View>
      <Text>All homes:</Text>
      {homeOwners.map(homeOwner => (
        <View>
          <Text>{homeOwner.home.address}</Text>
        </View>
      ))}

      <Text>All homes with a price:</Text>
      {listedPriceHomes.map(homeOwner => (
        <View>
          <Text>{homeOwner.home.address}</Text>
          <Text>{homeOwner.home.price}</Text>
        </View>
      ))}

      <Text>Summer Hill House:</Text>
      <Text>{summerHillHouse.address}</Text>
      <Text>{summerHillHouse.color}</Text>

      <Text>Red House:</Text>
      <Text>{redHouse.address}</Text>
    </View>
  );
};

```

## Update a Dictionary
Update a dictionary's property by using the `dictionary.set()` method or dot notation to set its property to a new value.

### Example
In the following `UpdateHome` example, we update a dictionary's property.

The `UpdateHome` component does the following:

- variable that represents the home address.
- within the component.
- transaction and uses `dictionary.set()` to set the home's address to the
value of the `address` state variable. It also uses dot syntax to set the
`yearRenovated` to `2004`.
- Render a `TextInput` that displays and changes the `address` state variable.
- the "Update Address" button that calls `updateAddress()`

#### Javascript

```javascript
const UpdateHome = ({homeOwnerName}) => {
  const [address, setAddress] = useState('');
  const realm = useRealm();
  const homeOwner = useQuery(
    HomeOwner,
    homeOwners => {
      return homeOwners.filtered(`name == '${homeOwnerName}'`);
    },
    [homeOwnerName],
  )[0];

  const updateAddress = () => {
    // Update the home object with the new address
    realm.write(() => {
      // use the `set()` method to update a field of a dictionary
      homeOwner.home.set({address});
      // alternatively, update a field of a dictionary through dot notation
      homeOwner.home.yearRenovated = 2004;
    });
  };

  return (
    <View>
      <Text>{homeOwner.name}</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder='Enter new address'
      />
      <Button
        onPress={updateAddress}
        title='Update Address'
       
      />
    </View>
  );
};

```

#### Typescript

```typescript
const UpdateHome = ({homeOwnerName}: {homeOwnerName: string}) => {
  const [address, setAddress] = useState('');
  const realm = useRealm();
  const homeOwner = useQuery(
    HomeOwner,
    homeOwners => {
      return homeOwners.filtered(`name == '${homeOwnerName}'`);
    },
    [homeOwnerName],
  )[0];

  const updateAddress = () => {
    // Update the home object with the new address
    realm.write(() => {
      // use the `set()` method to update a field of a dictionary
      homeOwner.home.set({address});
      // alternatively, update a field of a dictionary through dot notation
      homeOwner.home.yearRenovated = 2004;
    });
  };

  return (
    <View>
      <Text>{homeOwner.name}</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder='Enter new address'
      />
      <Button
        onPress={updateAddress}
        title='Update Address'
      />
    </View>
  );
};

```

## Delete Members of a Dictionary
To delete members of a dictionary, use the `dictionary.remove()` method with an array of properties to remove from the dictionary.

### Example
In the following `HomeInfo` example, we delete members of a dictionary.

The `HomeInfo` component does the following:

- Get access to an open realm instance by calling the `useRealm()` hook within the component.
- Retrieve the first homeowner that matches the name passed into the component as a prop. We do this by getting the first value returned from the query: `useQuery(HomeOwner).filtered(`name == '${homeOwnerName}'`)`.
- Create a component method `deleteExtraHomeInfo()` that performs a write transaction and calls `dictionary.remove()` to remove the `yearRenovated` and `color` properties.
- Render the homeowner's name and home address in the UI.
- Add an [onPress](https://reactnative.dev/docs/handling-touches) event on the "Delete extra home info" button that calls `deleteExtraHomeInfo()`.

#### Javascript

```javascript
const HomeInfo = ({homeOwnerName}) => {
  const realm = useRealm();
  const homeOwner = useQuery(
    HomeOwner,
    homeOwners => {
      return homeOwners.filtered(`name == '${homeOwnerName}'`);
    },
    [homeOwnerName],
  )[0];

  const deleteExtraHomeInfo = () => {
    realm.write(() => {
      // remove the 'yearRenovated' and 'color' field of the house
      homeOwner.home.remove(['yearRenovated', 'color']);
    });
  };

  return (
    <View>
      <Text>{homeOwner.name}</Text>
      <Text>{homeOwner.home.address}</Text>
      <Button
        onPress={deleteExtraHomeInfo}
        title='Delete extra home info'
       
      />
    </View>
  );
};

```

#### Typescript

```typescript

const HomeInfo = ({homeOwnerName}: {homeOwnerName: string}) => {
  const realm = useRealm();
  const homeOwner = useQuery(
    HomeOwner,
    homeOwners => {
      return homeOwners.filtered(`name == '${homeOwnerName}'`);
    },
    [homeOwnerName],
  )[0];

  const deleteExtraHomeInfo = () => {
    realm.write(() => {
      // remove the 'yearRenovated' and 'color' field of the house
      homeOwner.home.remove(['yearRenovated', 'color']);
    });
  };

  return (
    <View>
      <Text>{homeOwner.name}</Text>
      <Text>{homeOwner.home.address}</Text>
      <Button
        onPress={deleteExtraHomeInfo}
        title='Delete extra home info'
      />
    </View>
  );
};

```

