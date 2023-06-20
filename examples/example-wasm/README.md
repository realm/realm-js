# Example React App Using Realm & Sync for Web

This is an example React Todo/Task app for showcasing Realm and Sync for Web.

## MongoDB & Realm Functionality

### Use cases

* Log in and register (email/password)
* Log out
* Create tasks
* Read/query tasks
* Update the status of tasks
* Delete tasks
* Sync
  1. Tasks are stored locally in an in-memory realm..
  2. then synced to MongoDB Atlas..
  3. then synced to all other apps connected to the same Atlas App.
* Local/Offline-first
  * All CRUD functionality works while offline.
* Realm JS and [@realm/react](https://www.npmjs.com/package/@realm/react) hooks

### Screenshot

![Tasks Page](./src/assets/screenshot-realm-web-sync-tasks.png)

## Project Structure

The following shows the project structure and the most relevant files.

```
├── public
│   └── index.html              - File served to client
│
├── src
│   ├── atlas-app-services
│   │   └── config.json         - Set Atlas App ID
│   │
│   ├── components
│   │   ├── AddTaskForm.tsx     - Trigger create task
│   │   ├── NavBar.tsx          - Trigger logout
│   │   ├── TaskItem.tsx        - Trigger update/delete task
│   │   └── TaskList.tsx        - Render all tasks
│   │
│   ├── hooks
│   │   ├── useAppManager.ts    - Handle login/register
│   │   └── useTaskManager.ts   - Handle CRUD task
│   │
│   ├── models
│   │   └── Task.ts             - Data model
│   │
│   ├── pages
│   │   ├── LoginPage.tsx       - Trigger login/register
│   │   └── TaskPage.tsx        - Pass CRUD ops to children
│   │
│   ├── App.tsx                 - Get and provide Atlas App
│   ├── AuthenticatedApp.tsx    - Open and provide Realm & User
│   └── index.tsx               - Entry point
│
├── craco.config.ts             - Configure CRA
├── package.json                - Specify Node dependencies
└── tsconfig.json               - Configure TypeScript
```

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/en) v16 or later

### Installation

Clone the repository and the current branch, then navigate to the example app folder:

```sh
cd realm-js/examples/example-wasm
```

Install dependencies:

```sh
npm install
```

### Setting up an Atlas App and Device Sync

To sync data you must first:

1. [Create an App Services App](https://www.mongodb.com/docs/atlas/app-services/manage-apps/create/create-with-ui/)
2. [Enable Email/Password Authentication](https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/#std-label-email-password-authentication)
    * For development purposes, you can also automatically confirm users:
      * In the App Services UI, go to the **Authentication** tab > **Authentication Providers** > Edit **Email/Password** > **User Confirmation Method**
3. [Enable Flexible Sync](https://www.mongodb.com/docs/atlas/app-services/sync/configure/enable-sync/) with **Development Mode** on.
    * When Development Mode is enabled, queryable fields will be added automatically.
    * Queryable fields used in this app: `_id`, `isComplete`
4. Select a **global** [deployment region](https://www.mongodb.com/docs/atlas/app-services/apps/deployment-models-and-regions/#deployment-models---regions):
    * In the App Services UI, go to the **App Settings** tab > **General** > **Deployment Region**
5. Allow client requests from all or specific IP addresses:
    * In the App Services UI, go to the **App Settings** tab > **IP Access List** > **Add IP Address**
6. [Set read/write permissions](https://www.mongodb.com/docs/atlas/app-services/rules/roles/#with-device-sync) for the collection.
    * This app assumes all users can read and write all tasks in the collection.
    * In the App Services UI, go to the **Rules** tab > Click on the **Task** collection > Add a `readAndWriteAll` role.
    * *You may need to run the client before seeing the **Task** collection.*

Once done, [copy your App ID](https://www.mongodb.com/docs/atlas/app-services/reference/find-your-project-or-app-id/#std-label-find-your-app-id) from the App Services UI and paste it as the value of `ATLAS_APP_ID` in [src/atlas-app-services/config.json](./src/atlas-app-services/config.json):

```json
{
  "ATLAS_APP_ID": "YOUR_ID"
}
```

### Building the App

Navigate to `example-wasm/` and build the app (the output will be located in the `build/` folder and is minified):

```sh
npm run build
```

### Running the App

Navigate to `example-wasm/` and start the app in development mode:

```sh
npm start
```

This should automatically open your default browser; but if not, open [http://localhost:3000](http://localhost:3000).

### Troubleshooting

A great way to troubleshoot sync-related errors is to read the [logs in the App Services UI](https://www.mongodb.com/docs/atlas/app-services/logs/logs-ui/).

## Limitations

### Persistence

In the current state of the Realm JS SDK for browsers, in-memory Realms are used for storing the data locally. Therefore, a hard refresh in the browser will clear the local data (e.g. logged in users will need to reauthenticate).

Note that the data will still be persisted in MongoDB Atlas and synced to the client once authenticated.

This app uses client-side routing to retain the local data across different routes.
