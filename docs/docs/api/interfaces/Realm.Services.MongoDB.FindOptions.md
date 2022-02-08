---
id: "Realm.Services.MongoDB.FindOptions"
title: "Interface: FindOptions"
sidebar_label: "Realm.Services.MongoDB.FindOptions"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[MongoDB](../namespaces/Realm.Services.MongoDB).FindOptions

Options passed when finding a multiple documents

## Hierarchy

- `FindOneOptions`

  ↳ **`FindOptions`**

## Properties

### limit

• `Optional` `Readonly` **limit**: `number`

The maximum number of documents to return.

___

### projection

• `Optional` `Readonly` **projection**: `Record`<`string`, `unknown`\>

Limits the fields to return for all matching documents.
See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).

#### Inherited from

___

### sort

• `Optional` `Readonly` **sort**: `Record`<`string`, `unknown`\>

The order in which to return matching documents.

#### Inherited from
