# RealmJS
Realm is a mobile database that runs directly inside phones, tablets or wearables. This repository holds the source code for Realm's JavaScript bindings for integrating with mobile apps built using ReactNative and Apache Cordova (PhoneGap).

## Setup
This repository uses submodules so you need to run `git submodule update --init --recursive` in the realm-js root directory before running any examples.

## ReactNative Example
Make sure your environment is set up to run react native applications. Follow the instructions here https://facebook.github.io/react-native/docs/getting-started.html.

The ReactNative example project is in the `examples/ReactExample` directory. You need to run `npm install` in this directory before running the example for the first time.

## ReactNative Project Setup
- Create a new ReactNative project: `react-native init <project-name>`
- Change directories into the new project (`cd <project-name>`) and add the `realm` dependency: `npm install --save git+ssh://git@github.com/realm/realm-js.git#beta` (please note it's **essential** to leave the `#beta` at the end)

### iOS
- Open the generated Xcode project (`ios/<project-name>.xcodeproj`)
- Making sure the top-level project is selected in the sidebar, change the `iOS Deployment Target` to at least `8.0` in the project settings.
- Right-click the `Libraries` group in the sidebar and click `Add Files to “<project-name>”`. Select `node_modules/realm/RealmJS.xcodeproj` from the dialog.
- Drag `RealmReact.framework` from the `Products` directory under `RealmJS.xcodeproj` into the `Embedded Binaries` section in the `General` tab for your app's target settings.
- In the `Build Phases` tab for your app's target settings, make sure `RealmReact.framework` is added to the `Link Binary with Library` build phase.
- You can now `require('realm')` in your iOS app's JS to use Realm!

### Android
- Run this command from the project directory: `react-native link realm`
- You can now `require('realm')` in your Android app's JS to use Realm!

## Getting Started
Start with creating a `realm` by passing it an array of `objectSchema` (object types and their properties) for each type of object it will contain:

```js
const Realm = require('realm');

const personSchema = {
    name: 'Person',
    primaryKey: 'name',
    properties: {
        name: 'string',
        birthday: 'date',
        friends: {type: 'list', objectType: 'Person'},
        points: {type: 'int', default: 0},
    },
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

When creating an object, values for all properties without default values need to be specified. In the example above, since the `points` property has a default property it can be omitted.

Changes to object properties and object deletions also need to take place in a write transactions:

```js
realm.write(() => {
    rachel.points++;
    rachel.friends.push(ross);
    realm.delete(janine);
});
```

**Note:** If an uncaught exception occurs during a write transaction, then the write transaction will rollback and all object creations, deletions and modifications will be undone.

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
- `properties` - object with property definitions (see below)
- `primaryKey` – optional - name of `STRING` or `INT` property that should be unique

### Property Types
When defining object `properties` in a `schema`, the value for each property must either be the `type` **OR** an object with a `type` key along with other options detailed below. The `type` of each property must be defined as either the name of an object type in the same schema **or** as one of the following:

- `Realm.Types.BOOL` (`"bool"`)
- `Realm.Types.INT` (`"int"`)
- `Realm.Types.FLOAT` (`"float"`)
- `Realm.Types.DOUBLE` (`"double"`)
- `Realm.Types.STRING` (`"string"`)
- `Realm.Types.DATE` (`"date"`)
- `Realm.Types.DATA` (`"data"`)
- `Realm.Types.LIST` (`"list"` – requires `objectType` and cannot be `optional`)

You _may_ specify these property options as well:

- `default` – default value when property was not specified on creation
- `optional` – boolean indicating if this property may be assigned `null` or `undefined`

**Note:** When the `type` of a property is that of an object type in the same schema, it _always_ will be `optional`.

### `Realm` Instance Methods
#### `create(type, props [, update])`
- `type` – string matching object `name` in the `schema` definition
- `props` – object with property values for all required properties without a default value
- `update` – optional – boolean signaling that an existing object (matching primary key) should be updated – only the primary key property and properties which should be updated need to be specified for the `props` arguments (all missing property values will remain unchanged)
- _Returns a new realm object instance_

#### `delete(object)`
- `object` – realm object or array of realm objects (which can be a `List` or `Results` object)

#### `deleteAll()`
**WARNING:** This does what you think it does!

#### `objects(type [, query])`
- `type` - string matching object `name` in the `schema` definition
- `query` – optional – string that defines a query to filter results (see tests for examples)
- _Returns `Results` object_

#### `write(callback)`
- `callback` – function that is synchronously called inside the write transaction

#### `addListener(event, callback)`
- `event` – string specifying the event name (only `'change'` is currently supported)
- `callback` – function that is called when that event occurs

#### `removeListener(event, callback)`
- `event` – string specifying the event name (only `'change'` is currently supported)
- `callback` – function that was previously added a listener callback

#### `removeAllListeners([event])`
- `event` – optional – string specifying the event name (only `'change'` is currently supported)

#### `close()`
**WARNING:** This is only for advanced use cases and generally doesn't need to be used.

## Conduct
This project adheres to the Contributor Covenant [code of conduct](https://realm.io/conduct/).
By participating, you are expected to uphold this code. Please report unacceptable behavior to [info[at]realm.io](mailto:info+conduct@realm.io).

## License
Copyright 2015 Realm Inc - All Rights Reserved
Proprietary and Confidential
