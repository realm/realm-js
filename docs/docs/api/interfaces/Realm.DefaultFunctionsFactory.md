---
id: "Realm.DefaultFunctionsFactory"
title: "Interface: DefaultFunctionsFactory"
sidebar_label: "Realm.DefaultFunctionsFactory"
custom_edit_url: null
---

[Realm](../namespaces/Realm).DefaultFunctionsFactory

A collection of functions as defined on the MongoDB Server.

## Hierarchy

- `BaseFunctionsFactory`

  ↳ **`DefaultFunctionsFactory`**

## Indexable

▪ [name: `string`]: `RealmFunction`<`any`, `any`[]\>

All the functions are accessable as members on this instance.

## Methods

### callFunction

▸ **callFunction**(`name`, ...`args`): `Promise`<`any`\>

Call a remote MongoDB Realm function by its name.
Consider using `functions[name]()` instead of calling this method.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Name of the function. |
| `...args` | `any`[] | Arguments passed to the function. |

#### Returns

`Promise`<`any`\>

#### Inherited from

___

### callFunctionStreaming

▸ **callFunctionStreaming**(`name`, ...`args`): `Promise`<`AsyncIterable`<`Uint8Array`\>\>

Call a remote MongoDB Realm function by its name, in a streaming mode.
Consider using `functions[name]()` instead of calling this method.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Name of the function. |
| `...args` | `any`[] | Arguments passed to the function. |

#### Returns

`Promise`<`AsyncIterable`<`Uint8Array`\>\>

#### Inherited from
