# CRUD - Create - React Native SDK
To add a new Realm object to a realm instance, use `realm.create()` inside of a write transaction. If the
schema includes the object type and the
object conforms to the schema, then Realm stores the object.

The example for creating an object uses the following schema:

#### Javascript

```javascript
class Person extends Realm.Object {
  static schema = {
    name: 'Person',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int?',
    },
  };
}

```

#### Typescript

```typescript
class Person extends Realm.Object<Person> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  age?: number;

  static schema: ObjectSchema = {
    name: 'Person',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int?',
    },
  };
}

```

To create a new object:

1. Access a realm instance using the `useRealm()` hook.
2. Create `handleAddPerson()`, which creates a new `Person` object based on the TextInput value.
3. Add an [onPress](https://reactnative.dev/docs/handling-touches) event on the submit button that calls `handleAddPerson()`.

```typescript
const CreatePersonInput = () => {
  const [name, setName] = useState('');
  const realm = useRealm();

  const handleAddPerson = () => {
    realm.write(() => {
      realm.create('Person', {_id: PERSON_ID, name: name, age: 25});
    });
  };

  return (
    <>
      <TextInput value={name} onChangeText={setName}  />
      <Button
        onPress={() => handleAddPerson()}
        title='Add Person'
      />
    </>
  );
};

```

## Create an Object with a To-One Relationship
In a one-to-one relationship, an object is related to at most one other object of a particular type.
To learn more about one-to-one relationships, refer to to Relationships & Embedded
Objects.

The example for creating an object with a to-one relationship uses the following schema to indicate that a Pet Owner
may only own one Pet:

#### Javascript

```javascript
class Pet extends Realm.Object {
  static schema = {
    name: 'Pet',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int',
      animalType: 'string?',
    },
  };
}

class PetOwner extends Realm.Object {
  static schema = {
    name: 'PetOwner',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int',
      pet: 'Pet?',
    },
  };
}

```

#### Typescript

```typescript
class Pet extends Realm.Object<Pet> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  age!: number;
  animalType!: string;

  static schema: ObjectSchema = {
    name: 'Pet',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int',
      animalType: 'string?',
    },
  };
}

class PetOwner extends Realm.Object<PetOwner> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  age?: number;
  pet?: Pet;

  static schema: ObjectSchema = {
    name: 'PetOwner',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      age: 'int',
      pet: 'Pet?',
    },
  };
}

```

To create an object with a to-one relationship to another object:

1. Query the realm for a pre-existing Pet object. Assign the result to `newPet`.
2. Create a new PetOwner object and pass `newPet` to the `pet` property.
3. Wrap your write transaction in a `handleAddPetOwner()` function, which creates a new `PetOwner` object with an associated `Pet`.
4. Add an [onPress](https://reactnative.dev/docs/handling-touches) event on the submit button that calls `handleAddPetOwner()`.

```typescript
const CreatePetOwnerInput = () => {
  const [ownerName, setOwnerName] = useState('');
  const realm = useRealm();
  const newPet = useObject(Pet, PET_ID);

  const handleAddPetOwner = () => {
    // Create a new Pet Owner object, pass new Pet object in pet field
    realm.write(() => {
      realm.create('PetOwner', {
        _id: PETOWNER_ID,
        name: ownerName,
        age: 25,
        pet: newPet,
      });
    });
  };

  return (
    <>
      <TextInput
        onChangeText={setOwnerName}
        value={ownerName}

      />
      <Button
        onPress={() => handleAddPetOwner()}
        title='Add New Pet Owner'
      />
    </>
  );
};

```

## Create an Object with a To-Many Relationship
In a one-to-many relationship, an object may be related to multiple objects of a particular type.
To learn more about one-to-many relationships, refer to Relationships & Embedded
Objects.

The example for creating an object with a to-many relationship uses the following schema to indicate that a Company
may employ multiple Employees:

#### Javascript

```javascript
class Employee extends Realm.Object {
  static schema = {
    name: 'Employee',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      birthdate: 'date',
    },
  };
}

class Company extends Realm.Object {
  static schema = {
    name: 'Company',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      employees: {
        type: 'list',
        objectType: 'Employee',
        optional: false,
      },
    },
  };
}

```

#### Typescript

```typescript
class Employee extends Realm.Object<Employee> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  birthdate!: Date;

  static schema: ObjectSchema = {
    name: 'Employee',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      birthdate: 'date',
    },
  };
}

class Company extends Realm.Object<Company> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  employees!: Realm.List<Employee>;

  static schema: ObjectSchema = {
    name: 'Company',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      employees: {
        type: 'list',
        objectType: 'Employee',
        optional: false,
      },
    },
  };
}

```

To create an object with a to-many relationship to another object:

1. Query the realm for all pre-existing Employee objects using useQuery().
2. Create a new Company object and pass the results of your previous query to the `employees` property.
3. Wrap your write transaction in a `handleAddCompany()` function, which creates a new `Company` object with an associated list of `Employees`.
4. Add an [onPress](https://reactnative.dev/docs/handling-touches) event on the submit button that calls `handleAddCompany()`.

```typescript
const CreateNewCompanyInput = () => {
  const employees = useQuery(Employee);
  const [companyName, setCompanyName] = useState('');
  const realm = useRealm();

  // Create a new Company and connect our list of Employees to it
  const handleCreateCompany = () => {
    realm.write(() => {
      realm.create('Company', {
        _id: COMPANY_ID,
        name: companyName,
        employees: employees,
      });
    });
  };

  return (
    <>
      <TextInput
        onChangeText={setCompanyName}
        value={companyName}

      />
      <Button
        onPress={() => handleCreateCompany()}
        title='Add New Company'
      />
    </>
  );
};

```

## Create an Embedded Object
An embedded object is an object that exists as data nested inside of a parent object; it cannot exist as an
independent Realm object. To learn more about embedded objects, refer to to Relationships & Embedded
Objects.

The example for representing an embedded object uses the following schema that allows you to embed a single
Address into a new Contact object:

#### Javascript

```javascript
class Address extends Realm.Object {
  static schema = {
    name: 'Address',
    embedded: true, // default: false
    properties: {
      street: 'string?',
      city: 'string?',
      country: 'string?',
      postalCode: 'string?',
    },
  };
}

```

```javascript
class Contact extends Realm.Object {
  static schema = {
    name: 'Contact',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      // Embed a single object
      address: 'Address',
    },
  };
}

```

```javascript
class Business extends Realm.Object {
  static schema = {
    name: 'Business',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      // Embed an array of objects
      addresses: {type: 'list', objectType: 'Address'},
    },
  };
}

```

#### Typescript

```typescript
class Address extends Realm.Object<Address> {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;

  static schema: ObjectSchema = {
    name: 'Address',
    embedded: true, // default: false
    properties: {
      street: 'string?',
      city: 'string?',
      country: 'string?',
      postalCode: 'string?',
    },
  };
}

```

```typescript
class Contact extends Realm.Object {
  _id!: string;
  name!: string;
  address!: Address;

  static schema: ObjectSchema = {
    name: 'Contact',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      // Embed a single object
      address: 'Address',
    },
  };
}

```

```typescript
class Business extends Realm.Object {
  _id!: string;
  name!: string;
  addresses!: Realm.List<Address>;

  static schema: ObjectSchema = {
    name: 'Business',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      // Embed an array of objects
      addresses: {type: 'list', objectType: 'Address'},
    },
  };
}

```

To create an embedded object, assign an instance of the embedded object to a parent object's property.

The following `CreateContact` example creates a new `Contact` object
with an embedded `Address` object.

The `CreateContact` component does the following:

1. Creates React [state](https://react.dev/reference/react/Component#state) variables that represent the contact's name and address details.
2. Gets access to an open realm instance by calling the `useRealm()` hook within the component.
3. Creates a component method `submitContact()` that performs a write transaction to create a new `Address` embedded object and `Contact` parent object based on the `TextInput` values for the contact's name and address.
4. Adds an [onPress](https://reactnative.dev/docs/handling-touches) event on the "Submit Contact" button that calls `submitContact()`.

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
