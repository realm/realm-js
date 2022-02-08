---
id: "Realm.Services.HTTP-1"
title: "Interface: HTTP"
sidebar_label: "Realm.Services.HTTP"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Services](../namespaces/Realm.Services).HTTP

The Stitch HTTP Service is a generic interface that enables you to communicate with any service that is available over HTTP.

**`see`** https://docs.mongodb.com/stitch/services/http/

## Methods

### delete

▸ **delete**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP DELETE request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.

___

### get

▸ **get**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP GET request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.

___

### head

▸ **head**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP HEAD request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.

___

### patch

▸ **patch**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP PATCH request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.

___

### post

▸ **post**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP POST request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.

___

### put

▸ **put**(`url`, `options?`): `Promise`<[`Response`](Realm.Services.HTTP.Response)\>

Sends an HTTP PUT request to the specified URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL to send the request to. |
| `options?` | [`RequestOptions`](Realm.Services.HTTP.RequestOptions) | Options related to the request. |

#### Returns

`Promise`<[`Response`](Realm.Services.HTTP.Response)\>

The response.
