---
id: "Realm.App.Sync.MutableSubscriptionSet"
title: "Class: MutableSubscriptionSet"
sidebar_label: "Realm.App.Sync.MutableSubscriptionSet"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).MutableSubscriptionSet

The mutable version of a given SubscriptionSet. The mutable methods of a given
[SubscriptionSet](Realm.App.Sync.SubscriptionSet) instance can only be accessed from inside the [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update)
callback.

## Hierarchy

- [`BaseSubscriptionSet`](Realm.App.Sync.BaseSubscriptionSet)

  ↳ **`MutableSubscriptionSet`**

## Properties

### error

• `Readonly` **error**: `string`

**`returns`** If `state` is [Realm.App.Sync.SubscriptionsState.Error](../enums/Realm.App.Sync.SubscriptionsState#error), this will return a `string`
representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[error](Realm.App.Sync.BaseSubscriptionSet#error)

___

### isEmpty

• `Readonly` **isEmpty**: `boolean`

**`returns`** `true` if there are no subscriptions in the set, `false` otherwise.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[isEmpty](Realm.App.Sync.BaseSubscriptionSet#isempty)

___

### state

• `Readonly` **state**: [`SubscriptionsState`](../enums/Realm.App.Sync.SubscriptionsState)

**`returns`** The state of the SubscriptionSet.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[state](Realm.App.Sync.BaseSubscriptionSet#state)

___

### version

• `Readonly` **version**: `number`

**`returns`** The version of the SubscriptionSet. This is incremented every time an
{@link update} is applied.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[version](Realm.App.Sync.BaseSubscriptionSet#version)

## Methods

### add

▸ **add**<`T`\>(`query`, `options?`): [`Subscription`](Realm.App.Sync.Subscription)

Adds a query to the set of active subscriptions. The query will be joined via
an `OR` operator with any existing queries for the same type.

A query is represented by a [Realm.Results](../namespaces/Realm#results) instance returned from [Realm.objects](Realm#objects),
for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | A [Realm.Results](../namespaces/Realm#results) instance representing the query to subscribe to. |
| `options?` | [`SubscriptionOptions`](../interfaces/Realm.App.Sync.SubscriptionOptions) | An optional [SubscriptionOptions](../interfaces/Realm.App.Sync.SubscriptionOptions) object containing options to use when adding this subscription (e.g. to give the subscription a name). |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

A `Subscription` instance for the new subscription.

___

### findByName

▸ **findByName**(`name`): [`Subscription`](Realm.App.Sync.Subscription)

Find a subscription by name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name to search for. |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

The named subscription, or `null` if the subscription is not found.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findByName](Realm.App.Sync.BaseSubscriptionSet#findbyname)

___

### findByQuery

▸ **findByQuery**<`T`\>(`query`): [`Subscription`](Realm.App.Sync.Subscription)

Find a subscription by query. Will match both named and unnamed subscriptions.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | The query to search for, represented as a [Realm.Results](../namespaces/Realm#results) instance, e.g. `Realm.objects("Cat").filtered("age > 10")`. |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

The subscription with the specified query, or null if the subscription is not found.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findByQuery](Realm.App.Sync.BaseSubscriptionSet#findbyquery)

___

### new

▸ **new**(): `never`

#### Returns

`never`

#### Overrides

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[new](Realm.App.Sync.BaseSubscriptionSet#new)

___

### remove

▸ **remove**<`T`\>(`query`): `boolean`

Removes a subscription with the given query from the SubscriptionSet.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | A [Realm.Results](../namespaces/Realm#results) instance representing the query to remove a subscription to. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.

___

### removeAll

▸ **removeAll**(): `number`

Removes all subscriptions from the SubscriptionSet.

#### Returns

`number`

The number of subscriptions removed.

___

### removeByName

▸ **removeByName**(`name`): `boolean`

Removes a subscription with the given name from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name of the subscription to remove. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.

___

### removeByObjectType

▸ **removeByObjectType**(`objectType`): `number`

Removes all subscriptions for the specified object type from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objectType` | `string` | The string name of the object type to remove all subscriptions for. |

#### Returns

`number`

The number of subscriptions removed.

___

### removeSubscription

▸ **removeSubscription**(`subscription`): `boolean`

Removes the specified subscription from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `subscription` | [`Subscription`](Realm.App.Sync.Subscription) | The [Subscription](Realm.App.Sync.Subscription) instance to remove. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.
