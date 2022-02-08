---
id: "Realm.Object"
title: "Class: Object"
sidebar_label: "Realm.Object"
custom_edit_url: null
---

[Realm](../namespaces/Realm).Object

Object

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.Object.html }

## Constructors

### constructor

• **new Object**()

## Methods

### \_objectId

▸ **_objectId**(): `string`

#### Returns

`string`

___

### addListener

▸ **addListener**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `ObjectChangeCallback` |

#### Returns

`void`

void

___

### entries

▸ **entries**(): [`string`, `any`][]

#### Returns

[`string`, `any`][]

An array of key/value pairs of the object's properties.

___

### getPropertyType

▸ **getPropertyType**(`propertyName`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `propertyName` | `string` |

#### Returns

`string`

string

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

boolean

___

### keys

▸ **keys**(): `string`[]

#### Returns

`string`[]

An array of the names of the object's properties.

___

### linkingObjects

▸ **linkingObjects**<`T`\>(`objectType`, `property`): `Results`<`T` & `Object`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objectType` | `string` |
| `property` | `string` |

#### Returns

`Results`<`T` & `Object`\>

Results`<T>`

___

### linkingObjectsCount

▸ **linkingObjectsCount**(): `number`

#### Returns

`number`

number

___

### objectSchema

▸ **objectSchema**(): `ObjectSchema`

#### Returns

`ObjectSchema`

ObjectSchema

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
| `callback` | `ObjectChangeCallback` |

#### Returns

`void`

___

### toJSON

▸ **toJSON**(): `any`

#### Returns

`any`

An object for JSON serialization.
