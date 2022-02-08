---
id: "Realm.App.Sync"
title: "Namespace: Sync"
sidebar_label: "Realm.App.Sync"
custom_edit_url: null
---

[Realm](Realm).[App](Realm.App).Sync

Class for interacting with MongoDB Realm Cloud.

## Enumerations

- [NumericLogLevel](../enums/Realm.App.Sync.NumericLogLevel)
- [SubscriptionsState](../enums/Realm.App.Sync.SubscriptionsState)

## Classes

- [AuthError](../classes/Realm.App.Sync.AuthError)
- [Session](../classes/Realm.App.Sync.Session)
- [Subscription](../classes/Realm.App.Sync.Subscription)

## Interfaces

- [BaseSubscriptionSet](../interfaces/Realm.App.Sync.BaseSubscriptionSet)
- [MutableSubscriptionSet](../interfaces/Realm.App.Sync.MutableSubscriptionSet)
- [SubscriptionOptions](../interfaces/Realm.App.Sync.SubscriptionOptions)
- [SubscriptionSet](../interfaces/Realm.App.Sync.SubscriptionSet)

## Type aliases

### LogLevel

Ƭ **LogLevel**: ``"all"`` \| ``"trace"`` \| ``"debug"`` \| ``"detail"`` \| ``"info"`` \| ``"warn"`` \| ``"error"`` \| ``"fatal"`` \| ``"off"``

___

### PartitionValue

Ƭ **PartitionValue**: `string` \| `number` \| [`ObjectId`](Realm.BSON#objectid) \| [`UUID`](Realm.BSON#uuid) \| ``null``

## Variables

### MutableSubscriptionSet

• **MutableSubscriptionSet**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | [`MutableSubscriptionSet`](Realm.App.Sync#mutablesubscriptionset) |

___

### SubscriptionSet

• **SubscriptionSet**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `prototype` | [`SubscriptionSet`](Realm.App.Sync#subscriptionset) |

___

### downloadBeforeOpenBehavior

• **downloadBeforeOpenBehavior**: [`OpenRealmBehaviorConfiguration`](../interfaces/Realm.OpenRealmBehaviorConfiguration)

The default behavior settings if you want to wait for downloading a synchronized Realm to complete before opening it.

___

### openLocalRealmBehavior

• **openLocalRealmBehavior**: [`OpenRealmBehaviorConfiguration`](../interfaces/Realm.OpenRealmBehaviorConfiguration)

The default behavior settings if you want to open a synchronized Realm immediately and start working on it.
If this is the first time you open the Realm, it will be empty while the server data is being downloaded in the background.

## Functions

### \_hasExistingSessions

▸ **_hasExistingSessions**(`app`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |

#### Returns

`boolean`

___

### enableSessionMultiplexing

▸ **enableSessionMultiplexing**(`app`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |

#### Returns

`void`

___

### getAllSyncSessions

▸ **getAllSyncSessions**(`user`): [[`Session`](../classes/Realm.App.Sync.Session)]

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | [`User`](../classes/Realm.User)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`, [`DefaultUserProfileData`](Realm#defaultuserprofiledata)\> |

#### Returns

[[`Session`](../classes/Realm.App.Sync.Session)]

___

### getSyncSession

▸ **getSyncSession**(`user`, `partitionValue`): [`Session`](../classes/Realm.App.Sync.Session)

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | [`User`](../classes/Realm.User)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`, [`DefaultUserProfileData`](Realm#defaultuserprofiledata)\> |
| `partitionValue` | [`PartitionValue`](Realm.App.Sync#partitionvalue) |

#### Returns

[`Session`](../classes/Realm.App.Sync.Session)

___

### initiateClientReset

▸ **initiateClientReset**(`app`, `path`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |
| `path` | `string` |

#### Returns

`void`

___

### reconnect

▸ **reconnect**(`app`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |

#### Returns

`void`

___

### setLogLevel

▸ **setLogLevel**(`app`, `logLevel`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |
| `logLevel` | [`LogLevel`](Realm.App.Sync#loglevel) |

#### Returns

`void`

___

### setLogger

▸ **setLogger**(`app`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |
| `callback` | (`level`: [`NumericLogLevel`](../enums/Realm.App.Sync.NumericLogLevel), `message`: `string`) => `void` |

#### Returns

`void`

___

### setUserAgent

▸ **setUserAgent**(`app`, `userAgent`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `app` | [`App`](../classes/Realm.App-1)<[`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory), `SimpleObject`\> |
| `userAgent` | `string` |

#### Returns

`void`
