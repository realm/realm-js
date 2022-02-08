---
id: "Realm.App.Sync.SubscriptionOptions"
title: "Interface: SubscriptionOptions"
sidebar_label: "Realm.App.Sync.SubscriptionOptions"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).SubscriptionOptions

Options for {@link SubscriptionSet.add}.

## Properties

### name

• `Optional` **name**: `string`

Sets the name of the subscription being added. This allows you to later refer
to the subscription by name, e.g. when calling [MutableSubscriptionSet.removeByName](Realm.App.Sync.MutableSubscriptionSet#removebyname).

___

### throwOnUpdate

• `Optional` **throwOnUpdate**: `boolean`

By default, adding a subscription with the same name as an existing one
but a different query will update the existing subscription with the new
query. If `throwOnUpdate` is set to true, adding a subscription with the
same name but a different query will instead throw an exception.
Adding a subscription with the same name and query is always a no-op.
