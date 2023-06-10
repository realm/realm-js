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
│   ├── index.tsx               - Entry point
│   ├── App.tsx                 - Get and provide Atlas App
│   └── AuthenticatedApp.tsx    - Open and provide Realm & User
│
├── craco.config.ts             - Configure CRA
├── package.json                - Specify Node dependencies
└── tsconfig.json               - Configure TypeScript
```

## Getting Started

### Prerequisites

* Emscripten v3.1.40 or later.
  * Follow the [recommended installation instructions](https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended).
  * (In particular, do not use v3.1.39)
* [Node.js](https://nodejs.org/en) v16 or later

### Installation

Clone the repository and the current branch, then navigate to the project directory:

```sh
cd realm-js
```

Install dependencies and packages:

```sh
# From the root (realm-js/)
git submodule update --init --recursive
npm i
```

> <details>
> <summary> 📣 Toggle to see changes needed if moving or renaming this app directory 📣</summary>
> <br>
>
> This app is located in `realm-js/example-wasm/`. The following configurations need to be updated if moving or renaming this directory:
>
> [craco.config.ts](./craco.config.ts):
>   * Replace `"../packages"` with the relative path to the `packages` folder.
> ```TypeScript
> const config: CracoConfig = {
>   webpack: {
>     configure(config, context) {
>         // Update:
>         path.resolve(__dirname, '../packages')
>     },
>   },
> };
> ```
> [package.json](./package.json):
>   * Replace `"../packages"` with the relative path to the `packages` folder.
> ```json
> {
>   "name": "@realm/example-wasm",
>   "wireit": {
>     "start": {
>       "command": "craco start",
>       "dependencies": [
>         // Update:
>         "../packages/realm:build:browser",
>         "../packages/realm:bundle",
>         "../packages/realm-react:bundle"
>       ]
>     },
>     "build": {
>       "command": "craco build",
>       "dependencies": [
>         // Update:
>         "../packages/realm:build:browser",
>         "../packages/realm:bundle",
>         "../packages/realm-react:bundle"
>       ]
>     }
>   },
> }
> ```
> [realm-js/package.json](../package.json):
>   * Replace `"example-wasm"` with the relative path to the new location (e.g. `"new-folder/example-wasm"`).
> ```json
> {
>   "name": "@realm/root",
>   "workspaces": [
>     // Update:
>     "example-wasm",
>   ],
> }
> ```
> </details>

### Setting up an Atlas App and Device Sync

To sync Realm data you must first:

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
cd example-wasm
npm run build
```

### Running the App

Navigate to `example-wasm/` and start the app in development mode:

```sh
cd example-wasm
npm start
```

This should automatically open your default browser; but if not, open [http://localhost:3000](http://localhost:3000).

The page will reload if you make edits to the code. (Changes made to code in dependencies such as `realm` or `@realm/react` will require a rebuild.)

### Troubleshooting

A great way to troubleshoot sync-related errors is to read the [logs in the App Services UI](https://www.mongodb.com/docs/atlas/app-services/logs/logs-ui/).
