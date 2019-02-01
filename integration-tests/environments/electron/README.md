# Realm JS tests running in an Electron enviroment

Currently this directory consists of:
- An electron app in `app` which has
  - `main.js` which starts a hidden `BrowserWindow` and either runs the tests itself (see --main flag below) or lets
    the render process do the heavy lifting.
  - `index.html` which requires `renderer.js`.
  - `renderer.js` detects if it's supposed to run the tests and runs them.
- A `runner.js` script, which uses [spectron](https://www.npmjs.com/package/spectron) to start the Electron app and read out the console from the Electron process, and console logging it.

When running `npm install` a postinstall script will package the test suite and install that as well as Realm from an
archive. Make sure the integration-tests folder contains a `realm.tgz` file before installing this.

## Running the tests

To run tests in the main process:

    npm run test/main

To run tests in a renderer process:

    npm run test/renderer

To run tests both processes in sequence:

    npm test
