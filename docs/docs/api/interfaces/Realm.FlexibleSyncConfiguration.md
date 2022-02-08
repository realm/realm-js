---
id: "Realm.FlexibleSyncConfiguration"
title: "Interface: FlexibleSyncConfiguration"
sidebar_label: "Realm.FlexibleSyncConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).FlexibleSyncConfiguration

## Hierarchy

- [`BaseSyncConfiguration`](Realm.BaseSyncConfiguration)

  ↳ **`FlexibleSyncConfiguration`**

## Properties

### \_sessionStopPolicy

• `Optional` **\_sessionStopPolicy**: [`SessionStopPolicy`](../enums/Realm.SessionStopPolicy)

#### Inherited from

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[_sessionStopPolicy](Realm.BaseSyncConfiguration#_sessionstoppolicy)

___

### clientReset

• `Optional` **clientReset**: [`ClientResetConfiguration`](Realm.ClientResetConfiguration)<[`Manual`](../enums/Realm.ClientResetModeManualOnly#manual)\>

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

### flexible

• **flexible**: ``true``

#### Overrides

[BaseSyncConfiguration](Realm.BaseSyncConfiguration).[flexible](Realm.BaseSyncConfiguration#flexible)

___

### partitionValue

• `Optional` **partitionValue**: `never`

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
