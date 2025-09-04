# Quick Start - React Native SDK
This page demonstrates how to use Realm using the React Native SDK.

Before you begin, install the Realm React Native SDK.

## About the @realm/react Package
[@realm/react](https://github.com//realm/realm-js/tree/master/packages/realm-react) is a
package used in the React Native SDK. It provides state-aware React hooks for
Realm data. The hooks watch the Realm data and re-render components as needed.

The React Native SDK documentation uses the `@realm/react`
npm package for examples and describing concepts.

Refer to these pages for more details:

-[RealmProvider (@realm/react)](api-reference/realm-provider.md)

## Set Up Your Realm App
After installing the `realm` and `@realm/react` packages, there are a
few more things to set up before you can access your realm and work with local
data:

- Define your object models
- Configure a realm by creating a realm context object, extracting hooks, and
setting up providers

### Define Object Models
Your application's object models define the data
types that you can store within a realm. Each object model becomes a Realm
object type.

**To define a Realm object model:**

1. Create a class that extends `Realm.Object`.
2. Add a `schema` field.
3. For the `schema` value, create an object that contains `properties` and
`name` properties. The name value must be unique among object types in your
realm.

```typescript
// Define your object model
export class Profile extends Realm.Object<Profile> {
  _id!: BSON.ObjectId;
  name!: string;

  static schema: ObjectSchema = {
    name: 'Profile',
    properties: {
      _id: 'objectId',
      name: {type: 'string', indexed: 'full-text'},
    },
    primaryKey: '_id',
  };
}
```

To learn more, refer to
Define a Realm Object Model.

### Configure a Realm
Before you can work with data, you need to configure a realm. This means you need
to set up context and providers from `@realm/react`. To learn more, refer to
Configure a Realm.

**To configure and access a local realm:**

1. Import `RealmProvider` from `@realm/react`.
2. Pass your object models to the `schema` prop.
3. Add other `Configuration object`
properties as props to `RealmProvider`.

```typescript
import React from 'react';
import {RealmProvider} from '@realm/react';
// Import your models
import {Profile} from '../../../models';

export const AppWrapper = () => {
  return (
    <RealmProvider schema={[Profile]}>
      <RestOfApp />
    </RealmProvider>
  );
};
```

## Work With Realm Objects
After you have a data model and a configured realm, you can create, read, update, or
delete Realm objects.

You must nest components that perform these operations inside of
`RealmProvider`. The `useRealm()`, `useQuery()`, and `useObject()` hooks
enable you to perform read and write operations in your realm.

For detailed descriptions of `RealmProvider` and its hooks, refer to
RealmProvider (@realm/react)

### Read, Sort, and Filter Objects
`@realm/react` provides hooks to help you find a collection of Realm objects
or a single Realm object.

- useQuery()
- useObject()

As part of `useQuery()`, you can filter or sort the results using
Realm Query Language (RQL).

```typescript
import React from 'react';
import {useQuery} from '@realm/react';
import {Profile} from '../../models';

export const Read = () => {
  // Find
  const profiles = useQuery(Profile);
  // Sort
  const sortedProfiles = useQuery(Profile, profiles => {
    return profiles.sorted('name', false);
  });
  // Filter
  const filteredProfiles = useQuery(Profile, profiles => {
    return profiles.filtered('name == "testProfile"');
  });

  // ... rest of component
};
```

To learn more, refer to CRUD - Read and
Query Data.

#### Read Operations Outside of hooks
Sometimes, you may need to use Realm read operations, but not at the top level
of your React Native component. Because hooks only work at the top level of
components, you can't use the `@realm/react` hooks in these situations.

Instead, you can use `Realm.objects()` for
collections or `Realm.objectForPrimaryKey()` a single object.

### Create, Update, and Delete Realm Objects
After accessing the realm with `useRealm()`, you can create, update,
and delete objects inside of the realm. All operations must be in a
`Realm.write()` transaction block.

To learn more, refer to Write Transactions.

#### Create Objects
To create a new Realm object, specify the object type, pass in the object's
initial values, and add it to the realm in a write transaction block.

```typescript
import React, {useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {BSON} from 'realm';
import {useRealm} from '@realm/react';
import {Profile} from '../../models';

export const Create = () => {
  const realm = useRealm();
  const [profileName, setProfileName] = useState('');

  const addProfile = () => {
    realm.write(() => {
      realm.create(Profile, {
        _id: new BSON.ObjectId(),
        name: profileName,
      });
    });
  };

  return (
    <View>
      <Text>Create</Text>

      <TextInput

        onChangeText={setProfileName}
        value={profileName}
        placeholder="Profile name..."
      />

      <Button
        title="Add Profile"
        onPress={addProfile}
      />
    </View>
  );
};
```

To learn more, refer to CRUD - Create.

#### Update Objects
To update a Realm object, update its properties in a write transaction block.

```typescript
import React, {useState} from 'react';
import {Text, FlatList, View, Pressable, TextInput} from 'react-native';
import {useRealm, useQuery} from '@realm/react';

import {Profile} from '../../models';

export const Update = () => {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [profileToUpdate, setProfileToUpdate] = useState('');
  const [newProfileName, setNewProfileName] = useState('');

  const updateProfile = () => {
    const toUpdate = realm
      .objects(Profile)
      .filtered('name == $0', profileToUpdate);

    realm.write(() => {
      toUpdate[0].name = newProfileName;
    });
  };

  return (
    <View>
      <Text>Update</Text>

      {profiles.length ? (
        <View>
          <Text>Profiles: </Text>
          <FlatList
            scrollEnabled={false}
            data={profiles}
            horizontal={true}
            renderItem={({item}) => (
              <Pressable
                onPress={() => {
                  setProfileToUpdate(item.name);
                }}>
                <Text
                 >
                  {item.name}
                </Text>
              </Pressable>
            )}
            keyExtractor={item => item.name}
          />
        </View>
      ) : (
        <Text>🛑 No profiles found</Text>
      )}

      {profileToUpdate && (
        <TextInput
          style={styles.textInput}
          onChangeText={setNewProfileName}
          value={newProfileName}
          placeholder="New profile name..."
        />
      )}

      <Button
        title="Update profile"
        onPress={updateProfile}
      />
    </View>
  );
};
```

To learn more, refer to CRUD - Update.

#### Delete Objects
To delete a Realm object, pass the object to `Realm.delete()` within a write transaction block.

```typescript
import React, {useState} from 'react';
import {Text, FlatList, View, Pressable} from 'react-native';
import {useRealm, useQuery} from '@realm/react';
import {Profile} from '../../models';

export const Delete = () => {
  const realm = useRealm();
  const profiles = useQuery(Profile);
  const [profileToDelete, setProfileToDelete] = useState('');

  const deleteProfile = () => {
    const toDelete = realm
      .objects(Profile)
      .filtered('name == $0', profileToDelete);

    realm.write(() => {
      realm.delete(toDelete);
    });
  };

  return (
    <View>
      <Text>Delete</Text>

      {profiles.length ? (
        <View>
          <Text>Profiles: </Text>
          <FlatList
            scrollEnabled={false}
            data={profiles}
            horizontal={true}
            renderItem={({item}) => (
              <Pressable
                onPress={() => {
                  setProfileToDelete(item.name);
                }}>
                <Text
                 >
                  {item.name}
                </Text>
              </Pressable>
            )}
            keyExtractor={item => item.name}
          />
        </View>
      ) : (
        <Text>🛑 No profiles found</Text>
      )}

      <Button
        title="Delete profile"
        onPress={deleteProfile}
      />
    </View>
  );
};
```

To learn more, refer to CRUD - Delete.
