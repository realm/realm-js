---
id: "Realm.FlexibleSyncConfiguration"
title: "Interface: FlexibleSyncConfiguration"
sidebar_label: "Realm.FlexibleSyncConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).FlexibleSyncConfiguration

## Hierarchy

- `BaseSyncConfiguration`

  ↳ **`FlexibleSyncConfiguration`**

## Properties

### \_sessionStopPolicy

• `Optional` **\_sessionStopPolicy**: `SessionStopPolicy`

#### Inherited from

BaseSyncConfiguration.\_sessionStopPolicy

___

### clientReset

• `Optional` **clientReset**: `ClientResetConfiguration`<`Manual`\>

___

### customHttpHeaders

• `Optional` **customHttpHeaders**: `Object`

#### Index signature

▪ [header: `string`]: `string`

#### Inherited from

BaseSyncConfiguration.customHttpHeaders

___

### error

• `Optional` **error**: `ErrorCallback`

#### Inherited from

BaseSyncConfiguration.error

___

### flexible

• **flexible**: ``true``

#### Overrides

BaseSyncConfiguration.flexible

___

### partitionValue

• `Optional` **partitionValue**: `never`

___

### ssl

• `Optional` **ssl**: `SSLConfiguration`

#### Inherited from

BaseSyncConfiguration.ssl

___

### user

• **user**: `User`<`DefaultFunctionsFactory`, `SimpleObject`, `DefaultUserProfileData`\>

#### Inherited from

BaseSyncConfiguration.user
