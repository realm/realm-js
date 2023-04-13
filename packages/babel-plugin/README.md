# Realm Babel Plugin

## Introduction

The Realm Babel plugin enables defining your Realm models using standard Typescript syntax - no need to define a separate schema.

<table>
<tr>
<th>Before: without the Realm Babel plugin</th>
<th>After: with the Realm Babel plugin</th>
</tr>
<tr>
<td width="50%" valign="top">

```ts
class Task extends Realm.Object<Task, "description"> {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;

  static schema = {
    name: "Task",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      description: "string",
      isComplete: {
        type: "bool",
        default: false,
        indexed: true,
      },
    },
  };

  constructor(realm, description: string) {
    super(realm, {
      _id: new Realm.BSON.ObjectId(),
      description,
    });
  }
}
```

</td>
<td width="50%" valign="top">

```ts
class Task extends Realm.Object<Task, "description"> {
  _id = new Realm.BSON.ObjectId();
  description!: string;
  @index
  isComplete = false;

  static primaryKey = "_id";

  constructor(realm, description: string) {
    super(realm, { description });
  }
}
```

</code>
</td>
</tr>
</table>

## Features

- Schema properties can be defined as class properties by using standard TypeScript types or specific `Realm.Types` types, supporting every Realm type
- Support for default values using property initialiser syntax
- Support for specifying additional schema properties (e.g. primary key) using class statics
- Support for indexing and remapping fields using decorators

## Installation

1. Install the `@realm/babel-plugin` npm package:

   `npm install --save-dev @realm/babel-plugin`

2. If you don't already have it installed, install the `@babel/plugin-proposal-decorators` package (only required if you need to use the `@index` or `@mapTo` decorators):

   `npm install --save-dev @babel/plugin-proposal-decorators`

   and enable decorators in your `tsconfig.json` by adding: `"experimentalDecorators": true` to the `compilerOptions`.

3. Update your project's `babel.config.js` to load these two plugins:

   ```js
   // Existing babel.config.js content is commented out
   // module.exports = {
     // presets: ['module:metro-react-native-babel-preset'],

     // --------------------------
     // Add the following plugins:
     plugins: [
       '@realm/babel-plugin',
       ['@babel/plugin-proposal-decorators', { legacy: true }],
     ],
     // --------------------------
   // };

   ```

4. If using React Native, you may need to clear your packager cache for it to pick up the new plugins:

   `npm start -- --reset-cache`

## Usage

### Defining model properties

To define your Realm models when using this plugin, simply create classes which extend `Realm.Object`, and define the model's properties using either supported TypeScript types or `Realm.Types` types (see [supported types](#supported-types)). It is recommended that you use the non-null assertion operator (`!`) after the property name, to tell TypeScript that the property will definitely have a value.

You can use property initialiser syntax to specify a default value for a property, which can either be a static value or a function call for dynamic values.

The recommended pattern for constructing new instances with specified values for properties is to define a constructor which takes the properties as additional arguments. The second type parameter of `Realm.Object` can be used to specify any fields which are required to be specified in the second `fields` when an instance is constructed with `new` - all properties are optional by default.

```ts
import Realm from "realm";

// Specify that the name and description fields are required when creating an instance with `new`
export class Task extends Realm.Object<Task, "name" | "description"> {
  // Property initialiser syntax with a dynamic value - each instance will have a unique ID
  _id = new Realm.BSON.ObjectId();
  name!: string;
  description!: string;
  // Property initializer syntax with a static value
  isComplete = false;
  // Specifying the type of number to be stored in the Realm using Realm.Types
  count!: Realm.Types.Int = 0;
}
```

You can also import `Object` and `Types` directly from `realm`:

```ts
import { Object, Types, BSON } from "realm";

export class Task extends Object<Task, "name" | "description"> {
  _id = BSON.ObjectId();
  name: string;
  description!: string;
  isComplete = false;
  count!: Types.Int;
}
```

#### Supported types

This plugin supports standard TypeScript types wherever possible, to make defining your model as natural as possible. Some Realm types do not have a direct TypeScript equivalent (e.g. `double`, `int` and `float` are all represented by `number` in TypeScript), so in these cases you should use the types provided by `Realm.Types`.

As a rule, we recommend using TypeScript types where possible, and using `Realm.Types` where you cannot, but you can also exclusively use types from `Realm.Types` if preferred.

Types which are provided by Realm (e.g. `Realm.List`) are exported from both the top-level `Realm` namespace, and from `Realm.Types` - you can use either variant in your models.

The supported types are shown in the table below. See [the Realm documentation](https://www.mongodb.com/docs/realm/sdk/react-native/data-types/field-types/) and [SDK documentation](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.html#~PropertyType) for more details on each type.

| Realm.Types type                             | Realm schema type | TypeScript type | Realm type              | Notes                                                                                  |
| -------------------------------------------- | ----------------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `Types.Bool`                                 | `bool`            | `boolean`       |                         |                                                                                        |
| `Types.String`                               | `string`          | `string`        |                         |                                                                                        |
| `Types.Int`                                  | `int`             |                 |                         |                                                                                        |
| `Types.Float`                                | `float`           |                 |                         |                                                                                        |
| `Types.Double`                               | `double`          | `number`        |                         | Double is the default number type                                                      |
| `Types.Decimal128`                           | `decimal128`      |                 | `Realm.BSON.Decimal128` |                                                                                        |
| `Types.ObjectId`                             | `objectId`        |                 | `Realm.BSON.ObjectId`   |                                                                                        |
| `Types.UUID`                                 | `uuid`            |                 | `Realm.BSON.UUID`       |                                                                                        |
| `Types.Date`                                 | `date`            | `Date`          |                         |                                                                                        |
| `Types.Data`                                 | `data`            | `ArrayBuffer`   |                         |                                                                                        |
| `Types.List<T>`                              | `type[]`          |                 | `Realm.List<T>`         | `T` is the type of objects in the list                                                 |
| `Types.Set<T>`                               | `type<>`          |                 | `Realm.Set<T>`          | `T` is the type of objects in the set                                                  |
| `Types.Dictionary<T>`                        | `type{}`          |                 | `Realm.Dictionary<T>`   | `T` is the type of objects in the dictionary                                           |
| `Types.Mixed`                                | `mixed`           |                 | `Realm.Mixed`           |                                                                                        |
| <code>Types.LinkingObjects<T,&nbsp;N></code> | `linkingObjects`  |                 |                         | `T` is the type of objects, `N` is the property name of the relationship (as a string) |

### Specifying schema properties as `static`s

Additional schema properties can be specified by adding `static` properties to your class, as shown in the table below. See [the Realm documentation](https://www.mongodb.com/docs/realm/sdk/node/examples/define-a-realm-object-model/) for more details.

| Static property | Type      | Notes                                                                      |
| --------------- | --------- | -------------------------------------------------------------------------- |
| `name`          | `string`  | Specifies the name of the Realm schema. Defaults to your class name.       |
| `primaryKey`    | `string`  | Specifies the name of a property to be used as the primary key.            |
| `embedded`      | `boolean` | Specifies this is an embedded schema.                                      |
| `asymmetric`    | `boolean` | Specifies this schema should sync unidirectionally if using flexible sync. |

For example:

```ts
import Realm from "realm";

export class Task extends Realm.Object<Task, "description"> {
  _id = new Realm.BSON.ObjectId();
  description!: string;
  isComplete = false;

  static primaryKey = "_id";
}
```

### Using decorators to index and remap properties

The `@realm/babel-plugin` package exports decorators to allow you to specify certain properties should be indexed (using the `@index` decorators) or should remap to a Realm schema property with a different name (using the `@mapTo` decorator). To learn more about this functionality, see [the documentation](https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#index-a-property).

Note that use of decorators requires using the `@babel/plugin-proposal-decorators` plugin and for `experimentalDecorators` to be enabled in your `tsconfig.json`. There is currently no way to specifying properties to be indexed or remapped without using decorators.

This table shows the available decorators:

| Decorator | Parameters                    | Notes                                                                                                |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `index`   | none                          | Specifies that the decorated property should be indexed by Realm.                                    |
| `mapTo`   | `(realmPropertyName: string)` | Specifies that the decorated property should be stored as `realmPropertyName` in the Realm database. |

The example below shows both decorators in use:

```ts
import Realm from "realm";
import { mapTo, index } from "@realm/babel-plugin";

export class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  // Add an index to the `description` property
  @index
  description!: string;
  // Specify that the `isComplete` property should be stored as `complete` in the Realm database
  @mapTo("complete")
  isComplete = false;
}
```

## Restrictions

### All class properties will be added to the Realm schema

There is currently no way to specify a property on your class which should not be persisted to the Realm.

### Classes extending Realm.Object cannot be constructed with `new` outside of a write transaction

This plugin does not change the behaviour of `Realm.Object`, which cannot be constructed using `new` outside of a write transaction - there is no concept of a Realm.Object which is not stored in a Realm. Constructing a Realm object with `new` inside a write transaction will create a new object in the Realm - see [class-based models in the CHANGELOG](/CHANGELOG.md#enhancements-4).

## Debugging your model

To generate the output for your model (let's say it's located in `./models/task.ts`) you can run the babel transpiler manually on the file:

```
npm install --save-dev @babel/cli @babel/preset-typescript
npx babel --presets @babel/preset-typescript --plugins @realm/babel-plugin ./models/task.ts
```
