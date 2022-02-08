---
id: "Realm.PartitionSyncConfiguration"
title: "Interface: PartitionSyncConfiguration"
sidebar_label: "Realm.PartitionSyncConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).PartitionSyncConfiguration

## Hierarchy

- `BaseSyncConfiguration`

  ↳ **`PartitionSyncConfiguration`**

## Properties

### \_sessionStopPolicy

• `Optional` **\_sessionStopPolicy**: `SessionStopPolicy`

#### Inherited from

BaseSyncConfiguration.\_sessionStopPolicy

___

### clientReset

• `Optional` **clientReset**: `ClientResetConfiguration`<`ClientResetMode`\>

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

### existingRealmFileBehavior

• `Optional` **existingRealmFileBehavior**: `OpenRealmBehaviorConfiguration`

___

### flexible

• `Optional` **flexible**: ``false``

#### Overrides

BaseSyncConfiguration.flexible

___

### newRealmFileBehavior

• `Optional` **newRealmFileBehavior**: `OpenRealmBehaviorConfiguration`

___

### partitionValue

• **partitionValue**: `PartitionValue`

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
