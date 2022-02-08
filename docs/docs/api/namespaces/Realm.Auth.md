---
id: "Realm.Auth"
title: "Namespace: Auth"
sidebar_label: "Realm.Auth"
custom_edit_url: null
---

[Realm](Realm).Auth

## Classes

- [ApiKeyAuth](../classes/Realm.Auth.ApiKeyAuth)
- [EmailPasswordAuth](../classes/Realm.Auth.EmailPasswordAuth)

## Interfaces

- [CallResetPasswordFunctionDetails](../interfaces/Realm.Auth.CallResetPasswordFunctionDetails)
- [ConfirmUserDetails](../interfaces/Realm.Auth.ConfirmUserDetails)
- [RegisterUserDetails](../interfaces/Realm.Auth.RegisterUserDetails)
- [ResendConfirmationDetails](../interfaces/Realm.Auth.ResendConfirmationDetails)
- [ResetPasswordDetails](../interfaces/Realm.Auth.ResetPasswordDetails)
- [RetryCustomConfirmationDetails](../interfaces/Realm.Auth.RetryCustomConfirmationDetails)
- [SendResetPasswordDetails](../interfaces/Realm.Auth.SendResetPasswordDetails)

## Type aliases

### ApiKey

Ƭ **ApiKey**: `Object`

The representation of an API-key stored in the service.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `_id` | `string` | The internal identifier of the key. |
| `disabled` | `boolean` | When disabled, the key cannot authenticate. |
| `key` | `string` | The secret part of the key. |
| `name` | `string` | A name for the key. |
