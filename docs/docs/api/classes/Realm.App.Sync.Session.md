---
id: "Realm.App.Sync.Session"
title: "Class: Session"
sidebar_label: "Realm.App.Sync.Session"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).Session

## Constructors

### constructor

• **new Session**()

## Properties

### config

• `Readonly` **config**: `SyncConfiguration`

___

### connectionState

• `Readonly` **connectionState**: `ConnectionState`

___

### state

• `Readonly` **state**: ``"invalid"`` \| ``"active"`` \| ``"inactive"``

___

### url

• `Readonly` **url**: `string`

___

### user

• `Readonly` **user**: `User`<`DefaultFunctionsFactory`, `SimpleObject`, `DefaultUserProfileData`\>

## Methods

### addConnectionNotification

▸ **addConnectionNotification**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `ConnectionNotificationCallback` |

#### Returns

`void`

___

### addProgressNotification

▸ **addProgressNotification**(`direction`, `mode`, `progressCallback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `direction` | `ProgressDirection` |
| `mode` | `ProgressMode` |
| `progressCallback` | `ProgressNotificationCallback` |

#### Returns

`void`

___

### downloadAllServerChanges

▸ **downloadAllServerChanges**(`timeoutMs?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeoutMs?` | `number` |

#### Returns

`Promise`<`void`\>

___

### isConnected

▸ **isConnected**(): `boolean`

#### Returns

`boolean`

___

### pause

▸ **pause**(): `void`

#### Returns

`void`

___

### removeConnectionNotification

▸ **removeConnectionNotification**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `ConnectionNotificationCallback` |

#### Returns

`void`

___

### removeProgressNotification

▸ **removeProgressNotification**(`progressCallback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `progressCallback` | `ProgressNotificationCallback` |

#### Returns

`void`

___

### resume

▸ **resume**(): `void`

#### Returns

`void`

___

### uploadAllLocalChanges

▸ **uploadAllLocalChanges**(`timeoutMs?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeoutMs?` | `number` |

#### Returns

`Promise`<`void`\>
