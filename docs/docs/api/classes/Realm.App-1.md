---
id: "Realm.App-1"
title: "Class: App<FunctionsFactoryType, CustomDataType>"
sidebar_label: "Realm.App"
custom_edit_url: null
---

[Realm](../namespaces/Realm).App

A MongoDB Realm App.

## Type parameters

| Name | Type |
| :------ | :------ |
| `FunctionsFactoryType` | `DefaultFunctionsFactory` |
| `CustomDataType` | `SimpleObject` |

## Constructors

### constructor

• **new App**<`FunctionsFactoryType`, `CustomDataType`\>(`idOrConfiguration`)

Construct a MongoDB Realm App.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `FunctionsFactoryType` | `DefaultFunctionsFactory` |
| `CustomDataType` | `SimpleObject` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `idOrConfiguration` | `string` \| `AppConfiguration` | The id string or configuration for the app. |

## Properties

### allUsers

• `Readonly` **allUsers**: `Readonly`<`Record`<`string`, `User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\>\>\>

All authenticated users.

___

### currentUser

• `Readonly` **currentUser**: `User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\>

The last user to log in or being switched to.

___

### emailPasswordAuth

• **emailPasswordAuth**: `EmailPasswordAuth`

Perform operations related to the email/password auth provider.

___

### id

• `Readonly` **id**: `string`

The id of this Realm app.

___

### Credentials

▪ `Static` `Readonly` **Credentials**: typeof `Credentials`

All credentials available for authentication.

## Methods

### logIn

▸ **logIn**(`credentials`): `Promise`<`User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\>\>

Log in a user using a specific credential

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `credentials` | `Credentials`<`SimpleObject`\> | the credentials to use when logging in |

#### Returns

`Promise`<`User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\>\>

___

### removeUser

▸ **removeUser**(`user`): `Promise`<`void`\>

Logs out and removes a user from the client.

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | `User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\> |

#### Returns

`Promise`<`void`\>

A promise that resolves once the user has been logged out and removed from the app.

___

### switchUser

▸ **switchUser**(`user`): `void`

Switch current user, from an instance of `User` or the string id of the user.

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | `User`<`FunctionsFactoryType`, `CustomDataType`, `DefaultUserProfileData`\> |

#### Returns

`void`

___

### getApp

▸ `Static` **getApp**(`appId`): `App`<`DefaultFunctionsFactory`, `SimpleObject`\>

Get or create a singleton Realm App from an id.
Calling this function multiple times with the same id will return the same instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `appId` | `string` |

#### Returns

`App`<`DefaultFunctionsFactory`, `SimpleObject`\>

The Realm App instance.
