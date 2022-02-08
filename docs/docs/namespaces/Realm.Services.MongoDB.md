---
id: "Realm.Services.MongoDB"
title: "Namespace: MongoDB"
sidebar_label: "Realm.Services.MongoDB"
custom_edit_url: null
---

[Realm](Realm).[Services](Realm.Services).MongoDB

## Interfaces

- [CountOptions](../interfaces/Realm.Services.MongoDB.CountOptions)
- [DeleteResult](../interfaces/Realm.Services.MongoDB.DeleteResult)
- [Document](../interfaces/Realm.Services.MongoDB.Document)
- [FindOneAndModifyOptions](../interfaces/Realm.Services.MongoDB.FindOneAndModifyOptions)
- [FindOneOptions](../interfaces/Realm.Services.MongoDB.FindOneOptions)
- [FindOptions](../interfaces/Realm.Services.MongoDB.FindOptions)
- [InsertManyResult](../interfaces/Realm.Services.MongoDB.InsertManyResult)
- [InsertOneResult](../interfaces/Realm.Services.MongoDB.InsertOneResult)
- [MongoDBCollection](../interfaces/Realm.Services.MongoDB.MongoDBCollection)
- [UpdateOptions](../interfaces/Realm.Services.MongoDB.UpdateOptions)
- [UpdateResult](../interfaces/Realm.Services.MongoDB.UpdateResult)

## Type aliases

### AggregatePipelineStage

Ƭ **AggregatePipelineStage**: `Record`<`string`, `unknown`\>

A stage of an aggregation pipeline.

___

### BaseChangeEvent

Ƭ **BaseChangeEvent**<`T`\>: `Object`

A base change event containing the properties which apply across operation types.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`OperationType`](Realm.Services.MongoDB#operationtype) |

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `_id` | [`ChangeEventId`](Realm.Services.MongoDB#changeeventid) | The id of the change event. |
| `clusterTime` | `Timestamp` | The timestamp from the oplog entry associated with the event. |
| `lsid?` | `Record`<`string`, `unknown`\> | The identifier for the session associated with the transaction. Only present if the operation is part of a multi-document transaction. |
| `operationType` | `T` | The type of operation which was performed on the document. |
| `txnNumber?` | `Long` | The transaction number. Only present if the operation is part of a multi-document transaction. |

___

### ChangeEvent

Ƭ **ChangeEvent**<`T`\>: [`InsertEvent`](Realm.Services.MongoDB#insertevent)<`T`\> \| [`UpdateEvent`](Realm.Services.MongoDB#updateevent)<`T`\> \| [`ReplaceEvent`](Realm.Services.MongoDB#replaceevent)<`T`\> \| [`DeleteEvent`](Realm.Services.MongoDB#deleteevent)<`T`\> \| [`DropEvent`](Realm.Services.MongoDB#dropevent) \| [`RenameEvent`](Realm.Services.MongoDB#renameevent) \| [`DropDatabaseEvent`](Realm.Services.MongoDB#dropdatabaseevent) \| [`InvalidateEvent`](Realm.Services.MongoDB#invalidateevent)

Represents a change event communicated via a MongoDB change stream.

**`see`** https://docs.mongodb.com/manual/reference/change-events/

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |

___

### ChangeEventId

Ƭ **ChangeEventId**: `any`

Acts as the `resumeToken` for the `resumeAfter` parameter when resuming a change stream.

___

### DeleteEvent

Ƭ **DeleteEvent**<`T`\>: { `documentKey`: [`DocumentKey`](Realm.Services.MongoDB#documentkey)<`T`[``"_id"``]\> ; `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"delete"``\>

A document got deleted from the collection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |

___

### DocumentKey

Ƭ **DocumentKey**<`IdType`\>: { `_id`: `IdType`  } & `Record`<`string`, `any`\>

A document that contains the _id of the document created or modified by the insert, replace, delete, update operations (i.e. CRUD operations). For sharded collections, also displays the full shard key for the document. The _id field is not repeated if it is already a part of the shard key.

#### Type parameters

| Name |
| :------ |
| `IdType` |

___

### DocumentNamespace

Ƭ **DocumentNamespace**: `Object`

The namespace of a document.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `coll` | `string` | The name of the collection. |
| `db` | `string` | The name of the database. |

___

### DropDatabaseEvent

Ƭ **DropDatabaseEvent**: { `ns`: `Omit`<[`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace), ``"coll"``\>  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"dropDatabase"``\>

Occurs when a database is dropped.

___

### DropEvent

Ƭ **DropEvent**: { `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"drop"``\>

Occurs when a collection is dropped from a database.

___

### Filter

Ƭ **Filter**: `Record`<`string`, `unknown`\>

A filter applied to limit the documents being queried for.

___

### InsertEvent

Ƭ **InsertEvent**<`T`\>: { `documentKey`: [`DocumentKey`](Realm.Services.MongoDB#documentkey)<`T`[``"_id"``]\> ; `fullDocument`: `T` ; `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"insert"``\>

A document got inserted into the collection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |

___

### InvalidateEvent

Ƭ **InvalidateEvent**: [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"invalidate"``\>

Invalidate events close the change stream cursor.

___

### NewDocument

Ƭ **NewDocument**<`T`\>: `Omit`<`T`, ``"_id"``\> & `Partial`<`Pick`<`T`, ``"_id"``\>\>

A new document with an optional _id defined.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |

___

### OperationType

Ƭ **OperationType**: ``"insert"`` \| ``"delete"`` \| ``"replace"`` \| ``"update"`` \| ``"drop"`` \| ``"rename"`` \| ``"dropDatabase"`` \| ``"invalidate"``

An operation performed on a document.

___

### RenameEvent

Ƭ **RenameEvent**: { `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace) ; `to`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"rename"``\>

Occurs when a collection is renamed.

___

### ReplaceEvent

Ƭ **ReplaceEvent**<`T`\>: { `documentKey`: [`DocumentKey`](Realm.Services.MongoDB#documentkey)<`T`[``"_id"``]\> ; `fullDocument`: `T` ; `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"replace"``\>

A document got replaced in the collection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |

___

### Update

Ƭ **Update**: `Record`<`string`, `unknown`\>

An object specifying the update operations to perform when updating a document.

___

### UpdateDescription

Ƭ **UpdateDescription**: `Object`

A detailed description of an update performed on a document.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `removedFields` | `string`[] | Names of fields that got removed. |
| `updatedFields` | `Record`<`string`, `any`\> | Names of fields that got updated. |

___

### UpdateEvent

Ƭ **UpdateEvent**<`T`\>: { `documentKey`: [`DocumentKey`](Realm.Services.MongoDB#documentkey)<`T`[``"_id"``]\> ; `fullDocument?`: `T` ; `ns`: [`DocumentNamespace`](Realm.Services.MongoDB#documentnamespace) ; `updateDescription`: [`UpdateDescription`](Realm.Services.MongoDB#updatedescription)  } & [`BaseChangeEvent`](Realm.Services.MongoDB#basechangeevent)<``"update"``\>

A document got updated in the collection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](../interfaces/Realm.Services.MongoDB.Document) |
