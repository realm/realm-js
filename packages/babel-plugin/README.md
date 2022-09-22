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

npm start -- --reset-cache

## Usage

### Supported types

## Restrictions

### Classes extending Realm.Object cannot be constructed with `new`
