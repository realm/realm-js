# Realm JS tests running in an Electron environment

To install this environment, simply run:

```bash
npm ci
```

Currently this directory consists of:
- `runner.js` which start the Mocha remote server and the Electron app (using the distribution package when available).
- An electron app in `./app` where:
  - `main.js` starts a hidden `BrowserWindow` (loading `index.html`), which either runs the tests (if `processType` is `main`) or lets the render process do the heavy lifting (when `processType` is `renderer`).
  - `index.html` simply requires the `renderer.js` file - nothing fancy.
  - `renderer.js` detects if it's supposed to run the tests and runs them.
  - `mocha.js` creates a mocha remote client and sets globals for the tests to use.

## Running the tests

To run tests in the main process:

    npm run test/main

To run tests in a renderer process:

    npm run test/renderer

To run tests in both processes in sequence:

    npm test

To package the test app for distribution:

    npm run package -- [{arguments for electron-builder}](https://www.electron.build/cli).

## Post-install script and peer dependencies

The `realm` and `realm-integration-tests` packages are listed `*` in `peerDependencies` in the `package.json` and to trick `electron-builder` into including them in the packages `app.asar` file, we modify the package.json and restore it again, [when building the package](./package-package-application.js).

The actual tests are run against an archived package of Realm JS, expected to be stored as `integrations-tests/realm.tgz`. This is installed with `--no-save` as well as `--build-from-source=realm --realm_enable_sync` (to prevent a pre-built binary from being downloaded) to avoid integrity checks failing when NPM compares the SHA of the archives with SHA in the package-lock.json.
