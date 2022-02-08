---
id: "Realm.BaseConfiguration"
title: "Interface: BaseConfiguration"
sidebar_label: "Realm.BaseConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).BaseConfiguration

## Properties

### encryptionKey

• `Optional` **encryptionKey**: `ArrayBuffer` \| `ArrayBufferView` \| `Int8Array`

___

### fifoFilesFallbackPath

• `Optional` **fifoFilesFallbackPath**: `string`

___

### path

• `Optional` **path**: `string`

___

### readOnly

• `Optional` **readOnly**: `boolean`

___

### schema

• `Optional` **schema**: (`ObjectSchema` \| `ObjectClass`)[]

___

### schemaVersion

• `Optional` **schemaVersion**: `number`

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
