---
id: "Realm.Services.HTTP.RequestOptions"
title: "Interface: RequestOptions"
sidebar_label: "Realm.Services.HTTP.RequestOptions"
custom_edit_url: null
---

[Services](../namespaces/Realm.Services).[HTTP](../namespaces/Realm.Services.HTTP).RequestOptions

Options to use when sending a request.

## Properties

### authUrl

• `Optional` **authUrl**: `string`

A url to request from the service to retrieve the authorization header.

___

### body

• `Optional` **body**: `string`

String encoded body sent in the request.

___

### cookies

• `Optional` **cookies**: `Object`

Cookies used when sending the request.

#### Index signature

▪ [name: `string`]: `string`

___

### encodeBodyAsJSON

• `Optional` **encodeBodyAsJSON**: `boolean`

Is the body a stringified JSON object? (application/json)

___

### followRedirects

• `Optional` **followRedirects**: `boolean`

Should redirects be followed?

___

### form

• `Optional` **form**: `boolean`

Is the body stringified form? (multipart/form-data)

___

### headers

• `Optional` **headers**: `Object`

Headers used when sending the request.

#### Index signature

▪ [name: `string`]: `string`[]
