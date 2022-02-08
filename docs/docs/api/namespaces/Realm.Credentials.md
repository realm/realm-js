---
id: "Realm.Credentials"
title: "Namespace: Credentials"
sidebar_label: "Realm.Credentials"
custom_edit_url: null
---

[Realm](Realm).Credentials

## Type aliases

### AnonymousPayload

Ƭ **AnonymousPayload**: `Record`<`string`, `never`\>

Payload sent when authenticating using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).

___

### ApiKeyPayload

Ƭ **ApiKeyPayload**: `Object`

Payload sent when authenticating using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | The secret content of the API key. |

___

### ApplePayload

Ƭ **ApplePayload**: `Object`

Payload sent when authenticating using the [Apple ID Provider](https://docs.mongodb.com/realm/authentication/apple/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `id_token` | `string` | The OpenID token from Apple. |

___

### EmailPasswordPayload

Ƭ **EmailPasswordPayload**: `Object`

Payload sent when authenticating using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `password` | `string` | The end-users password. |
| `username` | `string` | The end-users username. Note: This currently has to be an email. |

___

### FacebookPayload

Ƭ **FacebookPayload**: `Object`

Payload sent when authenticating using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `accessToken` | `string` | The auth code returned from Google. |

___

### FunctionPayload

Ƭ **FunctionPayload**: `SimpleObject`

Payload sent when authenticating using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).

___

### GoogleAuthCodePayload

Ƭ **GoogleAuthCodePayload**: `Object`

Payload sent when authenticating using the OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `authCode` | `string` | The auth code from Google. |

___

### GoogleIdTokenPayload

Ƭ **GoogleIdTokenPayload**: `Object`

Payload sent when authenticating using the OpenID Connect [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `id_token` | `string` | The OpenID token from Google. |

___

### GooglePayload

Ƭ **GooglePayload**: `GoogleAuthCodePayload` \| `GoogleIdTokenPayload`

Payload sent when authenticating using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

___

### JWTPayload

Ƭ **JWTPayload**: `Object`

Payload sent when authenticating using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | The JSON Web Token signed by another service. |

___

### OAuth2RedirectPayload

Ƭ **OAuth2RedirectPayload**: `Object`

Payload sent when authenticating using an OAuth 2.0 provider:
- [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
- [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `redirectUrl` | `string` | The auth code returned from Google. |
