---
id: "Realm.App.Sync.SubscriptionSet"
title: "Class: SubscriptionSet"
sidebar_label: "Realm.App.Sync.SubscriptionSet"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).SubscriptionSet

Class representing the set of all active flexible sync subscriptions for a Realm
instance.

The server will continuously evaluate the queries that the instance is subscribed to
and will send data that matches them, as well as remove data that no longer does.

The set of subscriptions can only be updated inside a [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update) callback,
by calling methods on the corresponding [MutableSubscriptionSet](Realm.App.Sync.MutableSubscriptionSet) instance.

## Hierarchy

- [`BaseSubscriptionSet`](Realm.App.Sync.BaseSubscriptionSet)

  ↳ **`SubscriptionSet`**

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
[update](Realm.App.Sync.SubscriptionSet#update) is applied.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[version](Realm.App.Sync.BaseSubscriptionSet#version)

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

### update

▸ **update**(`callback`): `Promise`<`void`\>

Update the SubscriptionSet and change this instance to point to the updated SubscriptionSet.

Adding or removing subscriptions from the set must be performed inside
the callback argument of this method, and the mutating methods must be called on
the `mutableSubs` argument rather than the original [SubscriptionSet](Realm.App.Sync.SubscriptionSet) instance.

Any changes to the subscriptions after the callback has executed will be batched and sent
to the server. You can either `await` the call to `update`, or call [waitForSynchronization](Realm.App.Sync.SubscriptionSet#waitforsynchronization)
to wait for the new data to be available.

Example:
```
await realm.subscriptions.update(mutableSubs => {
  mutableSubs.add(realm.objects("Cat").filtered("age > 10"));
  mutableSubs.add(realm.objects("Dog").filtered("age > 20"));
  mutableSubs.removeByName("personSubs");
});
// `realm` will now return the expected results based on the updated subscriptions
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callback` | (`mutableSubs`: [`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)) => `void` | A callback function which receives a [MutableSubscriptionSet](Realm.App.Sync.MutableSubscriptionSet) instance as its only argument, which can be used to add or remove subscriptions from the set. Note: this callback should not be asynchronous. |

#### Returns

`Promise`<`void`\>

A promise which resolves when the SubscriptionSet is synchronized, or is rejected
if there was an error during synchronization (see {@link waitForSynchronisation})

___

### waitForSynchronization

▸ **waitForSynchronization**(): `Promise`<`void`\>

Wait for the server to acknowledge this set of subscriptions and return the
matching objects.

If `state` is [SubscriptionsState.Complete](../enums/Realm.App.Sync.SubscriptionsState#complete), the promise will be resolved immediately.

If `state` is [SubscriptionsState.Error](../enums/Realm.App.Sync.SubscriptionsState#error), the promise will be rejected immediately.

#### Returns

`Promise`<`void`\>

A promise which is resolved when synchronization is complete, or is
rejected if there is an error during synchronisation.
