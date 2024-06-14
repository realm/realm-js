# A AirBnB Listing Search Demo with Searchable Results when Offline Using Atlas Device SDK for React Native

A demo application showcasing how to use [MongoDB's Atlas Device SDK for React Native](https://www.mongodb.com/docs/realm/sdk/react-native/) in order to cache viewed collection items and view them offline. It uses anonymous auth to create a session which allows the demo user to search for AirBnB listings from the [Sample AirBnB Listings dataset](https://www.mongodb.com/docs/atlas/sample-data/sample-airbnb/).

## Demo Video

<div style="display: flex">
  <img src="assets/Demo.gif" width="350" alt="Demo Video">
</div>

## Project Structure

The following shows the project structure and the most relevant files.

> To learn more about the backend file structure, see [App Configuration](https://www.mongodb.com/docs/atlas/app-services/reference/config/).

```
├── app
│   ├── AirbnbList.tsx        - Main application screen
│   ├── AnonAuth.tsx          - Anonymous authentication component
│   ├── AppWrapper.ts         - Main wrapper with Realm Providers
│   ├── localModels.ts     		- Local only realm model schema
│   ├── localRealm.ts         - Local realm context and hooks
│   ├── syncedModels.tsx      - Synced realm model schema
│   └── syncedRealm.tsx       - Synced realm context and hooks
├── App.js                      - Entry point
├── sync.config.js                - Add App ID
├── package.json                  - Dependencies
└── README.md                     - Instructions and info
```

### Note: Using Multiple Realms at the Same Time

This app uses multiple Realms, which have been configured using `createRealmContext`.  This creates separate providers and hooks to access either the local-only Realm or the synced Realm.

#### Realm Configuration

When [opening a Realm](https://www.mongodb.com/docs/realm/sdk/react-native/sync-data/configure-a-synced-realm/), we can specify the behavior in the Realm configuration when opening it for the first time (via `newRealmFileBehavior`) and for subsequent ones (via `existingRealmFileBehavior`). We can either:
* `OpenRealmBehaviorType.OpenImmediately`
  * Opens the Realm file immediately if it exists, otherwise it first creates a new empty Realm file then opens it.
  * This lets users use the app with the existing data, while syncing any changes to the device in the background.
* `OpenRealmBehaviorType.DownloadBeforeOpen`
  * If there is data to be downloaded, this waits for the data to be fully synced before opening the Realm.

This app opens a Realm via `RealmProvider` (see [AuthenticatedApp.tsx](./frontend/app/AuthenticatedApp.tsx)) and passes the configuration as props. We use `OpenImmediately` for new and existing Realm files in order to use the app while offline.

> See [OpenRealmBehaviorConfiguration](https://www.mongodb.com/docs/realm-sdks/js/latest/types/OpenRealmBehaviorConfiguration.html) for possible configurations of new and existing Realm file behaviors.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/)
* [React Native development environment](https://reactnative.dev/docs/environment-setup?guide=native)
  * Refer to the **"React Native CLI Quickstart"**.

### Set up an Atlas Database with a Sample Dataset

1. [Deploy a free Atlas cluster](https://www.mongodb.com/docs/atlas/getting-started/#get-started-with-atlas) and create an Atlas database.
2. [Load the Sample Airbnb Dataset](https://www.mongodb.com/docs/atlas/sample-data/) into your Atlas database.
    * Several databases and collections exist in the sample dataset, but we will only be using the `sample_airbnb` database and its `listingsAndReviews` collection.
3. [Create a Search Index](https://www.mongodb.com/docs/atlas/atlas-search/tutorial/create-index/) with an Index Name of `airbnb`.  This will be used for Atlas Search within the application

### Set up an Atlas App Services App via CLI

To import and deploy changes from your local directory to App Services you can use the command line interface:

1. [Set up App Services CLI](https://www.mongodb.com/docs/atlas/app-services/cli/).
2. In the provided [backend directory](./backend/) (the App Services App), update the following:
    * Cluster Name
      * Update the `"clusterName"` in [data_sources/mongodb-atlas/config.json](./backend/data_sources/mongodb-atlas/config.json) to the name of your cluster.
      * (The default name is `Cluster0`.)
    * App ID
      * There is no `"app_id"` defined in [realm_config.json](./backend/realm_config.json) since we will create a brand new App. **If** you for some reason are updating an existing app, add an `"app_id"` field and its value.
3. [Create and deploy](https://www.mongodb.com/docs/atlas/app-services/cli/appservices-apps-create/) the local directory to App Services:
```sh
appservices push --local ./backend
```
4. Once pushed, verify that your App shows up in the App Services UI.  There will be a function called
5. 🥳 You can now go ahead and [install dependencies and run the React Native app](#install-dependencies).

### Install Dependencies

From the project root directory, run:

```sh
npm install
```

If developing with iOS, also run:

```sh
npx pod-install
```

### Run the App

1. [Copy your Atlas App ID](https://www.mongodb.com/docs/atlas/app-services/reference/find-your-project-or-app-id/#std-label-find-your-app-id) from the App Services UI.
2. Paste the copied ID as the value of the existing variable `appId` in [./sync.config.js](./sync.config.js):
```js
export const SYNC_CONFIG = {
  // Add your App ID here
  appId: "<YOUR APP ID>",
};
```
3. Start Metro (the JavaScript bundler) in its own terminal:
```sh
npm start
```
4. In another terminal, start the app:
```sh
# Open the app on an iOS simulator.
npm run ios

# Open the app on an Android emulator.
npm run android
```

> To run the app on an actual device, see React Native's [Running on Device](https://reactnative.dev/docs/running-on-device).

## Troubleshooting

A great help when troubleshooting is to look at the [Application Logs](https://www.mongodb.com/docs/atlas/app-services/activity/view-logs/) in the App Services UI.

### Permissions

If permission is denied:
  * Make sure your IP address is on the [IP Access List](https://www.mongodb.com/docs/atlas/app-services/security/network/#ip-access-list) for your App.
  * Make sure you have the correct data access permissions for the collections.
    * See [Set Data Access Permissions](#set-data-access-permissions) further above.

### Removing the Local Realm Database

Removing the local database can be useful for certain errors.

On an iOS simulator:
1. Press and hold the app icon on the Home Screen.
2. Choose to remove the app and its data.

On an Android emulator via Android Studio:
1. Quit the emulator if it is running.
2. Open `Device Manager`.
3. Select `Wipe Data` for the relevant emulator.
