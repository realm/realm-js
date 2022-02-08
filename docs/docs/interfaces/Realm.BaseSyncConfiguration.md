---
id: "Realm.BaseSyncConfiguration"
title: "Interface: BaseSyncConfiguration<ClientResetModeT>"
sidebar_label: "Realm.BaseSyncConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).BaseSyncConfiguration

## Type parameters

| Name | Type |
| :------ | :------ |
| `ClientResetModeT` | [`ClientResetMode`](../enums/Realm.ClientResetMode) |

## Hierarchy

- **`BaseSyncConfiguration`**

  ↳ [`FlexibleSyncConfiguration`](Realm.FlexibleSyncConfiguration)

  ↳ [`PartitionSyncConfiguration`](Realm.PartitionSyncConfiguration)

## Properties

### \_sessionStopPolicy

• `Optional` **\_sessionStopPolicy**: [`SessionStopPolicy`](../enums/Realm.SessionStopPolicy)

___

### customHttpHeaders

• `Optional` **customHttpHeaders**: `Object`

#### Index signature

▪ [header: `string`]: `string`

___

### error

• `Optional` **error**: [`ErrorCallback`](../namespaces/Realm#errorcallback)

___

### flexible

• `Optional` **flexible**: `boolean`

___

### ssl

• `Optional` **ssl**: [`SSLConfiguration`](Realm.SSLConfiguration)

___

### user

• **user**: [`User`](../classes/Realm.User)<[`DefaultFunctionsFactory`](Realm.DefaultFunctionsFactory), `SimpleObject`, [`DefaultUserProfileData`](../namespaces/Realm#defaultuserprofiledata)\>
