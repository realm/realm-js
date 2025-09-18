# Configure, Open, and Close a Realm - Node.js SDK
## Open a Realm
To open a local realm, pass a `Realm.Configuration` object to the asynchronous method `Realm.open()`.

> **NOTE:**
> If you do not specify a `path` property in your `Configuration` object,
the SDK creates a realm at the default path. You can access and change
the default realm path using the `Realm.defaultPath` global property.
>

```typescript
// Open a local realm file with a predefined Car object model
const realm = await Realm.open({
  schema: [Car],
});

```

### Open a Realm Without Providing a Schema
After you create a realm on a device, you can omit the schema when you
access the same realm by calling `new Realm()`. The SDK derives the
realm's schema from the existing realm file at `Realm.defaultPath`.

Accessing a realm without providing a schema only works for local realms. You
must always pass a schema when using a Synced realm.

```typescript
// Open the Realm with a schema
const realm = new Realm({ schema: [Car] });

realm.close();

// Reopen it without a schema
const reopenedRealm = new Realm();

```

### Open an In-Memory Realm
To create a realm that runs entirely in memory without being written to a file,
add `inMemory: true` to your `Realm.Configuration` object:

```typescript
const realm = await Realm.open({
  inMemory: true,
  schema: [Car],
});

```

> **NOTE:**
> In-memory realms may use disk space if memory is running low, but files
created by an in-memory realm are deleted when you close the realm.
>

## Copy Data and Open a New Realm
> Version added: 10.14.0

To copy data from an existing realm to a new realm with different
configuration options, pass the new configuration the
`Realm.writeCopyTo()` method.

In the new realm's configuration, you *must* specify the `path`.

If you write the copied realm to a realm file that already exists, the data is written object by object.
The copy operation replaces objects if there already exists objects for given primary keys.
The schemas of the realm you copy and the realm you are writing to must be
compatible for the copy operation to succeed.
Only objects in the schemas of both configurations are copied over.

The configuration change can also include changes to `encryptionKey`
property of the `Configuration`:

- Encrypted realm to unencrypted realm
- Unencrypted realm to encrypted realm

## Close a Realm
It is important to remember to call the `close()` method when done with a
realm instance to avoid memory leaks.

```typescript
realm.close();

```

## Use an HTTP Proxy
The Realm Node.js SDK has limited support for running behind an HTTP proxy.

### Requirements
- Realm Node.js SDK v10.3.0 or later.
- NPM CLI v6.9.0 or later is required.

### Limitations
- You must install the [fetch-with-proxy](https://www.npmjs.com/package/fetch-with-proxy) package manually.
- HTTPS connections from the client to the proxy server are not supported.
The URL specified in `HTTPS_PROXY` must start with `http://`.
- You must set an `HTTPS_PROXY` environment variable. The proxy can't
be set at runtime or on a per-app basis.

### Install fetch-with-proxy
A manual step is required to switch out the `node-fetch` package used by the
network transport layer.

After installing the Realm Node.js SDK, run the following command to install a
different package into the Network Transport package:

```sh
npm install node-fetch@npm:fetch-with-proxy --prefix node_modules/realm-network-transport
```

### Set HTTPS_PROXY and Run a Script
You can run an arbitrary script file while routing all of Realm JS's requests
through an HTTP proxy.

On a Unix system, you can prefix the assignment of an environment variable before
the command:

```sh
HTTPS_PROXY=http://127.0.0.1:3128 node index.js
```
