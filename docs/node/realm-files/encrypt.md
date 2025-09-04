# Encrypt a Realm - Node.js SDK
You can encrypt the realm file on disk with AES-256 +
SHA-2 by supplying a 64-byte encryption key when opening a
realm.

Realm transparently encrypts and decrypts data with standard
[AES-256 encryption](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) using the
first 256 bits of the given 512-bit encryption key. Realm
uses the other 256 bits of the 512-bit encryption key to validate
integrity using a [hash-based message authentication code
(HMAC)](https://en.wikipedia.org/wiki/HMAC).

> **WARNING:**
> Do not use cryptographically-weak hashes for realm encryption keys.
For optimal security, we recommend generating random rather than derived
encryption keys.
>

> **NOTE:**
> You must encrypt a realm the first time you open it.
If you try to open an existing unencrypted realm using a configuration
that contains an encryption key, Realm throws an error.
>
> Alternatively, you can copy the unencrypted realm data to a new
encrypted realm using the
`Realm.writeCopyTo()`
method.
Refer to Copy Data and Open a New Realm
for more information.
>

The following code demonstrates how to generate an encryption key and
open an encrypted realm:

#### Javascript

```javascript
// Retrieve encryption key from secure location or create one
const encryptionKey = new ArrayBuffer(64);

// Use encryption key in realm configuration
const config = {
  schema: [Task],
  encryptionKey: encryptionKey,
};

const realm = await Realm.open(config);
```

#### Typescript

```typescript
// Retrieve encryption key from secure location or create one
const encryptionKey = new ArrayBuffer(64);

// Use encryption key in realm configuration
const config: Configuration = {
  schema: [Task],
  encryptionKey: encryptionKey,
};

const realm = await Realm.open(config);
```

## Store & Reuse Keys
You **must** pass the same encryption key every time you open the encrypted realm.
If you don't provide a key or specify the wrong key for an encrypted
realm, the Realm SDK throws an error.

Apps should store the encryption key securely, typically in the target
platform's secure key/value storage, so that other apps cannot read the key.

## Performance Impact
Reads and writes on encrypted realms can be up to 10% slower than unencrypted realms.

## Access an Encrypted Realm from Multiple Processes
> Version changed:

Starting with Realm Node.js SDK version v11.8.0, Realm supports opening
the same encrypted realm in multiple processes.

If your app uses Realm Node.js SDK version v11.7.0 or earlier, attempting to
open an encrypted realm from multiple processes throws this error:
`Encrypted interprocess sharing is currently unsupported.`
