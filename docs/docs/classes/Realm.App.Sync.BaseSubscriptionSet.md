---
id: "Realm.App.Sync.BaseSubscriptionSet"
title: "Class: BaseSubscriptionSet"
sidebar_label: "Realm.App.Sync.BaseSubscriptionSet"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).BaseSubscriptionSet

Class representing the common functionality for the [SubscriptionSet](Realm.App.Sync.SubscriptionSet) and
[MutableSubscriptionSet](Realm.App.Sync.MutableSubscriptionSet) classes.

The [Subscription](Realm.App.Sync.Subscription)s in a SubscriptionSet can be accessed as an array, e.g.
`realm.subscriptions[0]`. This array is readonly – SubscriptionSets can only be
modified inside a [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update) callback.

This class supports all of the functionality of normal JavaScript `Array`s (other
than modifying the array), but for clarity these methods and properties are not
documented here.

**`see`** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array

## Hierarchy

- `Array`

  ↳ **`BaseSubscriptionSet`**

  ↳↳ [`SubscriptionSet`](Realm.App.Sync.SubscriptionSet)

  ↳↳ [`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

## Implements

- `ReadonlyArray`<[`Subscription`](Realm.App.Sync.Subscription)\>

## Properties

### error

• `Readonly` **error**: `string`

**`returns`** If `state` is [Realm.App.Sync.SubscriptionsState.Error](../enums/Realm.App.Sync.SubscriptionsState#error), this will return a `string`
representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.

___

### isEmpty

• `Readonly` **isEmpty**: `boolean`

**`returns`** `true` if there are no subscriptions in the set, `false` otherwise.

___

### state

• `Readonly` **state**: [`SubscriptionsState`](../enums/Realm.App.Sync.SubscriptionsState)

**`returns`** The state of the SubscriptionSet.

___

### version

• `Readonly` **version**: `number`

**`returns`** The version of the SubscriptionSet. This is incremented every time an
{@link update} is applied.

## Methods

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

___

### new

▸ **new**(): `never`

#### Returns

`never`
