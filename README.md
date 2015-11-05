# RealmJS
Realm is a mobile database that runs directly inside phones, tablets or wearables. This repository holds the source code for Realm's JavaScript bindings for integrating with mobile apps built using ReactNative and PhoneGap.

## Setup
This repository uses submodules so you need to run `git submodule update --init --recursive` in the realm-js root directory before running any examples or including the project in your app.

## ReactNative Example
Make sure your environment is set up to run react native applications. Follow the instructions here https://facebook.github.io/react-native/docs/getting-started.html.

The ReactNative example project is in the `examples/ReactExample` directory. You need to run `npm install` in this directory before running the example for the first time.

## ReactNative Project Setup
- Create a new ReactNative project `react-native init <project-name>` and open the generated XCode project.
- Drag `RealmJS.xcodeproj` into the `Libraries` folder in your project.
- Drag `RealmReact.framework` from the `Products` directory under `RealmJS.xcodeproj` into the `Embedded Libraries` section in the `General` tab for your app's target settings. This bundles the library with your app.
- In the `Build Phases` tab for your app's target settings, add `RealmReact.framework` in the `Target Dependencies` and `Link Binary with Library` build phases.
- In your app's `package.json` file, add the `realm` dependency with a path to the `realm-js/lib` folder like this: `"realm": "file:path/to/realm-js/lib"` (symlinks are not yet supported by the React Native packager, see [issue #637](https://github.com/facebook/react-native/issues/637)).
- You can now `require('realm')` in your app's JS to use Realm!

## Getting Started
Start with creating a `realm` by passing it an array of `objectSchema` (object types and their properties) for each type of object it will contain:

```js
const Realm = require('realm');

const personSchema = {
    name: 'Person',
    primaryKey: 'name',
    properties: [
        {name: 'name', type: Realm.Types.STRING},
        {name: 'birthday', type: Realm.Types.DATE},
        {name: 'friends', type: Realm.Types.LIST, objectType: 'Person'},
        {name: 'points', type: Realm.Types.INT, default: 0},
    ],
};

const realm = new Realm({schema: [personSchema]});
```

If you'd prefer your objects inherit from a prototype, you just need to define the `schema` on the `prototype` object and instead pass in the constructor when creating a `realm`:

```js
function Person() {}
Person.prototype = {
    schema: personSchema,
    get age() {
        return Math.floor((Date.now() - this.birthday.getTime()) / 31557600000);
    },
};

const realm = new Realm({schema: [Person]});
```

You can now use the `realm` instance to create new objects. When using Realm, all mutations must take place inside of a write transaction:

```js
realm.write(() => {
    ross = realm.create('Person', {
        name: 'Ross Geller',
        birthday: new Date(1967, 9, 18),
        friends: [chandler, joey, monica, phoebe, rachel],
    });
});
```

When creating an object, values for all properties without default values need to be specified. In the example above, since the `points` property has a default property it can be ommitted.

Changes to object properties and object deletions also need to take place in a write transactions:

```js
realm.write(() => {
    rachel.points++;
    rachel.friends.push(ross);
    realm.delete(janine);
});
```

**Note:** If an uncaught exception occurs during a write transaction, then the write transaction will roll-back and all, deletions, and modifications will be undone.

You can query for existing objects by passing the object type and an optional query into the `realm.objects()` method:

```js
let characters = realm.objects('Person');
let chandler = realm.objects('Person', 'name = "Chandler Bing"')[0];
```

Queries are live updating, so as change are made to a Realm queries are updated automatically to reflect those changes.

You can see more examples of how to use these APIs in the [ReactExample](https://github.com/realm/realm-js/tree/master/examples/ReactExample) app and in the [JS test files](https://github.com/realm/realm-js/tree/master/tests).

## Documentation
### `Realm` Constructor Options
#### `new Realm(realmConfig)`
The `realmConfig` passed to the constructor can contain the following:
- `schema` – required when first accessing a realm - array of `ObjectSchema` or object constructors (see below)
- `path` – optional - defaults to `Realm.defaultPath` (which initially is `'Documents/default.realm'`)
- `schemaVersion` – optional - defaults to `0` but must be specified and incremented after changing the schema

### ObjectSchema
- `name` – string used to refer to this object type
- `properties` - array of property defitions (see below)
- `primaryKey` – optional - name of `STRING` or `INT` property that should be unique

### Property Types
When definining object `properties` in a `schema`, each should have a unique `name`, and the `type` of each property must be defined as either the name of an object type in the same schema **or** as one of the following:

- `Realm.Types.BOOL`
- `Realm.Types.INT`
- `Realm.Types.FLOAT`
- `Realm.Types.DOUBLE`
- `Realm.Types.STRING`
- `Realm.Types.DATE`
- `Realm.Types.DATA`
- `Realm.Types.OBJECT` (requires `objectType`, is always `optional`)
- `Realm.Types.LIST` (requires `objectType`, is never `optional`)

You _may_ specify these property options as well:

- `default` – default value when property was not specified on creation
- `optional` – boolean indicating if this property may be assigned `null` or `undefined`

### `Realm` Instance Methods
#### `create(type, props [, update])`
- `type` – string matching object `name` in the `schema` definition
- `props` – object with property values for all required properties without a default value
- `update` – optional - boolean signaling that an existing object (matching primary key) should be updated - only the primary key property and properties which should be updated need to be specified for the `props` arguments - all missing property values will remain unchanged
- _Returns a new realm object instance_

#### `delete(object, ..., objectN)`
- `object` – realm object or array of realm objects (which can be a `List` or `Results` object)

#### `deleteAll()`
**WARNING:** This does what you think it does!

#### `objects(type [, query])`
- `type` - string matching object `name` in the `schema` definition
- `query` – optional - string that defines a query to filter results (see tests for examples)
- _Returns `Results` object_

#### `write(callback)`
- `callback` – function that is synchronously called inside the write transaction

#### `close()`
**WARNING:** This is only for advanced use cases and generally doesn't need to be used.

## License
Copyright 2015 Realm Inc - All Rights Reserved
Proprietary and Confidential
