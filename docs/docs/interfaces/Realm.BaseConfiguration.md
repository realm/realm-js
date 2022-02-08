---
id: "Realm.BaseConfiguration"
title: "Interface: BaseConfiguration"
sidebar_label: "Realm.BaseConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).BaseConfiguration

## Hierarchy

- **`BaseConfiguration`**

  ↳ [`ConfigurationWithSync`](Realm.ConfigurationWithSync)

  ↳ [`ConfigurationWithoutSync`](Realm.ConfigurationWithoutSync)

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

• `Optional` **schema**: ([`ObjectSchema`](Realm.ObjectSchema) \| [`ObjectClass`](Realm.ObjectClass))[]

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
