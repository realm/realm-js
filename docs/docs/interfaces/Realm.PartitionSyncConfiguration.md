---
id: "Realm.PartitionSyncConfiguration"
title: "Interface: PartitionSyncConfiguration"
sidebar_label: "Realm.PartitionSyncConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).PartitionSyncConfiguration

## Hierarchy

- [`BaseSyncConfiguration`](Realm.BaseSyncConfiguration)

  ↳ **`PartitionSyncConfiguration`**

## Properties

### \_sessionStopPolicy

• `Optional` **\_sessionStopPolicy**: [`SessionStopPolicy`](../enums/Realm.SessionStopPolicy)

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[_sessionStopPolicy](Realm.BaseSyncConfiguration#_sessionstoppolicy)

___

### clientReset

• `Optional` **clientReset**: [`ClientResetConfiguration`](Realm.ClientResetConfiguration)<[`ClientResetMode`](../enums/Realm.ClientResetMode)\>

___

### customHttpHeaders

• `Optional` **customHttpHeaders**: `Object`

#### Index signature

▪ [header: `string`]: `string`

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[customHttpHeaders](Realm.BaseSyncConfiguration#customhttpheaders)

___

### error

• `Optional` **error**: [`ErrorCallback`](../namespaces/Realm#errorcallback)

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[error](Realm.BaseSyncConfiguration#error)

___

### existingRealmFileBehavior

• `Optional` **existingRealmFileBehavior**: [`OpenRealmBehaviorConfiguration`](Realm.OpenRealmBehaviorConfiguration)

___

### flexible

• `Optional` **flexible**: ``false``

#### Overrides

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[flexible](Realm.BaseSyncConfiguration#flexible)

___

### newRealmFileBehavior

• `Optional` **newRealmFileBehavior**: [`OpenRealmBehaviorConfiguration`](Realm.OpenRealmBehaviorConfiguration)

___

### partitionValue

• **partitionValue**: [`PartitionValue`](../namespaces/Realm.App.Sync#partitionvalue)

___

### ssl

• `Optional` **ssl**: [`SSLConfiguration`](Realm.SSLConfiguration)

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[ssl](Realm.BaseSyncConfiguration#ssl)

___

### user

• **user**: [`User`](../classes/Realm.User)<[`DefaultFunctionsFactory`](Realm.DefaultFunctionsFactory), `SimpleObject`, [`DefaultUserProfileData`](../namespaces/Realm#defaultuserprofiledata)\>

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[user](Realm.BaseSyncConfiguration#user)
