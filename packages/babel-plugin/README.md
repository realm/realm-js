<h1 align="center">
  Realm Babel Plugin
</h1>

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
  createdAt!: Date;
  userId!: string;

  static schema = {
    name: "Task",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      description: "string",
      isComplete: { type: "bool", default: false },
      createdAt: "date",
      userId: "string",
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
  isComplete!: boolean;
  createdAt!: Date;
  userId!: string;
}
```

</code>
</td>
</tr>
</table>

npm start -- --reset-cache
