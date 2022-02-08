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
| `ValueType` | [`Mixed`](../namespaces/Realm#mixed) |

## Methods

### addListener

▸ **addListener**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`DictionaryChangeCallback`](../namespaces/Realm#dictionarychangecallback) |

#### Returns

`void`

void

___

### remove

▸ **remove**(`key`): [`DictionaryBase`](Realm.DictionaryBase)<`ValueType`\>

Removes given element from the dictionary

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` \| `string`[] |

#### Returns

[`DictionaryBase`](Realm.DictionaryBase)<`ValueType`\>

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
| `callback` | [`DictionaryChangeCallback`](../namespaces/Realm#dictionarychangecallback) |

#### Returns

`void`

___

### set

▸ **set**(`element`): [`DictionaryBase`](Realm.DictionaryBase)<`ValueType`\>

Adds given element to the dictionary

#### Parameters

| Name | Type |
| :------ | :------ |
| `element` | `Object` |

#### Returns

[`DictionaryBase`](Realm.DictionaryBase)<`ValueType`\>

The dictionary
