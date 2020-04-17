# Realm Web

Accessing MongoDB Realm from a web-browser.

## Caveats / limitations

As this is a *very early* preview release, it comes with a few caveats:

- Most importantly, the Realm Web project *will not* include a Realm Sync client in any foreseeable future.
- A limited selection of types of [credentials for authentication providers](https://docs.mongodb.com/stitch/authentication/providers/) are implemented at the moment:
  - Anonymous.
  - API key.
  - Email & password.
- A limited selection of [services](https://docs.mongodb.com/stitch/services/) are implemented at the moment:
  - Remote MongoDB (watching a collection is not yet implemented).
  - HTTP (send requests using the MongoDB service as a proxy).

Some parts of the legacy Stitch SDK is still missing, most notably:
- The ability to link a user to another identity.
- Persistance of the users tokens in the browsers local storage (user must reauthenticate after a page reload).
- The types for the `Realm.Credentials` namespace is not fully implemented.
