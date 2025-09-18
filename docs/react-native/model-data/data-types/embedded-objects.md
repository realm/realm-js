# Embedded Objects - React Native SDK
## Create an Embedded Object
To create an embedded object, assign an instance of the embedded object
to a parent object's property.

### Example
In the following `CreateContact` example, we create a new `Contact` object
with an embedded `Address` object.

The `CreateContact` component does the following:

- Creates React [state](https://react.dev/reference/react/Component#state)
variables that represent the contact's name and address details.
- Gets access to an open realm instance by calling the `useRealm()` hook within the
component.
- Creates a component method `submitContact()` that performs a write transaction
to create a new `Address` embedded object and `Contact` parent object based
on the `TextInput` values for the contact's name and address.
- Adds an [onPress](https://reactnative.dev/docs/handling-touches) event on the
"Submit Contact" button that calls `submitContact()`.

```typescript
const CreateContact = () => {
  const [name, setContactName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const realm = useRealm();

  const submitContact = () => {
    // Create a Contact within a write transaction
    realm.write(() => {
      // Create an embedded Address object
      const address = {
        street,
        city,
        country,
        postalCode,
      };

      realm.create('Contact', {
        _id: new Realm.BSON.ObjectID(),
        name,
        // Embed the address in the Contact object
        address,
      });
    });
  };
  return (
    <View>
      <TextInput value={name} onChangeText={text => setContactName(text)} />
      <TextInput value={street} onChangeText={text => setStreet(text)} />
      <TextInput value={city} onChangeText={text => setCity(text)} />
      <TextInput value={country} onChangeText={text => setCountry(text)} />
      <TextInput
        value={postalCode}
        onChangeText={text => setPostalCode(text)}
      />
      <Button
        title='Submit Contact'
        onPress={submitContact}
      />
    </View>
  );
};

```

## Query a Collection on Embedded Object Properties
You can use dot notation to filter or sort a collection of objects based on an embedded object
property value.

### Example
In the following `ContactList` example, we filter and query an embedded
`Address` object.

The `ContactList` component does the following:

- Performs a query for all contacts by passing the `Contact` class to the `useQuery` hook.
- Filters for contacts with the name "John Smith" by passing `collection.filtered()` on the query `"name == 'John Smith'"`.
- Retrieves the contact's street address by using dot notation.

#### Javascript

```javascript
const ContactList = ({postalCode}) => {
  // Run the `.filtered()` method on all the returned Contacts to get
  // contacts with a specific postal code.
  const contactsInArea = useQuery(
    Contact,
    contacts => {
      return contacts.filtered(`address.postalCode == '${postalCode}'`);
    },
    [postalCode],
  );

  if (contactsInArea.length) {
    return (
      <>
        <FlatList
          testID='contactsList'
          data={contactsInArea}
          renderItem={({item}) => {
            <Text>{item.name}</Text>;
          }}
        />
      </>
    );
  } else {
    return <Text>No contacts found in this area.</Text>;
  }
};

```

#### Typescript

```typescript
const ContactList = ({postalCode}: {postalCode: string}) => {
  // Run the `.filtered()` method on all Contact objects to get
  // contacts with a specific postal code.
  const contactsInArea = useQuery(Contact, contacts => {
    return contacts.filtered(`address.postalCode == '${postalCode}'`);
  });

  if (contactsInArea.length) {
    return (
      <>
        <FlatList
          data={contactsInArea}
          renderItem={({item}) => {
            <Text>{item.name}</Text>;
          }}
        />
      </>
    );
  } else {
    return <Text>No contacts found in this area.</Text>;
  }
};

```

## Update an Embedded Object Property
To update a property in an embedded object, modify the property in a
write transaction.

### Example
In the following `UpdateContact` example, we update the `street` property for
an embedded `Address` object.

The `UpdateContact` component does the following:

- Creates a React [state](https://react.dev/reference/react/Component#state)
variable that represents the contact's new street address.
- Performs a query for all contacts by passing the `Contact` class to the
`useQuery` hook and filters for the contact that matches the name passed
into the component as a [prop](https://react.dev/learn/passing-props-to-a-component).
- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Creates a component method `updateStreet()` that performs a write transaction and
sets the contact's street address to the value of the `street` state variable.
- Renders a `TextInput` that displays and changes the `street` state variable.
- Adds an [onPress](https://reactnative.dev/docs/handling-touches) event on the
`'Update Street Address'` button that calls `updateStreet()`.

#### Javascript

```javascript
// Find the contact you want to update
const UpdateContact = ({contactId}) => {
  const [street, setStreet] = useState('');
  const contact = useObject(Contact, contactId);
  const realm = useRealm();

  const updateStreet = () => {
    // Modify the property of the embedded Address object in a write transaction
    realm.write(() => {
      // Update the address directly through the contact
      contact.address.street = street;
    });
  };

  return (
    <View>
      <Text>{contact.name}</Text>
      <TextInput
        value={street}
        onChangeText={setStreet}
        placeholder='Enter New Street Address'
      />
      <Button
        onPress={updateStreet}
        title='Update Street Address'
      />
    </View>
  );
};

```

#### Typescript

```typescript
// Find the contact you want to update
const UpdateContact = ({contactId}: {contactId: Realm.BSON.ObjectId}) => {
  const [street, setStreet] = useState('');
  const contact = useObject(Contact, contactId);
  const realm = useRealm();

  const updateStreet = () => {
    // Modify the property of the embedded Address object in a write transaction
    realm.write(() => {
      // Update the address directly through the contact
      contact!.address.street = street;
    });
  };

  return (
    <View>
      <Text>{contact!.name}</Text>
      <TextInput
        value={street}
        onChangeText={setStreet}
        placeholder='Enter New Street Address'
      />
      <Button
        onPress={updateStreet}
        title='Update Street Address'
      />
    </View>
  );
};

```

## Overwrite an Embedded Object
To overwrite an embedded object, reassign the embedded object property
of a party to a new instance in a write transaction.

### Example
In the following `OverwriteContact` example, we overwrite an embedded `Address` object.

The `OverwriteContact` component does the following:

- Creates React [state](https://react.dev/reference/react/Component#state)
variables that represent the contact's new address.
- Performs a query for all contacts by passing the `Contact` class to the
`useQuery` hook and filters for the contact that matches the name passed
into the component as a [prop](https://react.dev/learn/passing-props-to-a-component).
- Gets access to an opened realm instance by calling the `useRealm()` hook
within the component.
- Creates a component method `updateAddress()` that performs a write
transaction and creates a new `Address` object that overwrites the existing
address in the `Contact` object.
- Renders `TextInput` components that display and change the state variables
for the new address.
- Adds an [onPress](https://reactnative.dev/docs/handling-touches) event on
the `'Overwrite Address'` button that calls `updateAddress()`.

#### Javascript

```javascript
const OverwriteContact = ({contactId}) => {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const contact = useObject(Contact, contactId);
  const realm = useRealm();

  const updateAddress = () => {
    realm.write(() => {
      // Within a write transaction, overwrite the embedded object with the new address
      const address = {
        street,
        city,
        country,
        postalCode,
      };

      contact.address = address;
    });
  };
  return (
    <View>
      <Text>{contact.name}</Text>
      <Text>Enter the new address:</Text>
      <TextInput
        value={street}
        onChangeText={setStreet}
        placeholder='Street'
      />
      <TextInput value={city} onChangeText={setCity} placeholder='City' />
      <TextInput
        value={country}
        onChangeText={setCountry}
        placeholder='Country'
      />
      <TextInput
        value={postalCode}
        onChangeText={setPostalCode}
        placeholder='Postal Code'
      />
      <Button
        onPress={updateAddress}
        title='Overwrite Address'
      />
    </View>
  );
};

```

#### Typescript

```typescript
const OverwriteContact = ({
  contactId,
}: {
  contactId: Realm.BSON.ObjectId;
}) => {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const contact = useObject(Contact, contactId);
  const realm = useRealm();

  const updateAddress = () => {
    realm.write(() => {
      // Within a write transaction, overwrite the embedded object with the new address
      const address = {
        street,
        city,
        country,
        postalCode,
      };

      contact!.address = address;
    });
  };

  return (
    <View>
      <Text>{contact!.name}</Text>
      <Text>Enter the new address:</Text>
      <TextInput
        value={street}
        onChangeText={setStreet}
        placeholder='Street'
      />
      <TextInput value={city} onChangeText={setCity} placeholder='City' />
      <TextInput
        value={country}
        onChangeText={setCountry}
        placeholder='Country'
      />
      <TextInput
        value={postalCode}
        onChangeText={setPostalCode}
        placeholder='Postal Code'
      />
      <Button
        onPress={updateAddress}
        title='Overwrite Address'
      />
    </View>
  );
};

```

## Delete an Embedded Object
Realm Uses Cascading Deletes for Embedded Objects. To delete an embedded object,
delete the embedded object's parent.

### Example
In the following `DeleteContact` example, we delete an embedded object and its
parent object.

The `DeleteContact` component does the following:

- Performs a query for all contacts by passing the `Contact` class to the
`useQuery` hook.
- Filters for the `Contact` object that matches the name passed into the
component as a [prop](https://react.dev/learn/passing-props-to-a-component).
- Gets access to an open realm instance by calling the `useRealm()` hook
within the component.
- Creates a component method `deleteContact()` that performs a write
transaction and calls `Realm.delete()` to remove
the `Contact` object.
- Add an [onPress](https://reactnative.dev/docs/handling-touches) event on
the "Delete Contact" button that calls `deleteContact()`.

#### Javascript

```javascript
const ContactInfo = ({contactCity, postalCode}) => {
  const realm = useRealm();
  const parentsToDelete = useQuery(
    Contact,
    contacts => {
      return contacts.filtered(`address.city == '${contactCity}'`);
    },
    [contactCity],
  );
  const embeddedToDelete = useQuery(
    Contact,
    contacts => {
      return contacts.filtered(`address.postalCode == '${postalCode}'`);
    },
    [postalCode],
  );

  const deleteParentObject = () => {
    realm.write(() => {
      // Delete all objects that match the filter.
      // Also deletes embedded objects.
      realm.delete(parentsToDelete);
    });
  };

  const deleteEmbeddedObject = () => {
    realm.write(() => {
      embeddedToDelete.forEach(contact => {
        // Delete just the embedded object.
        realm.delete(contact.address);
      });
    });
  };

  return (
    <View>
      <Text testID='contactCityText'>{contactCity}</Text>
      <Button
        onPress={deleteParentObject}
        title='Delete Contact'
      />
      <Button
        onPress={deleteEmbeddedObject}
        title='Delete Address'
      />
    </View>
  );
};

```

#### Typescript

```typescript
type ContactInfoProps = {
  contactCity: string;
  postalCode: string;
};

const ContactInfo = ({contactCity, postalCode}: ContactInfoProps) => {
  const parentsToDelete = useQuery(Contact, contacts => {
    return contacts.filtered(`address.city == '${contactCity}'`);
  });
  const embeddedToDelete = useQuery(Contact, contacts => {
    return contacts.filtered(`address.postalCode == '${postalCode}'`);
  });
  const realm = useRealm();

  const deleteParentObject = () => {
    realm.write(() => {
      // Delete all objects that match the filter.
      // Also deletes embedded objects.
      realm.delete(parentsToDelete);
    });
  };

  const deleteEmbeddedObject = () => {
    realm.write(() => {
      embeddedToDelete.forEach(contact => {
        // Delete just the embedded object.
        realm.delete(contact.address);
      });
    });
  };

  return (
    <View>
      <Text testID='contactCityText'>{contactCity}</Text>
      <Button
        onPress={deleteParentObject}
        title='Delete Contact'
      />
      <Button
        onPress={deleteEmbeddedObject}
        title='Delete Address'
      />
    </View>
  );
};

```

