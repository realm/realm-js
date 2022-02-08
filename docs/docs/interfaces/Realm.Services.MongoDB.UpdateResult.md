---
id: "Realm.Services.MongoDB.UpdateResult"
title: "Interface: UpdateResult<IdType>"
sidebar_label: "Realm.Services.MongoDB.UpdateResult"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[MongoDB](../namespaces/Realm.Services.MongoDB).UpdateResult

Result of updating documents

## Type parameters

| Name |
| :------ |
| `IdType` |

## Properties

### matchedCount

• `Readonly` **matchedCount**: `number`

The number of documents that matched the filter.

___

### modifiedCount

• `Readonly` **modifiedCount**: `number`

The number of documents matched by the query.

___

### upsertedId

• `Optional` `Readonly` **upsertedId**: `IdType`

The identifier of the inserted document if an upsert took place.

See [[RemoteUpdateOptions.upsert]].
