---
id: "Realm.ConfigurationWithoutSync"
title: "Interface: ConfigurationWithoutSync"
sidebar_label: "Realm.ConfigurationWithoutSync"
custom_edit_url: null
---

[Realm](../namespaces/Realm).ConfigurationWithoutSync

## Hierarchy

- `BaseConfiguration`

  ↳ **`ConfigurationWithoutSync`**

## Properties

### deleteRealmIfMigrationNeeded

• `Optional` **deleteRealmIfMigrationNeeded**: `boolean`

___

### disableFormatUpgrade

• `Optional` **disableFormatUpgrade**: `boolean`

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

• `Optional` **inMemory**: `boolean`

___

### migration

• `Optional` **migration**: `MigrationCallback`

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

• `Optional` **sync**: `never`

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
