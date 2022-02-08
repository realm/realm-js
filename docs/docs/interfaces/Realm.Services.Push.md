---
id: "Realm.Services.Push"
title: "Interface: Push"
sidebar_label: "Realm.Services.Push"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Services](../namespaces/Realm.Services).Push

Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).

## Methods

### deregister

▸ **deregister**(): `Promise`<`void`\>

Deregister this device with the user, to disable sending messages to this device.

#### Returns

`Promise`<`void`\>

___

### register

▸ **register**(`token`): `Promise`<`void`\>

Register this device with the user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | A Firebase Cloud Messaging (FCM) token, retrieved via the firebase SDK. |

#### Returns

`Promise`<`void`\>
