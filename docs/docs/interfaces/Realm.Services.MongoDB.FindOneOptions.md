---
id: "Realm.Services.MongoDB.FindOneOptions"
title: "Interface: FindOneOptions"
sidebar_label: "Realm.Services.MongoDB.FindOneOptions"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[MongoDB](../namespaces/Realm.Services.MongoDB).FindOneOptions

Options passed when finding a signle document

## Hierarchy

- **`FindOneOptions`**

  ↳ [`FindOptions`](Realm.Services.MongoDB.FindOptions)

  ↳ [`FindOneAndModifyOptions`](Realm.Services.MongoDB.FindOneAndModifyOptions)

## Properties

### projection

• `Optional` `Readonly` **projection**: `Record`<`string`, `unknown`\>

Limits the fields to return for all matching documents.
See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).

___

### sort

• `Optional` `Readonly` **sort**: `Record`<`string`, `unknown`\>

The order in which to return matching documents.
