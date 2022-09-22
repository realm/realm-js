# Realm Babel Plugin

## Introduction

The Realm Babel Plugin enables you to define your Realm models using standard Typescript syntax – no need to define a separate schema.

<table>
<tr>
<th>Before</th>
<th>After</th>
</tr>
<tr>
<td width="50%" valign="top">

```ts
export class Task extends Realm.Object {
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
}
```

</td>
<td width="50%" valign="top">

```ts
export class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  @index
  isComplete = false;

  static primaryKey = "_id";
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

2. If you don't already have it installed, install the `@babel/plugin-proposal-decorators` (only required if you need to use the `@index` or `@mapTo` decorators):

   `npm install --save-dev @babel/plugin-proposal-decorators`

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

```ts
import Realm from "realm";

export class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  count!: Realm.Types.Int;
}
```

You can also import `Object` and `Types` directly from `realm`:

```ts
import { Object, Types, BSON } from "realm";

export class Task extends Object {
  _id!: BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  count!: Types.Int;
}
```

#### Supported types

This plugin supports standard TypeScript types wherever possible, to make defining your model as natural as possible. Some Realm types do not have a direct TypeScript equivalent, or can have more nuance than TypeScript supports (e.g. `double`, `int` and `float` are all represented by `number` in TypeScript), so in these cases you should use the types provided by `Realm.Types` – you can also exclusively use types from `Realm.Types` if preferred. Some Realm types are already exported from the `Realm` namespace and are re-exported by `Realm.Types`, so you can use either variant.

The supported types are shown in the table below. See [the Realm documentation](https://www.mongodb.com/docs/realm/sdk/react-native/data-types/field-types/) and [SDK documentation](https://www.mongodb.com/docs/realm-sdks/js/latest/Realm.html#~PropertyType) for more details on each type.

| Realm.Types type                             | Realm schema type | TypeScript type | Realm type              | Notes                                                                                  |
| -------------------------------------------- | ----------------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `Types.Bool`                                 | `bool`            | `boolean`       |                         |                                                                                        |
| `Types.String`                               | `string`          | `string`        |                         |                                                                                        |
| `Types.Int`                                  | `int`             | `number`        |                         |                                                                                        |
| `Types.Float`                                | `float`           | `number`        |                         |                                                                                        |
| `Types.Double`                               | `double`          | `number`        |                         |                                                                                        |
| `Types.Decimal128`                           | `decimal128`      |                 | `Realm.BSON.Decimal128` |                                                                                        |
| `Types.ObjectId`                             | `objectId`        |                 | `Realm.BSON.UUID`       |                                                                                        |
| `Types.UUID`                                 | `uuid`            |                 |                         |                                                                                        |
| `Types.Date`                                 | `date`            | `Date`          |                         |                                                                                        |
| `Types.Data`                                 | `data`            | `ArrayBuffer`   |                         |                                                                                        |
| `Types.List<T>`                              | `type[]`          |                 | `Realm.List<T>`         | `T` is the type of objects in the list                                                 |
| `Types.Set<T>`                               | `type<>`          |                 | `Realm.Set<T>`          | `T` is the type of objects in the set                                                  |
| `Types.Dictionary<T>`                        | `type{}`          |                 | `Realm.Dictionary<T>`   | `T` is the type of objects in the dictionary                                           |
| `Types.Mixed`                                | `mixed`           | `unknown`       | `Realm.Mixed`           |                                                                                        |
| <code>Types.LinkingObjects<T,&nbsp;N></code> | `linkingObjects`  |                 |                         | `T` is the type of objects, `N` is the property name of the relationship (as a string) |

## Restrictions

### Classes extending Realm.Object cannot be constructed with `new`
