---
id: "Realm.Auth.EmailPasswordAuth"
title: "Class: EmailPasswordAuth"
sidebar_label: "Realm.Auth.EmailPasswordAuth"
custom_edit_url: null
---

[Realm](../namespaces/Realm).[Auth](../namespaces/Realm.Auth).EmailPasswordAuth

Authentication provider where users identify using email and password.

## Constructors

### constructor

• **new EmailPasswordAuth**()

## Methods

### callResetPasswordFunction

▸ **callResetPasswordFunction**(`resetDetails`, ...`args`): `Promise`<`void`\>

Call the custom function to reset the password.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resetDetails` | [`CallResetPasswordFunctionDetails`](../interfaces/Realm.Auth.CallResetPasswordFunctionDetails) | The email and password details to reset |
| `...args` | `unknown`[] | One or more arguments to pass to the function. |

#### Returns

`Promise`<`void`\>

▸ **callResetPasswordFunction**(`email`, `password`, ...`args`): `Promise`<`void`\>

Call the custom function to reset the password.

**`deprecated`** Use `callResetPasswordFunction(resetDetails, ...args)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | the email associated with the user. |
| `password` | `string` | the new password. |
| `...args` | `unknown`[] | one or more arguments to pass to the function. |

#### Returns

`Promise`<`void`\>

___

### confirmUser

▸ **confirmUser**(`tokenDetails`): `Promise`<`void`\>

Confirm a user by the token received.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tokenDetails` | [`ConfirmUserDetails`](../interfaces/Realm.Auth.ConfirmUserDetails) | The received token and ID details |

#### Returns

`Promise`<`void`\>

▸ **confirmUser**(`token`, `tokenId`): `Promise`<`void`\>

Confirm a user by the token received.

**`deprecated`** Use `confirmUser(tokenDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | the token received. |
| `tokenId` | `string` | the id of the token received. |

#### Returns

`Promise`<`void`\>

___

### registerUser

▸ **registerUser**(`userDetails`): `Promise`<`void`\>

Register a new user.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `userDetails` | [`RegisterUserDetails`](../interfaces/Realm.Auth.RegisterUserDetails) | The new user's email and password details |

#### Returns

`Promise`<`void`\>

▸ **registerUser**(`email`, `password`): `Promise`<`void`\>

Register a new user.

**`deprecated`** Use `registerUser(userDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | the new user's email. |
| `password` | `string` | the new user's passsword. |

#### Returns

`Promise`<`void`\>

___

### resendConfirmationEmail

▸ **resendConfirmationEmail**(`emailDetails`): `Promise`<`void`\>

Resend the confirmation email.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emailDetails` | [`ResendConfirmationDetails`](../interfaces/Realm.Auth.ResendConfirmationDetails) | The associated email details |

#### Returns

`Promise`<`void`\>

▸ **resendConfirmationEmail**(`email`): `Promise`<`void`\>

Resend the confirmation email.

**`deprecated`** Use `resendConfirmationEmail(emailDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | the email associated to resend the confirmation to. |

#### Returns

`Promise`<`void`\>

___

### resetPassword

▸ **resetPassword**(`resetDetails`): `Promise`<`void`\>

Complete resetting the password

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resetDetails` | [`ResetPasswordDetails`](../interfaces/Realm.Auth.ResetPasswordDetails) | The token and password details for the reset |

#### Returns

`Promise`<`void`\>

▸ **resetPassword**(`token`, `tokenId`, `password`): `Promise`<`void`\>

Complete resetting the password

**`deprecated`** Use `resetPassword(resetDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `token` | `string` | the token received. |
| `tokenId` | `string` | the id of the token received. |
| `password` | `string` | the new password. |

#### Returns

`Promise`<`void`\>

___

### retryCustomConfirmation

▸ **retryCustomConfirmation**(`emailDetails`): `Promise`<`void`\>

Rerun the custom confirmation function.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emailDetails` | [`RetryCustomConfirmationDetails`](../interfaces/Realm.Auth.RetryCustomConfirmationDetails) | The associated email details |

#### Returns

`Promise`<`void`\>

▸ **retryCustomConfirmation**(`email`): `Promise`<`void`\>

Rerun the custom confirmation function.

**`deprecated`** Use `retryCustomConfirmation(emailDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | the email associated to resend the confirmation to. |

#### Returns

`Promise`<`void`\>

___

### sendResetPasswordEmail

▸ **sendResetPasswordEmail**(`emailDetails`): `Promise`<`void`\>

Send an email with tokens to reset the password.

**`since`** v10.10.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emailDetails` | [`SendResetPasswordDetails`](../interfaces/Realm.Auth.SendResetPasswordDetails) | The email details to send the reset to |

#### Returns

`Promise`<`void`\>

▸ **sendResetPasswordEmail**(`email`): `Promise`<`void`\>

Send an email with tokens to reset the password.

**`deprecated`** Use `sendResetPasswordEmail(emailDetails)` instead

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `email` | `string` | the email to send the tokens to. |

#### Returns

`Promise`<`void`\>
