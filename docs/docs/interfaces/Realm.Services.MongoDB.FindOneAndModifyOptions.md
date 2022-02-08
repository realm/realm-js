---
id: "Realm.Services.MongoDB.FindOneAndModifyOptions"
title: "Interface: FindOneAndModifyOptions"
sidebar_label: "Realm.Services.MongoDB.FindOneAndModifyOptions"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[MongoDB](../namespaces/Realm.Services.MongoDB).FindOneAndModifyOptions

Options passed when finding and modifying a signle document

## Hierarchy

- [`FindOneOptions`](Realm.Services.MongoDB.FindOneOptions)

  ↳ **`FindOneAndModifyOptions`**

## Properties

### projection

• `Optional` `Readonly` **projection**: `Record`<`string`, `unknown`\>

Limits the fields to return for all matching documents.
See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).

#### Inherited from

[FindOneOptions](Realm.Services.MongoDB.FindOneOptions).[projection](Realm.Services.MongoDB.FindOneOptions#projection)

___

### returnNewDocument

• `Optional` `Readonly` **returnNewDocument**: `boolean`

Optional. Default: false.
A boolean that, if true, indicates that the action should return
the document in its updated form instead of its original, pre-update form.

___

### sort

• `Optional` `Readonly` **sort**: `Record`<`string`, `unknown`\>

The order in which to return matching documents.

#### Inherited from

[FindOneOptions](Realm.Services.MongoDB.FindOneOptions).[sort](Realm.Services.MongoDB.FindOneOptions#sort)

___

### upsert

• `Optional` `Readonly` **upsert**: `boolean`

Optional. Default: false.
A boolean that, if true, indicates that MongoDB should insert a new document that matches the
query filter when the query does not match any existing documents in the collection.
