---
id: "Realm.Services.MongoDB.MongoDBCollection"
title: "Interface: MongoDBCollection<T>"
sidebar_label: "Realm.Services.MongoDB.MongoDBCollection"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[MongoDB](../namespaces/Realm.Services.MongoDB).MongoDBCollection

A remote collection of documents in a MongoDB database.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Document`](Realm.Services.MongoDB.Document) |

## Methods

### aggregate

▸ **aggregate**(`pipeline`): `Promise`<`any`\>

Runs an aggregation framework pipeline against this collection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `pipeline` | [`AggregatePipelineStage`](../namespaces/Realm.Services.MongoDB#aggregatepipelinestage)[] | An array of aggregation pipeline stages. |

#### Returns

`Promise`<`any`\>

The result.

___

### count

▸ **count**(`filter?`, `options?`): `Promise`<`number`\>

Counts the number of documents in this collection matching the provided filter.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) |
| `options?` | [`CountOptions`](Realm.Services.MongoDB.CountOptions) |

#### Returns

`Promise`<`number`\>

___

### deleteMany

▸ **deleteMany**(`filter`): `Promise`<[`DeleteResult`](Realm.Services.MongoDB.DeleteResult)\>

Deletes multiple documents.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |

#### Returns

`Promise`<[`DeleteResult`](Realm.Services.MongoDB.DeleteResult)\>

The result.

___

### deleteOne

▸ **deleteOne**(`filter`): `Promise`<[`DeleteResult`](Realm.Services.MongoDB.DeleteResult)\>

Deletes a single matching document from the collection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |

#### Returns

`Promise`<[`DeleteResult`](Realm.Services.MongoDB.DeleteResult)\>

The result.

___

### find

▸ **find**(`filter?`, `options?`): `Promise`<`T`[]\>

Finds the documents which match the provided query.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | An optional filter applied to narrow down the results. |
| `options?` | [`FindOptions`](Realm.Services.MongoDB.FindOptions) | Additional options to apply. |

#### Returns

`Promise`<`T`[]\>

The documents.

___

### findOne

▸ **findOne**(`filter?`, `options?`): `Promise`<`T`\>

Finds a document which matches the provided filter.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `options?` | [`FindOneOptions`](Realm.Services.MongoDB.FindOneOptions) | Additional options to apply. |

#### Returns

`Promise`<`T`\>

The document.

___

### findOneAndDelete

▸ **findOneAndDelete**(`filter`, `options?`): `Promise`<`T`\>

Finds a document which matches the provided filter and deletes it

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `options?` | [`FindOneOptions`](Realm.Services.MongoDB.FindOneOptions) | Additional options to apply. |

#### Returns

`Promise`<`T`\>

The document found before deleting it.

___

### findOneAndReplace

▸ **findOneAndReplace**(`filter`, `replacement`, `options?`): `Promise`<`T`\>

Finds a document which matches the provided filter and replaces it with a new document.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `replacement` | [`NewDocument`](../namespaces/Realm.Services.MongoDB#newdocument)<`T`\> | The new replacing document. |
| `options?` | [`FindOneAndModifyOptions`](Realm.Services.MongoDB.FindOneAndModifyOptions) | Additional options to apply. |

#### Returns

`Promise`<`T`\>

The document found before replacing it.

___

### findOneAndUpdate

▸ **findOneAndUpdate**(`filter`, `update`, `options?`): `Promise`<`T`\>

Finds a document which matches the provided query and performs the desired update to individual fields.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `update` | [`Update`](../namespaces/Realm.Services.MongoDB#update) | The new values for the document. |
| `options?` | [`FindOneAndModifyOptions`](Realm.Services.MongoDB.FindOneAndModifyOptions) | Additional options to apply. |

#### Returns

`Promise`<`T`\>

The document found before updating it.

___

### insertMany

▸ **insertMany**(`documents`): `Promise`<[`InsertManyResult`](Realm.Services.MongoDB.InsertManyResult)<`T`[``"_id"``]\>\>

Inserts an array of documents into the collection.
If any values are missing identifiers, they will be generated by the server.

#### Parameters

| Name | Type |
| :------ | :------ |
| `documents` | [`NewDocument`](../namespaces/Realm.Services.MongoDB#newdocument)<`T`\>[] |

#### Returns

`Promise`<[`InsertManyResult`](Realm.Services.MongoDB.InsertManyResult)<`T`[``"_id"``]\>\>

The result.

___

### insertOne

▸ **insertOne**(`document`): `Promise`<[`InsertOneResult`](Realm.Services.MongoDB.InsertOneResult)<`T`[``"_id"``]\>\>

Inserts a single document into the collection.
Note: If the document is missing an _id, one will be generated for it by the server.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `document` | [`NewDocument`](../namespaces/Realm.Services.MongoDB#newdocument)<`T`\> | The document. |

#### Returns

`Promise`<[`InsertOneResult`](Realm.Services.MongoDB.InsertOneResult)<`T`[``"_id"``]\>\>

The result.

___

### updateMany

▸ **updateMany**(`filter`, `update`, `options?`): `Promise`<[`UpdateResult`](Realm.Services.MongoDB.UpdateResult)<`T`[``"_id"``]\>\>

Updates multiple documents matching the provided filter in this collection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `update` | [`Update`](../namespaces/Realm.Services.MongoDB#update) | The new values for the documents. |
| `options?` | [`UpdateOptions`](Realm.Services.MongoDB.UpdateOptions) | Additional options to apply. |

#### Returns

`Promise`<[`UpdateResult`](Realm.Services.MongoDB.UpdateResult)<`T`[``"_id"``]\>\>

The result.

___

### updateOne

▸ **updateOne**(`filter`, `update`, `options?`): `Promise`<[`UpdateResult`](Realm.Services.MongoDB.UpdateResult)<`T`[``"_id"``]\>\>

Updates a single document matching the provided filter in this collection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter applied to narrow down the result. |
| `update` | [`Update`](../namespaces/Realm.Services.MongoDB#update) | The new values for the document. |
| `options?` | [`UpdateOptions`](Realm.Services.MongoDB.UpdateOptions) | Additional options to apply. |

#### Returns

`Promise`<[`UpdateResult`](Realm.Services.MongoDB.UpdateResult)<`T`[``"_id"``]\>\>

The result.

___

### watch

▸ **watch**(`options?`): `AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>

Creates an asynchronous change stream to monitor this collection for changes.

By default, yields all change events for this collection. You may specify at most one of
the `filter` or `ids` options.

Important Note: To use this on React Native, you must install:

1. Polyfills for `fetch`, `ReadableStream` and `TextDecoder`: https://www.npmjs.com/package/react-native-polyfill-globals
2. Babel plugin enabling async generator syntax: https://npmjs.com/package/@babel/plugin-proposal-async-generator-functions

**`see`** https://docs.mongodb.com/manual/reference/change-events/

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `unknown` |

#### Returns

`AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>

▸ **watch**(`options`): `AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>

Creates an asynchronous change stream to monitor this collection for changes.

By default, yields all change events for this collection. You may specify at most one of
the `filter` or `ids` options.

**`see`** https://docs.mongodb.com/manual/reference/change-events/

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.ids` | `T`[``"_id"``][] | List of ids to watch |

#### Returns

`AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>

▸ **watch**(`options`): `AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>

Creates an asynchronous change stream to monitor this collection for changes.

By default, yields all change events for this collection.
You may specify at most one of the `filter` or `ids` options.

**`see`** https://docs.mongodb.com/manual/reference/change-events/

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.filter` | [`Filter`](../namespaces/Realm.Services.MongoDB#filter) | A filter document |

#### Returns

`AsyncGenerator`<[`ChangeEvent`](../namespaces/Realm.Services.MongoDB#changeevent)<`T`\>, `any`, `unknown`\>
