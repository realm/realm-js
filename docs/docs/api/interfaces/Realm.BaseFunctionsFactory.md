---
id: "Realm.BaseFunctionsFactory"
title: "Interface: BaseFunctionsFactory"
sidebar_label: "Realm.BaseFunctionsFactory"
custom_edit_url: null
---

[Realm](../namespaces/Realm).BaseFunctionsFactory

A collection of functions as defined on the MongoDB Server.

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
