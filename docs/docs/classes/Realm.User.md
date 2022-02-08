---
id: "Realm.User"
title: "Class: User<FunctionsFactoryType, CustomDataType, UserProfileDataType>"
sidebar_label: "Realm.User"
custom_edit_url: null
---

[Realm](../namespaces/Realm).User

Representation of an authenticated user of an app.

## Type parameters

| Name | Type |
| :------ | :------ |
| `FunctionsFactoryType` | [`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory) |
| `CustomDataType` | `SimpleObject` |
| `UserProfileDataType` | [`DefaultUserProfileData`](../namespaces/Realm#defaultuserprofiledata) |

## Constructors

### constructor

• **new User**<`FunctionsFactoryType`, `CustomDataType`, `UserProfileDataType`\>()

#### Type parameters

| Name | Type |
| :------ | :------ |
| `FunctionsFactoryType` | [`DefaultFunctionsFactory`](../interfaces/Realm.DefaultFunctionsFactory) |
| `CustomDataType` | `SimpleObject` |
| `UserProfileDataType` | [`DefaultUserProfileData`](../namespaces/Realm#defaultuserprofiledata) |

## Properties

### accessToken

• `Readonly` **accessToken**: `string`

The access token used when requesting a new access token.

___

### apiKeys

• `Readonly` **apiKeys**: [`ApiKeyAuth`](Realm.Auth.ApiKeyAuth)

Perform operations related to the API-key auth provider.

___

### customData

• `Readonly` **customData**: `CustomDataType`

You can store arbitrary data about your application users in a MongoDB collection and configure MongoDB Realm to automatically expose each user’s data in a field of their user object.
For example, you might store a user’s preferred language, date of birth, or their local timezone.

If this value has not been configured, it will be empty.

___

### deviceId

• `Readonly` **deviceId**: `string`

The id of the device.

___

### functions

• `Readonly` **functions**: `FunctionsFactoryType` & [`BaseFunctionsFactory`](../interfaces/Realm.BaseFunctionsFactory)

Use this to call functions defined by the MongoDB Realm app, as this user.

___

### id

• `Readonly` **id**: `string`

The automatically-generated internal ID of the user.

___

### identities

• `Readonly` **identities**: [`UserIdentity`](../interfaces/Realm.UserIdentity)[]

The identities of the user at any of the app's authentication providers.

___

### isLoggedIn

• `Readonly` **isLoggedIn**: `boolean`

The logged in state of the user.

___

### profile

• `Readonly` **profile**: `UserProfileDataType`

A profile containing additional information about the user.

___

### providerType

• `Readonly` **providerType**: [`ProviderType`](../namespaces/Realm#providertype)

The provider type used when authenticating the user.

___

### refreshToken

• `Readonly` **refreshToken**: `string`

The refresh token used when requesting a new access token.

___

### state

• `Readonly` **state**: [`UserState`](../enums/Realm.UserState)

The state of the user.

## Methods

### callFunction

▸ **callFunction**(`name`, ...`args`): `Promise`<`unknown`\>

Call a remote MongoDB Realm function by its name.
Note: Consider using `functions[name]()` instead of calling this method.

**`example`**
// These are all equivalent:
await user.callFunction("doThing", [a1, a2, a3]);
await user.functions.doThing(a1, a2, a3);
await user.functions["doThing"](a1, a2, a3);

**`example`**
// The methods returned from the functions object are bound, which is why it's okay to store the function in a variable before calling it:
const doThing = user.functions.doThing;
await doThing(a1);
await doThing(a2);

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Name of the function. |
| `...args` | `unknown`[] | Arguments passed to the function. |

#### Returns

`Promise`<`unknown`\>

___

### linkCredentials

▸ **linkCredentials**(`credentials`): `Promise`<`void`\>

Link the user with an identity represented by another set of credentials.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `credentials` | [`Credentials`](Realm.Credentials-1)<`SimpleObject`\> | The credentials to use when linking. |

#### Returns

`Promise`<`void`\>

___

### logOut

▸ **logOut**(): `Promise`<`void`\>

Log out the user.

#### Returns

`Promise`<`void`\>

A promise that resolves once the user has been logged out of the app.

___

### mongoClient

▸ **mongoClient**(`serviceName`): [`MongoDB`](../interfaces/Realm.Services.MongoDB-1)

Returns a connection to the MongoDB service.

**`example`**
let blueWidgets = user.mongoClient('myClusterName')
                      .db('myDb')
                      .collection('widgets')
                      .find({color: 'blue'});

#### Parameters

| Name | Type |
| :------ | :------ |
| `serviceName` | `string` |

#### Returns

[`MongoDB`](../interfaces/Realm.Services.MongoDB-1)

___

### push

▸ **push**(`serviceName`): [`Push`](../interfaces/Realm.Services.Push)

Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).

#### Parameters

| Name | Type |
| :------ | :------ |
| `serviceName` | `string` |

#### Returns

[`Push`](../interfaces/Realm.Services.Push)

An service client with methods to register and deregister the device on the user.

___

### refreshCustomData

▸ **refreshCustomData**(): `Promise`<`CustomDataType`\>

Refresh the access token and derive custom data from it.

#### Returns

`Promise`<`CustomDataType`\>

The newly fetched custom data.
