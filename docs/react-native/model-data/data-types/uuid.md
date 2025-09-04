# UUID - React Native SDK
> Version added:

`UUID` (Universal Unique Identifier) is a 16-byte [unique value](https://en.wikipedia.org/wiki/Universally_unique_identifier). `UUID` is bundled with the Realm package as
part of BSON (`Realm.BSON.UUID`).

You can use `UUID` as an unique identifier for
objects. `UUID` is indexable, and you can use it as a
primary key.

#### Javascript

```javascript
class Profile extends Realm.Object {
  static schema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
    },
  };
}

```

#### Typescript

```typescript
class Profile extends Realm.Object<Profile> {
  _id!: Realm.BSON.UUID;
  name!: string;

  static schema: ObjectSchema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
    },
  };
}

```

## Usage
To define a property as a `UUID`, set its type to `"uuid"` in your
object model. Create a Realm object within
a write transaction. To set any unique identifier properties of your object to a
random value, call `new UUID()`. Alternatively, pass a string to `new
UUID()` to set the unique identifier property to a specific value.

### Example
In the following `CreateProfileInput` example, we create a `Profile`
`Realm.Object` with a `uuid` type for the `_id`
field.

The `CreateProfileInput` component does the following:

- Gets access to the opened realm instance by calling the `useRealm()` hook.
- called "name" that represents the name of the profile.
- that write transaction, we create
a `Profile` object with the `name` value of the "name" state variable
and an `_id` value of a new `UUID` object.
- the profile. When the user presses the "Create Profile" button, the
`createProfile` method is called and creates a `Profile` object.

#### Javascript

```javascript
const CreateProfileInput = () => {
  const realm = useRealm();
  const [name, setName] = useState('');

  // createProfile creates a new 'Profile' Realm Object with a new UUID based on user input
  const createProfile = () => {
    realm.write(() => {
      realm.create('Profile', {
        name,
        _id: new Realm.BSON.UUID(),
      });
    });
  };
  return (
    <View>
      <TextInput
        placeholder='Name'
        onChangeText={setName}
      />
      <Button
        title='Create Profile'
        onPress={createProfile}
      />
    </View>
  );

```

#### Typescript

```typescript
const CreateProfileInput = () => {
  const realm = useRealm();
  const [name, setName] = useState('');

  // createProfile creates a new 'Profile' Realm Object with a new UUID based on user input
  const createProfile = () => {
    realm.write(() => {
      realm.create('Profile', {
        name,
        _id: new Realm.BSON.UUID(),
      });
    });
  };
  return (
    <View>
      <TextInput
        placeholder='Name'
        onChangeText={setName}
      />
      <Button
        title='Create Profile'
        onPress={createProfile}
      />
    </View>
  );

```

