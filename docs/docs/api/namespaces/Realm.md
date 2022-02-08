---
id: "Realm"
title: "Namespace: Realm"
sidebar_label: "Realm"
sidebar_position: 0
custom_edit_url: null
---

## Namespaces

- [App](Realm.App)
- [Auth](Realm.Auth)
- [BSON](Realm.BSON)
- [Credentials](Realm.Credentials)
- [Services](Realm.Services)

## Enumerations

- [ClientResetMode](../enums/Realm.ClientResetMode)
- [ClientResetModeManualOnly](../enums/Realm.ClientResetModeManualOnly)
- [ConnectionState](../enums/Realm.ConnectionState)
- [OpenRealmBehaviorType](../enums/Realm.OpenRealmBehaviorType)
- [OpenRealmTimeOutBehavior](../enums/Realm.OpenRealmTimeOutBehavior)
- [SessionStopPolicy](../enums/Realm.SessionStopPolicy)
- [UpdateMode](../enums/Realm.UpdateMode)
- [UserState](../enums/Realm.UserState)
- [UserType](../enums/Realm.UserType)

## Classes

- [App](../classes/Realm.App-1)
- [Credentials](../classes/Realm.Credentials-1)
- [Object](../classes/Realm.Object)
- [User](../classes/Realm.User)

## Interfaces

- [AppConfiguration](../interfaces/Realm.AppConfiguration)
- [AuthProviders](../interfaces/Realm.AuthProviders)
- [BaseConfiguration](../interfaces/Realm.BaseConfiguration)
- [BaseFunctionsFactory](../interfaces/Realm.BaseFunctionsFactory)
- [BaseSyncConfiguration](../interfaces/Realm.BaseSyncConfiguration)
- [ClientResetConfiguration](../interfaces/Realm.ClientResetConfiguration)
- [ClientResetError](../interfaces/Realm.ClientResetError)
- [Collection](../interfaces/Realm.Collection)
- [CollectionChangeSet](../interfaces/Realm.CollectionChangeSet)
- [ConfigurationWithSync](../interfaces/Realm.ConfigurationWithSync)
- [ConfigurationWithoutSync](../interfaces/Realm.ConfigurationWithoutSync)
- [DefaultFunctionsFactory](../interfaces/Realm.DefaultFunctionsFactory)
- [DictionaryBase](../interfaces/Realm.DictionaryBase)
- [DictionaryChangeSet](../interfaces/Realm.DictionaryChangeSet)
- [FlexibleSyncConfiguration](../interfaces/Realm.FlexibleSyncConfiguration)
- [List](../interfaces/Realm.List)
- [LocalAppConfiguration](../interfaces/Realm.LocalAppConfiguration)
- [ObjectChangeSet](../interfaces/Realm.ObjectChangeSet)
- [ObjectClass](../interfaces/Realm.ObjectClass)
- [ObjectPropsType](../interfaces/Realm.ObjectPropsType)
- [ObjectSchema](../interfaces/Realm.ObjectSchema)
- [ObjectSchemaProperty](../interfaces/Realm.ObjectSchemaProperty)
- [ObjectType](../interfaces/Realm.ObjectType)
- [OpenRealmBehaviorConfiguration](../interfaces/Realm.OpenRealmBehaviorConfiguration)
- [PartitionSyncConfiguration](../interfaces/Realm.PartitionSyncConfiguration)
- [PropertiesTypes](../interfaces/Realm.PropertiesTypes)
- [Results](../interfaces/Realm.Results)
- [SSLConfiguration](../interfaces/Realm.SSLConfiguration)
- [SSLVerifyObject](../interfaces/Realm.SSLVerifyObject)
- [Services](../interfaces/Realm.Services-1)
- [Set](../interfaces/Realm.Set)
- [SyncError](../interfaces/Realm.SyncError)
- [UserIdentity](../interfaces/Realm.UserIdentity)
- [UserMap](../interfaces/Realm.UserMap)

## Type aliases

### ClientResetAfterCallback

Ƭ **ClientResetAfterCallback**: (`localRealm`: [`Realm`](../classes/Realm), `remoteRealm`: [`Realm`](../classes/Realm)) => `void`

#### Type declaration

▸ (`localRealm`, `remoteRealm`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `localRealm` | [`Realm`](../classes/Realm) |
| `remoteRealm` | [`Realm`](../classes/Realm) |

##### Returns

`void`

___

### ClientResetBeforeCallback

Ƭ **ClientResetBeforeCallback**: (`localRealm`: [`Realm`](../classes/Realm)) => `void`

#### Type declaration

▸ (`localRealm`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `localRealm` | [`Realm`](../classes/Realm) |

##### Returns

`void`

___

### CollectionChangeCallback

Ƭ **CollectionChangeCallback**<`T`\>: (`collection`: `Collection`<`T`\>, `changes`: `CollectionChangeSet`) => `void`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

▸ (`collection`, `changes`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `collection` | `Collection`<`T`\> |
| `changes` | `CollectionChangeSet` |

##### Returns

`void`

___

### Configuration

Ƭ **Configuration**: `ConfigurationWithSync` \| `ConfigurationWithoutSync`

realm configuration

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }

___

### ConnectionNotificationCallback

Ƭ **ConnectionNotificationCallback**: (`newState`: `ConnectionState`, `oldState`: `ConnectionState`) => `void`

#### Type declaration

▸ (`newState`, `oldState`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `newState` | `ConnectionState` |
| `oldState` | `ConnectionState` |

##### Returns

`void`

___

### DefaultUserProfileData

Ƭ **DefaultUserProfileData**: { `birthday?`: `string` ; `email?`: `string` ; `firstName?`: `string` ; `gender?`: `string` ; `lastName?`: `string` ; `maxAge?`: `string` ; `minAge?`: `string` ; `name?`: `string` ; `pictureUrl?`: `string`  } & { [key: string]: `unknown`;  }

An extended profile with detailed information about the user.

___

### Dictionary

Ƭ **Dictionary**<`ValueType`\>: `DictionaryBase`<`ValueType`\> & { [key: string]: `ValueType`;  }

Dictionary

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.Dictionary.html }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `ValueType` | `Mixed` |

___

### DictionaryChangeCallback

Ƭ **DictionaryChangeCallback**: (`dict`: `Dictionary`, `changes`: `DictionaryChangeSet`) => `void`

#### Type declaration

▸ (`dict`, `changes`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `dict` | `Dictionary` |
| `changes` | `DictionaryChangeSet` |

##### Returns

`void`

___

### ErrorCallback

Ƭ **ErrorCallback**: (`session`: `App.Sync.Session`, `error`: `SyncError` \| `ClientResetError`) => `void`

#### Type declaration

▸ (`session`, `error`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `session` | `App.Sync.Session` |
| `error` | `SyncError` \| `ClientResetError` |

##### Returns

`void`

___

### MigrationCallback

Ƭ **MigrationCallback**: (`oldRealm`: [`Realm`](../classes/Realm), `newRealm`: [`Realm`](../classes/Realm)) => `void`

#### Type declaration

▸ (`oldRealm`, `newRealm`): `void`

A function which can be called to migrate a Realm from one version of the schema to another.

##### Parameters

| Name | Type |
| :------ | :------ |
| `oldRealm` | [`Realm`](../classes/Realm) |
| `newRealm` | [`Realm`](../classes/Realm) |

##### Returns

`void`

___

### Mixed

Ƭ **Mixed**: `unknown`

A primitive value, a BSON value or an object link.

___

### ObjectChangeCallback

Ƭ **ObjectChangeCallback**: (`object`: `Object`, `changes`: `ObjectChangeSet`) => `void`

#### Type declaration

▸ (`object`, `changes`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `Object` |
| `changes` | `ObjectChangeSet` |

##### Returns

`void`

___

### PrimaryKey

Ƭ **PrimaryKey**: `number` \| `string` \| `Realm.BSON.ObjectId` \| `Realm.BSON.UUID`

___

### ProgressDirection

Ƭ **ProgressDirection**: ``"download"`` \| ``"upload"``

___

### ProgressMode

Ƭ **ProgressMode**: ``"reportIndefinitely"`` \| ``"forCurrentlyOutstandingWork"``

___

### ProgressNotificationCallback

Ƭ **ProgressNotificationCallback**: (`transferred`: `number`, `transferable`: `number`) => `void`

#### Type declaration

▸ (`transferred`, `transferable`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `transferred` | `number` |
| `transferable` | `number` |

##### Returns

`void`

___

### PropertyType

Ƭ **PropertyType**: `string` \| ``"bool"`` \| ``"int"`` \| ``"float"`` \| ``"double"`` \| ``"decimal128"`` \| ``"objectId"`` \| ``"string"`` \| ``"data"`` \| ``"date"`` \| ``"list"`` \| ``"linkingObjects"``

PropertyType

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.html#~PropertyType }

___

### ProviderType

Ƭ **ProviderType**: ``"anon-user"`` \| ``"api-key"`` \| ``"local-userpass"`` \| ``"custom-function"`` \| ``"custom-token"`` \| ``"oauth2-google"`` \| ``"oauth2-facebook"`` \| ``"oauth2-apple"``

Types of an authentication provider.

___

### RealmFunction

Ƭ **RealmFunction**<`R`, `A`\>: (...`args`: `A`) => `Promise`<`R`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `R` | `R` |
| `A` | extends `any`[] |

#### Type declaration

▸ (...`args`): `Promise`<`R`\>

A function which executes on the MongoDB Realm platform.

##### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `A` |

##### Returns

`Promise`<`R`\>

___

### SSLVerifyCallback

Ƭ **SSLVerifyCallback**: (`sslVerifyObject`: `SSLVerifyObject`) => `boolean`

#### Type declaration

▸ (`sslVerifyObject`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `sslVerifyObject` | `SSLVerifyObject` |

##### Returns

`boolean`

___

### SortDescriptor

Ƭ **SortDescriptor**: [`string`] \| [`string`, `boolean`]

SortDescriptor

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html#~SortDescriptor }

___

### SyncConfiguration

Ƭ **SyncConfiguration**: `FlexibleSyncConfiguration` \| `PartitionSyncConfiguration`

## Variables

### BSON

• **BSON**: `__module`

___

### Collection

• **Collection**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | `Collection`<`any`\> |

___

### Dictionary

• **Dictionary**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | `Dictionary`<`unknown`\> |

___

### List

• **List**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | `List`<`any`\> |

___

### Results

• **Results**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | `Results`<`any`\> |

___

### Set

• **Set**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | `Set`<`any`\> |

## Functions

### JsonSerializationReplacer

▸ `Const` **JsonSerializationReplacer**(`key`, `val`): `any`

JsonSerializationReplacer solves circular structures when serializing Realm entities

**`example`** JSON.stringify(realm.objects("Person"), Realm.JsonSerializationReplacer)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `val` | `any` |

#### Returns

`any`
