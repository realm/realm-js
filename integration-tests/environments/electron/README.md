# Realm JS tests running in an Electron environment

To install this environment, simply run:

```bash
npm install
```

The `realm` and `realm-integration-tests` packages are listed as local archive `dependencies` in the `package.json` because `electron-builder` will only include packages listed in `dependencies` in the packaged `app.asar` file. To avoid integrity checks failing when NPM compares the SHA of the archives with SHA in the package-lock.json we `npm install` the archives on `preinstall`.

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
