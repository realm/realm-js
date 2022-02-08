---
id: "Realm.Services.MongoDBDatabase"
title: "Interface: MongoDBDatabase"
sidebar_label: "Realm.Services.MongoDBDatabase"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Services](../namespaces/Realm.Services).MongoDBDatabase

The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.

## Methods

### collection

▸ **collection**<`T`\>(`name`): [`MongoDBCollection`](Realm.Services.MongoDB.MongoDBCollection)<`T`\>

Get the interface to a remote MongoDB collection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](Realm.Services.MongoDB.Document)<`any`, `T`\> = `any` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name of the collection. |

#### Returns

[`MongoDBCollection`](Realm.Services.MongoDB.MongoDBCollection)<`T`\>

The remote MongoDB collection.
