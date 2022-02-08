---
id: "Realm.App.Sync.Subscription"
title: "Class: Subscription"
sidebar_label: "Realm.App.Sync.Subscription"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).Subscription

Class representing a single query subscription in a set of flexible sync
[SubscriptionSet](Realm.App.Sync.SubscriptionSet). This class contains readonly information about the
subscription – any changes to the set of subscriptions must be carried out
in a [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update) callback.

## Constructors

### constructor

• **new Subscription**()

## Properties

### createdAt

• `Readonly` **createdAt**: `Date`

**`returns`** The date when this subscription was created

___

### id

• `Readonly` **id**: `ObjectId`

**`returns`** The ObjectId of the subscription

___

### name

• `Readonly` **name**: `string`

**`returns`** The name given to this subscription when it was created.
If no name was set, this will return null.

___

### objectType

• `Readonly` **objectType**: `string`

**`returns`** The type of objects the subscription refers to.

___

### queryString

• `Readonly` **queryString**: `string`

**`returns`** The string representation of the query the subscription was created with.
If no filter or sort was specified, this will return "TRUEPREDICATE".

___

### updatedAt

• `Readonly` **updatedAt**: `Date`

**`returns`** The date when this subscription was last updated

## Methods

### new

▸ **new**(): `never`

#### Returns

`never`
