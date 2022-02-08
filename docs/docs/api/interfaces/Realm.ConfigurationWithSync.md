---
id: "Realm.ConfigurationWithSync"
title: "Interface: ConfigurationWithSync"
sidebar_label: "Realm.ConfigurationWithSync"
custom_edit_url: null
---

[Realm](../namespaces/Realm).ConfigurationWithSync

## Hierarchy

- [`BaseConfiguration`](Realm.BaseConfiguration)

  ↳ **`ConfigurationWithSync`**

## Properties

### deleteRealmIfMigrationNeeded

• `Optional` **deleteRealmIfMigrationNeeded**: `never`

___

### disableFormatUpgrade

• `Optional` **disableFormatUpgrade**: `never`

___

### encryptionKey

• `Optional` **encryptionKey**: `ArrayBuffer` \| `ArrayBufferView` \| `Int8Array`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[encryptionKey](Realm.BaseConfiguration#encryptionkey)

___

### fifoFilesFallbackPath

• `Optional` **fifoFilesFallbackPath**: `string`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[fifoFilesFallbackPath](Realm.BaseConfiguration#fifofilesfallbackpath)

___

### inMemory

• `Optional` **inMemory**: `never`

___

### migration

• `Optional` **migration**: `never`

___

### path

• `Optional` **path**: `string`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[path](Realm.BaseConfiguration#path)

___

### readOnly

• `Optional` **readOnly**: `boolean`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[readOnly](Realm.BaseConfiguration#readonly)

___

### schema

• `Optional` **schema**: ([`ObjectSchema`](Realm.ObjectSchema) \| [`ObjectClass`](Realm.ObjectClass))[]

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[schema](Realm.BaseConfiguration#schema)

___

### schemaVersion

• `Optional` **schemaVersion**: `number`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[schemaVersion](Realm.BaseConfiguration#schemaversion)

___

### sync

• **sync**: [`SyncConfiguration`](../namespaces/Realm#syncconfiguration)

## Methods

### shouldCompactOnLaunch

▸ `Optional` **shouldCompactOnLaunch**(`totalBytes`, `usedBytes`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `totalBytes` | `number` |
| `usedBytes` | `number` |

#### Returns

`boolean`

#### Inherited from

[BaseConfiguration](Realm.BaseConfiguration).[shouldCompactOnLaunch](Realm.BaseConfiguration#shouldcompactonlaunch)
