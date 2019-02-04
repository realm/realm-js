# Realm JS tests running in an Electron environment

Currently this directory consists of:
- An electron app in `app` where:
  - `main.js` starts a hidden `BrowserWindow` (loading `index.html`), either runs the tests or lets the render process
    do the heavy lifting.
  - `index.html` simply requires `renderer.js`.
  - `renderer.js` detects if it's supposed to run the tests and runs them.
  - `mocha.js` creates a mocha remote client and sets globals for the tests to use.
- `runner.js` which start the Mocha remote server and the Electron app (using the distribution package when available).

When running `npm install` a post-install script will package the test suite and install that as well as Realm from an
archive. Make sure the integration-tests folder contains a `realm-*.tgz` file before running this.

## Running the tests

To run tests in the main process:

    npm run test/main

To run tests in a renderer process:

    npm run test/renderer

To run tests both processes in sequence:

    npm test

To package the test app for distribution:

    npm run package -- [{arguments for electron-builder}](https://www.electron.build/cli).
