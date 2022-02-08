---
id: "Realm.App.Sync.SubscriptionsState"
title: "Enumeration: SubscriptionsState"
sidebar_label: "Realm.App.Sync.SubscriptionsState"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).SubscriptionsState

Enum representing the state of a [SubscriptionSet](../interfaces/Realm.App.Sync.SubscriptionSet) set.

## Enumeration members

### Complete

• **Complete** = `"complete"`

The server has acknowledged the subscription and sent all the data that
matched the subscription queries at the time the SubscriptionSet was
updated. The server is now in steady-state synchronization mode where it
will stream updates as they come.

___

### Error

• **Error** = `"error"`

The server has returned an error and synchronization is paused for this
Realm. To view the actual error, use `Subscriptions.error`.

You can still use [SubscriptionSet.update](../interfaces/Realm.App.Sync.SubscriptionSet#update) to update the subscriptions,
and if the new update doesn't trigger an error, synchronization
will be restarted.

___

### Pending

• **Pending** = `"pending"`

The subscription update has been persisted locally, but the server hasn't
yet returned all the data that matched the updated subscription queries.

___

### Superseded

• **Superseded** = `"Superseded"`

The SubscriptionSet has been superseded by an updated one. This typically means
that someone has called [SubscriptionSet.update](../interfaces/Realm.App.Sync.SubscriptionSet#update) on a different instance
of the `Subscriptions`. You should not use a superseded SubscriptionSet,
and instead obtain a new instance from [Realm.subscriptions](../classes/Realm#subscriptions).
