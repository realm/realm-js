---
id: "Realm"
title: "Class: Realm"
sidebar_label: "Realm"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Realm**(`config?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | [`Configuration`](../namespaces/Realm#configuration) |

• **new Realm**(`path?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path?` | `string` |

## Properties

### empty

• `Readonly` **empty**: `boolean`

Indicates if this Realm contains any objects.

___

### isClosed

• `Readonly` **isClosed**: `boolean`

___

### isInTransaction

• `Readonly` **isInTransaction**: `boolean`

___

### path

• `Readonly` **path**: `string`

___

### readOnly

• `Readonly` **readOnly**: `boolean`

___

### schema

• `Readonly` **schema**: [`ObjectSchema`](../interfaces/Realm.ObjectSchema)[]

___

### schemaVersion

• `Readonly` **schemaVersion**: `number`

___

### subscriptions

• `Readonly` **subscriptions**: [`SubscriptionSet`](../namespaces/Realm.App.Sync#subscriptionset)

Get the latest set of flexible sync subscriptions.

**`throws`** if flexible sync is not enabled for this app

___

### syncSession

• `Readonly` **syncSession**: [`Session`](Realm.App.Sync.Session)

___

### defaultPath

▪ `Static` **defaultPath**: `string`

## Methods

### \_updateSchema

▸ `Private` **_updateSchema**(`schema`): `void`

Update the schema of the Realm.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `schema` | [`ObjectSchema`](../interfaces/Realm.ObjectSchema)[] | The schema which the Realm should be updated to use. |

#### Returns

`void`

___

### addListener

▸ **addListener**(`name`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `callback` | (`sender`: [`Realm`](Realm), `event`: ``"change"``) => `void` |

#### Returns

`void`

void

▸ **addListener**(`name`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `callback` | (`sender`: [`Realm`](Realm), `event`: ``"schema"``, `schema`: [`ObjectSchema`](../interfaces/Realm.ObjectSchema)[]) => `void` |

#### Returns

`void`

___

### beginTransaction

▸ **beginTransaction**(): `void`

#### Returns

`void`

void

___

### cancelTransaction

▸ **cancelTransaction**(): `void`

#### Returns

`void`

void

___

### close

▸ **close**(): `void`

#### Returns

`void`

void

___

### commitTransaction

▸ **commitTransaction**(): `void`

#### Returns

`void`

void

___

### compact

▸ **compact**(): `boolean`

#### Returns

`boolean`

boolean

___

### create

▸ **create**<`T`\>(`type`, `properties`, `mode?`): `T` & [`Object`](Realm.Object)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `properties` | `RealmInsertionModel`<`T`\> |
| `mode?` | [`Never`](../enums/Realm.UpdateMode#never) |

#### Returns

`T` & [`Object`](Realm.Object)

T & Realm.Object

▸ **create**<`T`\>(`type`, `properties`, `mode`): `T` & [`Object`](Realm.Object)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `properties` | `Partial`<`T`\> \| `Partial`<`RealmInsertionModel`<`T`\>\> |
| `mode` | [`Modified`](../enums/Realm.UpdateMode#modified) \| [`All`](../enums/Realm.UpdateMode#all) |

#### Returns

`T` & [`Object`](Realm.Object)

▸ **create**<`T`\>(`type`, `properties`, `mode?`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Object`](Realm.Object)<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | (...`arg`: `any`[]) => `T` |
| `properties` | `RealmInsertionModel`<`T`\> |
| `mode?` | [`Never`](../enums/Realm.UpdateMode#never) |

#### Returns

`T`

T

▸ **create**<`T`\>(`type`, `properties`, `mode`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Object`](Realm.Object)<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | (...`arg`: `any`[]) => `T` |
| `properties` | `Partial`<`T`\> \| `Partial`<`RealmInsertionModel`<`T`\>\> |
| `mode` | [`Modified`](../enums/Realm.UpdateMode#modified) \| [`All`](../enums/Realm.UpdateMode#all) |

#### Returns

`T`

___

### delete

▸ **delete**(`object`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

`void`

void

___

### deleteAll

▸ **deleteAll**(): `void`

#### Returns

`void`

void

___

### deleteModel

▸ **deleteModel**(`name`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`void`

void

___

### objectForPrimaryKey

▸ **objectForPrimaryKey**<`T`\>(`type`, `key`): `T` & [`Object`](Realm.Object)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `key` | [`PrimaryKey`](../namespaces/Realm#primarykey) |

#### Returns

`T` & [`Object`](Realm.Object)

▸ **objectForPrimaryKey**<`T`\>(`type`, `key`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Object`](Realm.Object)<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | (...`arg`: `any`[]) => `T` |
| `key` | [`PrimaryKey`](../namespaces/Realm#primarykey) |

#### Returns

`T`

▸ **objectForPrimaryKey**<`T`\>(`type`, `key`): `T` & [`Object`](Realm.Object)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` \| (...`arg`: `any`[]) => `T` |
| `key` | [`PrimaryKey`](../namespaces/Realm#primarykey) |

#### Returns

`T` & [`Object`](Realm.Object)

___

### objects

▸ **objects**<`T`\>(`type`): [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

#### Returns

[`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\>

Realm.Results`<T & Realm.Object>`

▸ **objects**<`T`\>(`type`): [`Results`](../namespaces/Realm#results)<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Object`](Realm.Object)<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | (...`arg`: `any`[]) => `T` |

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

Realm.Results`<T>`

▸ **objects**<`T`\>(`type`): [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` \| (...`arg`: `any`[]) => `T` |

#### Returns

[`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\>

___

### removeAllListeners

▸ **removeAllListeners**(`name?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | `string` |

#### Returns

`void`

void

___

### removeListener

▸ **removeListener**(`name`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `callback` | (`sender`: [`Realm`](Realm), `event`: ``"change"``) => `void` |

#### Returns

`void`

void

▸ **removeListener**(`name`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `callback` | (`sender`: [`Realm`](Realm), `event`: ``"schema"``, `schema`: [`ObjectSchema`](../interfaces/Realm.ObjectSchema)[]) => `void` |

#### Returns

`void`

___

### write

▸ **write**<`ReturnValueType`\>(`callback`): `ReturnValueType`

#### Type parameters

| Name |
| :------ |
| `ReturnValueType` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | () => `ReturnValueType` |

#### Returns

`ReturnValueType`

___

### writeCopyTo

▸ **writeCopyTo**(`path`, `encryptionKey?`): `void`

Write a copy of a realm at the destination path.  Any user will be able to open and use
the new copy.  Copying a synced realm will create a snapshot of the realm that can be
opened to resume syncing from the server.  Synced realms must be fully synchronized with
the server before calling `writeCopyTo`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` | destination path |
| `encryptionKey?` | `ArrayBuffer` \| `ArrayBufferView` | encryption key to use |

#### Returns

`void`

void

___

### clearTestState

▸ `Static` `Private` **clearTestState**(): `void`

Clears the state by closing and deleting any Realm in the default directory and logout all users.

#### Returns

`void`

___

### copyBundledRealmFiles

▸ `Static` **copyBundledRealmFiles**(): `void`

Copy all bundled Realm files to app's default file folder.

#### Returns

`void`

___

### createTemplateObject

▸ `Static` **createTemplateObject**<`T`\>(`objectSchema`): `T` & [`Object`](Realm.Object)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objectSchema` | [`ObjectSchema`](../interfaces/Realm.ObjectSchema) |

#### Returns

`T` & [`Object`](Realm.Object)

___

### deleteFile

▸ `Static` **deleteFile**(`config`): `void`

Delete the Realm file for the given configuration.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`Configuration`](../namespaces/Realm#configuration) |

#### Returns

`void`

___

### exists

▸ `Static` **exists**(`config`): `boolean`

Checks if the Realm already exists on disk.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`Configuration`](../namespaces/Realm#configuration) |

#### Returns

`boolean`

___

### open

▸ `Static` **open**(`config`): `ProgressPromise`

Open a realm asynchronously with a promise. If the realm is synced, it will be fully synchronized before it is available.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`Configuration`](../namespaces/Realm#configuration) |

#### Returns

`ProgressPromise`

___

### schemaVersion

▸ `Static` **schemaVersion**(`path`, `encryptionKey?`): `number`

Get the current schema version of the Realm at the given path.

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `encryptionKey?` | `ArrayBuffer` \| `ArrayBufferView` |

#### Returns

`number`

number
