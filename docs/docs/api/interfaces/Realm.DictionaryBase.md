---
id: "Realm.DictionaryBase"
title: "Interface: DictionaryBase<ValueType>"
sidebar_label: "Realm.DictionaryBase"
custom_edit_url: null
---

[Realm](../namespaces/Realm).DictionaryBase

## Type parameters

| Name | Type |
| :------ | :------ |
| `ValueType` | `Mixed` |

## Methods

### addListener

▸ **addListener**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `DictionaryChangeCallback` |

#### Returns

`void`

void

___

### remove

▸ **remove**(`key`): `DictionaryBase`<`ValueType`\>

Removes given element from the dictionary

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` \| `string`[] |

#### Returns

`DictionaryBase`<`ValueType`\>

The dictionary

___

### removeAllListeners

▸ **removeAllListeners**(): `void`

#### Returns

`void`

___

### removeListener

▸ **removeListener**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `DictionaryChangeCallback` |

#### Returns

`void`

___

### set

▸ **set**(`element`): `DictionaryBase`<`ValueType`\>

Adds given element to the dictionary

#### Parameters

| Name | Type |
| :------ | :------ |
| `element` | `Object` |

#### Returns

`DictionaryBase`<`ValueType`\>

The dictionary
