---
id: "Realm.AppConfiguration"
title: "Interface: AppConfiguration"
sidebar_label: "Realm.AppConfiguration"
custom_edit_url: null
---

[Realm](../namespaces/Realm).AppConfiguration

Pass an object implementing this interface to the app constructor.

## Properties

### app

• `Optional` **app**: [`LocalAppConfiguration`](Realm.LocalAppConfiguration)

This describes the local app, sent to the server when a user authenticates.
Specifying this will enable the server to respond differently to specific versions of specific apps.

___

### baseUrl

• `Optional` **baseUrl**: `string`

An optional URL to use as a prefix when requesting the MongoDB Realm services.

___

### id

• **id**: `string`

The Realm App ID
