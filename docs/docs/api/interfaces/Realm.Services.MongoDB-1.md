---
id: "Realm.Services.MongoDB-1"
title: "Interface: MongoDB"
sidebar_label: "Realm.Services.MongoDB"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Services](../namespaces/Realm.Services).MongoDB

The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.

## Methods

### db

▸ **db**(`databaseName`): `MongoDBDatabase`

Get the interface to a remote MongoDB database.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `databaseName` | `string` | The name of the database. |

#### Returns

`MongoDBDatabase`

The remote MongoDB database.
