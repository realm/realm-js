---
id: "Realm.Auth.ApiKeyAuth"
title: "Class: ApiKeyAuth"
sidebar_label: "Realm.Auth.ApiKeyAuth"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Auth](../namespaces/Realm.Auth).ApiKeyAuth

Authentication provider where users identify using an API-key.

## Constructors

### constructor

• **new ApiKeyAuth**()

## Methods

### create

▸ **create**(`name`): `Promise`<`ApiKey`\>

Creates an API key that can be used to authenticate as the current user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the API key to be created. |

#### Returns

`Promise`<`ApiKey`\>

___

### delete

▸ **delete**(`keyId`): `Promise`<`void`\>

Deletes an API key associated with the current user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `keyId` | `string` | the id of the API key to delete |

#### Returns

`Promise`<`void`\>

___

### disable

▸ **disable**(`keyId`): `Promise`<`void`\>

Disable an API key associated with the current user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `keyId` | `string` | the id of the API key to disable |

#### Returns

`Promise`<`void`\>

___

### enable

▸ **enable**(`keyId`): `Promise`<`void`\>

Enables an API key associated with the current user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `keyId` | `string` | the id of the API key to enable |

#### Returns

`Promise`<`void`\>

___

### fetch

▸ **fetch**(`keyId`): `Promise`<`ApiKey`\>

Fetches an API key associated with the current user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `keyId` | `string` | the id of the API key to fetch. |

#### Returns

`Promise`<`ApiKey`\>

___

### fetchAll

▸ **fetchAll**(): `Promise`<`ApiKey`[]\>

Fetches the API keys associated with the current user.

#### Returns

`Promise`<`ApiKey`[]\>
