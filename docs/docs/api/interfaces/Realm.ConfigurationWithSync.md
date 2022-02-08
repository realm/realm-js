---
id: "Realm.ConfigurationWithSync"
title: "Interface: ConfigurationWithSync"
sidebar_label: "Realm.ConfigurationWithSync"
custom_edit_url: null
---

[Realm](../namespaces/Realm).ConfigurationWithSync

## Hierarchy

- `BaseConfiguration`

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

BaseConfiguration.encryptionKey

___

### fifoFilesFallbackPath

• `Optional` **fifoFilesFallbackPath**: `string`

#### Inherited from

BaseConfiguration.fifoFilesFallbackPath

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

BaseConfiguration.path

___

### readOnly

• `Optional` **readOnly**: `boolean`

#### Inherited from

BaseConfiguration.readOnly

___

### schema

• `Optional` **schema**: (`ObjectSchema` \| `ObjectClass`)[]

#### Inherited from

BaseConfiguration.schema

___

### schemaVersion

• `Optional` **schemaVersion**: `number`

#### Inherited from

BaseConfiguration.schemaVersion

___

### sync

• **sync**: `SyncConfiguration`

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

BaseConfiguration.shouldCompactOnLaunch
