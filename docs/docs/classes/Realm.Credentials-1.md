---
id: "Realm.Credentials-1"
title: "Class: Credentials<PayloadType>"
sidebar_label: "Realm.Credentials"
custom_edit_url: null
---

[Realm](../namespaces/Realm).Credentials

End-users enter credentials to authenticate toward your MongoDB Realm App.

## Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `SimpleObject` = `SimpleObject` |

## Constructors

### constructor

• **new Credentials**<`PayloadType`\>()

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `SimpleObject` = `SimpleObject` |

## Properties

### payload

• `Readonly` **payload**: `PayloadType`

A simple object which can be passed to the server as the body of a request to authenticate.

___

### providerName

• `Readonly` **providerName**: `string`

Name of the authentication provider.

___

### providerType

• `Readonly` **providerType**: [`ProviderType`](../namespaces/Realm#providertype)

Type of the authentication provider.

## Methods

### anonymous

▸ `Static` **anonymous**(): [`Credentials`](Realm.Credentials-1)<[`AnonymousPayload`](../namespaces/Realm.Credentials#anonymouspayload)\>

Factory for `Credentials` which authenticate using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).

#### Returns

[`Credentials`](Realm.Credentials-1)<[`AnonymousPayload`](../namespaces/Realm.Credentials#anonymouspayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### apple

▸ `Static` **apple**(`idToken`): [`Credentials`](Realm.Credentials-1)<[`ApplePayload`](../namespaces/Realm.Credentials#applepayload)\>

Factory for `Credentials` which authenticate using the [Apple ID Provider](https://docs.mongodb.com/realm/authentication/apple/).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `idToken` | `string` | The id_token returned from Apple. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`ApplePayload`](../namespaces/Realm.Credentials#applepayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### emailPassword

▸ `Static` **emailPassword**(`email`, `password`): [`Credentials`](Realm.Credentials-1)<[`EmailPasswordPayload`](../namespaces/Realm.Credentials#emailpasswordpayload)\>

Factory for `Credentials` which authenticate using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).
Note: This was formerly known as the "Username/Password" provider.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | The end-users email address. |
| `password` | `string` | The end-users password. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`EmailPasswordPayload`](../namespaces/Realm.Credentials#emailpasswordpayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### facebook

▸ `Static` **facebook**(`accessToken`): [`Credentials`](Realm.Credentials-1)<[`FacebookPayload`](../namespaces/Realm.Credentials#facebookpayload)\>

Factory for `Credentials` which authenticate using the [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `accessToken` | `string` | The access token returned from Facebook. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`FacebookPayload`](../namespaces/Realm.Credentials#facebookpayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### function

▸ `Static` **function**<`PayloadType`\>(`payload`): [`Credentials`](Realm.Credentials-1)<`PayloadType`\>

Factory for `Credentials` which authenticate using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `SimpleObject` = `SimpleObject` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `PayloadType` | The custom payload as expected by the server. |

#### Returns

[`Credentials`](Realm.Credentials-1)<`PayloadType`\>

A `Credentials` object for logging in using `app.logIn`.

___

### google

▸ `Static` **google**(`authCodeOrIdToken`): [`Credentials`](Realm.Credentials-1)<[`GooglePayload`](../namespaces/Realm.Credentials#googlepayload)\>

Factory for `Credentials` which authenticate using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Parameters

| Name | Type |
| :------ | :------ |
| `authCodeOrIdToken` | `string` |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`GooglePayload`](../namespaces/Realm.Credentials#googlepayload)\>

A `Credentials` object for logging in using `app.logIn`.

▸ `Static` **google**(`payload`): [`Credentials`](Realm.Credentials-1)<[`GoogleAuthCodePayload`](../namespaces/Realm.Credentials#googleauthcodepayload)\>

Factory for `Credentials` which authenticate using the Auth Token OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `Object` | - |
| `payload.authCode` | `string` | The auth code from Google. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`GoogleAuthCodePayload`](../namespaces/Realm.Credentials#googleauthcodepayload)\>

A `Credentials` object for logging in using `app.logIn`.

▸ `Static` **google**(`payload`): [`Credentials`](Realm.Credentials-1)<[`GoogleIdTokenPayload`](../namespaces/Realm.Credentials#googleidtokenpayload)\>

Factory for `Credentials` which authenticate using the OpenID Connect OAuth 2.0 [Google Provider](https://docs.mongodb.com/realm/authentication/google/).

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `Object` |
| `payload.idToken` | `string` |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`GoogleIdTokenPayload`](../namespaces/Realm.Credentials#googleidtokenpayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### jwt

▸ `Static` **jwt**(`token`): [`Credentials`](Realm.Credentials-1)<[`JWTPayload`](../namespaces/Realm.Credentials#jwtpayload)\>

Factory for `Credentials` which authenticate using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | The JSON Web Token (JWT). |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`JWTPayload`](../namespaces/Realm.Credentials#jwtpayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### serverApiKey

▸ `Static` **serverApiKey**(`key`): [`Credentials`](Realm.Credentials-1)<[`ApiKeyPayload`](../namespaces/Realm.Credentials#apikeypayload)\>

Factory for `Credentials` which authenticate using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).

**`deprecated`** Use `Credentials.apiKey`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | The secret content of the API key. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`ApiKeyPayload`](../namespaces/Realm.Credentials#apikeypayload)\>

A `Credentials` object for logging in using `app.logIn`.

___

### userApiKey

▸ `Static` **userApiKey**(`key`): [`Credentials`](Realm.Credentials-1)<[`ApiKeyPayload`](../namespaces/Realm.Credentials#apikeypayload)\>

Factory for `Credentials` which authenticate using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).

**`deprecated`** Use `Credentials.apiKey`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | The secret content of the API key. |

#### Returns

[`Credentials`](Realm.Credentials-1)<[`ApiKeyPayload`](../namespaces/Realm.Credentials#apikeypayload)\>

A `Credentials` object for logging in using `app.logIn`.
