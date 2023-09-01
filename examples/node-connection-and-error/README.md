# Connection State Change & Error Handling in Realm Node.js SDK

A skeleton app to be used as a reference for how to use the [Realm Node.js SDK](https://www.mongodb.com/docs/realm/sdk/node/) specifically around detecting various changes in e.g. connection state, user state, and sync errors, in order to better guide developers.

## Project Structure

The following shows the project structure and the most relevant files.

```
├── src
│   ├── atlas-app-services  - Configure Atlas App
│   │   ├── config.ts
│   │   └── getAtlasApp.ts
│   ├── models              - Simplified data model
│   │   ├── Kiosk.ts
│   │   ├── Product.ts
│   │   └── Store.ts
│   ├── index.ts            - Entry point
│   ├── logger.ts           - Replaceable logger
│   ├── realm-auth.ts       - Main Realm auth usage examples
│   └── realm-query.ts      - Data access/manipulation helper
└── other..
```

Main file for showcasing Realm usage pertaining to connection and error handling:
* [src/realm-auth.ts](./src/realm-auth.ts)

## Use Cases

This app focuses on showing where and when you can (a) perform logging and (b) handle specific scenarios based on observed changes. It specifically addresses the following points:

* Logging in using email/password authentication.
* Listening when a user is logged out or removed.
* Listening when a user's tokens are refreshed.
* Listening when the underlying sync session:
  * Tries to connect
  * Gets connected
  * Disconnects
  * Fails to reconnect
* Listening for sync errors.
* Listening for pre and post client resets.
* Generally providing best practices for the surrounding Realm usage such as opening and closing of realms, configurations, adding subscriptions, etc.
* Includes useful comments around the use of Realm.
* Note that an over-simplified data model is used. This app also writes data to confirm the functionality.

### Realm Details

* RealmJS version: ^12.0.0
* Device Sync type: Flexible

## Background

### Sync Error Handling

[Sync error](https://www.mongodb.com/docs/atlas/app-services/sync/error-handling/errors/) handling is centralized in a single callback function that can be defined in the Realm configuration. The callback will be invoked on each synchronization error that occurs and it is up to the user to react to it or not.

Device Sync will automatically recover from most of the errors; however, in a few cases, the exceptions might be fatal and will require some user interaction.

### Connection Changes

Connection changes can be detected by adding a listener callback to the Realm's sync session. The callback will be invoked whenever the underlying sync session changes its connection state.

Since retries will start automatically when disconnected, there is no need to manually reconnect.

> Convenience method:
> * Check if the app is connected: `app.syncSession?.isConnected()`

### User Event Changes and Tokens

User event changes can be detected by adding a listener callback to the logged in user. The callback will be invoked on various user related events including refresh of auth token, refresh token, custom user data, removal, and logout.

Access tokens are created once a user logs in and are refreshed automatically by the SDK when needed. Manually refreshing the token is [only required](https://www.mongodb.com/docs/realm/sdk/node/examples/authenticate-users/#get-a-user-access-token) if requests are sent outside of the SDK.

By default, refresh tokens expire 60 days after they are issued. In the Admin UI, you can [configure](https://www.mongodb.com/docs/atlas/app-services/users/sessions/#configure-refresh-token-expiration) this time for your App's refresh tokens to be anywhere between 30 minutes and 180 days, whereafter you can observe the relevant client listeners being fired.

> Convenience methods:
> * Get the user's access token: `app.currentUser?.accessToken`
> * Get the user's refresh token: `app.currentUser?.refreshToken`

### Client Reset

The server will [reset the client](https://www.mongodb.com/docs/atlas/app-services/sync/error-handling/client-resets/) whenever there is a discrepancy in the data history that cannot be resolved. By default, Realm will try to recover any unsynced changes from the client while resetting. However, there are other strategies available: You can discard the changes or do a [manual recovery](https://www.mongodb.com/docs/realm/sdk/node/advanced/client-reset-data-recovery/).

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/)

### Set Up an Atlas App Services App

To sync Realm data you must first:

1. [Create an App Services App](https://www.mongodb.com/docs/atlas/app-services/manage-apps/create/create-with-ui/)
2. Enable [Email/Password Authentication](https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/#std-label-email-password-authentication)
3. [Enable Flexible Sync](https://www.mongodb.com/docs/atlas/app-services/sync/configure/enable-sync/) with **Development Mode** on.
    * When Development Mode is enabled, queryable fields will be added automatically.
    * Queryable fields used in this app: `_id`, `storeId`

After running the client and seeing the available collections in Atlas, [set read/write permissions](https://www.mongodb.com/docs/atlas/app-services/rules/roles/#with-device-sync) for all collections.

### Install Dependencies

```sh
npm install
```

### Run the App

1. Copy your [Atlas App ID](https://www.mongodb.com/docs/atlas/app-services/reference/find-your-project-or-app-id/#std-label-find-your-app-id) from the App Services UI.
2. Paste the copied ID as the value of the existing variable `ATLAS_APP_ID` in [src/atlas-app-services/config.ts](./src/atlas-app-services/config.ts):
```js
export const ATLAS_APP_ID = "YOUR_APP_ID";
```

3. Start the script.

```sh
npm start
```

### Troubleshooting

* If permission is denied:
  * Whitelist your IP address via the Atlas UI.
  * Make sure you have [read/write permissions](https://www.mongodb.com/docs/atlas/app-services/rules/roles/#with-device-sync) for all collections.
* Removing the local database can be useful for certain errors.
  * When running the app, the local database will exist in the directory `mongodb-realm/`.
  * To remove it, run: `npm run rm-local-db`
